import type { Database, Row } from '../fake-supabase'
import { LOC_A, LOC_B, P1, P2, P3 } from './inventory'

// Re-export the shared ids so route tests can import everything from this file.
export { LOC_A, LOC_B, P1, P2, P3 } from './inventory'

// Product ids not exported by the inventory fixtures.
export const P4 = 'd1000000-0000-0000-0000-000000000004' // 10000mAh Power Bank (non-perishable)
export const P6 = 'd1000000-0000-0000-0000-000000000006' // Masala Chips Multi-Pack (perishable)
export const P7 = 'd1000000-0000-0000-0000-000000000007' // Whole Wheat Bread 400g (perishable)

export const LOC_C = 'a1000000-0000-0000-0000-000000000003' // Store C — Thane
export const LOC_WH = 'a1000000-0000-0000-0000-000000000004' // Central Warehouse

// Store ids referenced by the users.store seed (dev-token scope testing).
export const STORE_A_ID = 'e1000000-0000-0000-0000-000000000001'
export const STORE_B_ID = 'e1000000-0000-0000-0000-000000000002'
export const STORE_C_ID = 'e1000000-0000-0000-0000-000000000003'

export const SUP_TECH = 'b1000000-0000-0000-0000-000000000001' // TechDistribute India Pvt. Ltd.
export const SUP_FRESH = 'b1000000-0000-0000-0000-000000000002' // FreshFoods Co.
export const SUP_BEV = 'b1000000-0000-0000-0000-000000000003' // BeverageMart Distributors

// Purchase orders (mirror the in-memory fallback seeds so both code paths agree).
export const PO1 = 'f1000000-0000-0000-0000-000000000001' // closed (warehouse)
export const PO2 = 'f1000000-0000-0000-0000-000000000002' // sent    -> Store A
export const PO3 = 'f1000000-0000-0000-0000-000000000003' // draft   -> Store B (ai_auto)
export const PO4 = 'f1000000-0000-0000-0000-000000000004' // sent    -> Store A (perishable line)
export const PO5 = 'f1000000-0000-0000-0000-000000000005' // received -> Store A

export const PO_L1 = 'e1000000-0000-0000-0000-000000000001' // PO1 line P1 60/60
export const PO_L2 = 'e1000000-0000-0000-0000-000000000002' // PO1 line P4 40/40
export const PO_L3 = 'e1000000-0000-0000-0000-000000000003' // PO2 line P1 30/0
export const PO_L4 = 'e1000000-0000-0000-0000-000000000004' // PO2 line P4 10/0
export const PO_L5 = 'e1000000-0000-0000-0000-000000000005' // PO3 line P6 25/0
export const PO_L6 = 'e1000000-0000-0000-0000-000000000006' // PO4 line P7 20/0
export const PO_L7 = 'e1000000-0000-0000-0000-000000000007' // PO5 line P1 30/30
export const PO_L8 = 'e1000000-0000-0000-0000-000000000008' // PO5 line P2 15/15

export const PO_REC_1 = 'r1000000-0000-0000-0000-000000000001' // receipt on PO1
export const PO_RL_1 = 'rl1000000-0000-0000-0000-000000000001'
export const PO_RL_2 = 'rl1000000-0000-0000-0000-000000000002'

export const ADMIN_ID = '00000000-0000-0000-0000-000000000001'
export const STORE_A_STAFF = '00000000-0000-0000-0000-000000000002'
export const STORE_B_SALES = '00000000-0000-0000-0000-000000000003'
export const SENIOR = '00000000-0000-0000-0000-000000000004'

function po(overrides: Partial<Row> & { id: string }): Row {
  return {
    po_number: 'PO-2026-0000',
    supplier_id: SUP_TECH,
    destination_id: LOC_A,
    source: 'manual',
    status: 'draft',
    order_date: '2026-09-01',
    expected_date: '2026-09-06',
    received_date: null,
    total_items: 1,
    total_qty_ordered: 10,
    total_qty_received: 0,
    total_cost: 0,
    created_by: ADMIN_ID,
    approved_by: null,
    approved_at: null,
    cancelled_by: null,
    cancelled_at: null,
    cancel_reason: null,
    ai_recommendation_id: null,
    notes: null,
    created_at: '2026-09-01T08:00:00.000Z',
    updated_at: '2026-09-01T08:00:00.000Z',
    ...overrides,
  }
}

function poLine(overrides: Partial<Row> & { id: string; po_id: string; product_id: string }): Row {
  return {
    qty_ordered: 10,
    qty_received: 0,
    unit_cost: 100,
    line_total: 1000,
    notes: null,
    created_at: '2026-09-01T08:00:00.000Z',
    updated_at: '2026-09-01T08:00:00.000Z',
    ...overrides,
  }
}

/** @returns a PurchaseOrder module DB (suppliers, locations, products, POs...). */
export function poDb(): Database {
  return {
    suppliers: [
      { id: SUP_TECH, name: 'TechDistribute India Pvt. Ltd.', code: 'SUP-TECH', lead_time_days: 5, email: 'rajesh@techdistribute.in', phone: '+91 98200 11001', status: 'active' },
      { id: SUP_FRESH, name: 'FreshFoods Co.', code: 'SUP-FRESH', lead_time_days: 2, email: 'priya@freshfoods.co', phone: '+91 98200 22002', status: 'active' },
      { id: SUP_BEV, name: 'BeverageMart Distributors', code: 'SUP-BEV', lead_time_days: 3, email: 'amit@beveragemart.in', phone: '+91 98200 33003', status: 'active' },
      { id: 'b1000000-0000-0000-0000-000000000004', name: 'CleanCare Supplies', code: 'SUP-CLEAN', lead_time_days: 4, email: 'neha@cleancare.co.in', phone: '+91 98200 44004', status: 'active' },
      { id: 'b1000000-0000-0000-0000-000000000005', name: 'StyleWear Wholesale', code: 'SUP-STYLE', lead_time_days: 7, email: 'ali@stylewear.in', phone: '+91 98200 55005', status: 'active' },
    ],
    locations: [
      { id: LOC_A, name: 'Store A — MG Road', code: 'STORE-A', type: 'store', city: 'Mumbai', store_id: STORE_A_ID },
      { id: LOC_B, name: 'Store B — Andheri', code: 'STORE-B', type: 'store', city: 'Mumbai', store_id: STORE_B_ID },
      { id: LOC_C, name: 'Store C — Thane', code: 'STORE-C', type: 'store', city: 'Thane', store_id: STORE_C_ID },
      { id: LOC_WH, name: 'Central Warehouse', code: 'WH-CENTRAL', type: 'warehouse', city: 'Mumbai', store_id: null },
    ],
    products: [
      { id: P1, name: 'USB-C Charging Cable 1m', sku_code: 'PELEC-001', is_perishable: false, cost_price: 120, category_id: 'c2000000-0000-0000-0000-000000000001', unit_id: 'u1' },
      { id: P2, name: 'Wireless Earbuds Pro', sku_code: 'PELEC-002', is_perishable: false, cost_price: 800, category_id: 'c2000000-0000-0000-0000-000000000002', unit_id: 'u1' },
      { id: P3, name: 'Phone Screen Protector', sku_code: 'PELEC-003', is_perishable: false, cost_price: 40, category_id: 'c2000000-0000-0000-0000-000000000001', unit_id: 'u1' },
      { id: P4, name: '10000mAh Power Bank', sku_code: 'PELEC-004', is_perishable: false, cost_price: 450, category_id: 'c2000000-0000-0000-0000-000000000002', unit_id: 'u1' },
      { id: 'd1000000-0000-0000-0000-000000000005', name: 'Premium Basmati Rice 5kg', sku_code: 'PGROC-001', is_perishable: false, cost_price: 280, category_id: 'c2000000-0000-0000-0000-000000000003', unit_id: 'u2' },
      { id: P6, name: 'Masala Chips Multi-Pack', sku_code: 'PGROC-002', is_perishable: true, cost_price: 80, category_id: 'c2000000-0000-0000-0000-000000000003', unit_id: 'u2' },
      { id: P7, name: 'Whole Wheat Bread 400g', sku_code: 'PGROC-003', is_perishable: true, cost_price: 25, category_id: 'c2000000-0000-0000-0000-000000000003', unit_id: 'u2' },
      { id: 'd1000000-0000-0000-0000-000000000010', name: 'Cola 500mL Can (12-pack)', sku_code: 'PBEV-001', is_perishable: false, cost_price: 180, category_id: 'c2000000-0000-0000-0000-000000000004', unit_id: 'u2' },
      { id: 'd1000000-0000-0000-0000-000000000014', name: 'Liquid Hand Soap 500mL', sku_code: 'PCARE-001', is_perishable: false, cost_price: 75, category_id: 'c2000000-0000-0000-0000-000000000005', unit_id: 'u1' },
    ],
    supplier_products: [
      { id: 'sp-1', supplier_id: SUP_TECH, product_id: P1, unit_cost: 120, lead_time_override: null, is_preferred: true },
      { id: 'sp-2', supplier_id: SUP_TECH, product_id: P2, unit_cost: 800, lead_time_override: 6, is_preferred: true },
      { id: 'sp-3', supplier_id: SUP_TECH, product_id: P3, unit_cost: 40, lead_time_override: null, is_preferred: true },
      { id: 'sp-4', supplier_id: SUP_TECH, product_id: P4, unit_cost: 450, lead_time_override: 5, is_preferred: true },
      { id: 'sp-5', supplier_id: SUP_FRESH, product_id: 'd1000000-0000-0000-0000-000000000005', unit_cost: 280, lead_time_override: null, is_preferred: true },
      { id: 'sp-6', supplier_id: SUP_FRESH, product_id: P6, unit_cost: 80, lead_time_override: 2, is_preferred: true },
      { id: 'sp-7', supplier_id: SUP_FRESH, product_id: P7, unit_cost: 25, lead_time_override: 1, is_preferred: true },
      { id: 'sp-8', supplier_id: SUP_BEV, product_id: 'd1000000-0000-0000-0000-000000000010', unit_cost: 180, lead_time_override: 3, is_preferred: true },
      { id: 'sp-9', supplier_id: 'b1000000-0000-0000-0000-000000000004', product_id: 'd1000000-0000-0000-0000-000000000014', unit_cost: 75, lead_time_override: 4, is_preferred: true },
    ],
    purchase_orders: [
      po({
        id: PO1,
        po_number: 'PO-2026-0001',
        source: 'manual',
        status: 'closed',
        destination_id: LOC_WH,
        order_date: '2026-08-15',
        expected_date: '2026-08-20',
        received_date: '2026-08-20',
        total_items: 2,
        total_qty_ordered: 100,
        total_qty_received: 100,
        total_cost: 28000,
        approved_by: ADMIN_ID,
        approved_at: '2026-08-15T10:00:00.000Z',
        notes: 'Warehouse quarterly restock of accessories.',
        created_at: '2026-08-15T09:00:00.000Z',
        updated_at: '2026-08-20T14:30:00.000Z',
      }),
      po({
        id: PO2,
        po_number: 'PO-2026-0002',
        source: 'manual',
        status: 'sent',
        order_date: '2026-09-06',
        expected_date: '2026-09-11',
        total_items: 2,
        total_qty_ordered: 40,
        total_cost: 13600,
        approved_by: ADMIN_ID,
        approved_at: '2026-09-06T11:00:00.000Z',
        notes: 'In-transit electronics replenishment for Store A.',
        created_at: '2026-09-06T10:30:00.000Z',
        updated_at: '2026-09-06T11:00:00.000Z',
      }),
      po({
        id: PO3,
        po_number: 'PO-2026-0003',
        supplier_id: SUP_FRESH,
        source: 'ai_auto',
        status: 'draft',
        destination_id: LOC_B,
        order_date: '2026-09-09',
        expected_date: '2026-09-11',
        total_items: 1,
        total_qty_ordered: 25,
        total_cost: 2000,
        created_by: null,
        notes: 'Auto-triggered reorder for Store B grocery stock.',
        created_at: '2026-09-09T08:00:00.000Z',
        updated_at: '2026-09-09T08:00:00.000Z',
      }),
      po({
        id: PO4,
        po_number: 'PO-2026-0004',
        supplier_id: SUP_FRESH,
        source: 'manual',
        status: 'sent',
        order_date: '2026-09-10',
        expected_date: '2026-09-12',
        total_items: 1,
        total_qty_ordered: 20,
        total_cost: 500,
        approved_by: ADMIN_ID,
        approved_at: '2026-09-10T09:00:00.000Z',
        notes: 'Bakery goods inbound for Store A.',
        created_at: '2026-09-10T08:30:00.000Z',
        updated_at: '2026-09-10T09:00:00.000Z',
      }),
      po({
        id: PO5,
        po_number: 'PO-2026-0005',
        source: 'manual',
        status: 'received',
        order_date: '2026-09-05',
        expected_date: '2026-09-09',
        received_date: '2026-09-09',
        total_items: 2,
        total_qty_ordered: 45,
        total_qty_received: 45,
        total_cost: 15600,
        approved_by: ADMIN_ID,
        approved_at: '2026-09-05T10:00:00.000Z',
        notes: 'Store A electronics restock.',
        created_at: '2026-09-05T09:00:00.000Z',
        updated_at: '2026-09-09T12:00:00.000Z',
      }),
    ],
    po_lines: [
      poLine({ id: PO_L1, po_id: PO1, product_id: P1, qty_ordered: 60, qty_received: 60, unit_cost: 120, line_total: 7200 }),
      poLine({ id: PO_L2, po_id: PO1, product_id: P4, qty_ordered: 40, qty_received: 40, unit_cost: 520, line_total: 20800 }),
      poLine({ id: PO_L3, po_id: PO2, product_id: P1, qty_ordered: 30, unit_cost: 120, line_total: 3600, created_at: '2026-09-06T10:30:00.000Z', updated_at: '2026-09-06T10:30:00.000Z' }),
      poLine({ id: PO_L4, po_id: PO2, product_id: P4, qty_ordered: 10, unit_cost: 1000, line_total: 10000, created_at: '2026-09-06T10:30:00.000Z', updated_at: '2026-09-06T10:30:00.000Z' }),
      poLine({ id: PO_L5, po_id: PO3, product_id: P6, qty_ordered: 25, unit_cost: 80, line_total: 2000, notes: 'Auto-replenish chips', created_at: '2026-09-09T08:00:00.000Z', updated_at: '2026-09-09T08:00:00.000Z' }),
      poLine({ id: PO_L6, po_id: PO4, product_id: P7, qty_ordered: 20, unit_cost: 25, line_total: 500, created_at: '2026-09-10T08:30:00.000Z', updated_at: '2026-09-10T08:30:00.000Z' }),
      poLine({ id: PO_L7, po_id: PO5, product_id: P1, qty_ordered: 30, qty_received: 30, unit_cost: 120, line_total: 3600, created_at: '2026-09-05T09:00:00.000Z', updated_at: '2026-09-09T12:00:00.000Z' }),
      poLine({ id: PO_L8, po_id: PO5, product_id: P2, qty_ordered: 15, qty_received: 15, unit_cost: 800, line_total: 12000, created_at: '2026-09-05T09:00:00.000Z', updated_at: '2026-09-09T12:00:00.000Z' }),
    ],
    po_receipts: [
      {
        id: PO_REC_1,
        po_id: PO1,
        received_by: ADMIN_ID,
        received_at: '2026-08-20T14:30:00.000Z',
        notes: 'All items checked and in perfect condition.',
        created_at: '2026-08-20T14:30:00.000Z',
      },
    ],
    po_receipt_lines: [
      { id: PO_RL_1, receipt_id: PO_REC_1, po_line_id: PO_L1, po_id: PO1, product_id: P1, qty_received: 60, earliest_expiry_date: null, created_at: '2026-08-20T14:30:00.000Z' },
      { id: PO_RL_2, receipt_id: PO_REC_1, po_line_id: PO_L2, po_id: PO1, product_id: P4, qty_received: 40, earliest_expiry_date: null, created_at: '2026-08-20T14:30:00.000Z' },
    ],
    inventory: [
      { id: 'inv-a-1', product_id: P1, location_id: LOC_A, qty_on_hand: 45, earliest_expiry_date: null },
      { id: 'inv-a-2', product_id: P4, location_id: LOC_A, qty_on_hand: 22, earliest_expiry_date: null },
    ],
    profiles: [
      { id: ADMIN_ID, email: 'admin@vaultory.internal', role: 'admin' },
      { id: STORE_A_STAFF, email: 'staff-a@vaultory.internal', role: 'store_staff', store_id: STORE_A_ID },
      { id: STORE_B_SALES, email: 'sales-b@vaultory.internal', role: 'sales_personnel', store_id: STORE_B_ID },
      { id: SENIOR, email: 'senior@vaultory.internal', role: 'senior_stakeholder' },
    ],
  }
}