import type { Database, Row } from '../fake-supabase'
import { LOC_A, P1, P2, P3, STORE_A, InventoryDb, inventoryDb } from './inventory'

export const SALE_1_ID = 's1000000-0000-0000-0000-000000000001'
export const SALE_2_ID = 's1000000-0000-0000-0000-000000000002'
export const SALE_LINE_1_ID = 'sl1000000-0000-0000-0000-000000000001'
export const SALE_LINE_2_ID = 'sl1000000-0000-0000-0000-000000000002'
export const RETURN_1_ID = 'ret1000000-0000-0000-0000-000000000001'

export interface SaleRow {
  id: string
  sale_number: string
  store_id: string
  sale_datetime: string
  total_items: number
  total_qty: number
  subtotal: number
  discount: number
  total: number
  status: 'active' | 'voided'
  notes: string | null
  voided_by: string | null
  voided_at: string | null
  void_reason: string | null
  created_at: string
}

export function saleRows(): Row[] {
  return [
    {
      id: SALE_1_ID,
      sale_number: 'SALE-2026-0100',
      store_id: STORE_A,
      sale_datetime: '2026-08-20T10:00:00Z',
      total_items: 2,
      total_qty: 3,
      subtotal: 1997,
      discount: 0,
      total: 1997,
      status: 'active',
      notes: 'walk-in customer',
      voided_by: null,
      voided_at: null,
      void_reason: null,
      created_at: '2026-08-20T10:00:00Z',
    },
    {
      id: SALE_2_ID,
      sale_number: 'SALE-2026-0099',
      store_id: STORE_A,
      sale_datetime: '2026-08-19T14:00:00Z',
      total_items: 1,
      total_qty: 2,
      subtotal: 498,
      discount: 0,
      total: 498,
      status: 'voided',
      notes: null,
      voided_by: null,
      voided_at: '2026-08-19T16:00:00Z',
      void_reason: 'customer returned at counter',
      created_at: '2026-08-19T14:00:00Z',
    },
  ] as Row[]
}

export function saleLineRows(): Row[] {
  return [
    {
      id: SALE_LINE_1_ID,
      sale_id: SALE_1_ID,
      product_id: P1,
      qty: 2,
      unit_price: 249,
      line_total: 498,
      created_at: '2026-08-20T10:00:00Z',
    },
    {
      id: SALE_LINE_2_ID,
      sale_id: SALE_1_ID,
      product_id: P2,
      qty: 1,
      unit_price: 1499,
      line_total: 1499,
      created_at: '2026-08-20T10:00:00Z',
    },
  ] as Row[]
}

export function salesDb(): Database {
  const db: Database = inventoryDb()
  db.inventory = [
    { product_id: P1, location_id: LOC_A, qty_on_hand: 45, reorder_point: 30, target_level: 100, product_status: 'active' },
    { product_id: P2, location_id: LOC_A, qty_on_hand: 8, reorder_point: 10, target_level: 40, product_status: 'active' },
    { product_id: P3, location_id: LOC_A, qty_on_hand: 0, reorder_point: 50, target_level: 200, product_status: 'active' },
  ]
  db.sales = saleRows()
  db.sale_lines = saleLineRows()
  db.sale_returns = []
  db.sale_return_lines = []
  return db
}

export const ADVISED_SALE_NUMBER = 'SALE-2026-0101'