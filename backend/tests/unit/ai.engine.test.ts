import { beforeEach, describe, expect, it, vi } from 'vitest'
import { resetFakeDb, type Database } from '../helpers/fake-supabase'
import {
  computeMovingAverageForecast,
  demandForecast,
  type DemandHistoryPoint,
} from '../../src/modules/ai/ai.engine'

const PRODUCT_ID = 'd1000000-0000-0000-0000-000000000008'
const LOC_STORE_A = 'a1000000-0000-0000-0000-000000000001'
const STORE_A = 'aaaaaaaa-0000-0000-0000-000000000001'
const STORE_B = 'aaaaaaaa-0000-0000-0000-000000000002'

const DAY_MS = 86_400_000

function isoDaysAgo(n: number): string {
  return new Date(Date.now() - n * DAY_MS).toISOString()
}

function makeHistory(days: number, baseQty = 10, step = 0): DemandHistoryPoint[] {
  const out: DemandHistoryPoint[] = []
  for (let i = 0; i < days; i++) out.push({ date: isoDaysAgo(i).slice(0, 10), qty: baseQty + i * step })
  return out
}

interface SeedPoint {
  daysAgo: number
  qty: number
  product?: string
  store?: string
  status?: string
}

function seedSales(points: SeedPoint[], db: Database) {
  const sales = (db.sales ??= [])
  const lines = (db.sale_lines ??= [])
  points.forEach((p, i) => {
    const sale = {
      id: `s${i}`,
      sale_datetime: isoDaysAgo(p.daysAgo),
      status: p.status ?? 'active',
      store_id: p.store ?? STORE_A,
    }
    sales.push(sale)
    lines.push({ id: `sl${i}`, sale_id: sale.id, product_id: p.product ?? PRODUCT_ID, qty: p.qty })
  })
}

function baseDb(): Database {
  return {
    app_settings: [
      { key: 'ai_forecast_window_days', value: '30' },
      { key: 'ai_forecast_min_days', value: '14' },
    ],
    locations: [
      { id: LOC_STORE_A, store_id: STORE_A },
      { id: 'a1000000-0000-0000-0000-000000000002', store_id: STORE_B },
    ],
    sales: [],
    sale_lines: [],
  }
}

describe('computeMovingAverageForecast (pure)', () => {
  it('returns insufficient_history when all points predate the window', () => {
    const stale: DemandHistoryPoint[] = [60, 61, 62].map((i) => ({
      date: isoDaysAgo(i).slice(0, 10),
      qty: 10,
    }))
    const res = computeMovingAverageForecast(stale, 7, 30)
    expect(res.insufficient_history).toBe(true)
    expect(res.predicted_demand).toBe(0)
    expect(res.model_used).toBe('deterministic-sma')
    expect(res.sourced_from_ai).toBe(false)
  })

  it('returns insufficient_history when history is empty', () => {
    const res = computeMovingAverageForecast([], 7, 30)
    expect(res.insufficient_history).toBe(true)
    expect(res.predicted_demand).toBe(0)
  })

  it('projects the daily mean over the horizon and rounds up', () => {
    const history = makeHistory(3, 10, 10) // qty 10, 20, 30 over 3 days -> mean 20
    const res = computeMovingAverageForecast(history, 7, 30)
    expect(res.insufficient_history).toBe(false)
    expect(res.predicted_demand).toBe(140)
    expect(res.reasoning).toContain('20.00/day')
  })

  it('clamps confidence at the 30-day coverage cap and multiplies by horizon', () => {
    const history = makeHistory(45, 5, 0) // all 45 recent days at qty 5
    const res = computeMovingAverageForecast(history, 10, 60)
    expect(res.predicted_demand).toBe(50)
    expect(res.confidence).toBe(1)
  })

  it('never predicts a negative quantity', () => {
    const res = computeMovingAverageForecast([{ date: isoDaysAgo(1).slice(0, 10), qty: 0 }], 7, 30)
    expect(res.predicted_demand).toBe(0)
  })
})

describe('demandForecast (through fake supabase)', () => {
  beforeEach(() => {
    resetFakeDb(baseDb())
  })

  it('returns null when there is no sales history at all', async () => {
    const res = await demandForecast({ productId: PRODUCT_ID, productName: 'Milk', skuCode: 'PGROC-004', horizonDays: 7 })
    expect(res).toBeNull()
  })

  it('uses the deterministic SMA when history is thinner than ai_forecast_min_days', async () => {
    const db = baseDb()
    seedSales([
      { daysAgo: 1, qty: 10 },
      { daysAgo: 2, qty: 20 },
      { daysAgo: 3, qty: 30 },
    ], db)
    resetFakeDb(db)

    const res = await demandForecast({ productId: PRODUCT_ID, productName: 'Milk', skuCode: 'PGROC-004', horizonDays: 7 })
    expect(res).not.toBeNull()
    expect(res?.sourced_from_ai).toBe(false)
    expect(res?.model_used).toBe('deterministic-sma')
  })

  it('calls Groq when history is sufficient and returns a validated forecast', async () => {
    const db = baseDb()
    db.app_settings = [
      { key: 'ai_forecast_window_days', value: '30' },
      { key: 'ai_forecast_min_days', value: '3' },
    ]
    seedSales([
      { daysAgo: 1, qty: 10 },
      { daysAgo: 2, qty: 20 },
      { daysAgo: 3, qty: 30 },
      { daysAgo: 4, qty: 5 },
    ], db)
    resetFakeDb(db)

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          choices: [{ message: { content: JSON.stringify({ predicted_demand: 42.6, reasoning: 'rising trend', confidence: 0.7 }) } }],
        }),
        text: async () => '',
      }),
    )

    const res = await demandForecast({ productId: PRODUCT_ID, productName: 'Milk', skuCode: 'PGROC-004', horizonDays: 7 })
    expect(res?.sourced_from_ai).toBe(true)
    expect(res?.predicted_demand).toBe(43) // Math.ceil(42.6)
    expect(res?.model_used).toContain('Groq')
    expect(res?.confidence).toBe(0.7)
  })

  it('falls back to the SMA when Groq fails (HTTP error)', async () => {
    const db = baseDb()
    db.app_settings = [
      { key: 'ai_forecast_window_days', value: '30' },
      { key: 'ai_forecast_min_days', value: '3' },
    ]
    seedSales([
      { daysAgo: 1, qty: 10 },
      { daysAgo: 2, qty: 20 },
      { daysAgo: 3, qty: 30 },
    ], db)
    resetFakeDb(db)

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({}), text: async () => '' }))

    const res = await demandForecast({ productId: PRODUCT_ID, productName: 'Milk', skuCode: 'PGROC-004', horizonDays: 7 })
    expect(res?.sourced_from_ai).toBe(false)
    expect(res?.model_used).toBe('deterministic-sma')
    expect(res?.predicted_demand).toBeGreaterThan(0)
  })

  it('falls back to the SMA when Groq returns an invalid forecast', async () => {
    const db = baseDb()
    db.app_settings = [
      { key: 'ai_forecast_window_days', value: '30' },
      { key: 'ai_forecast_min_days', value: '3' },
    ]
    seedSales([
      { daysAgo: 1, qty: 10 },
      { daysAgo: 2, qty: 20 },
      { daysAgo: 3, qty: 30 },
    ], db)
    resetFakeDb(db)

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ choices: [{ message: { content: JSON.stringify({ predicted_demand: -5, reasoning: 'oops' }) } }] }),
        text: async () => '',
      }),
    )

    const res = await demandForecast({ productId: PRODUCT_ID, productName: 'Milk', skuCode: 'PGROC-004', horizonDays: 7 })
    expect(res?.sourced_from_ai).toBe(false)
    expect(res?.model_used).toBe('deterministic-sma')
  })

  it('filters out non-active sales', async () => {
    const db = baseDb()
    seedSales([
      { daysAgo: 1, qty: 100 },
      { daysAgo: 2, qty: 100 },
      { daysAgo: 3, qty: 100, status: 'void' },
    ], db)
    resetFakeDb(db)

    const res = await demandForecast({ productId: PRODUCT_ID, productName: 'Milk', skuCode: 'PGROC-004', horizonDays: 7 })
    // only the two active days count -> mean 100/day -> 700 over 7 days
    expect(res?.predicted_demand).toBe(700)
  })

  it('narrows history to a single store when a locationId is given', async () => {
    const db = baseDb()
    seedSales([
      { daysAgo: 1, qty: 100, store: STORE_A },
      { daysAgo: 2, qty: 100, store: STORE_A },
      { daysAgo: 3, qty: 100, store: STORE_A },
      { daysAgo: 1, qty: 1, store: STORE_B },
    ], db)
    resetFakeDb(db)

    const res = await demandForecast({ productId: PRODUCT_ID, productName: 'Milk', skuCode: 'PGROC-004', locationId: LOC_STORE_A, horizonDays: 7 })
    // only the 3 x 100 (store A) rows count -> mean 100/day -> 700 over 7 days
    expect(res?.predicted_demand).toBe(700)
  })

  it('reads window/minDays from app_settings', async () => {
    const db = baseDb()
    db.app_settings = [
      { key: 'ai_forecast_window_days', value: '3' },
      { key: 'ai_forecast_min_days', value: '2' },
    ]
    seedSales([
      { daysAgo: 1, qty: 10 },
      { daysAgo: 2, qty: 20 },
      { daysAgo: 5, qty: 999 }, // outside the 3-day window -> ignored
    ], db)
    resetFakeDb(db)

    // 2 in-window days >= minDays(2), so groq would trigger; force the SMA
    // fallback deterministically by making fetch fail.
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({}), text: async () => '' }))

    const res = await demandForecast({ productId: PRODUCT_ID, productName: 'Milk', skuCode: 'PGROC-004', horizonDays: 7 })
    // only the two in-window days count -> mean 15/day -> ceil(105) = 105
    expect(res).not.toBeNull()
    expect(res?.sourced_from_ai).toBe(false)
    expect(res?.predicted_demand).toBe(105)
  })
})