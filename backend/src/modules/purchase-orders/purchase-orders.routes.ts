import { Router } from 'express'
import { env, supabase } from '../../config/index.js'
import {
  AppError,
  asyncHandler,
  requireAuth,
  validate,
  validated,
} from '../../middleware/index.js'

import {
  autoTriggerReorderSchema,
  createPurchaseOrderSchema,
  listPurchaseOrdersQuerySchema,
  poIdParamSchema,
  receivePurchaseOrderSchema,
  updatePoStatusSchema,
} from '../../lib/schemas/purchase-orders.js'

const router = Router()

// RBAC: Roles allowed to manage POs (BRD §12: admin, store_staff)
const PO_MANAGE_ROLES = ['admin', 'store_staff']

function assertCanManagePo(role: string | undefined): void {
  if (!role || !PO_MANAGE_ROLES.includes(role)) {
    throw new AppError(403, 'You do not have permission to manage purchase orders', 'FORBIDDEN')
  }
}

// Returns the location IDs belonging to a store. Used to scope `store_staff`
// PO reads/writes to their own store (a PO's store is its destination).
async function getStoreLocationIds(storeId: string): Promise<string[]> {
  const { data } = await supabase
    .from('locations')
    .select('id')
    .eq('store_id', storeId)
  if (!data) {
    const fallback = STORE_LOCATION_MAP[storeId]
    return fallback ? [fallback] : []
  }
  return data.map((l) => l.id as string)
}

// All locations across the seeded stores (mirrors STORE_LOCATIONS in sales).
const STORE_LOCATION_MAP: Record<string, string> = {
  'e1000000-0000-0000-0000-000000000001': 'a1000000-0000-0000-0000-000000000001',
  'e1000000-0000-0000-0000-000000000002': 'a1000000-0000-0000-0000-000000000002',
  'e1000000-0000-0000-0000-000000000003': 'a1000000-0000-0000-0000-000000000003',
}

// DB-backed deployments (real Supabase URL): every operation below targets the
// DB directly. The in-memory stores are only the fallback for mock/local URLs.
const isMockSupabase = !env.SUPABASE_URL || env.SUPABASE_URL.includes('mock') || env.SUPABASE_URL.includes('localhost')

// Load a PO from the DB and shape it like enrichPurchaseOrder() (used by the
// DB-backed list/detail/status/receive paths so responses stay identical).
interface DbPoLineRow {
  id: string
  po_id: string
  product_id: string
  qty_ordered: number
  qty_received: number
  unit_cost: number
  line_total: number
  notes: string | null
  created_at: string
  updated_at: string
  products?: { name?: string; sku_code?: string }
}
interface SnapshotLine {
  id: string
  po_id: string
  product_id: string
  qty_ordered: number
  qty_received: number
  unit_cost: number
  line_total: number
  notes: string | null
  created_at: string
  updated_at: string
  product_name: string
  sku_code: string
  remaining_qty: number
}
interface PoSnapshot {
  id: string
  po_number: string
  supplier_id: string
  destination_id: string
  source: string
  status: string
  order_date: string
  expected_date: string | null
  received_date: string | null
  total_items: number
  total_qty_ordered: number
  total_qty_received: number
  total_cost: number
  created_by: string | null
  notes: string | null
  created_at: string
  supplier: { name?: string; code?: string; lead_time_days?: number; email?: string; phone?: string }
  destination: { name?: string; code?: string; type?: string; city?: string }
  lines: SnapshotLine[]
  fulfillment_percentage: number
}
async function fetchPoSnapshot(id: string): Promise<PoSnapshot | null> {
  const { data: po, error } = await supabase
    .from('purchase_orders')
    .select(`
      *,
      suppliers(name, code, lead_time_days, email, phone),
      locations(name, code, type, city),
      po_lines(*, products(name, sku_code, category_id, unit_id, is_perishable))
    `)
    .eq('id', id)
    .maybeSingle()
  if (error || !po) return null

  const { po_lines, suppliers, locations, ...rest } = po
  const lines: SnapshotLine[] = (po_lines ?? ([] as DbPoLineRow[])).map((l: DbPoLineRow) => ({
    ...l,
    product_name: l.products?.name ?? 'Product',
    sku_code: l.products?.sku_code ?? 'SKU',
    remaining_qty: Math.max(0, Number(l.qty_ordered) - Number(l.qty_received)),
  }))
  return {
    ...rest,
    supplier: suppliers,
    destination: locations,
    lines,
    fulfillment_percentage: Number(rest.total_qty_ordered) > 0
      ? Number(((Number(rest.total_qty_received) / Number(rest.total_qty_ordered)) * 100).toFixed(1))
      : 0,
  } as PoSnapshot
}

// -----------------------------------------------------------------------------
// IN-MEMORY FALLBACK STORE (Dev / Local Supabase fallback)
// -----------------------------------------------------------------------------

interface LocalPoLine {
  id: string
  po_id: string
  product_id: string
  qty_ordered: number
  qty_received: number
  unit_cost: number
  line_total: number
  notes?: string | null
  created_at: string
  updated_at: string
}

interface LocalPurchaseOrder {
  id: string
  po_number: string
  supplier_id: string
  destination_id: string
  source: 'manual' | 'ai_auto'
  status: 'draft' | 'sent' | 'partially_received' | 'received' | 'closed' | 'cancelled'
  order_date: string
  expected_date: string | null
  received_date: string | null
  total_items: number
  total_qty_ordered: number
  total_qty_received: number
  total_cost: number
  created_by: string | null
  approved_by?: string | null
  approved_at?: string | null
  cancelled_by?: string | null
  cancelled_at?: string | null
  cancel_reason?: string | null
  ai_recommendation_id?: string | null
  notes?: string | null
  created_at: string
  updated_at: string
}

interface LocalPoReceipt {
  id: string
  po_id: string
  received_by: string | null
  received_at: string
  notes?: string | null
  created_at: string
}

interface LocalPoReceiptLine {
  id: string
  receipt_id: string
  po_line_id: string
  po_id: string
  product_id: string
  qty_received: number
  earliest_expiry_date?: string | null
  created_at: string
}

interface LocalInventoryRow {
  product_id: string
  location_id: string
  qty_on_hand: number
  earliest_expiry_date: string | null
}

interface LocalSafetyStockRule {
  product_id: string
  location_id: string
  safety_stock: number
  reorder_point: number
  target_level: number
  auto_order_enabled: boolean
}

// Master references from seed.sql
const memoryLocations: Record<string, { name: string; code: string; type: 'store' | 'warehouse'; city: string }> = {
  'a1000000-0000-0000-0000-000000000001': { name: 'Store A — MG Road', code: 'STORE-A', type: 'store', city: 'Mumbai' },
  'a1000000-0000-0000-0000-000000000002': { name: 'Store B — Andheri', code: 'STORE-B', type: 'store', city: 'Mumbai' },
  'a1000000-0000-0000-0000-000000000003': { name: 'Store C — Thane', code: 'STORE-C', type: 'store', city: 'Thane' },
  'a1000000-0000-0000-0000-000000000004': { name: 'Central Warehouse', code: 'WH-CENTRAL', type: 'warehouse', city: 'Mumbai' },
}

const memorySuppliersList: Record<string, { name: string; code: string; lead_time_days: number; email: string; phone: string }> = {
  'b1000000-0000-0000-0000-000000000001': { name: 'TechDistribute India Pvt. Ltd.', code: 'SUP-TECH', lead_time_days: 5, email: 'rajesh@techdistribute.in', phone: '+91 98200 11001' },
  'b1000000-0000-0000-0000-000000000002': { name: 'FreshFoods Co.', code: 'SUP-FRESH', lead_time_days: 2, email: 'priya@freshfoods.co', phone: '+91 98200 22002' },
  'b1000000-0000-0000-0000-000000000003': { name: 'BeverageMart Distributors', code: 'SUP-BEV', lead_time_days: 3, email: 'amit@beveragemart.in', phone: '+91 98200 33003' },
  'b1000000-0000-0000-0000-000000000004': { name: 'CleanCare Supplies', code: 'SUP-CLEAN', lead_time_days: 4, email: 'neha@cleancare.co.in', phone: '+91 98200 44004' },
  'b1000000-0000-0000-0000-000000000005': { name: 'StyleWear Wholesale', code: 'SUP-STYLE', lead_time_days: 7, email: 'ali@stylewear.in', phone: '+91 98200 55005' },
}

// Exported so the products module can keep this mock catalog in sync
// (label/data freshness only; purchase-order business logic is unchanged).
export const memoryProductsList: Record<string, {
  name: string
  sku_code: string
  category: string
  unit: string
  cost_price: number
  sale_price: number
  default_safety_stock: number
  default_reorder_point: number
  default_target_level: number
  is_perishable: boolean
  shelf_life_days: number | null
}> = {
  'd1000000-0000-0000-0000-000000000001': { name: 'USB-C Charging Cable 1m', sku_code: 'PELEC-001', category: 'Electronics', unit: 'pcs', cost_price: 120, sale_price: 299, default_safety_stock: 15, default_reorder_point: 30, default_target_level: 60, is_perishable: false, shelf_life_days: null },
  'd1000000-0000-0000-0000-000000000002': { name: 'Wireless Earbuds Pro', sku_code: 'PELEC-002', category: 'Electronics', unit: 'pcs', cost_price: 800, sale_price: 1999, default_safety_stock: 8, default_reorder_point: 15, default_target_level: 30, is_perishable: false, shelf_life_days: null },
  'd1000000-0000-0000-0000-000000000003': { name: 'Phone Screen Protector', sku_code: 'PELEC-003', category: 'Electronics', unit: 'pcs', cost_price: 40, sale_price: 149, default_safety_stock: 30, default_reorder_point: 60, default_target_level: 120, is_perishable: false, shelf_life_days: null },
  'd1000000-0000-0000-0000-000000000004': { name: '10000mAh Power Bank', sku_code: 'PELEC-004', category: 'Electronics', unit: 'pcs', cost_price: 450, sale_price: 999, default_safety_stock: 10, default_reorder_point: 20, default_target_level: 40, is_perishable: false, shelf_life_days: null },
  'd1000000-0000-0000-0000-000000000005': { name: 'Premium Basmati Rice 5kg', sku_code: 'PGROC-001', category: 'Grocery', unit: 'pack', cost_price: 280, sale_price: 450, default_safety_stock: 20, default_reorder_point: 35, default_target_level: 70, is_perishable: false, shelf_life_days: 365 },
  'd1000000-0000-0000-0000-000000000006': { name: 'Masala Chips Multi-Pack', sku_code: 'PGROC-002', category: 'Grocery', unit: 'pack', cost_price: 80, sale_price: 120, default_safety_stock: 25, default_reorder_point: 50, default_target_level: 100, is_perishable: true, shelf_life_days: 90 },
  'd1000000-0000-0000-0000-000000000007': { name: 'Whole Wheat Bread 400g', sku_code: 'PGROC-003', category: 'Grocery', unit: 'pack', cost_price: 25, sale_price: 45, default_safety_stock: 15, default_reorder_point: 30, default_target_level: 60, is_perishable: true, shelf_life_days: 5 },
  'd1000000-0000-0000-0000-000000000008': { name: 'Full Cream Milk 1L', sku_code: 'PGROC-004', category: 'Dairy', unit: 'L', cost_price: 52, sale_price: 68, default_safety_stock: 20, default_reorder_point: 40, default_target_level: 80, is_perishable: true, shelf_life_days: 7 },
  'd1000000-0000-0000-0000-000000000009': { name: 'Greek Yogurt 400g', sku_code: 'PGROC-005', category: 'Dairy', unit: 'cup', cost_price: 65, sale_price: 95, default_safety_stock: 10, default_reorder_point: 20, default_target_level: 40, is_perishable: true, shelf_life_days: 21 },
  'd1000000-0000-0000-0000-000000000010': { name: 'Cola 500mL Can (12-pack)', sku_code: 'PBEV-001', category: 'Beverages', unit: 'pack', cost_price: 180, sale_price: 300, default_safety_stock: 15, default_reorder_point: 30, default_target_level: 60, is_perishable: false, shelf_life_days: 180 },
  'd1000000-0000-0000-0000-000000000014': { name: 'Liquid Hand Soap 500mL', sku_code: 'PCARE-001', category: 'Personal Care', unit: 'bottle', cost_price: 75, sale_price: 129, default_safety_stock: 15, default_reorder_point: 25, default_target_level: 50, is_perishable: false, shelf_life_days: 730 },
}

// Supplier product mappings (preferred supplier & unit cost)
const memorySupplierProducts: Array<{
  supplier_id: string
  product_id: string
  unit_cost: number
  lead_time_override: number | null
  is_preferred: boolean
}> = [
  { supplier_id: 'b1000000-0000-0000-0000-000000000001', product_id: 'd1000000-0000-0000-0000-000000000001', unit_cost: 120, lead_time_override: null, is_preferred: true },
  { supplier_id: 'b1000000-0000-0000-0000-000000000001', product_id: 'd1000000-0000-0000-0000-000000000002', unit_cost: 800, lead_time_override: 6, is_preferred: true },
  { supplier_id: 'b1000000-0000-0000-0000-000000000001', product_id: 'd1000000-0000-0000-0000-000000000003', unit_cost: 40, lead_time_override: null, is_preferred: true },
  { supplier_id: 'b1000000-0000-0000-0000-000000000001', product_id: 'd1000000-0000-0000-0000-000000000004', unit_cost: 450, lead_time_override: 5, is_preferred: true },
  { supplier_id: 'b1000000-0000-0000-0000-000000000002', product_id: 'd1000000-0000-0000-0000-000000000005', unit_cost: 280, lead_time_override: null, is_preferred: true },
  { supplier_id: 'b1000000-0000-0000-0000-000000000002', product_id: 'd1000000-0000-0000-0000-000000000006', unit_cost: 80, lead_time_override: 2, is_preferred: true },
  { supplier_id: 'b1000000-0000-0000-0000-000000000002', product_id: 'd1000000-0000-0000-0000-000000000007', unit_cost: 25, lead_time_override: 1, is_preferred: true },
  { supplier_id: 'b1000000-0000-0000-0000-000000000003', product_id: 'd1000000-0000-0000-0000-000000000010', unit_cost: 180, lead_time_override: 3, is_preferred: true },
  { supplier_id: 'b1000000-0000-0000-0000-000000000004', product_id: 'd1000000-0000-0000-0000-000000000014', unit_cost: 75, lead_time_override: 4, is_preferred: true },
]

// Mutable in-memory inventory store
const memoryInventory: LocalInventoryRow[] = [
  // Store A (MG Road)
  { product_id: 'd1000000-0000-0000-0000-000000000001', location_id: 'a1000000-0000-0000-0000-000000000001', qty_on_hand: 45, earliest_expiry_date: null },
  { product_id: 'd1000000-0000-0000-0000-000000000002', location_id: 'a1000000-0000-0000-0000-000000000001', qty_on_hand: 12, earliest_expiry_date: null }, // Low stock! reorder_point: 15
  { product_id: 'd1000000-0000-0000-0000-000000000003', location_id: 'a1000000-0000-0000-0000-000000000001', qty_on_hand: 85, earliest_expiry_date: null },
  { product_id: 'd1000000-0000-0000-0000-000000000004', location_id: 'a1000000-0000-0000-0000-000000000001', qty_on_hand: 22, earliest_expiry_date: null },
  { product_id: 'd1000000-0000-0000-0000-000000000007', location_id: 'a1000000-0000-0000-0000-000000000001', qty_on_hand: 18, earliest_expiry_date: '2026-09-15' }, // Low stock! reorder_point: 30
  // Store B (Andheri)
  { product_id: 'd1000000-0000-0000-0000-000000000001', location_id: 'a1000000-0000-0000-0000-000000000002', qty_on_hand: 14, earliest_expiry_date: null }, // Low stock! reorder_point: 20
  { product_id: 'd1000000-0000-0000-0000-000000000002', location_id: 'a1000000-0000-0000-0000-000000000002', qty_on_hand: 12, earliest_expiry_date: null },
  // Central Warehouse
  { product_id: 'd1000000-0000-0000-0000-000000000001', location_id: 'a1000000-0000-0000-0000-000000000004', qty_on_hand: 200, earliest_expiry_date: null },
  { product_id: 'd1000000-0000-0000-0000-000000000002', location_id: 'a1000000-0000-0000-0000-000000000004', qty_on_hand: 80, earliest_expiry_date: null },
]

// Mutable safety stock rules
const memorySafetyStockRules: LocalSafetyStockRule[] = [
  { product_id: 'd1000000-0000-0000-0000-000000000001', location_id: 'a1000000-0000-0000-0000-000000000001', safety_stock: 15, reorder_point: 30, target_level: 60, auto_order_enabled: true },
  { product_id: 'd1000000-0000-0000-0000-000000000002', location_id: 'a1000000-0000-0000-0000-000000000001', safety_stock: 8, reorder_point: 15, target_level: 30, auto_order_enabled: true },
  { product_id: 'd1000000-0000-0000-0000-000000000007', location_id: 'a1000000-0000-0000-0000-000000000001', safety_stock: 15, reorder_point: 30, target_level: 60, auto_order_enabled: true },
  { product_id: 'd1000000-0000-0000-0000-000000000001', location_id: 'a1000000-0000-0000-0000-000000000002', safety_stock: 10, reorder_point: 20, target_level: 50, auto_order_enabled: true },
]

// Seed Purchase Orders
const memoryPurchaseOrders: LocalPurchaseOrder[] = [
  {
    id: 'f1000000-0000-0000-0000-000000000001',
    po_number: 'PO-2026-0001',
    supplier_id: 'b1000000-0000-0000-0000-000000000001',
    destination_id: 'a1000000-0000-0000-0000-000000000004',
    source: 'manual',
    status: 'closed',
    order_date: '2026-08-15',
    expected_date: '2026-08-20',
    received_date: '2026-08-20',
    total_items: 2,
    total_qty_ordered: 100,
    total_qty_received: 100,
    total_cost: 28000,
    created_by: '00000000-0000-0000-0000-000000000001',
    approved_by: '00000000-0000-0000-0000-000000000001',
    approved_at: '2026-08-15T10:00:00.000Z',
    notes: 'Warehouse quarterly restock of accessories.',
    created_at: '2026-08-15T09:00:00.000Z',
    updated_at: '2026-08-20T14:30:00.000Z',
  },
  {
    id: 'f1000000-0000-0000-0000-000000000002',
    po_number: 'PO-2026-0002',
    supplier_id: 'b1000000-0000-0000-0000-000000000001',
    destination_id: 'a1000000-0000-0000-0000-000000000001',
    source: 'manual',
    status: 'sent',
    order_date: '2026-09-06',
    expected_date: '2026-09-11',
    received_date: null,
    total_items: 2,
    total_qty_ordered: 40,
    total_qty_received: 0,
    total_cost: 13600,
    created_by: '00000000-0000-0000-0000-000000000001',
    approved_by: '00000000-0000-0000-0000-000000000001',
    approved_at: '2026-09-06T11:00:00.000Z',
    notes: 'In-transit electronics replenishment for Store A.',
    created_at: '2026-09-06T10:30:00.000Z',
    updated_at: '2026-09-06T11:00:00.000Z',
  },
  {
    id: 'f1000000-0000-0000-0000-000000000003',
    po_number: 'PO-2026-0003',
    supplier_id: 'b1000000-0000-0000-0000-000000000002',
    destination_id: 'a1000000-0000-0000-0000-000000000002',
    source: 'ai_auto',
    status: 'draft',
    order_date: '2026-09-09',
    expected_date: '2026-09-11',
    received_date: null,
    total_items: 1,
    total_qty_ordered: 25,
    total_qty_received: 0,
    total_cost: 2000,
    created_by: null,
    notes: 'Auto-triggered reorder for Store B grocery stock.',
    created_at: '2026-09-09T08:00:00.000Z',
    updated_at: '2026-09-09T08:00:00.000Z',
  },
]

const memoryPoLines: LocalPoLine[] = [
  // PO 1 lines (closed)
  {
    id: 'e1000000-0000-0000-0000-000000000001',
    po_id: 'f1000000-0000-0000-0000-000000000001',
    product_id: 'd1000000-0000-0000-0000-000000000001',
    qty_ordered: 60,
    qty_received: 60,
    unit_cost: 120,
    line_total: 7200,
    notes: null,
    created_at: '2026-08-15T09:00:00.000Z',
    updated_at: '2026-08-20T14:30:00.000Z',
  },
  {
    id: 'e1000000-0000-0000-0000-000000000002',
    po_id: 'f1000000-0000-0000-0000-000000000001',
    product_id: 'd1000000-0000-0000-0000-000000000004',
    qty_ordered: 40,
    qty_received: 40,
    unit_cost: 520,
    line_total: 20800,
    notes: null,
    created_at: '2026-08-15T09:00:00.000Z',
    updated_at: '2026-08-20T14:30:00.000Z',
  },
  // PO 2 lines (sent)
  {
    id: 'e1000000-0000-0000-0000-000000000003',
    po_id: 'f1000000-0000-0000-0000-000000000002',
    product_id: 'd1000000-0000-0000-0000-000000000001',
    qty_ordered: 30,
    qty_received: 0,
    unit_cost: 120,
    line_total: 3600,
    notes: null,
    created_at: '2026-09-06T10:30:00.000Z',
    updated_at: '2026-09-06T10:30:00.000Z',
  },
  {
    id: 'e1000000-0000-0000-0000-000000000004',
    po_id: 'f1000000-0000-0000-0000-000000000002',
    product_id: 'd1000000-0000-0000-0000-000000000004',
    qty_ordered: 10,
    qty_received: 0,
    unit_cost: 1000,
    line_total: 10000,
    notes: null,
    created_at: '2026-09-06T10:30:00.000Z',
    updated_at: '2026-09-06T10:30:00.000Z',
  },
  // PO 3 lines (draft)
  {
    id: 'e1000000-0000-0000-0000-000000000005',
    po_id: 'f1000000-0000-0000-0000-000000000003',
    product_id: 'd1000000-0000-0000-0000-000000000006',
    qty_ordered: 25,
    qty_received: 0,
    unit_cost: 80,
    line_total: 2000,
    notes: 'Auto-replenish chips',
    created_at: '2026-09-09T08:00:00.000Z',
    updated_at: '2026-09-09T08:00:00.000Z',
  },
]

const memoryPoReceipts: LocalPoReceipt[] = [
  {
    id: 'r1000000-0000-0000-0000-000000000001',
    po_id: 'f1000000-0000-0000-0000-000000000001',
    received_by: '00000000-0000-0000-0000-000000000001',
    received_at: '2026-08-20T14:30:00.000Z',
    notes: 'All items checked and in perfect condition.',
    created_at: '2026-08-20T14:30:00.000Z',
  },
]

const memoryPoReceiptLines: LocalPoReceiptLine[] = [
  {
    id: 'rl1000000-0000-0000-0000-000000000001',
    receipt_id: 'r1000000-0000-0000-0000-000000000001',
    po_line_id: 'e1000000-0000-0000-0000-000000000001',
    po_id: 'f1000000-0000-0000-0000-000000000001',
    product_id: 'd1000000-0000-0000-0000-000000000001',
    qty_received: 60,
    earliest_expiry_date: null,
    created_at: '2026-08-20T14:30:00.000Z',
  },
  {
    id: 'rl1000000-0000-0000-0000-000000000002',
    receipt_id: 'r1000000-0000-0000-0000-000000000001',
    po_line_id: 'e1000000-0000-0000-0000-000000000002',
    po_id: 'f1000000-0000-0000-0000-000000000001',
    product_id: 'd1000000-0000-0000-0000-000000000004',
    qty_received: 40,
    earliest_expiry_date: null,
    created_at: '2026-08-20T14:30:00.000Z',
  },
]

let poCounter = 104

function nextPoNumber(): string {
  poCounter += 1
  return `PO-2026-${String(poCounter).padStart(4, '0')}`
}

function calculateExpectedDate(leadTimeDays: number): string {
  const d = new Date()
  d.setDate(d.getDate() + leadTimeDays)
  return d.toISOString().split('T')[0]
}

function normalizeStatus(status: string): LocalPurchaseOrder['status'] {
  if (status === 'partial') return 'partially_received'
  return status as LocalPurchaseOrder['status']
}

// Helper: Enrich PO with supplier, destination, and lines
function enrichPurchaseOrder(po: LocalPurchaseOrder) {
  const supplier = memorySuppliersList[po.supplier_id] || {
    name: 'Supplier ' + po.supplier_id.slice(0, 8),
    code: 'SUP-UNK',
    lead_time_days: 5,
    email: '',
    phone: '',
  }
  const destination = memoryLocations[po.destination_id] || {
    name: 'Location ' + po.destination_id.slice(0, 8),
    code: 'LOC-UNK',
    type: 'store' as const,
    city: 'Mumbai',
  }
  const lines = memoryPoLines
    .filter((l) => l.po_id === po.id)
    .map((l) => {
      const prod = memoryProductsList[l.product_id] || {
        name: 'Product ' + l.product_id.slice(0, 8),
        sku_code: 'SKU-' + l.product_id.slice(0, 6),
        category: 'General',
        unit: 'pcs',
        cost_price: l.unit_cost,
        is_perishable: false,
      }
      return {
        ...l,
        product_name: prod.name,
        sku_code: prod.sku_code,
        category: prod.category,
        unit: prod.unit,
        is_perishable: prod.is_perishable,
        remaining_qty: Math.max(0, l.qty_ordered - l.qty_received),
      }
    })

  return {
    ...po,
    supplier,
    destination,
    lines,
    fulfillment_percentage: po.total_qty_ordered > 0
      ? Number(((po.total_qty_received / po.total_qty_ordered) * 100).toFixed(1))
      : 0,
  }
}

// -----------------------------------------------------------------------------
// 1. GET /api/purchase-orders — list POs with search, filter, pagination, stats
// -----------------------------------------------------------------------------
router.get(
  '/purchase-orders',
  requireAuth,
  validate(listPurchaseOrdersQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const query = validated(req, 'query', listPurchaseOrdersQuerySchema)
    const status = query.status && query.status !== 'all' ? normalizeStatus(query.status) : undefined
    const supplierId = query.supplierId || query.supplier_id
    const destinationId = query.destinationId || query.destination_id
    const search = query.search?.toLowerCase().trim()
    const { limit, offset, source } = query

    // Store-scoped roles (store_staff / sales_personnel) see only POs destined
    // for their own store.
    let storeLocIds: string[] | null = null
    if (req.role === 'store_staff' || req.role === 'sales_personnel') {
      storeLocIds = req.storeId ? await getStoreLocationIds(req.storeId) : []
    }

    try {
      let sbQuery = supabase
        .from('purchase_orders')
        .select(`
          *,
          suppliers(name, code, lead_time_days),
          locations(name, code, type, city),
          po_lines(*)
        `, { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (storeLocIds !== null) {
        if (storeLocIds.length === 0) {
          return res.json({
            purchase_orders: [],
            total: 0,
            limit,
            offset,
            summary: {
              total_pos: 0,
              draft: 0,
              sent: 0,
              partially_received: 0,
              received: 0,
              closed: 0,
              cancelled: 0,
              total_spend: 0,
            },
          })
        }
        sbQuery = sbQuery.in('destination_id', storeLocIds)
      }

      if (status) {
        sbQuery = sbQuery.eq('status', status)
      }
      if (supplierId) {
        sbQuery = sbQuery.eq('supplier_id', supplierId)
      }
      if (destinationId) {
        sbQuery = sbQuery.eq('destination_id', destinationId)
      }
      if (source) {
        sbQuery = sbQuery.eq('source', source)
      }
      if (search) {
        sbQuery = sbQuery.or(`po_number.ilike.%${search}%,notes.ilike.%${search}%`)
      }

      const { data, count, error } = await sbQuery
      if (!error && data) {
        const enriched = data.map((d) => ({
          ...d,
          supplier: d.suppliers,
          destination: d.locations,
          lines: d.po_lines,
          fulfillment_percentage: d.total_qty_ordered > 0
            ? Number(((d.total_qty_received / d.total_qty_ordered) * 100).toFixed(1))
            : 0,
        }))

        // Summary metrics across all POs (DB-backed, not memory).
        let summaryQuery = supabase
          .from('purchase_orders')
          .select('status, total_cost')
        if (storeLocIds !== null) {
          summaryQuery = summaryQuery.in('destination_id', storeLocIds)
        }
        const { data: allRows, error: summaryErr } = await summaryQuery
        const rows = summaryErr ? [] : (allRows ?? [])
        const summary = {
          total_pos: rows.length,
          draft: rows.filter((r) => r.status === 'draft').length,
          sent: rows.filter((r) => r.status === 'sent').length,
          partially_received: rows.filter((r) => r.status === 'partially_received').length,
          received: rows.filter((r) => r.status === 'received').length,
          closed: rows.filter((r) => r.status === 'closed').length,
          cancelled: rows.filter((r) => r.status === 'cancelled').length,
          total_spend: rows.reduce((acc, r) => acc + (r.status !== 'cancelled' ? Number(r.total_cost) : 0), 0),
        }

        return res.json({
          purchase_orders: enriched,
          total: count ?? data.length,
          limit,
          offset,
          summary,
        })
      }
    } catch {
      // Fallback
    }

    // In-memory fallback filtering
    let filtered = [...memoryPurchaseOrders]
    if (status) {
      filtered = filtered.filter((po) => po.status === status)
    }

    if (supplierId) {
      filtered = filtered.filter((po) => po.supplier_id === supplierId)
    }
    if (destinationId) {
      filtered = filtered.filter((po) => po.destination_id === destinationId)
    }
    if (source) {
      filtered = filtered.filter((po) => po.source === source)
    }
    if (search) {
      filtered = filtered.filter((po) => {
        const sup = memorySuppliersList[po.supplier_id]?.name.toLowerCase() ?? ''
        const loc = memoryLocations[po.destination_id]?.name.toLowerCase() ?? ''
        return (
          po.po_number.toLowerCase().includes(search) ||
          (po.notes && po.notes.toLowerCase().includes(search)) ||
          sup.includes(search) ||
          loc.includes(search)
        )
      })
    }

    // Sort descending by created_at
    filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    // Store staff see only their own store's POs in the memory fallback too.
    if (storeLocIds !== null) {
      filtered = filtered.filter((p) => storeLocIds.includes(p.destination_id))
    }

    const total = filtered.length
    const paginated = filtered.slice(offset, offset + limit).map(enrichPurchaseOrder)

    // Summary metrics across all POs
    const scopedMemoryRows = storeLocIds !== null ? filtered : memoryPurchaseOrders
    const summary = {
      total_pos: scopedMemoryRows.length,
      draft: scopedMemoryRows.filter((p) => p.status === 'draft').length,
      sent: scopedMemoryRows.filter((p) => p.status === 'sent').length,
      partially_received: scopedMemoryRows.filter((p) => p.status === 'partially_received').length,
      received: scopedMemoryRows.filter((p) => p.status === 'received').length,
      closed: scopedMemoryRows.filter((p) => p.status === 'closed').length,
      cancelled: scopedMemoryRows.filter((p) => p.status === 'cancelled').length,
      total_spend: scopedMemoryRows.reduce((acc, p) => acc + (p.status !== 'cancelled' ? p.total_cost : 0), 0),
    }

    res.json({
      purchase_orders: paginated,
      total,
      limit,
      offset,
      summary,
    })
  }),
)

// -----------------------------------------------------------------------------
// 2. GET /api/purchase-orders/:id — PO detail with lines & receipts history
// -----------------------------------------------------------------------------
router.get(
  '/purchase-orders/:id',
  requireAuth,
  validate(poIdParamSchema, 'params'),
  asyncHandler(async (req, res) => {
    const { id } = validated(req, 'params', poIdParamSchema)

    // Store-scoped roles can only open POs destined for their own store.
    let allowedDestinationIds: string[] | null = null
    if (req.role === 'store_staff' || req.role === 'sales_personnel') {
      allowedDestinationIds = req.storeId ? await getStoreLocationIds(req.storeId) : []
    }

    try {
      const { data: po, error } = await supabase
        .from('purchase_orders')
        .select(`
          *,
          suppliers(name, code, lead_time_days, email, phone),
          locations(name, code, type, city),
          po_lines(*, products(name, sku_code, category_id, unit_id, is_perishable))
        `)
        .eq('id', id)
        .maybeSingle()

      if (!error && po) {
        if (
          allowedDestinationIds !== null &&
          !allowedDestinationIds.includes(po.destination_id as string)
        ) {
          throw new AppError(404, 'Purchase order not found', 'NOT_FOUND')
        }
        const receiptsRes = await supabase
          .from('po_receipts')
          .select('*, po_receipt_lines!fk_prl_receipt_po(*)')
          .eq('po_id', id)
          .order('received_at', { ascending: false })

        return res.json({
          purchase_order: {
            ...po,
            supplier: po.suppliers,
            destination: po.locations,
            lines: po.po_lines,
            receipts: receiptsRes.data ?? [],
          },
        })
      }
    } catch {
      // Fallback
    }

    // In-memory fallback
    const po = memoryPurchaseOrders.find((p) => p.id === id)
    if (!po) {
      throw new AppError(404, 'Purchase order not found', 'NOT_FOUND')
    }

    if (
      allowedDestinationIds !== null &&
      !allowedDestinationIds.includes(po.destination_id)
    ) {
      throw new AppError(404, 'Purchase order not found', 'NOT_FOUND')
    }

    const enriched = enrichPurchaseOrder(po)

    const receipts = memoryPoReceipts
      .filter((r) => r.po_id === id)
      .map((r) => ({
        ...r,
        lines: memoryPoReceiptLines.filter((rl) => rl.receipt_id === r.id),
      }))

    res.json({
      purchase_order: {
        ...enriched,
        receipts,
      },
    })
  }),
)

// -----------------------------------------------------------------------------
// 3. POST /api/purchase-orders — Manual PO creation with duplicate prevention
// -----------------------------------------------------------------------------
router.post(
  '/purchase-orders',
  requireAuth,
  validate(createPurchaseOrderSchema),
  asyncHandler(async (req, res) => {
    assertCanManagePo(req.role)

    const body = validated(req, 'body', createPurchaseOrderSchema)
    const supplierId = (body.supplierId || body.supplier_id)!
    const destinationId = (body.destinationId || body.destination_id)!
    const allowDuplicate = Boolean(body.allowDuplicate || body.allow_duplicate)
    const notes = body.notes ?? null
    const source = body.source || 'manual'

    // Store-scoped roles (store_staff / sales_personnel) may only create POs
    // destined to their own store's locations; otherwise the PO silently
    // disappears from their (store-scoped) list. Mirrors list/detail scoping.
    if (req.role === 'store_staff' || req.role === 'sales_personnel') {
      const allowedDestinations = req.storeId ? await getStoreLocationIds(req.storeId) : []
      if (allowedDestinations.length === 0) {
        throw new AppError(403, 'You are not assigned to a store. Contact an administrator.', 'FORBIDDEN')
      }
      if (!allowedDestinations.includes(destinationId)) {
        throw new AppError(403, 'You can only create purchase orders for your assigned store', 'FORBIDDEN')
      }
    }

    // Extract product IDs
    const normalizedLines = body.lines.map((l) => {
      const productId = (l.productId || l.product_id)!
      const qtyOrdered = Number(l.qtyOrdered || l.qty_ordered || 0)
      const explicitUnitCost = l.unitCost !== undefined ? Number(l.unitCost) : (l.unit_cost !== undefined ? Number(l.unit_cost) : undefined)
      return { productId, qtyOrdered, explicitUnitCost }
    })

    const productIds = normalizedLines.map((l) => l.productId)

    // =========================================================================
    // DB-BACKED CREATE (real deployed Supabase). The in-memory store below is
    // only exercised in mock/local mode.
    // =========================================================================
    if (!isMockSupabase) {
      const openStatuses = ['draft', 'sent', 'partially_received']

      if (!allowDuplicate) {
        const { data: openPos, error: openErr } = await supabase
          .from('purchase_orders')
          .select('id, po_number, status')
          .in('status', openStatuses)
          .eq('supplier_id', supplierId)
          .eq('destination_id', destinationId)
        if (openErr) {
          throw new AppError(500, `Failed to check for duplicate purchase orders: ${openErr.message}`, 'DB_ERROR')
        }
        if (openPos && openPos.length > 0) {
          const { data: openLines } = await supabase
            .from('po_lines')
            .select('product_id, po_id')
            .in('po_id', openPos.map((p) => p.id))
            .in('product_id', productIds)
          if (openLines && openLines.length > 0) {
            const overlapIds = [...new Set(openLines.map((l) => l.product_id))]
            const { data: prods } = await supabase.from('products').select('id, name').in('id', overlapIds)
            const names = new Map((prods ?? []).map((p) => [p.id, p.name]))
            const dupPo = openPos.find((p) => p.id === openLines[0].po_id)
            throw new AppError(
              409,
              `An open purchase order (${dupPo?.po_number ?? ''}, status: ${dupPo?.status ?? ''}) already exists for this supplier and destination with overlapping product(s): ${overlapIds.map((id) => names.get(id) ?? id).join(', ')}. To place an intentional additional order, set allowDuplicate: true.`,
              'DUPLICATE_OPEN_PO',
            )
          }
        }
      }

      // Resolve unit costs from the DB (supplier_products first, then product cost).
      const { data: supProducts } = await supabase
        .from('supplier_products')
        .select('product_id, unit_cost')
        .eq('supplier_id', supplierId)
      const { data: prodRows } = await supabase
        .from('products')
        .select('id, cost_price')
        .in('id', productIds)
      // unit_cost may be NULL in seed data — skip those rows so resolution
      // falls through to the product's cost_price instead of coercing to 0.
      const costBySupplier = new Map(
        (supProducts ?? [])
          .filter((sp) => sp.unit_cost !== null && sp.unit_cost !== undefined)
          .map((sp) => [sp.product_id, Number(sp.unit_cost)]),
      )
      const costByProduct = new Map((prodRows ?? []).map((p) => [p.id, Number(p.cost_price)]))

      const seq = await supabase.rpc('generate_po_number')
      if (seq.error || !seq.data) {
        throw new AppError(500, `Failed to allocate purchase order number: ${seq.error?.message ?? 'no number returned'}`, 'DB_ERROR')
      }

      const expectedDate = body.expectedDate || body.expected_date || null
      const { data: header, error: hErr } = await supabase
        .from('purchase_orders')
        .insert({
          po_number: String(seq.data),
          supplier_id: supplierId,
          destination_id: destinationId,
          source,
          status: 'draft',
          expected_date: expectedDate,
          created_by: req.userId ?? null,
          notes,
        })
        .select('id, po_number')
        .single()
      if (hErr) {
        throw new AppError(500, `Failed to create purchase order: ${hErr.message}`, 'DB_ERROR')
      }

      // line_total is a GENERATED column — never send it to the DB.
      const dbLines = normalizedLines.map((l) => ({
        po_id: header.id,
        product_id: l.productId,
        qty_ordered: l.qtyOrdered,
        unit_cost: l.explicitUnitCost ?? costBySupplier.get(l.productId) ?? costByProduct.get(l.productId) ?? 100,
        notes: null,
      }))
      const { error: linesErr } = await supabase.from('po_lines').insert(dbLines)
      if (linesErr) {
        throw new AppError(500, `Failed to write purchase order lines: ${linesErr.message}`, 'DB_ERROR')
      }

      const snapshot = await fetchPoSnapshot(header.id)
      return res.status(201).json({
        purchase_order: snapshot,
        message: `Purchase order ${header.po_number} created successfully`,
      })
    }

    // =========================================================================
    // DUPLICATE PO PREVENTION CHECK
    // Prevent duplicate open POs (draft, sent, partially_received) for the same
    // supplier & destination containing the requested products.
    // =========================================================================
    if (!allowDuplicate) {
      const openStatuses = ['draft', 'sent', 'partially_received']

      // Check in memory / DB
      const duplicatePo = memoryPurchaseOrders.find((p) => {
        if (p.supplier_id !== supplierId || p.destination_id !== destinationId) return false
        if (!openStatuses.includes(p.status)) return false
        // Check if any product is already on this open PO
        const existingLines = memoryPoLines.filter((l) => l.po_id === p.id)
        return existingLines.some((l) => productIds.includes(l.product_id))
      })

      if (duplicatePo) {
        const existingLines = memoryPoLines.filter((l) => l.po_id === duplicatePo.id)
        const overlapProducts = existingLines
          .filter((l) => productIds.includes(l.product_id))
          .map((l) => memoryProductsList[l.product_id]?.name || l.product_id)
          .join(', ')

        throw new AppError(
          409,
          `An open purchase order (${duplicatePo.po_number}, status: ${duplicatePo.status}) already exists for this supplier and destination with overlapping product(s): ${overlapProducts}. To place an intentional additional order, set allowDuplicate: true.`,
          'DUPLICATE_OPEN_PO',
        )
      }
    }

    // Resolve supplier lead time and calculate expected_date if not explicitly given
    const supplierLeadTime = memorySuppliersList[supplierId]?.lead_time_days ?? 5
    const expectedDate = body.expectedDate || body.expected_date || calculateExpectedDate(supplierLeadTime)
    const newPoId = crypto.randomUUID()
    const poNumber = nextPoNumber()

    // Calculate line costs and totals
    let totalItems = 0
    let totalQtyOrdered = 0
    let totalCost = 0
    const createdLines: LocalPoLine[] = []

    for (const item of normalizedLines) {
      // Resolve unit cost: explicit override, else supplier_products, else product.cost_price
      let cost = item.explicitUnitCost
      if (cost === undefined) {
        const mapping = memorySupplierProducts.find(
          (m) => m.supplier_id === supplierId && m.product_id === item.productId,
        )
        if (mapping) {
          cost = mapping.unit_cost
        } else {
          cost = memoryProductsList[item.productId]?.cost_price ?? 100
        }
      }

      const lineTotal = Number((item.qtyOrdered * cost).toFixed(2))
      totalItems += 1
      totalQtyOrdered += item.qtyOrdered
      totalCost += lineTotal

      const lineRecord: LocalPoLine = {
        id: crypto.randomUUID(),
        po_id: newPoId,
        product_id: item.productId,
        qty_ordered: item.qtyOrdered,
        qty_received: 0,
        unit_cost: cost,
        line_total: lineTotal,
        notes: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      createdLines.push(lineRecord)
    }

    const newPo: LocalPurchaseOrder = {
      id: newPoId,
      po_number: poNumber,
      supplier_id: supplierId,
      destination_id: destinationId,
      source,
      status: 'draft',
      order_date: new Date().toISOString().split('T')[0],
      expected_date: expectedDate,
      received_date: null,
      total_items: totalItems,
      total_qty_ordered: totalQtyOrdered,
      total_qty_received: 0,
      total_cost: Number(totalCost.toFixed(2)),
      created_by: req.userId ?? null,
      notes,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    try {
      const { data: dbPo, error: poErr } = await supabase
        .from('purchase_orders')
        .insert(newPo)
        .select()
        .single()

      if (!poErr && dbPo) {
        await supabase.from('po_lines').insert(createdLines)
      }
    } catch {
      // Fallback
    }

    // Save to memory store
    memoryPurchaseOrders.unshift(newPo)
    memoryPoLines.push(...createdLines)

    res.status(201).json({
      purchase_order: enrichPurchaseOrder(newPo),
      message: `Purchase order ${newPo.po_number} created successfully`,
    })
  }),
)

// -----------------------------------------------------------------------------
// 4. POST /api/purchase-orders/auto-trigger — Automatic PO triggering based on
//    inventory conditions (qty_on_hand <= reorder_point) with duplicate prevention
// -----------------------------------------------------------------------------
router.post(
  '/purchase-orders/auto-trigger',
  requireAuth,
  validate(autoTriggerReorderSchema),
  asyncHandler(async (req, res) => {
    assertCanManagePo(req.role)

    const { destinationId, destination_id, locationId, location_id, dryRun } = validated(
      req,
      'body',
      autoTriggerReorderSchema,
    )
    const targetLocationId = destinationId || destination_id || locationId || location_id

    // 1. Scan inventory rows
    let invRows = [...memoryInventory]
    if (targetLocationId) {
      invRows = invRows.filter((r) => r.location_id === targetLocationId)
    }

    const openStatuses = ['draft', 'sent', 'partially_received']
    const createdPos: ReturnType<typeof enrichPurchaseOrder>[] = []
    const skippedDuplicates: Array<{
      product_id: string
      product_name: string
      location_id: string
      location_name: string
      open_po_number: string
      open_status: string
      qty_on_hand: number
      reorder_point: number
    }> = []
    const unmappedProducts: Array<{
      product_id: string
      product_name: string
      location_id: string
      qty_on_hand: number
      reorder_point: number
    }> = []

    // Group items needing reorder by (supplier_id, location_id)
    const groupsToOrder = new Map<string, {
      supplier_id: string
      destination_id: string
      lines: Array<{
        product_id: string
        reorder_qty: number
        unit_cost: number
      }>
    }>()

    for (const row of invRows) {
      const prod = memoryProductsList[row.product_id]
      if (!prod) continue

      // Look up rule or default reorder point
      const rule = memorySafetyStockRules.find(
        (r) => r.product_id === row.product_id && r.location_id === row.location_id,
      )
      const reorderPoint = rule?.reorder_point ?? prod.default_reorder_point
      const targetLevel = rule?.target_level ?? prod.default_target_level

      // Condition: qty_on_hand <= reorder_point
      if (row.qty_on_hand <= reorderPoint) {
        // DUPLICATE PO PREVENTION: Check if an open PO already exists covering this product at this location
        const openPoWithProduct = memoryPurchaseOrders.find((po) => {
          if (po.destination_id !== row.location_id) return false
          if (!openStatuses.includes(po.status)) return false
          const lines = memoryPoLines.filter((l) => l.po_id === po.id)
          return lines.some((l) => l.product_id === row.product_id && l.qty_ordered > l.qty_received)
        })

        if (openPoWithProduct) {
          // Skip auto-ordering to prevent duplicate PO!
          skippedDuplicates.push({
            product_id: row.product_id,
            product_name: prod.name,
            location_id: row.location_id,
            location_name: memoryLocations[row.location_id]?.name ?? row.location_id,
            open_po_number: openPoWithProduct.po_number,
            open_status: openPoWithProduct.status,
            qty_on_hand: row.qty_on_hand,
            reorder_point: reorderPoint,
          })
          continue
        }

        // Calculate shortfall reorder quantity: target - current
        const reorderQty = Math.max(1, Math.round(targetLevel - row.qty_on_hand))

        // Find preferred or active supplier for product
        const mapping = memorySupplierProducts.find(
          (m) => m.product_id === row.product_id && m.is_preferred,
        ) || memorySupplierProducts.find((m) => m.product_id === row.product_id)

        if (!mapping) {
          unmappedProducts.push({
            product_id: row.product_id,
            product_name: prod.name,
            location_id: row.location_id,
            qty_on_hand: row.qty_on_hand,
            reorder_point: reorderPoint,
          })
          continue
        }

        const groupKey = `${mapping.supplier_id}::${row.location_id}`
        if (!groupsToOrder.has(groupKey)) {
          groupsToOrder.set(groupKey, {
            supplier_id: mapping.supplier_id,
            destination_id: row.location_id,
            lines: [],
          })
        }

        groupsToOrder.get(groupKey)!.lines.push({
          product_id: row.product_id,
          reorder_qty: reorderQty,
          unit_cost: mapping.unit_cost,
        })
      }
    }

    if (dryRun) {
      return res.json({
        dry_run: true,
        scanned_items_count: invRows.length,
        potential_pos_count: groupsToOrder.size,
        skipped_duplicates: skippedDuplicates,
        unmapped_products: unmappedProducts,
      })
    }

    // Generate purchase orders for each supplier + destination group
    for (const [, grp] of groupsToOrder) {
      const newPoId = crypto.randomUUID()
      const poNumber = nextPoNumber()
      const supplierLeadTime = memorySuppliersList[grp.supplier_id]?.lead_time_days ?? 5
      const expectedDate = calculateExpectedDate(supplierLeadTime)

      let totalItems = 0
      let totalQtyOrdered = 0
      let totalCost = 0
      const createdLines: LocalPoLine[] = []

      for (const line of grp.lines) {
        const lineTotal = Number((line.reorder_qty * line.unit_cost).toFixed(2))
        totalItems += 1
        totalQtyOrdered += line.reorder_qty
        totalCost += lineTotal

        const lineRecord: LocalPoLine = {
          id: crypto.randomUUID(),
          po_id: newPoId,
          product_id: line.product_id,
          qty_ordered: line.reorder_qty,
          qty_received: 0,
          unit_cost: line.unit_cost,
          line_total: lineTotal,
          notes: 'Auto-triggered by inventory reorder point threshold',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
        createdLines.push(lineRecord)
      }

      const newPo: LocalPurchaseOrder = {
        id: newPoId,
        po_number: poNumber,
        supplier_id: grp.supplier_id,
        destination_id: grp.destination_id,
        source: 'ai_auto',
        status: 'draft',
        order_date: new Date().toISOString().split('T')[0],
        expected_date: expectedDate,
        received_date: null,
        total_items: totalItems,
        total_qty_ordered: totalQtyOrdered,
        total_qty_received: 0,
        total_cost: Number(totalCost.toFixed(2)),
        created_by: req.userId ?? null,
        notes: `Auto-triggered order generated for ${totalItems} low-stock item(s).`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      memoryPurchaseOrders.unshift(newPo)
      memoryPoLines.push(...createdLines)
      createdPos.push(enrichPurchaseOrder(newPo))
    }

    res.json({
      message: `Evaluation completed. Created ${createdPos.length} auto-order purchase orders.`,
      scanned_items_count: invRows.length,
      created_pos: createdPos,
      total_pos_created: createdPos.length,
      skipped_duplicates: skippedDuplicates,
      unmapped_products: unmappedProducts,
    })
  }),
)

// -----------------------------------------------------------------------------
// 5. PATCH /api/purchase-orders/:id/status — Lifecycle transition
//    Lifecycle: draft -> sent -> partially_received -> received -> closed
//    Any -> cancelled
// -----------------------------------------------------------------------------
router.patch(
  '/purchase-orders/:id/status',
  requireAuth,
  validate(poIdParamSchema, 'params'),
  validate(updatePoStatusSchema),
  asyncHandler(async (req, res) => {
    assertCanManagePo(req.role)

    const { id } = validated(req, 'params', poIdParamSchema)
    const body = validated(req, 'body', updatePoStatusSchema)
    const targetStatus = normalizeStatus(body.status)
    const cancelReason = body.cancelReason || body.cancel_reason

    // DB-backed lifecycle transition.
    if (!isMockSupabase) {
      const { data: dbPo, error: dbErr } = await supabase
        .from('purchase_orders')
        .select('id, po_number, status')
        .eq('id', id)
        .maybeSingle()
      if (dbErr) {
        throw new AppError(500, `Failed to load purchase order: ${dbErr.message}`, 'DB_ERROR')
      }
      if (!dbPo) {
        throw new AppError(404, 'Purchase order not found', 'NOT_FOUND')
      }

      const current = dbPo.status
      const patch: Record<string, unknown> = {}
      let statusMessage: string

      if (targetStatus === 'cancelled') {
        if (current === 'closed') {
          throw new AppError(400, 'Cannot cancel a closed purchase order', 'INVALID_TRANSITION')
        }
        if (current === 'cancelled') {
          throw new AppError(400, 'Purchase order is already cancelled', 'ALREADY_CANCELLED')
        }
        if (!cancelReason) {
          throw new AppError(400, 'cancelReason is required when cancelling a purchase order', 'CANCEL_REASON_REQUIRED')
        }
        Object.assign(patch, {
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          cancelled_by: req.userId ?? null,
          cancel_reason: cancelReason,
        })
        statusMessage = 'Purchase order cancelled'
      } else if (current === 'draft' && targetStatus === 'sent') {
        Object.assign(patch, { status: 'sent', approved_at: new Date().toISOString(), approved_by: req.userId ?? null })
        statusMessage = 'Purchase order marked as sent'
      } else if ((current === 'sent' || current === 'draft') && targetStatus === 'partially_received') {
        Object.assign(patch, { status: 'partially_received' })
        statusMessage = 'Status updated to partially received'
      } else if ((current === 'sent' || current === 'partially_received') && targetStatus === 'received') {
        Object.assign(patch, { status: 'received', received_date: new Date().toISOString().split('T')[0] })
        statusMessage = 'Purchase order marked as fully received'
      } else if (current === 'received' && targetStatus === 'closed') {
        Object.assign(patch, { status: 'closed' })
        statusMessage = 'Purchase order closed and finalized'
      } else if (current === targetStatus) {
        statusMessage = `Purchase order is already in ${targetStatus} state`
      } else {
        throw new AppError(
          400,
          `Invalid lifecycle transition from ${current} to ${targetStatus}. Follow the progression: draft -> sent -> partially_received -> received -> closed.`,
          'INVALID_TRANSITION',
        )
      }

      if (Object.keys(patch).length > 0) {
        const { error: updErr } = await supabase.from('purchase_orders').update(patch).eq('id', id)
        if (updErr) {
          throw new AppError(500, `Failed to update purchase order status: ${updErr.message}`, 'DB_ERROR')
        }
      }

      const snapshot = await fetchPoSnapshot(id)
      return res.json({ purchase_order: snapshot, message: statusMessage })
    }

    const po = memoryPurchaseOrders.find((p) => p.id === id)
    if (!po) {
      throw new AppError(404, 'Purchase order not found', 'NOT_FOUND')
    }

    const currentStatus = po.status


    // State machine transitions:
    // draft -> sent
    // sent -> partially_received (or done via goods-in)
    // sent | partially_received -> received (only if received_qty matches ordered, or confirmed full receipt)
    // received -> closed
    // any (except closed/cancelled) -> cancelled
    if (targetStatus === 'cancelled') {
      if (currentStatus === 'closed') {
        throw new AppError(400, 'Cannot cancel a closed purchase order', 'INVALID_TRANSITION')
      }
      if (currentStatus === 'cancelled') {
        throw new AppError(400, 'Purchase order is already cancelled', 'ALREADY_CANCELLED')
      }
      if (!cancelReason) {
        throw new AppError(400, 'cancelReason is required when cancelling a purchase order', 'CANCEL_REASON_REQUIRED')
      }

      po.status = 'cancelled'
      po.cancelled_at = new Date().toISOString()
      po.cancelled_by = req.userId ?? null
      po.cancel_reason = cancelReason
      po.updated_at = new Date().toISOString()
      return res.json({ purchase_order: enrichPurchaseOrder(po), message: 'Purchase order cancelled' })
    }

    if (currentStatus === 'draft' && targetStatus === 'sent') {
      po.status = 'sent'
      po.approved_at = new Date().toISOString()
      po.approved_by = req.userId ?? null
      po.updated_at = new Date().toISOString()
      return res.json({ purchase_order: enrichPurchaseOrder(po), message: 'Purchase order marked as sent' })
    }

    if ((currentStatus === 'sent' || currentStatus === 'draft') && targetStatus === 'partially_received') {
      po.status = 'partially_received'
      po.updated_at = new Date().toISOString()
      return res.json({ purchase_order: enrichPurchaseOrder(po), message: 'Status updated to partially received' })
    }

    if ((currentStatus === 'sent' || currentStatus === 'partially_received') && targetStatus === 'received') {
      po.status = 'received'
      po.received_date = new Date().toISOString().split('T')[0]
      po.updated_at = new Date().toISOString()
      return res.json({ purchase_order: enrichPurchaseOrder(po), message: 'Purchase order marked as fully received' })
    }

    if (currentStatus === 'received' && targetStatus === 'closed') {
      po.status = 'closed'
      po.updated_at = new Date().toISOString()
      return res.json({ purchase_order: enrichPurchaseOrder(po), message: 'Purchase order closed and finalized' })
    }

    if (currentStatus === targetStatus) {
      return res.json({ purchase_order: enrichPurchaseOrder(po), message: `Purchase order is already in ${targetStatus} state` })
    }

    throw new AppError(
      400,
      `Invalid lifecycle transition from ${currentStatus} to ${targetStatus}. Follow the progression: draft -> sent -> partially_received -> received -> closed.`,
      'INVALID_TRANSITION',
    )
  }),
)

// -----------------------------------------------------------------------------
// 6. POST /api/purchase-orders/:id/receive — Goods-in processing
//    Receives stock against a PO, adds stock to inventory, updates lifecycle state
// -----------------------------------------------------------------------------
router.post(
  '/purchase-orders/:id/receive',
  requireAuth,
  validate(poIdParamSchema, 'params'),
  validate(receivePurchaseOrderSchema),
  asyncHandler(async (req, res) => {
    assertCanManagePo(req.role)

    const { id } = validated(req, 'params', poIdParamSchema)
    const { lines, notes, receivedBy } = validated(req, 'body', receivePurchaseOrderSchema)

    // DB-backed goods-in: admission control here gives precise errors, then each
    // line is applied atomically via fn_receive_po (locks the line, writes the
    // receipt + receipt line, bumps qty_received, and adds stock in one txn).
    if (!isMockSupabase) {
      const { data: dbPo, error: dbErr } = await supabase
        .from('purchase_orders')
        .select('id, po_number, status, destination_id')
        .eq('id', id)
        .maybeSingle()
      if (dbErr) {
        throw new AppError(500, `Failed to load purchase order: ${dbErr.message}`, 'DB_ERROR')
      }
      if (!dbPo) {
        throw new AppError(404, 'Purchase order not found', 'NOT_FOUND')
      }
      if (dbPo.status === 'draft') {
        throw new AppError(400, 'Cannot receive goods for a draft purchase order. Please send the PO first.', 'PO_NOT_SENT')
      }
      if (dbPo.status === 'closed') {
        throw new AppError(400, 'Cannot receive goods for a closed purchase order.', 'PO_CLOSED')
      }
      if (dbPo.status === 'cancelled') {
        throw new AppError(400, 'Cannot receive goods for a cancelled purchase order.', 'PO_CANCELLED')
      }

      const { data: dbPoLines, error: linesErr } = await supabase
        .from('po_lines')
        .select('id, product_id, qty_ordered, qty_received, unit_cost')
        .eq('po_id', id)
      if (linesErr) {
        throw new AppError(500, `Failed to load purchase order lines: ${linesErr.message}`, 'DB_ERROR')
      }

      const lineProductIds = [...new Set((dbPoLines ?? []).map((l) => l.product_id))]
      const { data: prods } = await supabase
        .from('products')
        .select('id, name, is_perishable')
        .in('id', lineProductIds)
      const prodInfo = new Map((prods ?? []).map((p) => [p.id, p]))

      for (const item of lines) {
        const poLineId = item.poLineId || item.po_line_id
        const productId = item.productId || item.product_id
        const qtyReceived = Number(item.qtyReceived || item.qty_received || 0)
        const earliestExpiry = item.earliestExpiryDate || item.earliest_expiry_date || null

        if (qtyReceived <= 0) {
          throw new AppError(400, 'Quantity received must be greater than 0', 'INVALID_QUANTITY')
        }

        const matchingLine = (dbPoLines ?? []).find((l) => (poLineId ? l.id === poLineId : l.product_id === productId))
        if (!matchingLine) {
          throw new AppError(400, `PO line item not found for product ${productId}`, 'PO_LINE_MISMATCH')
        }
        const resolvedProductId = productId ?? matchingLine.product_id

        const remaining = Number(matchingLine.qty_ordered) - Number(matchingLine.qty_received)
        if (qtyReceived > remaining + 1e-9) {
          throw new AppError(
            400,
            `Cannot receive ${qtyReceived} units for line item ${matchingLine.id}. Remaining quantity is only ${remaining}.`,
            'OVER_RECEIPT',
          )
        }

        const prod = prodInfo.get(resolvedProductId)
        if (prod?.is_perishable && !earliestExpiry) {
          throw new AppError(
            400,
            `Product ${prod.name} is perishable and requires an earliest_expiry_date for goods-in.`,
            'EXPIRY_DATE_REQUIRED',
          )
        }

        const { error: rpcErr } = await supabase.rpc('fn_receive_po', {
          p_po_id: id,
          p_po_line_id: matchingLine.id,
          p_product_id: resolvedProductId,
          p_location_id: dbPo.destination_id,
          p_qty_received: qtyReceived,
          p_received_by: receivedBy ?? req.userId ?? null,
          p_notes: notes ?? null,
          p_earliest_expiry_date: earliestExpiry,
        })
        if (rpcErr) {
          throw new AppError(500, `Goods-in failed for line ${matchingLine.id}: ${rpcErr.message}`, 'DB_ERROR')
        }
      }

      // Progress the lifecycle like the in-memory path: all lines fully
      // received -> received; some received -> partially_received.
      const { data: progressedLines, error: progErr } = await supabase
        .from('po_lines')
        .select('qty_ordered, qty_received')
        .eq('po_id', id)
      if (progErr) {
        throw new AppError(500, `Failed to verify receipt quantities: ${progErr.message}`, 'DB_ERROR')
      }
      const anyReceived = (progressedLines ?? []).some((l) => Number(l.qty_received) > 0)
      const allReceived = (progressedLines ?? []).length > 0
        && (progressedLines ?? []).every((l) => Number(l.qty_received) >= Number(l.qty_ordered))
      if (allReceived) {
        const { error: statusErr } = await supabase
          .from('purchase_orders')
          .update({ status: 'received', received_date: new Date().toISOString().split('T')[0] })
          .eq('id', id)
        if (statusErr) {
          throw new AppError(500, `Failed to mark purchase order as received: ${statusErr.message}`, 'DB_ERROR')
        }
      } else if (anyReceived) {
        const { error: statusErr } = await supabase
          .from('purchase_orders')
          .update({ status: 'partially_received' })
          .eq('id', id)
        if (statusErr) {
          throw new AppError(500, `Failed to mark purchase order as partially received: ${statusErr.message}`, 'DB_ERROR')
        }
      }

      const snapshot = await fetchPoSnapshot(id)
      const { data: receipts, error: recErr } = await supabase
        .from('po_receipts')
        .select('*, po_receipt_lines!fk_prl_receipt_po(*)')
        .eq('po_id', id)
        .order('received_at', { ascending: false })
      if (recErr) {
        throw new AppError(500, `Failed to load receipts: ${recErr.message}`, 'DB_ERROR')
      }

      return res.status(201).json({
        receipt: receipts?.[0] ?? { po_id: id, lines: [] },
        purchase_order: snapshot,
        message: `Goods-in processed successfully. Inventory updated at ${snapshot?.destination?.name ?? 'destination'}. Current PO status: ${snapshot?.status ?? dbPo.status}.`,
      })
    }

    const po = memoryPurchaseOrders.find((p) => p.id === id)
    if (!po) {
      throw new AppError(404, 'Purchase order not found', 'NOT_FOUND')
    }

    if (po.status === 'draft') {

      throw new AppError(400, 'Cannot receive goods for a draft purchase order. Please send the PO first.', 'PO_NOT_SENT')
    }
    if (po.status === 'closed') {
      throw new AppError(400, 'Cannot receive goods for a closed purchase order.', 'PO_CLOSED')
    }
    if (po.status === 'cancelled') {
      throw new AppError(400, 'Cannot receive goods for a cancelled purchase order.', 'PO_CANCELLED')
    }

    // Validate each line against the PO
    const poLines = memoryPoLines.filter((l) => l.po_id === id)
    const receiptLinesToInsert: LocalPoReceiptLine[] = []
    const receiptId = crypto.randomUUID()
    const nowIso = new Date().toISOString()

    for (const item of lines) {
      const poLineId = item.poLineId || item.po_line_id
      const productId = item.productId || item.product_id
      const qtyReceived = Number(item.qtyReceived || item.qty_received || 0)
      const earliestExpiry = item.earliestExpiryDate || item.earliest_expiry_date || null

      if (qtyReceived <= 0) {
        throw new AppError(400, 'Quantity received must be greater than 0', 'INVALID_QUANTITY')
      }

      const matchingLine = poLines.find((l) => (poLineId ? l.id === poLineId : l.product_id === productId))
      if (!matchingLine) {
        throw new AppError(400, `PO line item not found for product ${productId}`, 'PO_LINE_MISMATCH')
      }

      // Check for over-receipt
      const remaining = matchingLine.qty_ordered - matchingLine.qty_received
      if (qtyReceived > remaining + 1e-9) {
        throw new AppError(
          400,
          `Cannot receive ${qtyReceived} units for line item ${matchingLine.id}. Remaining quantity is only ${remaining}.`,
          'OVER_RECEIPT',
        )
      }

      // Perishable validation: check if product is perishable and lacks expiry date
      const prodInfo = memoryProductsList[matchingLine.product_id]
      if (prodInfo?.is_perishable && !earliestExpiry) {
        throw new AppError(
          400,
          `Product ${prodInfo.name} is perishable and requires an earliest_expiry_date for goods-in.`,
          'EXPIRY_DATE_REQUIRED',
        )
      }

      receiptLinesToInsert.push({
        id: crypto.randomUUID(),
        receipt_id: receiptId,
        po_line_id: matchingLine.id,
        po_id: id,
        product_id: matchingLine.product_id,
        qty_received: qtyReceived,
        earliest_expiry_date: earliestExpiry,
        created_at: nowIso,
      })
    }

    // Apply receipt updates atomically
    const receiptRecord: LocalPoReceipt = {
      id: receiptId,
      po_id: id,
      received_by: receivedBy || req.userId || null,
      received_at: nowIso,
      notes: notes ?? null,
      created_at: nowIso,
    }

    memoryPoReceipts.unshift(receiptRecord)
    memoryPoReceiptLines.push(...receiptLinesToInsert)

    // Update PO lines qty_received and update inventory at destination
    for (const rLine of receiptLinesToInsert) {
      const line = poLines.find((l) => l.id === rLine.po_line_id)
      if (line) {
        line.qty_received += rLine.qty_received
        line.updated_at = nowIso
      }

      // Record stock into inventory at destination location
      const invIdx = memoryInventory.findIndex(
        (inv) => inv.product_id === rLine.product_id && inv.location_id === po.destination_id,
      )
      if (invIdx >= 0) {
        memoryInventory[invIdx].qty_on_hand += rLine.qty_received
        if (rLine.earliest_expiry_date) {
          memoryInventory[invIdx].earliest_expiry_date = rLine.earliest_expiry_date
        }
      } else {
        memoryInventory.push({
          product_id: rLine.product_id,
          location_id: po.destination_id,
          qty_on_hand: rLine.qty_received,
          earliest_expiry_date: rLine.earliest_expiry_date ?? null,
        })
      }
    }

    // Recompute total received on header
    const newTotalQtyReceived = poLines.reduce((acc, l) => acc + l.qty_received, 0)
    po.total_qty_received = newTotalQtyReceived
    po.updated_at = nowIso

    // Lifecycle auto-progression:
    // If all lines fully received: status -> received
    // If partially received: status -> partially_received
    if (po.total_qty_received >= po.total_qty_ordered) {
      po.status = 'received'
      po.received_date = nowIso.split('T')[0]
    } else if (po.total_qty_received > 0) {
      po.status = 'partially_received'
    }

    res.status(201).json({
      receipt: {
        ...receiptRecord,
        lines: receiptLinesToInsert,
      },
      purchase_order: enrichPurchaseOrder(po),
      message: `Goods-in processed successfully. Inventory updated at ${memoryLocations[po.destination_id]?.name}. Current PO status: ${po.status}.`,
    })
  }),
)

// -----------------------------------------------------------------------------
// 7. GET /api/purchase-orders/:id/receipts — list receipts for a PO
// -----------------------------------------------------------------------------
router.get(
  '/purchase-orders/:id/receipts',
  requireAuth,
  validate(poIdParamSchema, 'params'),
  asyncHandler(async (req, res) => {
    const { id } = validated(req, 'params', poIdParamSchema)

    // DB-backed receipts list.
    if (!isMockSupabase) {
      const { data: receipts, error } = await supabase
        .from('po_receipts')
        .select('*, po_receipt_lines!fk_prl_receipt_po(*, products(name, sku_code))')
        .eq('po_id', id)
        .order('received_at', { ascending: false })
      if (error) {
        throw new AppError(500, `Failed to load receipts: ${error.message}`, 'DB_ERROR')
      }
      const mapped = (receipts ?? []).map((r: { po_receipt_lines?: Array<{ products?: { name?: string; sku_code?: string } }> } & object) => ({
        ...r,
        lines: (r.po_receipt_lines ?? []).map((rl: { products?: { name?: string; sku_code?: string } } & object) => ({
          ...rl,
          product_name: rl.products?.name ?? 'Product',
          sku_code: rl.products?.sku_code ?? 'SKU',
        })),
      }))
      return res.json({ receipts: mapped })
    }

    const receipts = memoryPoReceipts
      .filter((r) => r.po_id === id)
      .map((r) => ({
        ...r,
        lines: memoryPoReceiptLines
          .filter((rl) => rl.receipt_id === r.id)
          .map((rl) => ({
            ...rl,
            product_name: memoryProductsList[rl.product_id]?.name ?? 'Product',
            sku_code: memoryProductsList[rl.product_id]?.sku_code ?? 'SKU',
          })),
      }))

    res.json({ receipts })
  }),
)

export default router
