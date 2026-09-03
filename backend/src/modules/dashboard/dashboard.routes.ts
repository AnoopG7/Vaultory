import { Router } from 'express'
import { supabase } from '../../config/index.js'
import { AppError, asyncHandler, requireAuth } from '../../middleware/index.js'

const router = Router()

/**
 * Dashboard module (BRD FR-MON-02 / Exec dashboard).
 * Aggregated KPIs + time series for sales & inventory health across all stores.
 *
 * Visibility: Admin + Senior Stakeholder see full aggregates. Sales personnel
 * see sales-focused KPIs. Store staff get only their own store (handled by
 * filtering where the caller is store-scoped).
 */

const EXEC_ROLES = ['admin', 'senior_stakeholder']

function isExec(role: string | undefined): boolean {
  return Boolean(role && EXEC_ROLES.includes(role))
}

// ---------------------------------------------------------------------------
// GET /api/dashboard/summary — aggregated KPIs
// ---------------------------------------------------------------------------
router.get(
  '/dashboard/summary',
  requireAuth,
  asyncHandler(async (req, res) => {
    const isExecView = isExec(req.role)

    // Today's date (UTC) for "today's sales".
    const todayStart = new Date()
    todayStart.setUTCHours(0, 0, 0, 0)

    // --- Sales aggregates -----------------------------------------------------
    // Today's active sales (sum of totals + count).
    const todaySalesQuery = supabase
      .from('sales')
      .select('total', { count: 'exact' })
      .eq('status', 'active')
      .gte('sale_datetime', todayStart.toISOString())

    const { data: todaySales, count: todayCount, error: todaySalesErr } = await todaySalesQuery
    if (todaySalesErr) throw new AppError(500, 'Failed to load today\'s sales', 'DB_ERROR')

    const todayTotal = (todaySales ?? []).reduce((sum, s) => sum + Number(s.total ?? 0), 0)

    // --- Inventory aggregates (via inventory_status view) ---------------------
    let invQuery = supabase.from('inventory_status').select('*')
    // Store staff only see their own store's location.
    if (req.role === 'store_staff' && req.storeId) {
      const { data: locs } = await supabase
        .from('locations')
        .select('id')
        .eq('store_id', req.storeId)
      const locIds = (locs ?? []).map((l) => l.id as string)
      if (locIds.length) invQuery = invQuery.in('location_id', locIds)
    }

    const { data: inventoryView, error: invErr } = await invQuery
    if (invErr) throw new AppError(500, 'Failed to load inventory summary', 'DB_ERROR')

    const rows = (inventoryView ?? []) as Array<{
      qty_on_hand: number
      cost_price: string | number | null
      stock_status: string
      safety_stock: number
      reorder_point: number
      target_level: number
      location_id: string
      product_id: string
    }>

    let totalStockValue = 0
    let lowStockCount = 0
    let outOfStockCount = 0
    let totalUnits = 0
    for (const r of rows) {
      const qty = Number(r.qty_on_hand ?? 0)
      totalUnits += qty
      if (isExecView && r.cost_price != null) {
        totalStockValue += qty * Number(r.cost_price)
      }
      if (r.stock_status === 'low') lowStockCount += 1
      if (r.stock_status === 'out_of_stock') outOfStockCount += 1
    }

    // --- Inventory turnover ---------------------------------------------------
    // Turnover = cost of goods sold / average inventory value over a period.
    // Approximate: COGS (from active sale line totals) / current stock value.
    let turnover = 0
    if (isExecView && totalStockValue > 0) {
      const { data: cogs, error: cogsErr } = await supabase
        .from('sale_lines')
        .select(
          'qty, products(cost_price)',
        )
      if (!cogsErr && cogs) {
        const totalCogs = cogs.reduce((sum, l) => {
          const prod = (l.products as unknown) as
            | { cost_price: string }
            | Array<{ cost_price: string }>
            | null
          const cost = Array.isArray(prod) ? prod[0]?.cost_price : prod?.cost_price
          return sum + Number(l.qty ?? 0) * Number(cost ?? 0)
        }, 0)
        turnover = totalCogs / totalStockValue
      }
    }

    // --- Auto-orders pending --------------------------------------------------
    const { count: autoPending, error: autoErr } = await supabase
      .from('purchase_orders')
      .select('id', { count: 'exact', head: true })
      .eq('source', 'ai_auto')
      .not('status', 'in', '("received","closed","cancelled")')
    if (autoErr) throw new AppError(500, 'Failed to load auto-order count', 'DB_ERROR')

    res.json({
      total_stock_value: isExecView ? Number(totalStockValue.toFixed(2)) : null,
      total_stock_units: totalUnits,
      inventory_turnover: isExecView ? Number(turnover.toFixed(2)) : null,
      low_stock_count: lowStockCount,
      out_of_stock_count: outOfStockCount,
      today_sales_total: Number(todayTotal.toFixed(2)),
      today_sales_count: todayCount ?? 0,
      auto_orders_pending: autoPending ?? 0,
      role_visibility: isExecView ? 'full' : 'sales',
    })
  }),
)

// ---------------------------------------------------------------------------
// GET /api/dashboard/revenue-trend — daily revenue for last N days (default 30)
// ---------------------------------------------------------------------------
router.get(
  '/dashboard/revenue-trend',
  requireAuth,
  asyncHandler(async (req, res) => {
    const days = Math.min(
      Math.max(Number(req.query.days) || 30, 1),
      365,
    )

    const start = new Date()
    start.setUTCHours(0, 0, 0, 0)
    start.setUTCDate(start.getUTCDate() - (days - 1))

    const { data, error } = await supabase
      .from('sales')
      .select('sale_datetime, total')
      .eq('status', 'active')
      .gte('sale_datetime', start.toISOString())
    if (error) throw new AppError(500, 'Failed to load revenue trend', 'DB_ERROR')

    // Bucket into per-day totals keyed by YYYY-MM-DD (UTC).
    const byDay = new Map<string, number>()
    for (const s of data ?? []) {
      const day = (s.sale_datetime as string).slice(0, 10)
      byDay.set(day, (byDay.get(day) ?? 0) + Number(s.total ?? 0))
    }

    // Build a contiguous series (fill zeros for days with no sales).
    const series: Array<{ date: string; revenue: number }> = []
    for (let i = 0; i < days; i++) {
      const d = new Date(start)
      d.setUTCDate(start.getUTCDate() + i)
      const key = d.toISOString().slice(0, 10)
      series.push({ date: key, revenue: Number((byDay.get(key) ?? 0).toFixed(2)) })
    }

    res.json({ days, series })
  }),
)

// ---------------------------------------------------------------------------
// GET /api/dashboard/top-products — top N products by qty sold (rolling 30d)
// ---------------------------------------------------------------------------
router.get(
  '/dashboard/top-products',
  requireAuth,
  asyncHandler(async (req, res) => {
    const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 50)
    const days = Math.min(Math.max(Number(req.query.days) || 30, 1), 365)

    const start = new Date()
    start.setUTCHours(0, 0, 0, 0)
    start.setUTCDate(start.getUTCDate() - (days - 1))

    // Use the daily_sales_summary view to aggregate units + value per product,
    // restricted to active sales within the rolling window.
    let q = supabase
      .from('daily_sales_summary')
      .select('product_id, product_name, sku_code, units_sold, sales_value')
      .gte('sale_date', start.toISOString().slice(0, 10))

    // Restrict sales personnel / staff to their store.
    if ((req.role === 'store_staff' || req.role === 'sales_personnel') && req.storeId) {
      q = q.eq('store_id', req.storeId)
    }

    const { data, error } = await q
    if (error) throw new AppError(500, 'Failed to load top products', 'DB_ERROR')

    // Aggregate across rows (the view is per store × product × day).
    const agg = new Map<string, { name: string; sku: string; units: number; value: number }>()
    for (const row of data ?? []) {
      const id = row.product_id as string
      const cur = agg.get(id) ?? {
        name: row.product_name as string,
        sku: row.sku_code as string,
        units: 0,
        value: 0,
      }
      cur.units += Number(row.units_sold ?? 0)
      cur.value += Number(row.sales_value ?? 0)
      agg.set(id, cur)
    }

    const top = [...agg.entries()]
      .sort((a, b) => b[1].units - a[1].units)
      .slice(0, limit)
      .map(([product_id, v]) => ({
        product_id,
        product_name: v.name,
        sku_code: v.sku,
        qty_sold: v.units,
        sales_value: Number(v.value.toFixed(2)),
      }))

    res.json({ days, top })
  }),
)

// ---------------------------------------------------------------------------
// GET /api/dashboard/store-comparison — per-store sales totals
// ---------------------------------------------------------------------------
router.get(
  '/dashboard/store-comparison',
  requireAuth,
  asyncHandler(async (req, res) => {
    // Load all stores.
    const { data: stores, error: storesErr } = await supabase
      .from('stores')
      .select('id, name, code')
      .eq('status', 'active')
    if (storesErr) throw new AppError(500, 'Failed to load stores', 'DB_ERROR')

    // Sales personnel / staff see only their own store.
    const scopedStoreId =
      (req.role === 'store_staff' || req.role === 'sales_personnel') && req.storeId
        ? req.storeId
        : null

    const result = await Promise.all(
      (stores ?? []).map(async (store) => {
        const sid = store.id as string
        if (scopedStoreId && sid !== scopedStoreId) {
          return { store_id: sid, store_name: store.name as string, sales_total: 0 }
        }

        let q = supabase
          .from('sales')
          .select('total')
          .eq('status', 'active')
          .eq('store_id', sid)

        // Optional period filter (from / to query params).
        const from = req.query.from as string | undefined
        const to = req.query.to as string | undefined
        if (from) q = q.gte('sale_datetime', from)
        if (to) q = q.lte('sale_datetime', to)

        const { data, error } = await q
        if (error) throw new AppError(500, 'Failed to load store sales', 'DB_ERROR')

        const total = (data ?? []).reduce((sum, s) => sum + Number(s.total ?? 0), 0)
        return {
          store_id: sid,
          store_name: store.name as string,
          store_code: store.code as string,
          sales_total: Number(total.toFixed(2)),
        }
      }),
    )

    res.json({ stores: result })
  }),
)

export default router
