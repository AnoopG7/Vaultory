import type { Database, Row } from '../fake-supabase'
import { inventoryDb, P1, P2, P3 } from './inventory'

export const R_STORE_A = 'e1000000-0000-0000-0000-000000000001'
export const R_STORE_B = 'e1000000-0000-0000-0000-000000000002'

export const R_SALE_1 = 'rp-0001-0000-0000-0000-000000000001'
export const R_SALE_2 = 'rp-0002-0000-0000-0000-000000000002'
export const R_SALE_3 = 'rp-0003-0000-0000-0000-000000000003'

export function dailySummaryRows(): Row[] {
  return [
    {
      sale_date: '2026-08-20',
      store_id: R_STORE_A,
      store_name: 'Store A — MG Road',
      product_id: P1,
      product_name: 'USB-C Charging Cable 1m',
      sku_code: 'PELEC-001',
      units_sold: 2,
      sales_value: 498,
    },
    {
      sale_date: '2026-08-20',
      store_id: R_STORE_A,
      store_name: 'Store A — MG Road',
      product_id: P2,
      product_name: 'Wireless Earbuds Pro',
      sku_code: 'PELEC-002',
      units_sold: 1,
      sales_value: 1499,
    },
  ] as Row[]
}

export function storeRows(): Row[] {
  return [
    { id: R_STORE_A, name: 'Store A — MG Road', code: 'STORE-A', city: 'Mumbai' },
    { id: R_STORE_B, name: 'Store B — Andheri', code: 'STORE-B', city: 'Mumbai' },
  ] as Row[]
}

export function reportSalesRows(): Row[] {
  return [
    {
      id: R_SALE_1,
      store_id: R_STORE_A,
      sale_datetime: '2026-08-20T10:00:00+00:00',
      total: 1997,
      total_qty: 3,
      status: 'active',
    },
    {
      id: R_SALE_2,
      store_id: R_STORE_B,
      sale_datetime: '2026-09-05T12:00:00+00:00',
      total: 998,
      total_qty: 2,
      status: 'active',
    },
    {
      // voided — must be excluded from every report
      id: R_SALE_3,
      store_id: R_STORE_B,
      sale_datetime: '2026-09-05T13:00:00+00:00',
      total: 500,
      total_qty: 1,
      status: 'voided',
    },
  ] as Row[]
}

export function reportSaleLineRows(): Row[] {
  return [
    { sale_id: R_SALE_1, product_id: P1, qty: 2, line_total: 498 },
    { sale_id: R_SALE_1, product_id: P2, qty: 1, line_total: 1499 },
    { sale_id: R_SALE_2, product_id: P1, qty: 1, line_total: 498 },
    // product not present in the products table → embed fallback ('Product'/'SKU')
    { sale_id: R_SALE_2, product_id: P3, qty: 1, line_total: 500 },
  ] as Row[]
}

export function reportsDb(): Database {
  const db: Database = inventoryDb()
  db.daily_sales_summary = dailySummaryRows()
  db.stores = storeRows()
  db.sales = reportSalesRows()
  db.sale_lines = reportSaleLineRows()
  return db
}