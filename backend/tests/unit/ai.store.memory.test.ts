import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LOC_A, LOC_B, P1, P2, P3 } from '../helpers/fixtures/inventory'

// Same-store coverage of the mock fallback: SUPABASE_URL marked as mock makes
// `isMockSupabase` true, so every function takes its in-memory branch. Because
// the module graph is rebuilt in `beforeEach`, `memoryRecommendations`,
// `memoryRules`, `memoryInventory` and `memoryAlerts` are fresh for each test.

const M_LOC_B = LOC_B
const M_WAREHOUSE = 'a1000000-0000-0000-0000-000000000004'
const M_P7 = 'd1000000-0000-0000-0000-000000000007'

const ACTOR = { id: '00000000-0000-0000-0000-000000000001', email: 'admin@vaultory.com', role: 'admin' as const }

let store: typeof import('../../src/modules/ai/ai.store')
let alertsStore: typeof import('../../src/modules/alerts/alerts.store')

beforeEach(async () => {
  process.env.SUPABASE_URL = 'https://mock.supabase.co'
  vi.resetModules()
  store = await import('../../src/modules/ai/ai.store')
  alertsStore = await import('../../src/modules/alerts/alerts.store')
})

describe('generateReorderRecommendations (memory path)', () => {
  it('dry run scans the in-memory inventory', async () => {
    const res = await store.generateReorderRecommendations({ dryRun: true })

    expect(res.dry_run).toBe(true)
    expect(res.scanned_items_count).toBe(5)
    expect(res.potential_recommendations_count).toBe(3)

    // P2/LOC_A: 12 <= reorder 15 -> 30 - 12 = 18. No forecast in mock mode.
    const p2 = res.candidates.find((c) => c.product_id === P2 && c.location_id === LOC_A)
    expect(p2?.recommended_value).toBe(18)
    expect(p2?.forecast_prediction).toBeNull()
    expect(p2?.model_used).toBe('deterministic-sma')
    expect(p2?.auto_approve).toBe(false)
    expect(p2?.reasoning).toContain('No sufficient sales history; ordering 18 units')

    const p7 = res.candidates.find((c) => c.product_id === M_P7 && c.location_id === LOC_A)
    expect(p7?.product_name).toBe('Whole Wheat Bread 400g')
    expect(p7?.recommended_value).toBe(42) // target 60 - 18
    expect(p7?.supplier_id).toBe('b1000000-0000-0000-0000-000000000002')

    const p1LocB = res.candidates.find((c) => c.product_id === P1 && c.location_id === M_LOC_B)
    expect(p1LocB?.recommended_value).toBe(36) // target 50 - 14

    // No unmapped products (all products have memory suppliers) and no open POs
    // in mock mode.
    expect(res.unmapped_products).toHaveLength(0)
    expect(res.skipped_duplicates).toHaveLength(0)

    // P1/LOC_A has 45 on hand > reorder point 30, so it is skipped.
    expect(res.candidates.some((c) => c.product_id === P1 && c.location_id === LOC_A)).toBe(false)
  })

  it('persists recommendations and alerts in memory when not a dry run', async () => {
    const res = await store.generateReorderRecommendations({})

    expect(res.dry_run).toBe(false)
    expect(res.recommendations_created).toBe(3)
    expect(res.po_created).toBe(0)
    expect(res.created_recommendations).toHaveLength(3)

    expect(alertsStore.memoryAlerts).toHaveLength(3)
    expect(alertsStore.memoryAlerts[0].type).toBe('ai_recommendation')
    expect(alertsStore.memoryAlerts[0].title).toContain('Reorder suggestion')

    const listed = await store.listRecommendations({})
    expect(listed.total).toBe(3)
    expect(listed.summary).toEqual({ total: 3, pending: 3, accepted: 0, modified: 0, rejected: 0 })
  })

  it('filters in-memory recommendations', async () => {
    await store.generateReorderRecommendations({})

    expect((await store.listRecommendations({ productId: P2 })).recommendations).toHaveLength(1)
    expect((await store.listRecommendations({ type: 'reorder_quantity' })).recommendations).toHaveLength(3)
    expect((await store.listRecommendations({ status: 'pending' })).recommendations).toHaveLength(3)

    const page = await store.listRecommendations({ limit: 2, offset: 0, productId: M_P7 })
    expect(page.total).toBe(1)
    expect(page.recommendations[0].product_name).toBe('Whole Wheat Bread 400g')
  })
})

describe('insertRecommendation + getRecommendation (memory path)', () => {
  it('stores an enriched in-memory recommendation', async () => {
    const rec = await store.insertRecommendation({
      type: 'warehouse_stock_level',
      productId: P1,
      locationId: M_WAREHOUSE,
      recommendedValue: 60,
      currentValue: 200,
      reasoning: 'Replenish the central warehouse.',
      modelUsed: 'deterministic-sma',
      confidence: null,
    })

    expect(rec.status).toBe('pending')
    expect(rec.product_name).toBe('USB-C Charging Cable 1m')
    expect(rec.location_name).toBe('Central Warehouse')

    const found = await store.getRecommendation(rec.id)
    expect(found?.id).toBe(rec.id)
    expect(found?.recommended_value).toBe(60)
  })

  it('returns null for unknown ids', async () => {
    expect(await store.getRecommendation('0000aaaa-0000-0000-0000-00000000ffff')).toBeNull()
  })
})

describe('actOnRecommendation (memory path)', () => {
  async function makeReorder(productId: string, locationId: string, value: number) {
    return store.insertRecommendation({
      type: 'reorder_quantity',
      productId,
      locationId,
      recommendedValue: value,
      currentValue: 10,
      reasoning: 'Seeded via insertRecommendation for act tests.',
      confidence: 0.5,
    })
  }

  it('accepts a reorder recommendation (no PO in mock mode)', async () => {
    const rec = await makeReorder(P2, LOC_A, 18)
    const res = await store.actOnRecommendation(rec.id, ACTOR, 'accepted')

    expect(res.purchase_order).toBeNull()
    expect(res.recommendation.status).toBe('accepted')
    expect(res.recommendation.accepted_value).toBe(18)
    expect(await store.getRecommendation(rec.id)).toMatchObject({ status: 'accepted', accepted_value: 18 })
  })

  it('modifies a value before accepting (no side effects in mock mode)', async () => {
    const rec = await makeReorder(P2, LOC_A, 18)
    const res = await store.actOnRecommendation(rec.id, ACTOR, 'modified', 20)

    expect(res.recommendation.status).toBe('modified')
    expect(res.recommendation.accepted_value).toBe(20)
    expect(res.message).toContain('modified to 20 units')
  })

  it('rejects products without a mapped supplier (422)', async () => {
    const rec = await makeReorder(P3, LOC_A, 50)
    await expect(store.actOnRecommendation(rec.id, ACTOR, 'accepted')).rejects.toMatchObject({
      statusCode: 422,
      code: 'NO_SUPPLIER',
    })
  })

  it('applies a warehouse recommendation to memory rules', async () => {
    const rec = await store.insertRecommendation({
      type: 'warehouse_stock_level',
      productId: P1,
      locationId: M_WAREHOUSE,
      recommendedValue: 200,
      currentValue: 200,
      reasoning: 'Raise the warehouse target.',
      confidence: 0.9,
    })
    const res = await store.actOnRecommendation(rec.id, ACTOR, 'accepted')

    expect(res.recommendation.status).toBe('accepted')
    expect(res.message).toContain('applied to safety stock rules')
  })

  it('rejects already-acted and unknown recommendations', async () => {
    const rec = await makeReorder(P2, LOC_A, 18)
    await store.actOnRecommendation(rec.id, ACTOR, 'accepted')

    await expect(store.actOnRecommendation(rec.id, ACTOR, 'accepted')).rejects.toMatchObject({
      statusCode: 409,
      code: 'ALREADY_ACTED',
    })
    await expect(store.actOnRecommendation('0000aaaa-0000-0000-0000-00000000ffff', ACTOR)).rejects.toMatchObject({
      statusCode: 404,
      code: 'NOT_FOUND',
    })
  })
})

describe('rejectRecommendation (memory path)', () => {
  it('rejects a pending recommendation with a trimmed reason', async () => {
    const rec = await store.insertRecommendation({
      type: 'reorder_quantity',
      productId: P2,
      locationId: LOC_A,
      recommendedValue: 18,
      currentValue: 12,
      reasoning: 'Reject me.',
      confidence: 0.5,
    })
    const res = await store.rejectRecommendation(rec.id, ACTOR, '  Not needed  ')

    expect(res.recommendation.status).toBe('rejected')
    expect(res.recommendation.rejection_reason).toBe('Not needed')
  })

  it('rejects an already-acted recommendation', async () => {
    const rec = await store.insertRecommendation({
      type: 'reorder_quantity',
      productId: P2,
      locationId: LOC_A,
      recommendedValue: 18,
      currentValue: 12,
      reasoning: 'Reject me.',
      confidence: 0.5,
    })
    await store.actOnRecommendation(rec.id, ACTOR, 'accepted')
    await expect(store.rejectRecommendation(rec.id, ACTOR)).rejects.toMatchObject({ statusCode: 409 })
  })
})

describe('generateWarehouseRecommendations (memory path)', () => {
  it('uses the memory fallback warehouse and configured targets', async () => {
    const results = await store.generateWarehouseRecommendations()

    expect(results).toHaveLength(2)
    // P1 at the Central Warehouse has an existing P1 rule (target 60).
    const p1 = results.find((r) => r.product_id === P1)
    expect(p1?.location_name).toBe('Central Warehouse')
    expect(p1?.current_stock).toBe(200)
    expect(p1?.recommended_stock_level).toBe(60)
    expect(p1?.model_used).toBeNull()
    expect(p1?.reasoning).toContain('Insufficient sales history for a statistical forecast')

    const p2 = results.find((r) => r.product_id === P2)
    expect(p2?.recommended_stock_level).toBe(30)
  })
})

describe('createDemandForecastRecommendation (memory path)', () => {
  it('returns null forecast/recommendation when no sales history exists', async () => {
    const res = await store.createDemandForecastRecommendation({
      productId: P2,
      productName: 'Wireless Earbuds Pro',
      skuCode: 'PELEC-002',
      locationId: LOC_A,
      horizonDays: 6,
    })

    expect(res.forecast).toBeNull()
    expect(res.recommendation).toBeNull()
  })
})