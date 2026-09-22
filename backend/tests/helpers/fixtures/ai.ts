import type { Database, Row } from '../fake-supabase'
import { ADMIN, LOC_A, LOC_B, LOC_C, P1, P2, P3, STORE_A, inventoryDb } from './inventory'

export const SUP_A = 'b1000000-0000-0000-0000-000000000001'

// Seeded ai_recommendations rows (full rows — aiRecommendationSchema needs every column).
export const REC_R1 = '0000aaaa-0000-0000-0000-000000000001' // reorder_quantity / P3 / LOC_A / pending (no supplier)
export const REC_R2 = '0000aaaa-0000-0000-0000-000000000002' // reorder_quantity / P2 / LOC_A / pending (accept -> PO)
export const REC_R3 = '0000aaaa-0000-0000-0000-000000000003' // reorder_quantity / P2 / LOC_A / pending (modify -> PO)
export const REC_R4 = '0000aaaa-0000-0000-0000-000000000004' // reorder_quantity / P1 / LOC_A / pending (open PO branch)
export const REC_W = '0000aaaa-0000-0000-0000-000000000005' // warehouse_stock_level / P1 / LOC_C / pending
export const REC_W2 = '0000aaaa-0000-0000-0000-000000000006' // warehouse_stock_level / P1 / LOC_B / pending
export const REC_S = '0000aaaa-0000-0000-0000-000000000007' // safety_stock_suggest / P1 / LOC_A / pending
export const REC_D = '0000aaaa-0000-0000-0000-000000000008' // demand_forecast / P2 / LOC_A / accepted
export const REC_REJ = '0000aaaa-0000-0000-0000-000000000009' // reorder_quantity / P1 / LOC_B / pending (reject test)

const NOW = '2026-09-15T08:00:00.000Z'

function aiRec(overrides: Partial<Row>): Row {
  return {
    id: '0000aaaa-0000-0000-0000-000000000000',
    type: 'reorder_quantity',
    status: 'pending',
    product_id: P1,
    location_id: LOC_A,
    recommended_value: 100,
    current_value: 45,
    reasoning: 'Seed recommendation',
    model_used: 'deterministic-sma',
    confidence: 0.1,
    input_data: null,
    accepted_value: null,
    acted_on_by: null,
    acted_on_at: null,
    rejection_reason: null,
    resulting_po_id: null,
    expires_at: null,
    created_at: NOW,
    updated_at: NOW,
    ...overrides,
  }
}

/** Display defaults used for rows inserted through `insertRecommendation`. */
export const AI_REC_DEFAULTS: Row = {
  status: 'pending',
  accepted_value: null,
  acted_on_by: null,
  acted_on_at: null,
  rejection_reason: null,
  resulting_po_id: null,
  created_at: NOW,
  updated_at: NOW,
}

export function recommendedRows(): Row[] {
  return [
    aiRec({ id: REC_R1, type: 'reorder_quantity', product_id: P3, location_id: LOC_A, recommended_value: 300, current_value: 0, reasoning: 'Seed R1', confidence: 0.2 }),
    aiRec({ id: REC_R2, type: 'reorder_quantity', product_id: P2, location_id: LOC_A, recommended_value: 180, current_value: 12, reasoning: 'Seed R2', confidence: 0.1 }),
    aiRec({ id: REC_R3, type: 'reorder_quantity', product_id: P2, location_id: LOC_A, recommended_value: 180, current_value: 12, reasoning: 'Seed R3', confidence: 0.1 }),
    aiRec({ id: REC_R4, type: 'reorder_quantity', product_id: P1, location_id: LOC_A, recommended_value: 100, current_value: 45, reasoning: 'Seed R4 / open PO', confidence: 0.8 }),
    aiRec({ id: REC_W, type: 'warehouse_stock_level', product_id: P1, location_id: LOC_C, recommended_value: 250, current_value: 200, reasoning: 'Seed W', confidence: 0.9 }),
    aiRec({ id: REC_W2, type: 'warehouse_stock_level', product_id: P1, location_id: LOC_B, recommended_value: 90, current_value: 14, reasoning: 'Seed W2', confidence: 0.9 }),
    aiRec({ id: REC_S, type: 'safety_stock_suggest', product_id: P1, location_id: LOC_A, recommended_value: 40, current_value: 45, reasoning: 'Seed S', confidence: 0.7 }),
    aiRec({
      id: REC_D,
      type: 'demand_forecast',
      product_id: P2,
      location_id: LOC_A,
      status: 'accepted',
      recommended_value: 18,
      current_value: 12,
      reasoning: 'Seed D',
      accepted_value: 18,
      acted_on_by: ADMIN,
      acted_on_at: '2026-09-14T10:00:00.000Z',
      confidence: 0.5,
    }),
    aiRec({ id: REC_REJ, type: 'reorder_quantity', product_id: P1, location_id: LOC_B, recommended_value: 86, current_value: 14, reasoning: 'Seed REJ', confidence: 0.6 }),
  ]
}

/**
 * Base AI DB: inventory history (drives deterministic-SMA forecasts), mapped
 * supplier for P1/P2, per-location safety rules and 9 seeded recommendations.
 */
export function aiDb(): Database {
  const base = inventoryDb()
  return {
    ...base,
    app_settings: [
      { key: 'ai_forecast_window_days', value: '60' },
      { key: 'ai_forecast_min_days', value: '14' },
      { key: 'ai_default_lead_time_days', value: '7' },
      { key: 'ai_safety_buffer_pct', value: '0.2' },
    ],
    products: [
      { id: P1, name: 'USB-C Charging Cable 1m', sku_code: 'PELEC-001', default_safety_stock: 20, default_reorder_point: 30, default_target_level: 100, status: 'active', cost_price: 120, sale_price: 249 },
      { id: P2, name: 'Wireless Earbuds Pro', sku_code: 'PELEC-002', default_safety_stock: 5, default_reorder_point: 10, default_target_level: 40, status: 'active', cost_price: 800, sale_price: 1499 },
      { id: P3, name: 'Phone Screen Protector', sku_code: 'PELEC-003', default_safety_stock: 30, default_reorder_point: 50, default_target_level: 200, status: 'active', cost_price: 40, sale_price: 99 },
    ],
    locations: [
      { id: LOC_A, store_id: STORE_A, name: 'Store A — MG Road', type: 'store', status: 'active' },
      { id: LOC_B, store_id: 'aaaaaaaa-0000-0000-0000-000000000002', name: 'Store B — Andheri', type: 'store', status: 'active' },
      { id: LOC_C, store_id: STORE_A, name: 'Store A Back Office', type: 'warehouse', status: 'active' },
    ],
    inventory: [
      { id: 'ai-inv-1', product_id: P1, location_id: LOC_A, qty_on_hand: 45 },
      { id: 'ai-inv-2', product_id: P2, location_id: LOC_A, qty_on_hand: 12 },
      { id: 'ai-inv-3', product_id: P3, location_id: LOC_A, qty_on_hand: 0 },
      { id: 'ai-inv-4', product_id: P1, location_id: LOC_B, qty_on_hand: 14 },
      { id: 'ai-inv-5', product_id: P1, location_id: LOC_C, qty_on_hand: 200 },
    ],
    safety_stock_rules: [
      { id: 'r1', product_id: P1, location_id: null, safety_stock: 20, reorder_point: 30, target_level: 100, auto_order_enabled: true, auto_approve: false },
      { id: 'r2', product_id: P2, location_id: LOC_A, safety_stock: 5, reorder_point: 15, target_level: 30, auto_order_enabled: true, auto_approve: false },
      { id: 'r3', product_id: P3, location_id: LOC_A, safety_stock: 10, reorder_point: 50, target_level: 200, auto_order_enabled: true, auto_approve: false },
      { id: 'r4', product_id: P1, location_id: LOC_B, safety_stock: 0, reorder_point: 25, target_level: 80, auto_order_enabled: true, auto_approve: false },
    ],
    suppliers: [
      { id: SUP_A, name: 'ElectroTech Distributors', lead_time_days: 6 },
    ],
    supplier_products: [
      { id: 'sp-1', supplier_id: SUP_A, product_id: P1, is_preferred: true, unit_cost: 120, lead_time_override: null },
      { id: 'sp-2', supplier_id: SUP_A, product_id: P2, is_preferred: true, unit_cost: 800, lead_time_override: null },
    ],
    profiles: [{ id: ADMIN, email: 'admin@vaultory.internal', role: 'admin' }],
    purchase_orders: [],
    po_lines: [],
    sales: [
      { id: 'ai-sale-1', sale_datetime: '2026-09-10T10:00:00.000Z', status: 'active', store_id: STORE_A, total: 4000, total_qty: 70 },
    ],
    sale_lines: [
      { id: 'ai-sale-line-1', sale_id: 'ai-sale-1', product_id: P1, qty: 40 },
      { id: 'ai-sale-line-2', sale_id: 'ai-sale-1', product_id: P2, qty: 30 },
    ],
    ai_recommendations: recommendedRows(),
  }
}

/** aiDb + two open POs (P1 at LOC_A and LOC_B) for the "skip duplicate" paths. */
export function aiOpenPoDb(): Database {
  const db = aiDb()
  return {
    ...db,
    purchase_orders: [
      { id: 'po-1', po_number: 'PO-LOCA-001', status: 'draft', destination_id: LOC_A },
      { id: 'po-2', po_number: 'PO-LOCB-001', status: 'sent', destination_id: LOC_B },
    ],
    po_lines: [
      { id: 'pol-1', po_id: 'po-1', product_id: P1, qty_ordered: 10, qty_received: 0 },
      { id: 'pol-2', po_id: 'po-2', product_id: P1, qty_ordered: 20, qty_received: 5 },
    ],
  }
}