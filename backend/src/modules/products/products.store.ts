import { memoryInventory } from '../inventory/inventory.store.js'
import { memoryProductsList } from '../purchase-orders/purchase-orders.routes.js'
import { memoryUnits } from '../units/units.store.js'

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