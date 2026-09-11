import { env, supabase, supabaseAdmin } from '../../config/index.js'
import { AppError } from '../../middleware/index.js'
import type { Role } from '../../middleware/auth.js'
import type { StockStatus } from '../../lib/schemas/enums.js'
import type { ListInventoryQuery } from '../../lib/schemas/inventory.js'
import { memoryLocations, memoryProductsList } from '../../lib/mock-catalog.js'
import { memoryCategories } from '../categories/categories.store.js'
import { recordAuditLog } from '../users/users.store.js'

const db = supabaseAdmin ?? supabase

export interface LocalInventoryItem {
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
  stock_status: StockStatus
}

export interface LocalSafetyStockRule {
  id: string
  product_id: string
  location_id: string | null
  safety_stock: number
  reorder_point: number
  target_level: number
  auto_order_enabled: boolean
  auto_approve: boolean
  created_at: string
  updated_at: string
}

/**
 * Pure stock status computation function matching DB compute_stock_status:
 * - qty <= 0 -> out_of_stock
 * - qty <= reorderPoint -> low
 * - targetLevel > 0 && qty > targetLevel -> over_stock
 * - else -> in_stock (normal)
 */
export function computeStockStatus(
  qty: number,
  reorderPoint: number,
  targetLevel: number = 0
): StockStatus {
  if (qty <= 0) return 'out_of_stock'
  if (qty <= reorderPoint) return 'low'
  if (targetLevel > 0 && qty > targetLevel) return 'over_stock'
  return 'in_stock'
}

// Seed memory store with realistic items matching seed.sql
export const memoryInventory: LocalInventoryItem[] = [
  {
    product_id: 'd1000000-0000-0000-0000-000000000001',
    location_id: 'a1000000-0000-0000-0000-000000000001',
    qty_on_hand: 45.0,
    earliest_expiry_date: null,
    last_movement_at: '2026-08-15T10:00:00Z',
    sku_code: 'PELEC-001',
    product_name: 'USB-C Charging Cable 1m',
    sale_price: 249.0,
    cost_price: 120.0,
    product_status: 'active',
    is_perishable: false,
    category_id: 'c2000000-0000-0000-0000-000000000001',
    category_name: 'Mobile Accessories',
    unit_name: 'Pieces',
    location_name: 'Store A — MG Road',
    location_type: 'store',
    safety_stock: 20.0,
    reorder_point: 30.0,
    target_level: 100.0,
    auto_order_enabled: true,
    stock_status: computeStockStatus(45.0, 30.0, 100.0), // in_stock
  },
  {
    product_id: 'd1000000-0000-0000-0000-000000000002',
    location_id: 'a1000000-0000-0000-0000-000000000001',
    qty_on_hand: 8.0,
    earliest_expiry_date: null,
    last_movement_at: '2026-08-18T14:30:00Z',
    sku_code: 'PELEC-002',
    product_name: 'Wireless Earbuds Pro',
    sale_price: 1499.0,
    cost_price: 800.0,
    product_status: 'active',
    is_perishable: false,
    category_id: 'c2000000-0000-0000-0000-000000000002',
    category_name: 'Audio',
    unit_name: 'Pieces',
    location_name: 'Store A — MG Road',
    location_type: 'store',
    safety_stock: 5.0,
    reorder_point: 10.0,
    target_level: 40.0,
    auto_order_enabled: false,
    stock_status: computeStockStatus(8.0, 10.0, 40.0), // low
  },
  {
    product_id: 'd1000000-0000-0000-0000-000000000003',
    location_id: 'a1000000-0000-0000-0000-000000000001',
    qty_on_hand: 0.0,
    earliest_expiry_date: null,
    last_movement_at: '2026-08-20T09:15:00Z',
    sku_code: 'PELEC-003',
    product_name: 'Phone Screen Protector',
    sale_price: 99.0,
    cost_price: 40.0,
    product_status: 'active',
    is_perishable: false,
    category_id: 'c2000000-0000-0000-0000-000000000001',
    category_name: 'Mobile Accessories',
    unit_name: 'Pieces',
    location_name: 'Store A — MG Road',
    location_type: 'store',
    safety_stock: 30.0,
    reorder_point: 50.0,
    target_level: 200.0,
    auto_order_enabled: true,
    stock_status: computeStockStatus(0.0, 50.0, 200.0), // out_of_stock
  },
  {
    product_id: 'd1000000-0000-0000-0000-000000000004',
    location_id: 'a1000000-0000-0000-0000-000000000002',
    qty_on_hand: 22.0,
    earliest_expiry_date: null,
    last_movement_at: '2026-08-22T11:00:00Z',
    sku_code: 'PELEC-004',
    product_name: '10000mAh Power Bank',
    sale_price: 899.0,
    cost_price: 450.0,
    product_status: 'active',
    is_perishable: false,
    category_id: 'c2000000-0000-0000-0000-000000000001',
    category_name: 'Mobile Accessories',
    unit_name: 'Pieces',
    location_name: 'Store B — Andheri',
    location_type: 'store',
    safety_stock: 8.0,
    reorder_point: 15.0,
    target_level: 60.0,
    auto_order_enabled: false,
    stock_status: computeStockStatus(22.0, 15.0, 60.0), // in_stock
  },
  {
    product_id: 'd1000000-0000-0000-0000-000000000005',
    location_id: 'a1000000-0000-0000-0000-000000000003',
    qty_on_hand: 12.0,
    earliest_expiry_date: null,
    last_movement_at: '2026-08-25T16:45:00Z',
    sku_code: 'PGROC-001',
    product_name: 'Premium Basmati Rice 5kg',
    sale_price: 450.0,
    cost_price: 280.0,
    product_status: 'active',
    is_perishable: false,
    category_id: 'c1000000-0000-0000-0000-000000000002',
    category_name: 'Grocery',
    unit_name: 'Packs',
    location_name: 'Store C — Thane',
    location_type: 'store',
    safety_stock: 15.0,
    reorder_point: 25.0,
    target_level: 100.0,
    auto_order_enabled: false,
    stock_status: computeStockStatus(12.0, 25.0, 100.0), // low
  },
]

export const memoryRules: LocalSafetyStockRule[] = [
  {
    id: 'r1000000-0000-0000-0000-000000000001',
    product_id: 'd1000000-0000-0000-0000-000000000001',
    location_id: null,
    safety_stock: 20.0,
    reorder_point: 30.0,
    target_level: 100.0,
    auto_order_enabled: true,
    auto_approve: false,
    created_at: '2026-08-01T00:00:00Z',
    updated_at: '2026-08-01T00:00:00Z',
  },
]

/**
 * List inventory items with computed stock status and applied thresholds.
 */
export async function queryInventory(
  query: ListInventoryQuery,
  callerRole?: Role,
  callerStoreId?: string | null
): Promise<{ data: LocalInventoryItem[]; total: number }> {
  try {
    let q = db.from('inventory_status').select('*', { count: 'exact' })

    // If store_staff is assigned to a store, filter by their store locations
    if (callerRole === 'store_staff' && callerStoreId) {
      const { data: storeLocs } = await db
        .from('locations')
        .select('id')
        .eq('store_id', callerStoreId)
      const locIds = (storeLocs ?? []).map((l) => l.id as string)
      if (locIds.length) {
        q = q.in('location_id', locIds)
      }
    }

    if (query.locationId) {
      q = q.eq('location_id', query.locationId)
    }

    if (query.categoryId) {
      q = q.eq('category_id', query.categoryId)
    }

    if (query.status) {
      q = q.eq('stock_status', query.status)
    }

    if (query.search) {
      const s = query.search.trim()
      q = q.or(`product_name.ilike.%${s}%,sku_code.ilike.%${s}%`)
    }

    const offset = query.offset ?? 0
    const limit = query.limit ?? 50
    q = q.order('product_name', { ascending: true }).range(offset, offset + limit - 1)

    const { data, count, error } = await q
    if (!error && data && data.length > 0) {
      const items: LocalInventoryItem[] = data.map((row) => ({
        product_id: row.product_id,
        location_id: row.location_id,
        qty_on_hand: Number(row.qty_on_hand ?? 0),
        earliest_expiry_date: row.earliest_expiry_date ?? null,
        last_movement_at: row.last_movement_at ?? null,
        sku_code: row.sku_code,
        product_name: row.product_name,
        sale_price: Number(row.sale_price ?? 0),
        cost_price: callerRole === 'admin' ? Number(row.cost_price ?? 0) : 0,
        product_status: row.product_status ?? 'active',
        is_perishable: Boolean(row.is_perishable),
        category_id: row.category_id,
        category_name: row.category_name,
        unit_name: row.unit_name,
        location_name: row.location_name,
        location_type: row.location_type,
        safety_stock: Number(row.safety_stock ?? 0),
        reorder_point: Number(row.reorder_point ?? 0),
        target_level: Number(row.target_level ?? 0),
        auto_order_enabled: Boolean(row.auto_order_enabled),
        stock_status: computeStockStatus(
          Number(row.qty_on_hand ?? 0),
          Number(row.reorder_point ?? 0),
          Number(row.target_level ?? 0)
        ),
      }))

      return { data: items, total: count ?? items.length }
    }
  } catch {
    // Fallback to memory
  }

  // In-memory fallback
  let filtered = [...memoryInventory]

  if (query.locationId) {
    filtered = filtered.filter((i) => i.location_id === query.locationId)
  }

  if (query.categoryId) {
    filtered = filtered.filter((i) => i.category_id === query.categoryId)
  }

  if (query.status) {
    filtered = filtered.filter((i) => i.stock_status === query.status)
  }

  if (query.search) {
    const s = query.search.toLowerCase()
    filtered = filtered.filter(
      (i) =>
        i.product_name.toLowerCase().includes(s) ||
        i.sku_code.toLowerCase().includes(s)
    )
  }

  const offset = query.offset ?? 0
  const limit = query.limit ?? 50
  const paged = filtered.slice(offset, offset + limit)

  return { data: paged, total: filtered.length }
}

/**
 * Retrieve single inventory record for a product at a location.
 */
export async function getInventoryItem(
  productId: string,
  locationId?: string | null
): Promise<LocalInventoryItem | null> {
  try {
    let q = db.from('inventory_status').select('*').eq('product_id', productId)
    if (locationId) {
      q = q.eq('location_id', locationId)
    }
    const { data, error } = await q.maybeSingle()
    if (!error && data) {
      return {
        product_id: data.product_id,
        location_id: data.location_id,
        qty_on_hand: Number(data.qty_on_hand ?? 0),
        earliest_expiry_date: data.earliest_expiry_date ?? null,
        last_movement_at: data.last_movement_at ?? null,
        sku_code: data.sku_code,
        product_name: data.product_name,
        sale_price: Number(data.sale_price ?? 0),
        cost_price: Number(data.cost_price ?? 0),
        product_status: data.product_status ?? 'active',
        is_perishable: Boolean(data.is_perishable),
        category_id: data.category_id,
        category_name: data.category_name,
        unit_name: data.unit_name,
        location_name: data.location_name,
        location_type: data.location_type,
        safety_stock: Number(data.safety_stock ?? 0),
        reorder_point: Number(data.reorder_point ?? 0),
        target_level: Number(data.target_level ?? 0),
        auto_order_enabled: Boolean(data.auto_order_enabled),
        stock_status: computeStockStatus(
          Number(data.qty_on_hand ?? 0),
          Number(data.reorder_point ?? 0),
          Number(data.target_level ?? 0)
        ),
      }
    }
  } catch {
    // Fallback to memory
  }

  const found = memoryInventory.find(
    (i) => i.product_id === productId && (!locationId || i.location_id === locationId)
  )
  return found ?? null
}

/**
 * Update stock thresholds (safety_stock, reorder_point, target_level).
 * Enforces business logic: target_level >= reorder_point >= safety_stock >= 0.
 */
export async function updateThresholds(params: {
  productId: string
  locationId?: string | null
  safetyStock: number
  reorderPoint: number
  targetLevel?: number
  actor?: { id: string; email: string; role: Role }
}): Promise<{
  productId: string
  locationId: string | null
  safetyStock: number
  reorderPoint: number
  targetLevel: number
  stockStatus: StockStatus
}> {
  const { productId, locationId = null, safetyStock, reorderPoint, actor } = params

  if (safetyStock < 0 || reorderPoint < 0) {
    throw new AppError(400, 'Thresholds must be non-negative numbers', 'INVALID_STOCK_LEVELS')
  }

  if (reorderPoint < safetyStock) {
    throw new AppError(
      400,
      'Reorder point cannot be lower than safety stock',
      'INVALID_STOCK_LEVELS'
    )
  }

  // Satisfy chk_ssr_levels (target_level >= reorder_point AND reorder_point >= safety_stock)
  const effTarget = Math.max(
    params.targetLevel ?? 0,
    reorderPoint * 2,
    reorderPoint + 10,
    safetyStock
  )

  let persisted = false

  try {
    // Verify product exists in Supabase or memory fallback
    const { data: prod } = await db
      .from('products')
      .select('id, name, sku_code')
      .eq('id', productId)
      .maybeSingle()

    const inMemoryProd = memoryInventory.find((p) => p.product_id === productId)
    if (!prod && !inMemoryProd) {
      throw new AppError(404, 'Product not found', 'NOT_FOUND')
    }

    if (prod) {
      if (locationId) {
        // Location-specific rule (handle partial index uq_ssr_product_location)
        const { data: existingRule } = await db
          .from('safety_stock_rules')
          .select('id')
          .eq('product_id', productId)
          .eq('location_id', locationId)
          .maybeSingle()

        if (existingRule) {
          const { error: updErr } = await db
            .from('safety_stock_rules')
            .update({
              safety_stock: safetyStock,
              reorder_point: reorderPoint,
              target_level: effTarget,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existingRule.id)
          if (updErr) {
            throw new AppError(500, `Failed to update location threshold: ${updErr.message}`, 'DB_ERROR')
          }
        } else {
          const { error: insErr } = await db.from('safety_stock_rules').insert({
            product_id: productId,
            location_id: locationId,
            safety_stock: safetyStock,
            reorder_point: reorderPoint,
            target_level: effTarget,
          })
          if (insErr) {
            throw new AppError(500, `Failed to create location threshold: ${insErr.message}`, 'DB_ERROR')
          }
        }
      } else {
        // Global product threshold
        const { data: existingGlobal } = await db
          .from('safety_stock_rules')
          .select('id')
          .eq('product_id', productId)
          .is('location_id', null)
          .maybeSingle()

        if (existingGlobal) {
          const { error: err1 } = await db
            .from('safety_stock_rules')
            .update({
              safety_stock: safetyStock,
              reorder_point: reorderPoint,
              target_level: effTarget,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existingGlobal.id)
          if (err1) console.error('Error updating existingGlobal safety_stock_rules:', err1)
        } else {
          const { error: insErr } = await db.from('safety_stock_rules').insert({
            product_id: productId,
            location_id: null,
            safety_stock: safetyStock,
            reorder_point: reorderPoint,
            target_level: effTarget,
          })
          if (insErr) console.error('Error inserting safety_stock_rules:', insErr)
        }

        // Also update products table defaults
        await db
          .from('products')
          .update({
            default_safety_stock: safetyStock,
            default_reorder_point: reorderPoint,
            default_target_level: effTarget,
          })
          .eq('id', productId)
      }
      persisted = true
    }
  } catch (err) {
    if (err instanceof AppError) throw err
    // Memory fallback will handle
  }

  // Update in-memory fallback
  for (const item of memoryInventory) {
    if (item.product_id === productId && (!locationId || item.location_id === locationId)) {
      item.safety_stock = safetyStock
      item.reorder_point = reorderPoint
      item.target_level = effTarget
      item.stock_status = computeStockStatus(item.qty_on_hand, reorderPoint, effTarget)
    }
  }

  // Calculate new stock status for return
  const currentItem = await getInventoryItem(productId, locationId)
  const currentQty = currentItem?.qty_on_hand ?? 0
  const computedStatus = computeStockStatus(currentQty, reorderPoint, effTarget)

  // Record audit log
  await recordAuditLog({
    actorId: actor?.id ?? null,
    actorEmail: actor?.email ?? null,
    actorRole: actor?.role ?? null,
    action: 'safety_stock_updated',
    entity: 'product',
    entityId: productId,
    detail: {
      location_id: locationId,
      safety_stock: safetyStock,
      reorder_point: reorderPoint,
      target_level: effTarget,
      computed_status: computedStatus,
      persisted_in_db: persisted,
    },
  })

  return {
    productId,
    locationId,
    safetyStock,
    reorderPoint,
    targetLevel: effTarget,
    stockStatus: computedStatus,
  }
}

// -----------------------------------------------------------------------------
// SHARED STOCK / MOVEMENT LEDGER
// -----------------------------------------------------------------------------
// Every stock-affecting operation (manual stock-in/out, transfer, adjustment,
// PO receiving) flows through the helpers below. Real-DB mode mirrors
// fn_mutate_stock / fn_transfer_stock; the in-memory ledger is always applied
// so the mock (offline) demo stays consistent. This is the single mechanism the
// rest of the codebase calls — do not mutate memoryInventory directly elsewhere.

const isMockSupabase =
  !env.SUPABASE_URL || env.SUPABASE_URL.includes('mock') || env.SUPABASE_URL.includes('localhost')

export type InventoryMovementType =
  | 'stock_in'
  | 'stock_out'
  | 'transfer_out'
  | 'transfer_in'
  | 'adjustment'
  | 'po_receipt'
  | 'sale'
  | 'sale_void'
  | 'sale_return'

export interface LocalStockMovement {
  id: string
  product_id: string
  location_id: string
  type: InventoryMovementType
  qty: number
  qty_before: number | null
  qty_after: number | null
  sale_id: string | null
  po_id: string | null
  po_line_id: string | null
  return_id: string | null
  transfer_ref: string | null
  reason: string | null
  notes: string | null
  created_by: string | null
  created_at: string
}

/** Immutable (append-only) movement ledger for the memory store. */
export const memoryMovements: LocalStockMovement[] = []

function isKnownProduct(productId: string): boolean {
  return memoryInventory.some((i) => i.product_id === productId) || Boolean(memoryProductsList[productId])
}

function buildInventoryRow(productId: string, locationId: string): LocalInventoryItem {
  const existing = memoryInventory.find((i) => i.product_id === productId)
  const existingRow: LocalInventoryItem | undefined = existing
    ? {
        ...existing,
        product_id: productId,
        location_id: locationId,
        qty_on_hand: 0,
        earliest_expiry_date: null,
        last_movement_at: null,
        location_name: memoryLocations[locationId]?.name ?? locationId,
        location_type: memoryLocations[locationId]?.type ?? 'store',
      }
    : undefined
  if (existingRow) return existingRow

  const prod = memoryProductsList[productId]
  const loc = memoryLocations[locationId]
  const cat = prod ? memoryCategories.find((c) => c.name === prod.category) : undefined

  return {
    product_id: productId,
    location_id: locationId,
    qty_on_hand: 0,
    earliest_expiry_date: null,
    last_movement_at: null,
    sku_code: prod?.sku_code ?? 'SKU',
    product_name: prod?.name ?? 'Unknown product',
    sale_price: prod?.sale_price ?? 0,
    cost_price: prod?.cost_price ?? 0,
    product_status: 'active',
    is_perishable: prod?.is_perishable ?? false,
    category_id: cat?.id ?? '',
    category_name: cat?.name ?? prod?.category ?? 'Uncategorized',
    unit_name: prod?.unit ?? 'units',
    location_name: loc?.name ?? locationId,
    location_type: loc?.type ?? 'store',
    safety_stock: prod?.default_safety_stock ?? 0,
    reorder_point: prod?.default_reorder_point ?? 0,
    target_level: prod?.default_target_level ?? 0,
    auto_order_enabled: false,
    stock_status: computeStockStatus(0, prod?.default_reorder_point ?? 0, prod?.default_target_level ?? 0),
  }
}

interface MemoryMovementParams {
  productId: string
  locationId: string
  type: InventoryMovementType
  qty: number
  reason?: string | null
  notes?: string | null
  poId?: string | null
  poLineId?: string | null
  earliestExpiryDate?: string | null
  transferRef?: string | null
  createdBy?: string | null
}

/**
 * Apply a mutation to the in-memory ledger: updates qty_on_hand, snapshots the
 * before/after, records an append-only movement, and refreshes stock status.
 */
export function applyMemoryStockMovement(params: MemoryMovementParams): LocalStockMovement {
  const {
    productId,
    locationId,
    type,
    qty,
    reason,
    notes,
    poId,
    poLineId,
    earliestExpiryDate,
    transferRef,
    createdBy,
  } = params

  const item = memoryInventory.find((i) => i.product_id === productId && i.location_id === locationId)
  const qtyBefore = item?.qty_on_hand ?? 0
  const qtyAfter = qtyBefore + qty

  if (qtyAfter < 0) {
    throw new AppError(
      409,
      `Insufficient stock for ${type}: on-hand is ${qtyBefore} but the operation requires ${-qty} more.`,
      'INSUFFICIENT_STOCK',
    )
  }

  let row = item
  if (!row) {
    row = buildInventoryRow(productId, locationId)
    memoryInventory.push(row)
  }
  row.qty_on_hand = qtyAfter
  row.last_movement_at = new Date().toISOString()
  if (earliestExpiryDate) {
    row.earliest_expiry_date = earliestExpiryDate
  }
  row.stock_status = computeStockStatus(row.qty_on_hand, row.reorder_point, row.target_level)

  const movement: LocalStockMovement = {
    id: crypto.randomUUID(),
    product_id: productId,
    location_id: locationId,
    type,
    qty,
    qty_before: qtyBefore,
    qty_after: qtyAfter,
    sale_id: null,
    po_id: poId ?? null,
    po_line_id: poLineId ?? null,
    return_id: null,
    transfer_ref: transferRef ?? null,
    reason: reason ?? null,
    notes: notes ?? null,
    created_by: createdBy ?? null,
    created_at: new Date().toISOString(),
  }
  memoryMovements.unshift(movement)
  return movement
}

export interface StockActor {
  id?: string | null
  email?: string | null
  role?: Role | null
}

export interface MutateStockParams {
  productId: string
  locationId: string
  type: 'stock_in' | 'stock_out' | 'adjustment' | 'po_receipt'
  qty: number
  reason?: string | null
  notes?: string | null
  poId?: string | null
  poLineId?: string | null
  earliestExpiryDate?: string | null
  transferRef?: string | null
  actor?: StockActor
}

/**
 * Single stock mutation entry point. Attempts the real DB RPC when Supabase is
 * configured, then always applies the in-memory ledger so the mock demo is
 * consistent. Returns the recorded movement.
 */
export async function mutateStock(params: MutateStockParams): Promise<LocalStockMovement> {
  const {
    productId,
    locationId,
    type,
    qty,
    reason,
    notes,
    poId,
    poLineId,
    earliestExpiryDate,
    transferRef,
    actor,
  } = params

  if (!isKnownProduct(productId)) {
    throw new AppError(404, 'Product not found', 'NOT_FOUND')
  }

  let persistedMovementId: string | null = null

  if (!isMockSupabase) {
    try {
      const { data, error } = await db.rpc('fn_mutate_stock', {
        p_product_id: productId,
        p_location_id: locationId,
        p_type: type,
        p_qty: qty,
        p_created_by: actor?.id ?? null,
        p_reason: reason ?? null,
        p_notes: notes ?? null,
        p_sale_id: null,
        p_sale_line_id: null,
        p_po_id: poId ?? null,
        p_po_line_id: poLineId ?? null,
        p_return_id: null,
        p_transfer_ref: transferRef ?? null,
        p_earliest_expiry_date: earliestExpiryDate ?? null,
      })
      if (error) {
        if (/insufficient/i.test(error.message ?? '')) {
          throw new AppError(409, 'Insufficient stock for this operation', 'INSUFFICIENT_STOCK')
        }
        throw error
      }
      persistedMovementId = (data as string) ?? null
    } catch (err) {
      if (err instanceof AppError) throw err
      // Fall back to the in-memory ledger
    }
  }

  const movement = applyMemoryStockMovement({
    productId,
    locationId,
    type,
    qty,
    reason,
    notes,
    poId,
    poLineId,
    earliestExpiryDate,
    transferRef,
    createdBy: actor?.id ?? null,
  })
  if (persistedMovementId) {
    movement.id = persistedMovementId
  }

  await recordAuditLog({
    actorId: actor?.id ?? null,
    actorEmail: actor?.email ?? null,
    actorRole: actor?.role ?? null,
    action: type === 'po_receipt' ? 'stock_in' : type === 'adjustment' ? 'stock_adjustment' : type,
    entity: 'inventory',
    entityId: `${productId}::${locationId}`,
    detail: {
      location_id: locationId,
      type,
      qty,
      qty_before: movement.qty_before,
      qty_after: movement.qty_after,
      po_id: poId ?? null,
      reason: reason ?? null,
      persisted_in_db: Boolean(persistedMovementId),
    },
  })

  return movement
}

export interface TransferStockParams {
  productId: string
  sourceLocationId: string
  destinationLocationId: string
  qty: number
  notes?: string | null
  actor?: StockActor
}

/** Atomic transfer: source out (negative) + destination in (positive), paired by transfer_ref. */
export async function transferStock(params: TransferStockParams): Promise<{
  transfer_ref: string
  source_movement_id: string
  dest_movement_id: string
}> {
  const { productId, sourceLocationId, destinationLocationId, qty, notes, actor } = params

  if (sourceLocationId === destinationLocationId) {
    throw new AppError(400, 'Source and destination locations must differ', 'INVALID_TRANSFER')
  }
  if (qty <= 0) {
    throw new AppError(400, 'Transfer quantity must be greater than 0', 'INVALID_QUANTITY')
  }
  if (!isKnownProduct(productId)) {
    throw new AppError(404, 'Product not found', 'NOT_FOUND')
  }

  let persistedRef: string | null = null
  if (!isMockSupabase) {
    try {
      const { data, error } = await db.rpc('fn_transfer_stock', {
        p_product_id: productId,
        p_source_loc_id: sourceLocationId,
        p_dest_loc_id: destinationLocationId,
        p_qty: qty,
        p_created_by: actor?.id ?? null,
        p_notes: notes ?? null,
      })
      if (error) {
        if (/insufficient/i.test(error.message ?? '')) {
          throw new AppError(409, 'Insufficient stock for this transfer', 'INSUFFICIENT_STOCK')
        }
        throw error
      }
      persistedRef = (data as string) ?? null
    } catch (err) {
      if (err instanceof AppError) throw err
      // Fall back to the in-memory ledger
    }
  }

  const transferRef = persistedRef ?? crypto.randomUUID()
  const sourceMv = applyMemoryStockMovement({
    productId,
    locationId: sourceLocationId,
    type: 'transfer_out',
    qty: -qty,
    notes,
    transferRef,
    createdBy: actor?.id ?? null,
  })
  const destMv = applyMemoryStockMovement({
    productId,
    locationId: destinationLocationId,
    type: 'transfer_in',
    qty,
    notes,
    transferRef,
    createdBy: actor?.id ?? null,
  })

  await recordAuditLog({
    actorId: actor?.id ?? null,
    actorEmail: actor?.email ?? null,
    actorRole: actor?.role ?? null,
    action: 'stock_transfer',
    entity: 'inventory',
    entityId: `${productId}::${sourceLocationId}->${destinationLocationId}`,
    detail: {
      product_id: productId,
      source_location_id: sourceLocationId,
      destination_location_id: destinationLocationId,
      qty,
      transfer_ref: transferRef,
      persisted_in_db: Boolean(persistedRef),
    },
  })

  return { transfer_ref: transferRef, source_movement_id: sourceMv.id, dest_movement_id: destMv.id }
}

export interface ListMovementsQuery {
  productId?: string
  locationId?: string
  type?: InventoryMovementType
  limit?: number
  offset?: number
}

function enrichMovement(m: LocalStockMovement): LocalStockMovement & {
  product_name: string
  sku_code: string
  location_name: string
} {
  const prod = memoryProductsList[m.product_id]
  const stockRow = memoryInventory.find((i) => i.product_id === m.product_id)
  return {
    ...m,
    product_name: prod?.name ?? stockRow?.product_name ?? m.product_id,
    sku_code: prod?.sku_code ?? stockRow?.sku_code ?? '—',
    location_name: memoryLocations[m.location_id]?.name ?? m.location_id,
  }
}

/** List stock movements (newest first) with product/location labels. */
export async function queryMovements(
  query: ListMovementsQuery,
  callerRole?: Role,
  callerStoreId?: string | null,
): Promise<{ movements: LocalStockMovement[]; total: number; limit: number; offset: number }> {
  const limit = query.limit ?? 50
  const offset = query.offset ?? 0

  try {
    if (!isMockSupabase) {
      let q = db
        .from('stock_movements')
        .select('*, products(name, sku_code), locations(name)', { count: 'exact' })

      if (callerRole === 'store_staff' && callerStoreId) {
        const { data: storeLocs } = await db
          .from('locations')
          .select('id')
          .eq('store_id', callerStoreId)
        const locIds = (storeLocs ?? []).map((l) => l.id as string)
        if (locIds.length) {
          q = q.in('location_id', locIds)
        }
      }

      if (query.productId) {
        q = q.eq('product_id', query.productId)
      }
      if (query.locationId) {
        q = q.eq('location_id', query.locationId)
      }
      if (query.type) {
        q = q.eq('type', query.type)
      }

      q = q.order('created_at', { ascending: false }).range(offset, offset + limit - 1)

      const { data, count, error } = await q
      if (!error && data && data.length > 0) {
        const movements: LocalStockMovement[] = data.map((row) => {
          const prodJoin = (row.products as { name?: string; sku_code?: string } | null) ?? null
          const locJoin = (row.locations as { name?: string } | null) ?? null
          return {
            id: String(row.id),
            product_id: String(row.product_id),
            location_id: String(row.location_id),
            type: row.type as InventoryMovementType,
            qty: Number(row.qty ?? 0),
            qty_before: row.qty_before != null ? Number(row.qty_before) : null,
            qty_after: row.qty_after != null ? Number(row.qty_after) : null,
            sale_id: (row.sale_id as string) ?? null,
            po_id: (row.po_id as string) ?? null,
            po_line_id: (row.po_line_id as string) ?? null,
            return_id: (row.return_id as string) ?? null,
            transfer_ref: (row.transfer_ref as string) ?? null,
            reason: (row.reason as string) ?? null,
            notes: (row.notes as string) ?? null,
            created_by: (row.created_by as string) ?? null,
            created_at: row.created_at as string,
            product_name: prodJoin?.name ?? String(row.product_id),
            sku_code: prodJoin?.sku_code ?? '—',
            location_name: locJoin?.name ?? String(row.location_id),
          }
        })
        return { movements, total: count ?? movements.length, limit, offset }
      }
    }
  } catch {
    // Fall back to in-memory ledger
  }

  let filtered = [...memoryMovements]

  if (query.productId) {
    filtered = filtered.filter((m) => m.product_id === query.productId)
  }
  if (query.locationId) {
    filtered = filtered.filter((m) => m.location_id === query.locationId)
  }
  if (query.type) {
    filtered = filtered.filter((m) => m.type === query.type)
  }

  filtered.sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
  const paged = filtered.slice(offset, offset + limit)

  return {
    movements: paged.map(enrichMovement),
    total: filtered.length,
    limit,
    offset,
  }
}
