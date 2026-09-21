import { beforeAll, describe, expect, it, vi } from 'vitest'
import { resetFakeDb } from '../helpers/fake-supabase'
import { reportsDb } from '../helpers/fixtures/reports'
import { P1, LOC_A } from '../helpers/fixtures/inventory'

// SUPABASE_URL marked as mock -> every function runs its pure in-memory branch
// against the seeded memorySales (SALE-2026-0001 on 2026-09-08, SALE-2026-0002
// on 2026-09-09, both in Store A / Store B for Q3 2026).
let R: typeof import('../../src/modules/reports/reports.store')
let memoryInventory: typeof import('../../src/modules/inventory/inventory.store').memoryInventory

const M_STORE_A = 'e1000000-0000-0000-0000-000000000001'
const M_STORE_B = 'e1000000-0000-0000-0000-000000000002'

beforeAll(async () => {
  process.env.SUPABASE_URL = 'https://mock.supabase.co'
  vi.resetModules()
  const reports = await import('../../src/modules/reports/reports.store')
  const inventory = await import('../../src/modules/inventory/inventory.store')
  R = reports
  memoryInventory = inventory.memoryInventory
  resetFakeDb(reportsDb())
})

describe('getDailySalesReport (memory path)', () => {
  it('aggregates the seeded sales for a given date', async () => {
    const res = await R.getDailySalesReport({ date: '2026-09-08' })
    expect(res.date).toBe('2026-09-08')
    expect(res.items).toHaveLength(2)
    expect(res.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ product_id: P1, units_sold: 2, sales_value: 498, store_id: M_STORE_A }),
        expect.objectContaining({ product_name: 'Wireless Earbuds Pro', sku_code: 'PELEC-002', units_sold: 1, sales_value: 1499 }),
      ]),
    )
    expect(res.summary).toEqual({ total_units_sold: 3, total_sales_value: 1997, transactions_count: 1 })
  })

  it('filters by store and date', async () => {
    const res = await R.getDailySalesReport({ date: '2026-09-09', storeId: M_STORE_B })
    expect(res.summary.transactions_count).toBe(1)
    expect(res.summary.total_units_sold).toBe(3)
    expect(res.summary.total_sales_value).toBe(1797) // line_total based, discount not applied

    const none = await R.getDailySalesReport({ date: '2026-09-08', storeId: M_STORE_B })
    expect(none.summary.transactions_count).toBe(0)
    expect(none.items).toHaveLength(0)
  })

  it('reports no transactions for a date with no sales', async () => {
    const res = await R.getDailySalesReport({ date: '2026-01-01' })
    expect(res.items).toHaveLength(0)
    expect(res.summary.total_sales_value).toBe(0)
  })

  it('derives product names from the shared memory inventory', async () => {
    const [p1row] = memoryInventory.filter((i) => i.product_id === P1)
    expect(p1row?.location_id).toBe(LOC_A)
  })
})

describe('getQuarterlySalesReport (memory path)', () => {
  it('builds the monthly and product breakdown for the seeded Q3 sales', async () => {
    const res = await R.getQuarterlySalesReport({ quarter: '2026-Q3' })
    expect(res.quarter).toBe('2026-Q3')
    const sept = res.monthly_breakdown.find((m) => m.month === '2026-09')
    expect(sept).toMatchObject({ label: 'September', orders_count: 2, units_sold: 6, sales_value: 3694 })
    expect(res.summary).toMatchObject({ orders_count: 2, total_units_sold: 6, total_sales_value: 3694 })
    expect(res.product_breakdown).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ product_id: P1, sales_value: 498, units_sold: 2 }),
        expect.objectContaining({ product_name: 'Phone Screen Protector', sku_code: 'PELEC-003', sales_value: 1797, units_sold: 3 }),
      ]),
    )
  })

  it('filters by store', async () => {
    const res = await R.getQuarterlySalesReport({ quarter: '2026-Q3', storeId: M_STORE_B })
    expect(res.summary.orders_count).toBe(1)
    expect(res.summary.total_sales_value).toBe(1697)
  })

  it('treats an invalid quarter string as Q1 of the parsed year', async () => {
    const res = await R.getQuarterlySalesReport({ quarter: '2026-invalid' })
    expect(res.date_range).toEqual({ from: '2026-01-01', to: '2026-03-31' })
    expect(res.summary.orders_count).toBe(0)
  })
})

describe('getYearlySalesReport (memory path)', () => {
  it('computes the yearly totals and monthly average', async () => {
    const res = await R.getYearlySalesReport({ year: 2026 })
    expect(res.year).toBe(2026)
    const sept = res.monthly_breakdown.find((m) => m.month === '2026-09')
    expect(sept).toMatchObject({ label: 'Sep', orders_count: 2, sales_value: 3694 })
    expect(res.summary).toMatchObject({
      orders_count: 2,
      total_units_sold: 6,
      total_sales_value: 3694,
      average_monthly_sales: 307.83,
    })
  })

  it('returns all-zero months outside the sale window', async () => {
    const res = await R.getYearlySalesReport({ year: 2020 })
    expect(res.monthly_breakdown).toHaveLength(12)
    expect(res.summary).toMatchObject({ total_sales_value: 0, average_monthly_sales: 0 })
  })
})

describe('getStorePerformanceReport (memory path)', () => {
  it('ranks the seeded stores by revenue', async () => {
    const res = await R.getStorePerformanceReport({})
    expect(res.stores).toHaveLength(3)
    expect(res.stores[0]).toMatchObject({ store_name: 'Store A — MG Road', total_orders: 1, total_sales_value: 1997, average_order_value: 1997 })
    expect(res.comparison).toMatchObject({ best_performing_store: 'Store A — MG Road', total_revenue: 3694, average_store_revenue: 1231.33 })
    expect(res.summary).toMatchObject({ total_orders: 2, total_units_sold: 6 })
  })

  it('limits the analysis to one store', async () => {
    const res = await R.getStorePerformanceReport({ storeId: M_STORE_B })
    expect(res.stores).toHaveLength(1)
    expect(res.stores[0]).toMatchObject({ store_code: 'STORE-B', total_sales_value: 1697, average_order_value: 1697 })
  })

  it('returns an empty comparison when no stores are analysed', async () => {
    const res = await R.getStorePerformanceReport({ storeId: 'e1000000-0000-0000-0000-000000000099' })
    expect(res.stores).toHaveLength(0)
    expect(res.comparison).toMatchObject({ best_performing_store: null, total_revenue: 0, average_store_revenue: 0 })
  })
})