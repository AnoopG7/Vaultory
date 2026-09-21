import type { Database, Row } from './fake-supabase'

/** A single `inventory_status` view row (matches the view's output columns). */
export interface InventoryViewRow {
  product_id: string
  location_id: string
  qty_on_hand: number
  earliest_expiry_date: string | null
  last_movement_at: string | null
  sku_code: string
  product_name: string
  sale_price: number
  cost_price: number
  product_status: 'active' | 'inactive' | 'archived'
  is_perishable: boolean
  category_id: string
  category_name: string
  unit_name: string
  location_name: string
  location_type: 'store' | 'warehouse'
  safety_stock: number
  reorder_point: number
  target_level: number
  auto_order_enabled: boolean
  stock_status: 'in_stock' | 'low' | 'out_of_stock' | 'over_stock'
}

export const P1 = 'd1000000-0000-0000-0000-000000000001'
export const P2 = 'd1000000-0000-0000-0000-000000000002'
export const P3 = 'd1000000-0000-0000-0000-000000000003'
export const LOC_A = 'a1000000-0000-0000-0000-000000000001'
export const LOC_B = 'a1000000-0000-0000-0000-000000000002'
export const LOC_C = 'a1000000-0000-0000-0000-000000000003'
export const STORE_A = 'aaaaaaaa-0000-0000-0000-000000000001'
export const STORE_B = 'aaaaaaaa-0000-0000-0000-000000000002'

export const ADMIN = '00000000-0000-0000-0000-000000000001'
export const DEV_ADMIN_TOKEN = 'dev-admin-token'
export const DEV_TOKEN = 'dev-token'

export function inventoryRows(): Row[] {
  return [
    {
      // in_stock at Store A
      product_id: P1,
      location_id: LOC_A,
      qty_on_hand: 45,
      earliest_expiry_date: null,
      last_movement_at: '2026-08-15T10:00:00Z',
      sku_code: 'PELEC-001',
      product_name: 'USB-C Charging Cable 1m',
      sale_price: 249,
      cost_price: 120,
      product_status: 'active',
      is_perishable: false,
      category_id: 'c2000000-0000-0000-0000-000000000001',
      category_name: 'Mobile Accessories',
      unit_name: 'Pieces',
      location_name: 'Store A — MG Road',
      location_type: 'store',
      safety_stock: 20,
      reorder_point: 30,
      target_level: 100,
      auto_order_enabled: true,
      stock_status: 'in_stock',
    },
    {
      // low at Store A
      product_id: P2,
      location_id: LOC_A,
      qty_on_hand: 8,
      earliest_expiry_date: null,
      last_movement_at: '2026-08-18T14:30:00Z',
      sku_code: 'PELEC-002',
      product_name: 'Wireless Earbuds Pro',
      sale_price: 1499,
      cost_price: 800,
      product_status: 'active',
      is_perishable: false,
      category_id: 'c2000000-0000-0000-0000-000000000002',
      category_name: 'Audio',
      unit_name: 'Pieces',
      location_name: 'Store A — MG Road',
      location_type: 'store',
      safety_stock: 5,
      reorder_point: 10,
      target_level: 40,
      auto_order_enabled: false,
      stock_status: 'low',
    },
    {
      // out_of_stock at Store A
      product_id: P3,
      location_id: LOC_A,
      qty_on_hand: 0,
      earliest_expiry_date: null,
      last_movement_at: '2026-08-20T09:15:00Z',
      sku_code: 'PELEC-003',
      product_name: 'Phone Screen Protector',
      sale_price: 99,
      cost_price: 40,
      product_status: 'active',
      is_perishable: false,
      category_id: 'c2000000-0000-0000-0000-000000000001',
      category_name: 'Mobile Accessories',
      unit_name: 'Pieces',
      location_name: 'Store A — MG Road',
      location_type: 'store',
      safety_stock: 30,
      reorder_point: 50,
      target_level: 200,
      auto_order_enabled: true,
      stock_status: 'out_of_stock',
    },
    {
      // in_stock at Store B
      product_id: P1,
      location_id: LOC_B,
      qty_on_hand: 22,
      earliest_expiry_date: null,
      last_movement_at: '2026-08-22T11:00:00Z',
      sku_code: 'PELEC-001',
      product_name: 'USB-C Charging Cable 1m',
      sale_price: 249,
      cost_price: 120,
      product_status: 'active',
      is_perishable: false,
      category_id: 'c2000000-0000-0000-0000-000000000001',
      category_name: 'Mobile Accessories',
      unit_name: 'Pieces',
      location_name: 'Store B — Andheri',
      location_type: 'store',
      safety_stock: 8,
      reorder_point: 15,
      target_level: 60,
      auto_order_enabled: false,
      stock_status: 'in_stock',
    },
  ] as Row[]
}

export function inventoryDb(): Database {
  return {
    inventory_status: inventoryRows(),
    products: [
      { id: P1, name: 'USB-C Charging Cable 1m', sku_code: 'PELEC-001', default_safety_stock: 20, default_reorder_point: 30, default_target_level: 100, status: 'active' },
      { id: P2, name: 'Wireless Earbuds Pro', sku_code: 'PELEC-002', default_safety_stock: 5, default_reorder_point: 10, default_target_level: 40, status: 'active' },
    ],
    locations: [
      { id: LOC_A, store_id: STORE_A, name: 'Store A — MG Road', type: 'store' },
      { id: LOC_B, store_id: STORE_B, name: 'Store B — Andheri', type: 'store' },
      { id: LOC_C, store_id: STORE_A, name: 'Store A Back Office', type: 'warehouse' },
    ],
    safety_stock_rules: [{ id: 'r1', product_id: P1, location_id: null, safety_stock: 20, reorder_point: 30, target_level: 100, auto_order_enabled: true }],
  }
}