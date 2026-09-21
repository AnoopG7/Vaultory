import { env, supabase } from '../../config/index.js'
import { memoryInventory } from '../inventory/inventory.store.js'
import { memoryProductsList } from '../purchase-orders/purchase-orders.routes.js'
import { memorySales, memorySaleLines } from '../sales/sales.store.js'
import { findDescendantCategoryIds } from '../categories/index.js'
import { memoryUnits } from '../units/units.store.js'

const isMockSupabase = !env.SUPABASE_URL || env.SUPABASE_URL.includes('mock') || env.SUPABASE_URL.includes('localhost')

const DAY_MS = 86_400_000

export interface LocalProduct {
  id: string
  sku_code: string
  name: string
  description: string | null
  category_id: string
  unit_id: string
  cost_price: number
  sale_price: number
  default_safety_stock: number
  default_reorder_point: number
  default_target_level: number
  is_perishable: boolean
  shelf_life_days: number | null
  status: 'active' | 'archived'
  created_by: string | null
  created_at: string
  updated_at: string
}

/** Seed products matching seed.sql v1.5 (deterministic UUID prefixes). */
export const memoryProducts: LocalProduct[] = [
  // Electronics / Mobile Accessories / Audio
  { id: 'd1000000-0000-0000-0000-000000000001', sku_code: 'PELEC-001', name: 'USB-C Charging Cable 1m', description: '1-meter braided USB-C to USB-C cable', category_id: 'c2000000-0000-0000-0000-000000000001', unit_id: 'f1000000-0000-0000-0000-000000000001', cost_price: 120, sale_price: 249, default_safety_stock: 20, default_reorder_point: 30, default_target_level: 100, is_perishable: false, shelf_life_days: null, status: 'active', created_by: null, created_at: '2026-08-29T10:00:00.000Z', updated_at: '2026-08-29T10:00:00.000Z' },
  { id: 'd1000000-0000-0000-0000-000000000002', sku_code: 'PELEC-002', name: 'Wireless Earbuds Pro', description: 'TWS earbuds with ANC and 24h battery', category_id: 'c2000000-0000-0000-0000-000000000002', unit_id: 'f1000000-0000-0000-0000-000000000001', cost_price: 800, sale_price: 1499, default_safety_stock: 5, default_reorder_point: 10, default_target_level: 40, is_perishable: false, shelf_life_days: null, status: 'active', created_by: null, created_at: '2026-08-29T10:00:00.000Z', updated_at: '2026-08-29T10:00:00.000Z' },
  { id: 'd1000000-0000-0000-0000-000000000003', sku_code: 'PELEC-003', name: 'Phone Screen Protector', description: 'Tempered glass for smartphones (universal)', category_id: 'c2000000-0000-0000-0000-000000000001', unit_id: 'f1000000-0000-0000-0000-000000000001', cost_price: 40, sale_price: 99, default_safety_stock: 30, default_reorder_point: 50, default_target_level: 200, is_perishable: false, shelf_life_days: null, status: 'active', created_by: null, created_at: '2026-08-29T10:00:00.000Z', updated_at: '2026-08-29T10:00:00.000Z' },
  { id: 'd1000000-0000-0000-0000-000000000004', sku_code: 'PELEC-004', name: '10000mAh Power Bank', description: 'Compact power bank with dual USB output', category_id: 'c2000000-0000-0000-0000-000000000001', unit_id: 'f1000000-0000-0000-0000-000000000001', cost_price: 450, sale_price: 899, default_safety_stock: 8, default_reorder_point: 15, default_target_level: 60, is_perishable: false, shelf_life_days: null, status: 'active', created_by: null, created_at: '2026-08-29T10:00:00.000Z', updated_at: '2026-08-29T10:00:00.000Z' },
  // Grocery
  { id: 'd1000000-0000-0000-0000-000000000005', sku_code: 'PGROC-001', name: 'Premium Basmati Rice 5kg', description: '5kg pack of aged basmati rice', category_id: 'c1000000-0000-0000-0000-000000000002', unit_id: 'f1000000-0000-0000-0000-000000000007', cost_price: 280, sale_price: 450, default_safety_stock: 15, default_reorder_point: 25, default_target_level: 100, is_perishable: false, shelf_life_days: null, status: 'active', created_by: null, created_at: '2026-08-29T10:00:00.000Z', updated_at: '2026-08-29T10:00:00.000Z' },
  { id: 'd1000000-0000-0000-0000-000000000006', sku_code: 'PGROC-002', name: 'Masala Chips Multi-Pack', description: '10-pack assorted masala chips', category_id: 'c2000000-0000-0000-0000-000000000003', unit_id: 'f1000000-0000-0000-0000-000000000007', cost_price: 80, sale_price: 150, default_safety_stock: 20, default_reorder_point: 40, default_target_level: 150, is_perishable: true, shelf_life_days: 90, status: 'active', created_by: null, created_at: '2026-08-29T10:00:00.000Z', updated_at: '2026-08-29T10:00:00.000Z' },
  { id: 'd1000000-0000-0000-0000-000000000007', sku_code: 'PGROC-003', name: 'Whole Wheat Bread 400g', description: 'Fresh whole wheat bread loaf', category_id: 'c1000000-0000-0000-0000-000000000002', unit_id: 'f1000000-0000-0000-0000-000000000001', cost_price: 25, sale_price: 45, default_safety_stock: 10, default_reorder_point: 20, default_target_level: 80, is_perishable: true, shelf_life_days: 5, status: 'active', created_by: null, created_at: '2026-08-29T10:00:00.000Z', updated_at: '2026-08-29T10:00:00.000Z' },
  // Dairy
  { id: 'd1000000-0000-0000-0000-000000000008', sku_code: 'PGROC-004', name: 'Full Cream Milk 1L', description: '1-liter pack of full cream milk', category_id: 'c2000000-0000-0000-0000-000000000004', unit_id: 'f1000000-0000-0000-0000-000000000008', cost_price: 28, sale_price: 56, default_safety_stock: 25, default_reorder_point: 40, default_target_level: 120, is_perishable: true, shelf_life_days: 7, status: 'active', created_by: null, created_at: '2026-08-29T10:00:00.000Z', updated_at: '2026-08-29T10:00:00.000Z' },
  { id: 'd1000000-0000-0000-0000-000000000009', sku_code: 'PGROC-005', name: 'Greek Yogurt 400g', description: 'Plain Greek yogurt', category_id: 'c2000000-0000-0000-0000-000000000004', unit_id: 'f1000000-0000-0000-0000-000000000001', cost_price: 60, sale_price: 110, default_safety_stock: 10, default_reorder_point: 20, default_target_level: 60, is_perishable: true, shelf_life_days: 21, status: 'active', created_by: null, created_at: '2026-08-29T10:00:00.000Z', updated_at: '2026-08-29T10:00:00.000Z' },
  // Beverages
  { id: 'd1000000-0000-0000-0000-000000000010', sku_code: 'PBEV-001', name: 'Cola 500mL Can (12-pack)', description: '12 × 500mL cans of cola', category_id: 'c2000000-0000-0000-0000-000000000005', unit_id: 'f1000000-0000-0000-0000-000000000007', cost_price: 180, sale_price: 360, default_safety_stock: 15, default_reorder_point: 25, default_target_level: 100, is_perishable: false, shelf_life_days: null, status: 'active', created_by: null, created_at: '2026-08-29T10:00:00.000Z', updated_at: '2026-08-29T10:00:00.000Z' },
  { id: 'd1000000-0000-0000-0000-000000000011', sku_code: 'PBEV-002', name: 'Sparkling Water 1L (6-pack)', description: '6 × 1L bottles of sparkling water', category_id: 'c2000000-0000-0000-0000-000000000005', unit_id: 'f1000000-0000-0000-0000-000000000007', cost_price: 120, sale_price: 240, default_safety_stock: 10, default_reorder_point: 20, default_target_level: 80, is_perishable: false, shelf_life_days: null, status: 'active', created_by: null, created_at: '2026-08-29T10:00:00.000Z', updated_at: '2026-08-29T10:00:00.000Z' },
  { id: 'd1000000-0000-0000-0000-000000000012', sku_code: 'PBEV-003', name: 'Orange Juice 1L', description: '100% pure orange juice', category_id: 'c2000000-0000-0000-0000-000000000006', unit_id: 'f1000000-0000-0000-0000-000000000008', cost_price: 55, sale_price: 110, default_safety_stock: 10, default_reorder_point: 18, default_target_level: 60, is_perishable: true, shelf_life_days: 30, status: 'active', created_by: null, created_at: '2026-08-29T10:00:00.000Z', updated_at: '2026-08-29T10:00:00.000Z' },
  { id: 'd1000000-0000-0000-0000-000000000013', sku_code: 'PBEV-004', name: 'Green Tea Bags (100 ct)', description: 'Premium green tea, box of 100', category_id: 'c2000000-0000-0000-0000-000000000007', unit_id: 'f1000000-0000-0000-0000-000000000006', cost_price: 150, sale_price: 299, default_safety_stock: 8, default_reorder_point: 15, default_target_level: 50, is_perishable: false, shelf_life_days: null, status: 'active', created_by: null, created_at: '2026-08-29T10:00:00.000Z', updated_at: '2026-08-29T10:00:00.000Z' },
  // Personal Care
  { id: 'd1000000-0000-0000-0000-000000000014', sku_code: 'PCARE-001', name: 'Liquid Hand Soap 500mL', description: 'Antibacterial liquid hand wash', category_id: 'c1000000-0000-0000-0000-000000000004', unit_id: 'f1000000-0000-0000-0000-000000000008', cost_price: 45, sale_price: 99, default_safety_stock: 12, default_reorder_point: 20, default_target_level: 80, is_perishable: false, shelf_life_days: null, status: 'active', created_by: null, created_at: '2026-08-29T10:00:00.000Z', updated_at: '2026-08-29T10:00:00.000Z' },
  { id: 'd1000000-0000-0000-0000-000000000015', sku_code: 'PCARE-002', name: 'Shampoo 250mL', description: 'Anti-dandruff shampoo', category_id: 'c1000000-0000-0000-0000-000000000004', unit_id: 'f1000000-0000-0000-0000-000000000008', cost_price: 90, sale_price: 199, default_safety_stock: 8, default_reorder_point: 15, default_target_level: 50, is_perishable: false, shelf_life_days: null, status: 'active', created_by: null, created_at: '2026-08-29T10:00:00.000Z', updated_at: '2026-08-29T10:00:00.000Z' },
  { id: 'd1000000-0000-0000-0000-000000000016', sku_code: 'PCARE-003', name: 'Toothpaste 150g (twin pack)', description: '2 × 150g fluoride toothpaste', category_id: 'c1000000-0000-0000-0000-000000000004', unit_id: 'f1000000-0000-0000-0000-000000000007', cost_price: 55, sale_price: 120, default_safety_stock: 15, default_reorder_point: 25, default_target_level: 80, is_perishable: false, shelf_life_days: null, status: 'active', created_by: null, created_at: '2026-08-29T10:00:00.000Z', updated_at: '2026-08-29T10:00:00.000Z' },
  // Household
  { id: 'd1000000-0000-0000-0000-000000000017', sku_code: 'PHOUSE-001', name: 'Floor Cleaner 1L', description: 'All-purpose floor disinfectant', category_id: 'c1000000-0000-0000-0000-000000000005', unit_id: 'f1000000-0000-0000-0000-000000000008', cost_price: 50, sale_price: 110, default_safety_stock: 10, default_reorder_point: 18, default_target_level: 60, is_perishable: false, shelf_life_days: null, status: 'active', created_by: null, created_at: '2026-08-29T10:00:00.000Z', updated_at: '2026-08-29T10:00:00.000Z' },
  { id: 'd1000000-0000-0000-0000-000000000018', sku_code: 'PHOUSE-002', name: 'Laundry Detergent 2kg', description: 'Front-load washing powder', category_id: 'c1000000-0000-0000-0000-000000000005', unit_id: 'f1000000-0000-0000-0000-000000000006', cost_price: 120, sale_price: 249, default_safety_stock: 8, default_reorder_point: 12, default_target_level: 40, is_perishable: false, shelf_life_days: null, status: 'active', created_by: null, created_at: '2026-08-29T10:00:00.000Z', updated_at: '2026-08-29T10:00:00.000Z' },
  // Stationery
  { id: 'd1000000-0000-0000-0000-000000000019', sku_code: 'PSTAT-001', name: 'A4 Copier Paper 500 sheets', description: 'White 80 gsm A4 copier paper', category_id: 'c1000000-0000-0000-0000-000000000007', unit_id: 'f1000000-0000-0000-0000-000000000007', cost_price: 180, sale_price: 350, default_safety_stock: 10, default_reorder_point: 20, default_target_level: 80, is_perishable: false, shelf_life_days: null, status: 'active', created_by: null, created_at: '2026-08-29T10:00:00.000Z', updated_at: '2026-08-29T10:00:00.000Z' },
  { id: 'd1000000-0000-0000-0000-000000000020', sku_code: 'PSTAT-002', name: 'Ballpoint Pen Pack (10)', description: 'Blue ink ballpoint pens, box of 10', category_id: 'c1000000-0000-0000-0000-000000000007', unit_id: 'f1000000-0000-0000-0000-000000000006', cost_price: 30, sale_price: 70, default_safety_stock: 15, default_reorder_point: 30, default_target_level: 100, is_perishable: false, shelf_life_days: null, status: 'active', created_by: null, created_at: '2026-08-29T10:00:00.000Z', updated_at: '2026-08-29T10:00:00.000Z' },
]

/** Derive the `[P]<category>-<seq>` prefix from a (top-level) category name. */
export function deriveSkuPrefix(categoryName: string): string {
  const clean = categoryName
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.replace(/[^A-Za-z0-9]/g, ''))
    .filter(Boolean)
  if (clean.length === 0) return 'GEN'
  if (clean.length === 1) {
    return clean[0].slice(0, 4).toUpperCase() || 'GEN'
  }
  return clean
    .slice(0, 4)
    .map((w) => w.slice(0, 1))
    .join('')
    .toUpperCase() || 'GEN'
}

/** Suggest the next SKU `P<PREFIX>-<NNN>` for a given top-level category name. */
export function suggestSkuForPrefix(prefix: string): string {
  const pattern = new RegExp(`^P${prefix}-(\\d+)$`, 'i')
  let maxSeq = 0
  for (const product of memoryProducts) {
    const match = product.sku_code.match(pattern)
    if (match) maxSeq = Math.max(maxSeq, Number(match[1]))
  }
  return `P${prefix}-${String(maxSeq + 1).padStart(3, '0')}`
}

/**
 * Keep the other mock-mode stores consistent with product mutations so
 * archived items are flagged everywhere (inventory.product_status) and labels
 * stay fresh. Synchronization only — no changes to their business logic.
 */
export function syncProductToMockStores(product: LocalProduct): void {
  for (const row of memoryInventory) {
    if (row.product_id === product.id) {
      row.product_name = product.name
      row.sku_code = product.sku_code
      row.sale_price = product.sale_price
      row.cost_price = product.cost_price
      row.product_status = product.status
    }
  }
  if (memoryProductsList[product.id]) {
    memoryProductsList[product.id] = {
      ...memoryProductsList[product.id],
      name: product.name,
      sku_code: product.sku_code,
      cost_price: product.cost_price,
      sale_price: product.sale_price,
      default_safety_stock: product.default_safety_stock,
      default_reorder_point: product.default_reorder_point,
      default_target_level: product.default_target_level,
      is_perishable: product.is_perishable,
      shelf_life_days: product.shelf_life_days,
    }
  }
}

/** Register a newly created product in auxiliary mock catalogs. */
export function registerProductInMockStores(product: LocalProduct): void {
  if (!memoryProductsList[product.id]) {
    memoryProductsList[product.id] = {
      name: product.name,
      sku_code: product.sku_code,
      category: memoryUnits.find((u) => u.id === product.unit_id)?.name ?? 'General',
      unit: memoryUnits.find((u) => u.id === product.unit_id)?.abbreviation ?? 'pcs',
      cost_price: product.cost_price,
      sale_price: product.sale_price,
      default_safety_stock: product.default_safety_stock,
      default_reorder_point: product.default_reorder_point,
      default_target_level: product.default_target_level,
      is_perishable: product.is_perishable,
      shelf_life_days: product.shelf_life_days,
    }
  }
}

/** Business rule: target >= reorder >= safety (SRS §4.1.1 / chk_product_stock_levels). */
export function validateStockLevels(
  target: number,
  reorder: number,
  safety: number,
): { ok: boolean; message?: string } {
  if (target < reorder || reorder < safety) {
    return {
      ok: false,
      message: 'Invalid stock levels — default_target_level must be >= default_reorder_point >= default_safety_stock',
    }
  }
  return { ok: true }
}

export interface MoverItem {
  product_id: string
  product_name: string
  sku_code: string
  total_units_sold: number
  classification: 'fast' | 'slow' | 'normal'
  sales_value: number
}

export interface MoverResponse {
  window_days: number
  items: MoverItem[]
}

const MOVER_WINDOW_DEFAULT = 90
const FAST_MOVER_DEFAULT = 30
const SLOW_MOVER_DEFAULT = 5

/**
 * Fast/slow mover classification (SRS §8.3.3).
 *
 * A product is a fast mover when units sold within the rolling window reach
 * `fast_mover_threshold` or more, and a slow mover when they sit at or below
 * `slow_mover_threshold` (0 units counts as slow). Prefer the stored
 * `app_settings` values, falling back to the seeded defaults.
 */
async function readMoverSettings(): Promise<{ windowDays: number; fastThreshold: number; slowThreshold: number }> {
  const defaults = { windowDays: MOVER_WINDOW_DEFAULT, fastThreshold: FAST_MOVER_DEFAULT, slowThreshold: SLOW_MOVER_DEFAULT }
  if (isMockSupabase) return defaults
  try {
    const { data } = await supabase.from('app_settings').select('key, value').in('key', ['mover_window_days', 'fast_mover_threshold', 'slow_mover_threshold'])
    if (!data) return defaults
    const map = new Map(data.map((r) => [r.key, Number(r.value)]))
    return {
      windowDays: map.get('mover_window_days') ?? MOVER_WINDOW_DEFAULT,
      fastThreshold: map.get('fast_mover_threshold') ?? FAST_MOVER_DEFAULT,
      slowThreshold: map.get('slow_mover_threshold') ?? SLOW_MOVER_DEFAULT,
    }
  } catch {
    return defaults
  }
}

interface SoldAgg {
  units: number
  value: number
}

/** Add sale-line quantities to the per-product sold map (DB mode). */
async function aggregateDbSales(
  windowStartIso: string,
  storeId: string | undefined,
  sold: Map<string, SoldAgg>,
): Promise<void> {
  let q = supabase
    .from('sale_lines')
    .select('product_id, qty, line_total, sales!inner(sale_datetime, status, store_id)')
    .gte('sales.sale_datetime', windowStartIso)
    .eq('sales.status', 'active')
  if (storeId) q = q.eq('sales.store_id', storeId)

  const { data, error } = await q
  if (error || !data) return
  for (const line of data) {
    const pid = String(line.product_id)
    const agg = sold.get(pid) ?? { units: 0, value: 0 }
    agg.units += Number(line.qty ?? 0)
    agg.value += Number(line.line_total ?? 0)
    sold.set(pid, agg)
  }
}

/**
 * Compute fast/slow movers within a rolling window.
 *
 * Filtering: `storeId` (optional), `categoryId` includes sub-categories
 * (optional), `classification` narrows the result set (optional).
 * `limit` caps the number of product rows returned.
 */
export async function getMovers(params: {
  windowDays?: number
  storeId?: string
  categoryId?: string
  classification?: 'fast' | 'slow' | 'normal'
  limit?: number
}): Promise<MoverResponse> {
  const settings = await readMoverSettings()
  const windowDays = params.windowDays ?? settings.windowDays
  const windowStartIso = new Date(Date.now() - windowDays * DAY_MS).toISOString()

  const sold = new Map<string, SoldAgg>()
  const productRows: { id: string; name: string; sku_code: string; category_id: string; status: string }[] = []

  if (!isMockSupabase) {
    try {
      await aggregateDbSales(windowStartIso, params.storeId, sold)

      let q = supabase
        .from('products')
        .select('id, sku_code, name, category_id, status')
        .eq('status', 'active')
      if (params.categoryId) {
        const ids = findDescendantCategoryIds(params.categoryId)
        if (ids) q = q.in('category_id', [...ids])
      }
      const { data, error } = await q
      if (!error && data) {
        for (const p of data as { id: string; name: string; sku_code: string; category_id: string; status: string }[]) {
          productRows.push(p)
        }
      }
    } catch {
      // fall through to in-memory store
    }
  }

  // In-memory fallback / mock path
  if (productRows.length === 0) {
    const activeSaleIds = new Set(
      memorySales
        .filter(
          (s) =>
            s.status === 'active' &&
            s.sale_datetime >= windowStartIso &&
            (!params.storeId || s.store_id === params.storeId),
        )
        .map((s) => s.id),
    )
    for (const line of memorySaleLines) {
      if (!activeSaleIds.has(line.sale_id)) continue
      const agg = sold.get(line.product_id) ?? { units: 0, value: 0 }
      agg.units += line.qty
      agg.value += line.line_total
      sold.set(line.product_id, agg)
    }

    let products = memoryProducts.filter((p) => p.status === 'active')
    if (params.categoryId) {
      const ids = findDescendantCategoryIds(params.categoryId)
      if (ids) products = products.filter((p) => ids.has(p.category_id))
    }
    for (const p of products) {
      productRows.push({ id: p.id, name: p.name, sku_code: p.sku_code, category_id: p.category_id, status: p.status })
    }
  }

  const classify = (units: number): 'fast' | 'slow' | 'normal' => {
    if (units >= settings.fastThreshold) return 'fast'
    if (units <= settings.slowThreshold) return 'slow'
    return 'normal'
  }

  let items: MoverItem[] = productRows.map((p) => {
    const agg = sold.get(p.id) ?? { units: 0, value: 0 }
    const units = agg.units
    return {
      product_id: p.id,
      product_name: p.name,
      sku_code: p.sku_code,
      total_units_sold: units,
      classification: classify(units),
      sales_value: Number(agg.value.toFixed(2)),
    }
  })

  if (params.classification) {
    items = items.filter((i) => i.classification === params.classification)
  }

  // Fast movers first (highest velocity), then normal, then slow movers.
  const order = { fast: 0, normal: 1, slow: 2 }
  items.sort((a, b) => {
    const cls = order[a.classification] - order[b.classification]
    return cls !== 0 ? cls : b.total_units_sold - a.total_units_sold
  })

  const limit = params.limit ?? 100
  return { window_days: windowDays, items: items.slice(0, limit) }
}