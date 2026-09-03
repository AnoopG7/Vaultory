import { Router } from 'express'
import { supabase } from '../../config/index.js'
import {
  AppError,
  assertFound,
  asyncHandler,
  requireAuth,
  validate,
  validated,
} from '../../middleware/index.js'
import {
  CreateSaleRequest,
  ListSalesQuery,
  SaleIdParam,
  VoidSaleRequest,
} from '../../lib/schemas/index.js'

const router = Router()

/**
 * Roles allowed to record a sale (BRD §12).
 * Sales personnel (and Admin) record sales; store staff only manage stock.
 */
const SALE_WRITE_ROLES = ['admin', 'sales_personnel']

/**
 * Map a sale's business store to its physical store-location (sales reference
 * `stores`, while inventory lives on `locations` via locations.store_id).
 */
async function getStoreLocationId(storeId: string): Promise<string> {
  const { data, error } = await supabase
    .from('locations')
    .select('id')
    .eq('store_id', storeId)
    .eq('type', 'store')
    .maybeSingle()
  if (error) throw new AppError(500, 'Failed to resolve store location', 'DB_ERROR')
  if (!data) throw new AppError(400, 'Store has no physical location', 'NO_STORE_LOCATION')
  return data.id
}

/** Assert the caller may record sales (server-side RBAC per BRD §12). */
function assertCanWriteSale(role: string | undefined): void {
  if (!role || !SALE_WRITE_ROLES.includes(role)) {
    throw new AppError(403, 'You do not have permission to record sales', 'FORBIDDEN')
  }
}

// ---------------------------------------------------------------------------
// POST /api/sales — record a sale (auto stock deduction)
// ---------------------------------------------------------------------------
router.post(
  '/sales',
  requireAuth,
  validate(CreateSaleRequest),
  asyncHandler(async (req, res) => {
    assertCanWriteSale(req.role)

    const { store_id, sale_datetime, discount, notes, lines } = validated(
      req,
      'body',
      CreateSaleRequest,
    )

    // Resolve the physical store location (inventory is keyed by location).
    const locationId = await getStoreLocationId(store_id)

    // Pre-flight stock sufficiency check: fail fast (409) before writing anything,
    // avoiding partial sale + stock writes if a line exceeds on-hand stock.
    const insufficient: string[] = []
    const productIds = [...new Set(lines.map((l) => l.product_id))]
    const { data: stockRows, error: stockRowsErr } = await supabase
      .from('inventory')
      .select('product_id, qty_on_hand')
      .eq('location_id', locationId)
      .in('product_id', productIds)
    if (stockRowsErr) throw new AppError(500, 'Failed to validate stock', 'DB_ERROR')
    const onHand = new Map(
      (stockRows ?? []).map((r) => [r.product_id as string, Number(r.qty_on_hand ?? 0)]),
    )
    for (const line of lines) {
      const available = onHand.get(line.product_id) ?? 0
      if (line.qty > available + 1e-9) insufficient.push(line.product_id)
    }
    if (insufficient.length > 0) {
      const { data: prodNames, error: prodNamesErr } = await supabase
        .from('products')
        .select('sku_code, name')
        .in('id', insufficient)
      if (prodNamesErr) throw new AppError(500, 'Failed to load product', 'DB_ERROR')
      const label = (prodNames ?? [])
        .map((p) => `${p.name as string} (${p.sku_code as string})`)
        .join(', ')
      throw new AppError(409, `Insufficient stock for: ${label}`, 'INSUFFICIENT_STOCK')
    }

    // Insert the sale header (totals are computed by DB triggers from lines).
    const { data: sale, error: saleError } = await supabase
      .from('sales')
      .insert({
        store_id,
        sale_datetime: sale_datetime ?? new Date().toISOString(),
        discount,
        notes,
        created_by: req.userId,
      })
      .select(
        'id, sale_number, store_id, sale_datetime, total_items, total_qty, subtotal, discount, total, status, notes, created_at',
      )
      .single()
    if (saleError) throw new AppError(500, 'Failed to create sale', 'DB_ERROR')
    const saleId = (sale as { id: string }).id

    // Insert line items. unit_price defaults to the product's sale price.
    let fallbackError: string | null = null
    const insertLines = lines.map(async (line) => {
      // Resolve unit price: explicit override, else the product's sale_price.
      let unitPrice = line.unit_price
      if (unitPrice == null) {
        const { data: prod, error: prodErr } = await supabase
          .from('products')
          .select('sale_price')
          .eq('id', line.product_id)
          .maybeSingle()
        if (prodErr) throw new AppError(500, 'Failed to load product', 'DB_ERROR')
        if (!prod) throw new AppError(404, `Product ${line.product_id} not found`)
        unitPrice = Number((prod as { sale_price: string }).sale_price)
      }

      const { data: saleLine, error: lineError } = await supabase
        .from('sale_lines')
        .insert({
          sale_id: saleId,
          product_id: line.product_id,
          qty: line.qty,
          unit_price: unitPrice,
        })
        .select('id, product_id, qty, unit_price')
        .single()
      if (lineError) {
        fallbackError = lineError.message
        return null
      }

      // Deduct stock at the sale's store location (atomic, no-negative guard).
      const { error: stockError } = await supabase.rpc('fn_mutate_stock', {
        p_product_id: line.product_id,
        p_location_id: locationId,
        p_type: 'sale',
        p_qty: -line.qty,
        p_created_by: req.userId,
        p_reason: 'sale',
        p_sale_id: saleId,
        p_sale_line_id: (saleLine as { id: string }).id,
      })
      if (stockError) {
        // Resource contention / insufficient stock at the DB layer.
        throw new AppError(409, stockError.message, 'INSUFFICIENT_STOCK')
      }
      return saleLine
    })

    await Promise.all(insertLines)
    if (fallbackError) {
      throw new AppError(500, fallbackError, 'DB_ERROR')
    }

    // Reload the freshly-computed sale (totals recomputed by triggers).
    const { data: fullSale, error: reloadError } = await supabase
      .from('sales')
      .select('*')
      .eq('id', saleId)
      .single()
    if (reloadError) throw new AppError(500, 'Failed to load sale', 'DB_ERROR')

    res.status(201).json({ sale: fullSale })
  }),
)

// ---------------------------------------------------------------------------
// GET /api/sales — list sales with filters + pagination
// ---------------------------------------------------------------------------
router.get(
  '/sales',
  requireAuth,
  validate(ListSalesQuery, 'query'),
  asyncHandler(async (req, res) => {
    const { store_id, from, to, status, limit, offset } = validated(
      req,
      'query',
      ListSalesQuery,
    )

    // Store Staff are scoped to their own store (BRD §12: view own store).
    if (req.role === 'store_staff' && req.storeId && store_id && store_id !== req.storeId) {
      throw new AppError(403, 'You can only view your own store', 'FORBIDDEN')
    }
    const effectiveStore = req.role === 'store_staff' && req.storeId ? req.storeId : store_id

    let query = supabase
      .from('sales')
      .select(
        'id, sale_number, store_id, sale_datetime, total_items, total_qty, subtotal, discount, total, status, notes, created_at',
        { count: 'exact' },
      )
      .order('sale_datetime', { ascending: false })
      .range(offset, offset + limit - 1)

    if (effectiveStore) query = query.eq('store_id', effectiveStore)
    if (from) query = query.gte('sale_datetime', from)
    if (to) query = query.lte('sale_datetime', to)
    if (status) query = query.eq('status', status)

    const { data, error, count } = await query
    if (error) throw new AppError(500, 'Failed to list sales', 'DB_ERROR')

    res.json({ sales: data, total: count ?? 0, limit, offset })
  }),
)

// ---------------------------------------------------------------------------
// GET /api/sales/:id — sale detail with line items
// ---------------------------------------------------------------------------
router.get(
  '/sales/:id',
  requireAuth,
  validate(SaleIdParam, 'params'),
  asyncHandler(async (req, res) => {
    const { id } = validated(req, 'params', SaleIdParam)

    const { data: sale, error: saleError } = await supabase
      .from('sales')
      .select(
        'id, sale_number, store_id, sale_datetime, total_items, total_qty, subtotal, discount, total, status, notes, voided_at, void_reason, created_at',
      )
      .eq('id', id)
      .maybeSingle()
    if (saleError) throw new AppError(500, 'Failed to load sale', 'DB_ERROR')
    assertFound(sale as Record<string, unknown> | null, 'Sale')

    // Sale line items joined to product name/sku.
    const { data: lines, error: linesError } = await supabase
      .from('sale_lines')
      .select('id, product_id, qty, unit_price, line_total, products(sku_code, name)')
      .eq('sale_id', id)
      .order('created_at', { ascending: true })
    if (linesError) throw new AppError(500, 'Failed to load sale lines', 'DB_ERROR')

    res.json({ sale, lines })
  }),
)

// ---------------------------------------------------------------------------
// POST /api/sales/:id/void — Admin-only, restores stock, marks voided
// ---------------------------------------------------------------------------
router.post(
  '/sales/:id/void',
  requireAuth,
  validate(SaleIdParam, 'params'),
  validate(VoidSaleRequest),
  asyncHandler(async (req, res) => {
    if (req.role !== 'admin') {
      throw new AppError(403, 'Only an admin can void a sale', 'FORBIDDEN')
    }

    const { id } = validated(req, 'params', SaleIdParam)
    const { reason } = validated(req, 'body', VoidSaleRequest)

    // Load the sale; must be active to void.
    const { data: sale, error: saleError } = await supabase
      .from('sales')
      .select('id, store_id, status')
      .eq('id', id)
      .maybeSingle()
    if (saleError) throw new AppError(500, 'Failed to load sale', 'DB_ERROR')
    const found = assertFound(sale as Record<string, unknown> | null, 'Sale')
    if (found.status === 'voided') {
      throw new AppError(409, 'Sale is already voided', 'ALREADY_VOIDED')
    }

    const locationId = await getStoreLocationId(found.store_id as string)

    // Load the sale lines.
    const { data: lines, error: linesError } = await supabase
      .from('sale_lines')
      .select('id, product_id, qty')
      .eq('sale_id', id)
    if (linesError) throw new AppError(500, 'Failed to load sale lines', 'DB_ERROR')

    // Restore stock for each line (positive qty, movement type sale_void).
    for (const line of lines ?? []) {
      const { error: stockError } = await supabase.rpc('fn_mutate_stock', {
        p_product_id: line.product_id,
        p_location_id: locationId,
        p_type: 'sale_void',
        p_qty: line.qty,
        p_created_by: req.userId,
        p_reason: `void: ${reason}`,
        p_sale_id: id,
        p_sale_line_id: line.id,
      })
      if (stockError) throw new AppError(409, stockError.message, 'STOCK_ERROR')
    }

    // Mark the sale voided.
    const { error: voidError } = await supabase
      .from('sales')
      .update({
        status: 'voided',
        voided_by: req.userId,
        voided_at: new Date().toISOString(),
        void_reason: reason,
      })
      .eq('id', id)
    if (voidError) throw new AppError(500, 'Failed to void sale', 'DB_ERROR')

    res.json({ message: 'Sale voided and stock restored' })
  }),
)

export default router
