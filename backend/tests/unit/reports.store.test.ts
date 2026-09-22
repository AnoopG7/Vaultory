import { beforeEach, describe, expect, it } from 'vitest'
import { resetFakeDb } from '../helpers/fake-supabase'
import {
  getDailySalesReport,
  getQuarterlySalesReport,
  getYearlySalesReport,
  getStorePerformanceReport,
} from '../../src/modules/reports/reports.store'
import { reportsDb, R_STORE_A, R_STORE_B } from '../helpers/fixtures/reports'
import { P1, P2, P3 } from '../helpers/fixtures/inventory'

beforeEach(() => {
  resetFakeDb(reportsDb())
})

describe('getDailySalesReport (db path)', () => {
  it('aggregates the daily_sales_summary view with matching summary totals', async () => {
    const res = await getDailySalesReport({ date: '2026-08-20' })
    expect(res.date).toBe('2026-08-20')
    expect(res.items).toHaveLength(2)
    expect(res.items[0]).toMatchObject({
      store_id: R_STORE_A,
      product_id: P1,
      sku_code: 'PELEC-001',
      units_sold: 2,
      sales_value: 498,
    })
    expect(res.summary).toMatchObject({ total_units_sold: 3, total_sales_value: 1997, transactions_count: 2 })
  })

  it('filters the view rows by store and product', async () => {
    const byStore = await getDailySalesReport({ date: '2026-08-20', storeId: R_STORE_A })
    expect(byStore.items).toHaveLength(2)

    const byProduct = await getDailySalesReport({ date: '2026-08-20', productId: P2 })
    expect(byProduct.items).toHaveLength(1)
    expect(byProduct.items[0].sales_value).toBe(1499)
    expect(byProduct.summary.total_units_sold).toBe(1)

    const both = await getDailySalesReport({ date: '2026-08-20', storeId: R_STORE_A, productId: P1 })
    expect(both.items).toHaveLength(1)
  })

  it('returns an empty report for a date without data', async () => {
    const res = await getDailySalesReport({ date: '2026-01-01' })
    expect(res.items).toHaveLength(0)
    expect(res.summary).toEqual({ total_units_sold: 0, total_sales_value: 0, transactions_count: 0 })
  })
})

describe('getQuarterlySalesReport (db path)', () => {
  it('builds the monthly breakdown, product breakdown, and summary for 2026-Q3', async () => {
    const res = await getQuarterlySalesReport({ quarter: '2026-Q3' })
    expect(res.quarter).toBe('2026-Q3')
    expect(res.date_range).toEqual({ from: '2026-07-01', to: '2026-09-30' })

    const byMonth = Object.fromEntries(res.monthly_breakdown.map((m) => [m.month, m]))
    expect(byMonth['2026-07']).toMatchObject({ units_sold: 0, sales_value: 0, orders_count: 0 })
    expect(byMonth['2026-08']).toMatchObject({ units_sold: 3, sales_value: 1997, orders_count: 1 })
    expect(byMonth['2026-09']).toMatchObject({ units_sold: 2, sales_value: 998, orders_count: 1 })

    expect(res.product_breakdown).toEqual([
      { product_id: P2, product_name: 'Wireless Earbuds Pro', sku_code: 'PELEC-002', units_sold: 1, sales_value: 1499 },
      { product_id: P1, product_name: 'USB-C Charging Cable 1m', sku_code: 'PELEC-001', units_sold: 3, sales_value: 996 },
      // P3 has no products row → generic fallback labels
      { product_id: P3, product_name: 'Product', sku_code: 'SKU', units_sold: 1, sales_value: 500 },
    ])
    expect(res.summary).toMatchObject({ total_units_sold: 5, total_sales_value: 2995, orders_count: 2 })
  })

  it('filters by store and falls back to generic labels for unknown products', async () => {
    const res = await getQuarterlySalesReport({ quarter: '2026-Q3', storeId: R_STORE_B })
    expect(res.summary.orders_count).toBe(1)
    expect(res.summary.total_sales_value).toBe(998)
    const p1 = res.product_breakdown.find((p) => p.product_id === P1)
    expect(p1).toMatchObject({ sales_value: 498, units_sold: 1 })
  })
})

describe('getYearlySalesReport (db path)', () => {
  it('fills all twelve months and computes the yearly summary for 2026', async () => {
    const res = await getYearlySalesReport({ year: 2026 })
    expect(res.year).toBe(2026)
    expect(res.monthly_breakdown).toHaveLength(12)
    const sept = res.monthly_breakdown.find((m) => m.month === '2026-09')
    expect(sept).toMatchObject({ label: 'Sep', orders_count: 1, units_sold: 2, sales_value: 998 })
    expect(res.summary).toMatchObject({
      total_units_sold: 5,
      total_sales_value: 2995,
      orders_count: 2,
      average_monthly_sales: 249.58,
    })
  })

  it('filters by store', async () => {
    const res = await getYearlySalesReport({ year: 2026, storeId: R_STORE_B })
    expect(res.summary).toMatchObject({ orders_count: 1, total_sales_value: 998, total_units_sold: 2 })
  })

  it('returns zeros for a year without sales', async () => {
    const res = await getYearlySalesReport({ year: 2020 })
    expect(res.summary).toMatchObject({ total_sales_value: 0, orders_count: 0, average_monthly_sales: 0 })
  })
})

describe('getStorePerformanceReport (db path)', () => {
  it('ranks stores by revenue and reports comparison + summary', async () => {
    const res = await getStorePerformanceReport({})
    expect(res.stores).toHaveLength(2)
    expect(res.stores[0]).toMatchObject({
      store_id: R_STORE_A,
      store_name: 'Store A — MG Road',
      store_code: 'STORE-A',
      total_sales_value: 1997,
      total_units_sold: 3,
      total_orders: 1,
      average_order_value: 1997,
    })
    expect(res.stores[1]).toMatchObject({ store_name: 'Store B — Andheri', total_sales_value: 998, average_order_value: 998 })
    expect(res.comparison).toMatchObject({
      best_performing_store: 'Store A — MG Road',
      total_revenue: 2995,
      average_store_revenue: 1497.5,
    })
    expect(res.summary).toMatchObject({ total_revenue: 2995, total_orders: 2, total_units_sold: 5 })
  })

  it('limits sales to a single store (store rows still list all stores)', async () => {
    const onlyA = await getStorePerformanceReport({ storeId: R_STORE_A })
    // the db path lists every store row; the storeId filter only scopes the sales
    expect(onlyA.stores).toHaveLength(2)
    const a = onlyA.stores.find((s) => s.store_id === R_STORE_A)
    const b = onlyA.stores.find((s) => s.store_id === R_STORE_B)
    expect(a?.total_sales_value).toBe(1997)
    expect(b?.total_sales_value).toBe(0)
    expect(b?.average_order_value).toBe(0)
  })

  it('applies a date window to the sales', async () => {
    const windowed = await getStorePerformanceReport({ from: '2026-09-01T00:00:00Z' })
    const a = windowed.stores.find((s) => s.store_id === R_STORE_A)
    const b = windowed.stores.find((s) => s.store_id === R_STORE_B)
    expect(a?.total_orders).toBe(0)
    expect(b?.total_orders).toBe(1)
    expect(windowed.summary.total_revenue).toBe(998)
  })
})