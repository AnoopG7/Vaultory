import { env, supabase } from '../../config/index.js'
import { AppError } from '../../middleware/index.js'
import type { Role } from '../../middleware/auth.js'
import { recordAuditLog } from '../users/users.store.js'
import { memoryInventory, computeStockStatus } from '../inventory/inventory.store.js'
import type { CreateSaleInput, ReturnSaleInput, VoidSaleInput } from '../../lib/schemas/sales.js'

export interface LocalSaleLine {
  id: string
  sale_id: string
  product_id: string
  qty: number
  unit_price: number
  line_total: number
  created_at: string
  products?: {
    sku_code: string
    name: string
  } | null
}

export interface LocalSale {
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
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface LocalSaleReturnLine {
  id: string
  return_id: string
  sale_line_id: string
  product_id: string
  qty_returned: number
  unit_price: number
  line_refund: number
  created_at: string
}

export interface LocalSaleReturn {
  id: string
  sale_id: string
  store_id: string
  return_datetime: string
  reason: string
  refund_amount: number
  created_by: string | null
  notes: string | null
  created_at: string
  lines?: LocalSaleReturnLine[]
}

const isMockSupabase = !env.SUPABASE_URL || env.SUPABASE_URL.includes('mock') || env.SUPABASE_URL.includes('localhost')

const STORE_LOCATIONS: Record<string, string> = {
  'e1000000-0000-0000-0000-000000000001': 'a1000000-0000-0000-0000-000000000001',
  'e1000000-0000-0000-0000-000000000002': 'a1000000-0000-0000-0000-000000000002',
  'e1000000-0000-0000-0000-000000000003': 'a1000000-0000-0000-0000-000000000003',
}

// In-memory seeds
export const memorySales: LocalSale[] = [
  {
    id: 's1000000-0000-0000-0000-000000000001',
    sale_number: 'SALE-2026-0001',
    store_id: 'e1000000-0000-0000-0000-000000000001',
    sale_datetime: '2026-09-08T11:20:00Z',
    total_items: 2,
    total_qty: 3,
    subtotal: 1997.0,
    discount: 0.0,
    total: 1997.0,
    status: 'active',
    notes: 'POS Counter 1 · Cash payment',
    voided_by: null,
    voided_at: null,
    void_reason: null,
    created_by: '00000000-0000-0000-0000-000000000001',
    created_at: '2026-09-08T11:20:00Z',
    updated_at: '2026-09-08T11:20:00Z',
  },
  {
    id: 's1000000-0000-0000-0000-000000000002',
    sale_number: 'SALE-2026-0002',
    store_id: 'e1000000-0000-0000-0000-000000000002',
    sale_datetime: '2026-09-09T14:45:00Z',
    total_items: 1,
    total_qty: 3,
    subtotal: 1797.0,
    discount: 100.0,
    total: 1697.0,
    status: 'active',
    notes: 'Promo discount applied · UPI payment',
    voided_by: null,
    voided_at: null,
    void_reason: null,
    created_by: '00000000-0000-0000-0000-000000000001',
    created_at: '2026-09-09T14:45:00Z',
    updated_at: '2026-09-09T14:45:00Z',
  },
]

export const memorySaleLines: LocalSaleLine[] = [
  {
    id: 'sl100000-0000-0000-0000-000000000001',
    sale_id: 's1000000-0000-0000-0000-000000000001',
    product_id: 'd1000000-0000-0000-0000-000000000001',
    qty: 2,
    unit_price: 249.0,
    line_total: 498.0,
    created_at: '2026-09-08T11:20:00Z',
    products: {
      sku_code: 'PELEC-001',
      name: 'USB-C Charging Cable 1m',
    },
  },
  {
    id: 'sl100000-0000-0000-0000-000000000002',
    sale_id: 's1000000-0000-0000-0000-000000000001',
    product_id: 'd1000000-0000-0000-0000-000000000002',
    qty: 1,
    unit_price: 1499.0,
    line_total: 1499.0,
    created_at: '2026-09-08T11:20:00Z',
    products: {
      sku_code: 'PELEC-002',
      name: 'Wireless Earbuds Pro',
    },
  },
  {
    id: 'sl100000-0000-0000-0000-000000000003',
    sale_id: 's1000000-0000-0000-0000-000000000002',
    product_id: 'd1000000-0000-0000-0000-000000000003',
    qty: 3,
    unit_price: 599.0,
    line_total: 1797.0,
    created_at: '2026-09-09T14:45:00Z',
    products: {
      sku_code: 'PCLOT-001',
      name: 'Cotton T-Shirt Crew Neck M',
    },
  },
]

export const memorySaleReturns: LocalSaleReturn[] = []
export const memorySaleReturnLines: LocalSaleReturnLine[] = []

let saleCounter = 100

/**
 * Resolve store ID to location ID.
 */
export async function getStoreLocationId(storeId: string): Promise<string> {
  if (!isMockSupabase) {
    try {
      const { data, error } = await supabase
        .from('locations')
        .select('id')
        .eq('store_id', storeId)
        .eq('type', 'store')
        .maybeSingle()

      if (!error && data?.id) {
        return data.id as string
      }
    } catch {
      // Fallback
    }
  }

  const fallback = STORE_LOCATIONS[storeId]
  if (fallback) return fallback

  throw new AppError(400, `Store ${storeId} has no physical location`, 'NO_STORE_LOCATION')
}

/**
 * Mutate stock in memory store with status update.
 */
export function mutateMemoryStock(productId: string, locationId: string, qtyDelta: number): void {
  const item = memoryInventory.find(
    (i) => i.product_id === productId && i.location_id === locationId,
  )
  if (item) {
    item.qty_on_hand = Math.max(0, item.qty_on_hand + qtyDelta)
    item.last_movement_at = new Date().toISOString()
    item.stock_status = computeStockStatus(item.qty_on_hand, item.reorder_point, item.target_level)
  }
}

/**
 * Record a sale with stock deduction, pre-flight check, and audit log.
 */
export async function createSaleTransaction(
  payload: CreateSaleInput,
  actor: { id?: string; email?: string; role?: Role },
  clientMeta: { ip?: string; userAgent?: string } = {},
): Promise<LocalSale> {
  const { storeId, saleDatetime, discount, notes, lines } = payload
  const locationId = await getStoreLocationId(storeId)

  // 1. Pre-flight stock sufficiency check
  const insufficient: string[] = []
  const productIds = [...new Set(lines.map((l) => l.productId))]

  // Check Supabase or memory
  let onHandMap = new Map<string, number>()
  if (!isMockSupabase) {
    try {
      const { data: stockRows, error: stockRowsErr } = await supabase
        .from('inventory')
        .select('product_id, qty_on_hand')
        .eq('location_id', locationId)
        .in('product_id', productIds)

      if (!stockRowsErr && stockRows && stockRows.length > 0) {
        onHandMap = new Map(stockRows.map((r) => [r.product_id as string, Number(r.qty_on_hand ?? 0)]))
      }
    } catch {
      // Fallback
    }
  }

  if (onHandMap.size === 0) {
    // Check in-memory inventory
    for (const pid of productIds) {
      const mem = memoryInventory.find((i) => i.product_id === pid && i.location_id === locationId)
      onHandMap.set(pid, mem ? mem.qty_on_hand : 0)
    }
  }

  for (const line of lines) {
    const available = onHandMap.get(line.productId) ?? 0
    if (line.qty > available + 1e-9) {
      insufficient.push(line.productId)
    }
  }

  if (insufficient.length > 0) {
    const names = insufficient
      .map((pid) => {
        const found = memoryInventory.find((i) => i.product_id === pid)
        return found ? `${found.product_name} (${found.sku_code})` : pid
      })
      .join(', ')
    throw new AppError(409, `Insufficient stock for: ${names}`, 'INSUFFICIENT_STOCK')
  }

  // 2. Compute sale totals
  let computedSubtotal = 0
  let computedTotalQty = 0
  const lineDetails = lines.map((line) => {
    let unitPrice = line.unitPrice
    if (unitPrice == null) {
      const p = memoryInventory.find((i) => i.product_id === line.productId)
      unitPrice = p ? p.sale_price : 0
    }
    const lineTotal = Number((line.qty * unitPrice).toFixed(2))
    computedSubtotal += lineTotal
    computedTotalQty += line.qty
    return {
      product_id: line.productId,
      qty: line.qty,
      unit_price: unitPrice,
      line_total: lineTotal,
    }
  })

  const effectiveDiscount = Math.min(discount ?? 0, computedSubtotal)
  const effectiveTotal = Number((computedSubtotal - effectiveDiscount).toFixed(2))
  const saleId = `s-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
  saleCounter++
  const saleNumber = `SALE-2026-${String(saleCounter).padStart(4, '0')}`
  const now = saleDatetime ?? new Date().toISOString()

  let dbPersisted = false
  let dbSaleRecord: LocalSale | null = null

  // Persist to Supabase. Header is inserted with discount 0 (no lines exist
  // yet, so chk_sale_total demands total = subtotal - discount = 0); discount
  // and its recompute are applied via UPDATE only after the lines exist.
  if (!isMockSupabase) {
    // Allocate the next sale number from the DB's own sequence (the
    // generate_sale_number() helper is exposed as a PostgREST RPC). Passing it
    // explicitly keeps inserts working even where the sales_assign_sale_number
    // trigger is not (yet) installed.
    const { data: nextSaleNumber, error: seqError } = await supabase.rpc('generate_sale_number')
    if (seqError || !nextSaleNumber) {
      throw new AppError(500, `Failed to allocate sale number: ${seqError?.message ?? 'no number returned'}`, 'DB_ERROR')
    }

    const { data: dbSale, error: saleError } = await supabase
      .from('sales')
      .insert({
        sale_number: String(nextSaleNumber),
        store_id: storeId,
        sale_datetime: now,
        discount: 0,
        notes: notes ?? null,
        created_by: actor.id ?? null,
      })
      .select('id, sale_number, store_id, sale_datetime, total_items, total_qty, subtotal, discount, total, status, notes, created_at')
      .single()

    if (saleError || !dbSale) {
      throw new AppError(500, `Failed to create sale: ${saleError?.message ?? 'no sale returned'}`, 'DB_ERROR')
    }

    const realSaleId = (dbSale as { id: string }).id

    // Insert lines & mutate stock
    for (const ld of lineDetails) {
      const { data: sLine, error: sLineError } = await supabase
        .from('sale_lines')
        .insert({
          sale_id: realSaleId,
          product_id: ld.product_id,
          qty: ld.qty,
          unit_price: ld.unit_price,
        })
        .select('id')
        .single()

      if (sLineError || !sLine) {
        throw new AppError(500, `Failed to persist sale line: ${sLineError?.message ?? 'no line returned'}`, 'DB_ERROR')
      }

      const { error: stockError } = await supabase.rpc('fn_mutate_stock', {
        p_product_id: ld.product_id,
        p_location_id: locationId,
        p_type: 'sale',
        p_qty: -ld.qty,
        p_created_by: actor.id ?? null,
        p_reason: 'sale',
        p_sale_id: realSaleId,
        p_sale_line_id: (sLine as { id: string }).id,
      })
      if (stockError) {
        throw new AppError(500, `Failed to update stock: ${stockError.message}`, 'DB_ERROR')
      }
    }

    // Apply discount now that lines exist so the recompute trigger can total it.
    if (effectiveDiscount > 0) {
      const { error: discountError } = await supabase
        .from('sales')
        .update({ discount: effectiveDiscount })
        .eq('id', realSaleId)
      if (discountError) {
        throw new AppError(500, `Failed to apply discount: ${discountError.message}`, 'DB_ERROR')
      }
    }

    const { data: finalSale, error: finalError } = await supabase
      .from('sales')
      .select('id, sale_number, store_id, sale_datetime, total_items, total_qty, subtotal, discount, total, status, notes, voided_at, void_reason, created_at')
      .eq('id', realSaleId)
      .single()

    if (finalError || !finalSale) {
      throw new AppError(500, `Failed to reload created sale: ${finalError?.message ?? 'no sale returned'}`, 'DB_ERROR')
    }

    dbSaleRecord = {
      ...(finalSale as LocalSale),
      voided_by: null,
      updated_at: now,
    }
    dbPersisted = true
  }

  // Deduct stock in memory store
  for (const ld of lineDetails) {
    mutateMemoryStock(ld.product_id, locationId, -ld.qty)
  }

  const createdSale: LocalSale = dbSaleRecord ?? {
    id: saleId,
    sale_number: saleNumber,
    store_id: storeId,
    sale_datetime: now,
    total_items: lineDetails.length,
    total_qty: computedTotalQty,
    subtotal: computedSubtotal,
    discount: effectiveDiscount,
    total: effectiveTotal,
    status: 'active',
    notes: notes ?? null,
    voided_by: null,
    voided_at: null,
    void_reason: null,
    created_by: actor.id ?? null,
    created_at: now,
    updated_at: now,
  }

  memorySales.unshift(createdSale)

  for (const ld of lineDetails) {
    const p = memoryInventory.find((i) => i.product_id === ld.product_id)
    memorySaleLines.push({
      id: `sl-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      sale_id: createdSale.id,
      product_id: ld.product_id,
      qty: ld.qty,
      unit_price: ld.unit_price,
      line_total: ld.line_total,
      created_at: now,
      products: p ? { sku_code: p.sku_code, name: p.product_name } : null,
    })
  }

  // Record audit log
  await recordAuditLog({
    actorId: actor.id ?? null,
    actorEmail: actor.email ?? null,
    actorRole: actor.role ?? null,
    action: 'sale_created',
    entity: 'sale',
    entityId: createdSale.id,
    detail: {
      sale_number: createdSale.sale_number,
      store_id: createdSale.store_id,
      items_count: lineDetails.length,
      total_qty: computedTotalQty,
      subtotal: computedSubtotal,
      discount: effectiveDiscount,
      total: effectiveTotal,
      persisted_in_db: dbPersisted,
    },
    ipAddress: clientMeta.ip,
    userAgent: clientMeta.userAgent,
  })

  return createdSale
}

/**
 * List sales with filters.
 */
export async function querySales(params: {
  store_id?: string
  from?: string
  to?: string
  status?: 'active' | 'voided'
  search?: string
  limit?: number
  offset?: number
}): Promise<{ sales: LocalSale[]; total: number }> {
  if (!isMockSupabase) {
    let query = supabase
      .from('sales')
      .select('id, sale_number, store_id, sale_datetime, total_items, total_qty, subtotal, discount, total, status, notes, voided_at, void_reason, created_at', { count: 'exact' })
      .order('sale_datetime', { ascending: false })

    if (params.store_id) query = query.eq('store_id', params.store_id)
    if (params.status) query = query.eq('status', params.status)
    if (params.from) query = query.gte('sale_datetime', params.from)
    if (params.to) query = query.lte('sale_datetime', params.to)

    const offset = params.offset ?? 0
    const limit = params.limit ?? 50
    query = query.range(offset, offset + limit - 1)

    const { data, count, error } = await query
    if (error) {
      throw new AppError(500, `Failed to load sales: ${error.message}`, 'DB_ERROR')
    }
    return {
      sales: (data ?? []) as LocalSale[],
      total: count ?? (data ?? []).length,
    }
  }

  let filtered = [...memorySales]
  if (params.store_id) filtered = filtered.filter((s) => s.store_id === params.store_id)
  if (params.status) filtered = filtered.filter((s) => s.status === params.status)
  if (params.from) filtered = filtered.filter((s) => s.sale_datetime >= (params.from as string))
  if (params.to) filtered = filtered.filter((s) => s.sale_datetime <= (params.to as string))

  if (params.search) {
    const term = params.search.toLowerCase()
    filtered = filtered.filter(
      (s) => s.sale_number.toLowerCase().includes(term) || (s.notes && s.notes.toLowerCase().includes(term)),
    )
  }

  const offset = params.offset ?? 0
  const limit = params.limit ?? 50
  return {
    sales: filtered.slice(offset, offset + limit),
    total: filtered.length,
  }
}

/**
 * Fetch detailed sale with line items and return history.
 */
export async function getSaleDetail(id: string): Promise<{
  sale: LocalSale
  lines: LocalSaleLine[]
  returns: LocalSaleReturn[]
}> {
  // Try Supabase first
  if (!isMockSupabase) {
    const { data: sale, error: saleError } = await supabase
      .from('sales')
      .select('id, sale_number, store_id, sale_datetime, total_items, total_qty, subtotal, discount, total, status, notes, voided_at, void_reason, created_at')
      .eq('id', id)
      .maybeSingle()

    if (saleError) {
      throw new AppError(500, `Failed to load sale: ${saleError.message}`, 'DB_ERROR')
    }
    if (sale) {
      const { data: lines } = await supabase
        .from('sale_lines')
        .select('id, product_id, qty, unit_price, line_total, products(sku_code, name)')
        .eq('sale_id', id)
        .order('created_at', { ascending: true })

      const { data: returns } = await supabase
        .from('sale_returns')
        .select('*')
        .eq('sale_id', id)
        .order('created_at', { ascending: false })

      return {
        sale: sale as LocalSale,
        lines: (lines ?? []).map((l) => {
          const p = Array.isArray(l.products) ? l.products[0] : l.products
          return {
            id: String(l.id),
            sale_id: id,
            product_id: String(l.product_id),
            qty: Number(l.qty),
            unit_price: Number(l.unit_price),
            line_total: Number(l.line_total),
            created_at: sale.created_at,
            products: p ? { sku_code: String(p.sku_code), name: String(p.name) } : null,
          }
          }),
          returns: (returns ?? []) as LocalSaleReturn[],
        }
      }
  }

  const foundSale = memorySales.find((s) => s.id === id)
  if (!foundSale) {
    throw new AppError(404, 'Sale not found', 'NOT_FOUND')
  }

  const lines = memorySaleLines.filter((l) => l.sale_id === id)
  const returns = memorySaleReturns.filter((r) => r.sale_id === id)

  return {
    sale: foundSale,
    lines,
    returns,
  }
}

/**
 * Void sale: restores stock and updates status.
 */
export async function voidSaleTransaction(
  id: string,
  payload: VoidSaleInput,
  actor: { id?: string; email?: string; role?: Role },
  clientMeta: { ip?: string; userAgent?: string } = {},
): Promise<{ message: string }> {
  const { reason } = payload

  const saleDetail = await getSaleDetail(id)
  if (saleDetail.sale.status === 'voided') {
    throw new AppError(409, 'Sale is already voided', 'ALREADY_VOIDED')
  }

  const locationId = await getStoreLocationId(saleDetail.sale.store_id)
  const now = new Date().toISOString()
  let dbPersisted = false

  // Compute quantities already returned per sale line, so a void only restores
  // what is still in customer hands (avoids over-crediting inventory).
  const returnedByLine = new Map<string, number>()
  if (!isMockSupabase) {
    const { data: dbReturns, error: returnsError } = await supabase
      .from('sale_returns')
      .select('id')
      .eq('sale_id', id)
    if (returnsError) {
      throw new AppError(500, `Failed to load sale returns: ${returnsError.message}`, 'DB_ERROR')
    }
    const returnIds = (dbReturns ?? []).map((r) => String(r.id))
    if (returnIds.length > 0) {
      const { data: rlines, error: rlinesErr } = await supabase
        .from('sale_return_lines')
        .select('sale_line_id, qty_returned')
        .in('return_id', returnIds)
      if (rlinesErr) {
        throw new AppError(500, `Failed to load return lines: ${rlinesErr.message}`, 'DB_ERROR')
      }
      for (const r of rlines ?? []) {
        const slId = String(r.sale_line_id)
        returnedByLine.set(slId, (returnedByLine.get(slId) ?? 0) + Number(r.qty_returned))
      }
    }
  } else {
    for (const rl of memorySaleReturnLines) {
      if (memorySaleReturns.some((r) => r.id === rl.return_id && r.sale_id === id)) {
        returnedByLine.set(rl.sale_line_id, (returnedByLine.get(rl.sale_line_id) ?? 0) + rl.qty_returned)
      }
    }
  }

  const restoreQtyByLine = new Map<string, number>()
  for (const line of saleDetail.lines) {
    restoreQtyByLine.set(line.id, Math.max(0, line.qty - (returnedByLine.get(line.id) ?? 0)))
  }

  if (!isMockSupabase) {
    for (const line of saleDetail.lines) {
      const restoreQty = restoreQtyByLine.get(line.id) ?? 0
      if (restoreQty <= 0) continue
      const { error: stockError } = await supabase.rpc('fn_mutate_stock', {
        p_product_id: line.product_id,
        p_location_id: locationId,
        p_type: 'sale_void',
        p_qty: restoreQty,
        p_created_by: actor.id ?? null,
        p_reason: `void: ${reason}`,
        p_sale_id: id,
        p_sale_line_id: line.id,
      })
      if (stockError) {
        throw new AppError(500, `Failed to restore stock: ${stockError.message}`, 'DB_ERROR')
      }
    }

    const { error: voidError } = await supabase
      .from('sales')
      .update({
        status: 'voided',
        voided_by: actor.id ?? null,
        voided_at: now,
        void_reason: reason,
      })
      .eq('id', id)

    if (voidError) {
      throw new AppError(500, `Failed to void sale: ${voidError.message}`, 'DB_ERROR')
    }
    dbPersisted = true
  }

  // In-memory stock restoration
  for (const line of saleDetail.lines) {
    const restoreQty = restoreQtyByLine.get(line.id) ?? 0
    if (restoreQty > 0) mutateMemoryStock(line.product_id, locationId, restoreQty)
  }

  const memSale = memorySales.find((s) => s.id === id)
  if (memSale) {
    memSale.status = 'voided'
    memSale.voided_by = actor.id ?? null
    memSale.voided_at = now
    memSale.void_reason = reason
    memSale.updated_at = now
  }

  // Record audit log
  await recordAuditLog({
    actorId: actor.id ?? null,
    actorEmail: actor.email ?? null,
    actorRole: actor.role ?? null,
    action: 'sale_voided',
    entity: 'sale',
    entityId: id,
    detail: {
      sale_number: saleDetail.sale.sale_number,
      store_id: saleDetail.sale.store_id,
      void_reason: reason,
      voided_at: now,
      restored_items: saleDetail.lines.length,
      persisted_in_db: dbPersisted,
    },
    ipAddress: clientMeta.ip,
    userAgent: clientMeta.userAgent,
  })

  return { message: 'Sale voided and stock restored' }
}

/**
 * Process a sale return: restores returned items to stock, creates return record, and logs audit.
 */
export async function processSaleReturnTransaction(
  saleId: string,
  payload: ReturnSaleInput,
  actor: { id?: string; email?: string; role?: Role },
  clientMeta: { ip?: string; userAgent?: string } = {},
): Promise<{ return: LocalSaleReturn; lines: LocalSaleReturnLine[] }> {
  const { reason, notes, lines } = payload

  const saleDetail = await getSaleDetail(saleId)
  if (saleDetail.sale.status === 'voided') {
    throw new AppError(409, 'Cannot return items from a voided sale', 'SALE_IS_VOIDED')
  }

  const locationId = await getStoreLocationId(saleDetail.sale.store_id)
  const returnId = `ret-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
  const now = new Date().toISOString()

  // Verify return lines and quantities against original sale lines and previous returns
  let previousReturns: LocalSaleReturnLine[] = []
  if (!isMockSupabase) {
    const { data: dbReturns, error: returnsError } = await supabase
      .from('sale_returns')
      .select('id')
      .eq('sale_id', saleId)
    if (returnsError) {
      throw new AppError(500, `Failed to load sale returns: ${returnsError.message}`, 'DB_ERROR')
    }
    const returnIds = (dbReturns ?? []).map((r) => String(r.id))
    if (returnIds.length > 0) {
      const { data: rlines, error: rlinesErr } = await supabase
        .from('sale_return_lines')
        .select('sale_line_id, qty_returned')
        .in('return_id', returnIds)
      if (rlinesErr) {
        throw new AppError(500, `Failed to load return lines: ${rlinesErr.message}`, 'DB_ERROR')
      }
      previousReturns = (rlines ?? []).map((r) => ({
        sale_line_id: String(r.sale_line_id),
        qty_returned: Number(r.qty_returned),
      })) as LocalSaleReturnLine[]
    }
  } else {
    previousReturns = memorySaleReturnLines.filter((rl) =>
      memorySaleReturns.some((r) => r.id === rl.return_id && r.sale_id === saleId),
    )
  }

  const returnLinesProcessed: LocalSaleReturnLine[] = []
  let totalRefund = 0

  for (const item of lines) {
    const origLine = saleDetail.lines.find((sl) => sl.id === item.saleLineId)
    if (!origLine) {
      throw new AppError(400, `Sale line ${item.saleLineId} does not exist on this sale`, 'LINE_NOT_FOUND')
    }
    if (origLine.product_id !== item.productId) {
      throw new AppError(400, `Product mismatch for line ${item.saleLineId}`, 'PRODUCT_MISMATCH')
    }

    const previouslyReturned = previousReturns
      .filter((pr) => pr.sale_line_id === item.saleLineId)
      .reduce((acc, curr) => acc + curr.qty_returned, 0)

    const remainingReturnable = origLine.qty - previouslyReturned
    if (item.qtyReturned > remainingReturnable + 1e-9) {
      throw new AppError(
        400,
        `Cannot return ${item.qtyReturned} of product. Only ${remainingReturnable} remaining returnable for this line.`,
        'RETURN_EXCEEDS_SOLD',
      )
    }

    const lineRefund = Number((item.qtyReturned * origLine.unit_price).toFixed(2))
    totalRefund += lineRefund

    returnLinesProcessed.push({
      id: `rtl-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      return_id: returnId,
      sale_line_id: item.saleLineId,
      product_id: item.productId,
      qty_returned: item.qtyReturned,
      unit_price: origLine.unit_price,
      line_refund: lineRefund,
      created_at: now,
    })
  }

  totalRefund = Number(totalRefund.toFixed(2))
  let dbPersisted = false

  // Persist return to Supabase
  if (!isMockSupabase) {
    const { data: dbReturn, error: returnError } = await supabase
      .from('sale_returns')
      .insert({
        sale_id: saleId,
        store_id: saleDetail.sale.store_id,
        return_datetime: now,
        reason,
        refund_amount: totalRefund,
        created_by: actor.id ?? null,
        notes: notes ?? null,
      })
      .select('*')
      .single()

    if (returnError || !dbReturn) {
      throw new AppError(500, `Failed to persist return: ${returnError?.message ?? 'no return returned'}`, 'DB_ERROR')
    }

    const realReturnId = (dbReturn as { id: string }).id

    for (const rl of returnLinesProcessed) {
      const { error: lineErr } = await supabase.from('sale_return_lines').insert({
        return_id: realReturnId,
        sale_line_id: rl.sale_line_id,
        product_id: rl.product_id,
        qty_returned: rl.qty_returned,
        unit_price: rl.unit_price,
      })
      if (lineErr) {
        throw new AppError(500, `Failed to persist return line: ${lineErr.message}`, 'DB_ERROR')
      }

      const { error: stockError } = await supabase.rpc('fn_mutate_stock', {
        p_product_id: rl.product_id,
        p_location_id: locationId,
        p_type: 'sale_return',
        p_qty: rl.qty_returned,
        p_created_by: actor.id ?? null,
        p_reason: `return: ${reason}`,
        p_sale_id: saleId,
        p_sale_line_id: rl.sale_line_id,
        p_return_id: realReturnId,
      })
      if (stockError) {
        throw new AppError(500, `Failed to restore returned stock: ${stockError.message}`, 'DB_ERROR')
      }
    }

    dbPersisted = true
  }

  // In-memory stock restoration
  for (const rl of returnLinesProcessed) {
    mutateMemoryStock(rl.product_id, locationId, rl.qty_returned)
    memorySaleReturnLines.push(rl)
  }

  const createdReturn: LocalSaleReturn = {
    id: returnId,
    sale_id: saleId,
    store_id: saleDetail.sale.store_id,
    return_datetime: now,
    reason,
    refund_amount: totalRefund,
    created_by: actor.id ?? null,
    notes: notes ?? null,
    created_at: now,
    lines: returnLinesProcessed,
  }

  memorySaleReturns.unshift(createdReturn)

  // Record audit log
  await recordAuditLog({
    actorId: actor.id ?? null,
    actorEmail: actor.email ?? null,
    actorRole: actor.role ?? null,
    action: 'sale_returned',
    entity: 'sale',
    entityId: saleId,
    detail: {
      return_id: returnId,
      sale_number: saleDetail.sale.sale_number,
      store_id: saleDetail.sale.store_id,
      reason,
      refund_amount: totalRefund,
      lines_count: returnLinesProcessed.length,
      persisted_in_db: dbPersisted,
    },
    ipAddress: clientMeta.ip,
    userAgent: clientMeta.userAgent,
  })

  return {
    return: createdReturn,
    lines: returnLinesProcessed,
  }
}

/**
 * List all sale returns.
 */
export async function querySaleReturns(params: {
  sale_id?: string
  store_id?: string
  limit?: number
  offset?: number
}): Promise<{ returns: LocalSaleReturn[]; total: number }> {
  if (!isMockSupabase) {
    let query = supabase
      .from('sale_returns')
      .select('id, sale_id, store_id, return_datetime, reason, refund_amount, created_at, notes', { count: 'exact' })
      .order('return_datetime', { ascending: false })

    if (params.sale_id) query = query.eq('sale_id', params.sale_id)
    if (params.store_id) query = query.eq('store_id', params.store_id)

    const offset = params.offset ?? 0
    const limit = params.limit ?? 50
    query = query.range(offset, offset + limit - 1)

    const { data, count, error } = await query
    if (error) {
      throw new AppError(500, `Failed to load sale returns: ${error.message}`, 'DB_ERROR')
    }
    return {
      returns: (data ?? []) as LocalSaleReturn[],
      total: count ?? (data ?? []).length,
    }
  }

  let filtered = [...memorySaleReturns]
  if (params.sale_id) filtered = filtered.filter((r) => r.sale_id === params.sale_id)
  if (params.store_id) filtered = filtered.filter((r) => r.store_id === params.store_id)

  const offset = params.offset ?? 0
  const limit = params.limit ?? 50
  return {
    returns: filtered.slice(offset, offset + limit),
    total: filtered.length,
  }
}

