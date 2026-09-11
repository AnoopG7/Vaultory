import { env, supabase } from '../../config/index.js'
import { AppError } from '../../middleware/index.js'
import { memorySales, memorySaleLines } from '../sales/sales.store.js'
import { memoryInventory } from '../inventory/inventory.store.js'

const isMockSupabase = !env.SUPABASE_URL || env.SUPABASE_URL.includes('mock') || env.SUPABASE_URL.includes('localhost')

function round2(n: number): number {
  return Number(n.toFixed(2))
}

interface DbSaleRow {
  id: string
  store_id: string
  sale_datetime: string
  total: string | number
  total_qty: string | number
}
interface DbSaleLineRow {
  product_id: string
  qty: string | number
  line_total: string | number
  products?: { name?: string; sku_code?: string }
}

export interface StoreMeta {
  id: string
  name: string
  code: string
  city: string
}

export const STORE_MAP: Record<string, StoreMeta> = {
  'e1000000-0000-0000-0000-000000000001': {
    id: 'e1000000-0000-0000-0000-000000000001',
    name: 'Store A — MG Road',
    code: 'STORE-A',
    city: 'Mumbai',
  },
  'e1000000-0000-0000-0000-000000000002': {
    id: 'e1000000-0000-0000-0000-000000000002',
    name: 'Store B — Andheri',
    code: 'STORE-B',
    city: 'Mumbai',
  },
  'e1000000-0000-0000-0000-000000000003': {
    id: 'e1000000-0000-0000-0000-000000000003',
    name: 'Store C — Thane',
    code: 'STORE-C',
    city: 'Thane',
  },
}

export interface DailyReportItem {
  store_id: string
  store_name: string
  product_id: string
  product_name: string
  sku_code: string
  units_sold: number
  sales_value: number
  sale_date: string
}

export interface DailyReportResponse {
  date: string
  items: DailyReportItem[]
  summary: {
    total_units_sold: number
    total_sales_value: number
    transactions_count: number
  }
}

export interface MonthlyTrendItem {
  month: string
  label: string
  units_sold: number
  sales_value: number
  orders_count: number
}

export interface ProductBreakdownItem {
  product_id: string
  product_name: string
  sku_code: string
  units_sold: number
  sales_value: number
}

export interface QuarterlyReportResponse {
  quarter: string
  date_range: { from: string; to: string }
  monthly_breakdown: MonthlyTrendItem[]
  product_breakdown: ProductBreakdownItem[]
  summary: {
    total_units_sold: number
    total_sales_value: number
    orders_count: number
  }
}

export interface YearlyReportResponse {
  year: number
  monthly_breakdown: MonthlyTrendItem[]
  summary: {
    total_units_sold: number
    total_sales_value: number
    orders_count: number
    average_monthly_sales: number
  }
}

export interface StorePerformanceItem {
  store_id: string
  store_name: string
  store_code: string
  city: string
  total_sales_value: number
  total_units_sold: number
  total_orders: number
  average_order_value: number
}

export interface StorePerformanceResponse {
  stores: StorePerformanceItem[]
  comparison: {
    best_performing_store: string | null
    total_revenue: number
    average_store_revenue: number
  }
  summary: {
    total_revenue: number
    total_orders: number
    total_units_sold: number
  }
}

/**
 * 1. GET /api/reports/sales/daily
 */
export async function getDailySalesReport(params: {
  storeId?: string
  productId?: string
  date?: string
}): Promise<DailyReportResponse> {
  const targetDate = params.date ?? new Date().toISOString().split('T')[0]

  // Try Supabase view first
  if (!isMockSupabase) {
    try {
      let q = supabase
        .from('daily_sales_summary')
        .select('*')
        .eq('sale_date', targetDate)

      if (params.storeId) q = q.eq('store_id', params.storeId)
      if (params.productId) q = q.eq('product_id', params.productId)

      const { data, error } = await q
      if (error) {
        throw new AppError(500, `Failed to load daily sales report: ${error.message}`, 'DB_ERROR')
      }
      if (data) {
        const items: DailyReportItem[] = data.map((r) => ({
          store_id: r.store_id,
          store_name: r.store_name,
          product_id: r.product_id,
          product_name: r.product_name,
          sku_code: r.sku_code,
          units_sold: Number(r.units_sold ?? 0),
          sales_value: Number(r.sales_value ?? 0),
          sale_date: r.sale_date,
        }))

        const totalUnits = items.reduce((acc, i) => acc + i.units_sold, 0)
        const totalValue = Number(items.reduce((acc, i) => acc + i.sales_value, 0).toFixed(2))

        return {
          date: targetDate,
          items,
          summary: {
            total_units_sold: totalUnits,
            total_sales_value: totalValue,
            transactions_count: items.length,
          },
        }
      }
    } catch (err) {
      if (err instanceof AppError) throw err
      throw new AppError(500, `Failed to load daily sales report: ${(err as Error).message}`, 'DB_ERROR')
    }
  }

  // In-memory fallback
  const matchingSales = memorySales.filter(
    (s) =>
      s.status === 'active' &&
      s.sale_datetime.startsWith(targetDate) &&
      (!params.storeId || s.store_id === params.storeId),
  )

  const saleIds = new Set(matchingSales.map((s) => s.id))
  const lines = memorySaleLines.filter(
    (l) => saleIds.has(l.sale_id) && (!params.productId || l.product_id === params.productId),
  )

  const groupMap = new Map<string, DailyReportItem>()

  for (const l of lines) {
    const sale = matchingSales.find((s) => s.id === l.sale_id)
    if (!sale) continue
    const key = `${sale.store_id}__${l.product_id}`
    const p = memoryInventory.find((i) => i.product_id === l.product_id)
    const store = STORE_MAP[sale.store_id] ?? {
      name: 'Store A — MG Road',
      code: 'STORE-A',
      city: 'Mumbai',
    }

    if (!groupMap.has(key)) {
      groupMap.set(key, {
        store_id: sale.store_id,
        store_name: store.name,
        product_id: l.product_id,
        product_name: p ? p.product_name : l.products?.name ?? 'Product',
        sku_code: p ? p.sku_code : l.products?.sku_code ?? 'SKU',
        units_sold: 0,
        sales_value: 0,
        sale_date: targetDate,
      })
    }

    const item = groupMap.get(key)!
    item.units_sold += l.qty
    item.sales_value = Number((item.sales_value + l.line_total).toFixed(2))
  }

  const items = Array.from(groupMap.values())
  const totalUnits = items.reduce((acc, i) => acc + i.units_sold, 0)
  const totalValue = Number(items.reduce((acc, i) => acc + i.sales_value, 0).toFixed(2))

  return {
    date: targetDate,
    items,
    summary: {
      total_units_sold: totalUnits,
      total_sales_value: totalValue,
      transactions_count: matchingSales.length,
    },
  }
}

/**
 * 2. GET /api/reports/sales/quarterly
 */
export async function getQuarterlySalesReport(params: {
  storeId?: string
  productId?: string
  quarter?: string
}): Promise<QuarterlyReportResponse> {
  const currentYear = new Date().getFullYear()
  const currentQuarterNum = Math.floor(new Date().getMonth() / 3) + 1
  const targetQuarter = params.quarter ?? `${currentYear}-Q${currentQuarterNum}`

  const [yearStr, qStr] = targetQuarter.split('-Q')
  const year = parseInt(yearStr, 10) || currentYear
  const qNum = parseInt(qStr, 10) || 1

  const startMonth = (qNum - 1) * 3 + 1
  const endMonth = startMonth + 2

  const fromDate = `${year}-${String(startMonth).padStart(2, '0')}-01T00:00:00Z`
  const lastDay = new Date(year, endMonth, 0).getDate()
  const toDate = `${year}-${String(endMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}T23:59:59Z`

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ]

  const monthsInQuarter = [startMonth, startMonth + 1, endMonth].map((m) => {
    const mStr = `${year}-${String(m).padStart(2, '0')}`
    return {
      month: mStr,
      label: monthNames[m - 1],
      units_sold: 0,
      sales_value: 0,
      orders_count: 0,
    }
  })

  // DB-backed computation (real deployment). In-memory fallback below is mock only.
  if (!isMockSupabase) {
    let q = supabase
      .from('sales')
      .select('id, store_id, sale_datetime, total, total_qty')
      .gte('sale_datetime', fromDate)
      .lte('sale_datetime', toDate)
      .eq('status', 'active')
    if (params.storeId) q = q.eq('store_id', params.storeId)
    const { data, error } = await q
    if (error) {
      throw new AppError(500, `Failed to load quarterly sales report: ${error.message}`, 'DB_ERROR')
    }

    const salesRows = (data ?? []) as DbSaleRow[]
    let prodLines: DbSaleLineRow[] = []
    const saleIds = salesRows.map((s) => s.id)
    if (saleIds.length > 0) {
      let lq = supabase
        .from('sale_lines')
        .select('product_id, qty, line_total, products(name, sku_code)')
        .in('sale_id', saleIds)
      if (params.productId) lq = lq.eq('product_id', params.productId)
      const { data: lines, error: lErr } = await lq
      if (lErr) {
        throw new AppError(500, `Failed to load quarterly sale lines: ${lErr.message}`, 'DB_ERROR')
      }
      prodLines = (lines ?? []) as DbSaleLineRow[]
    }

    for (const s of salesRows) {
      const monthKey = s.sale_datetime.substring(0, 7)
      const mItem = monthsInQuarter.find((m) => m.month === monthKey)
      if (mItem) {
        mItem.orders_count += 1
        mItem.sales_value = round2(mItem.sales_value + Number(s.total))
        mItem.units_sold += Number(s.total_qty)
      }
    }

    const prodMap = new Map<string, ProductBreakdownItem>()
    for (const l of prodLines) {
      if (l.product_id === null) continue
      if (!prodMap.has(l.product_id)) {
        prodMap.set(l.product_id, {
          product_id: l.product_id,
          product_name: l.products?.name ?? 'Product',
          sku_code: l.products?.sku_code ?? 'SKU',
          units_sold: 0,
          sales_value: 0,
        })
      }
      const pItem = prodMap.get(l.product_id)!
      pItem.units_sold += Number(l.qty)
      pItem.sales_value = round2(pItem.sales_value + Number(l.line_total))
    }

    const totalUnits = monthsInQuarter.reduce((acc, m) => acc + m.units_sold, 0)
    const totalValue = round2(monthsInQuarter.reduce((acc, m) => acc + m.sales_value, 0))

    return {
      quarter: targetQuarter,
      date_range: { from: fromDate.split('T')[0], to: toDate.split('T')[0] },
      monthly_breakdown: monthsInQuarter,
      product_breakdown: Array.from(prodMap.values()).sort((a, b) => b.sales_value - a.sales_value),
      summary: {
        total_units_sold: totalUnits,
        total_sales_value: totalValue,
        orders_count: salesRows.length,
      },
    }
  }

  // Filter sales
  const sales = memorySales.filter(
    (s) =>
      s.status === 'active' &&
      s.sale_datetime >= fromDate &&
      s.sale_datetime <= toDate &&
      (!params.storeId || s.store_id === params.storeId),
  )

  const saleIds = new Set(sales.map((s) => s.id))
  const lines = memorySaleLines.filter(
    (l) => saleIds.has(l.sale_id) && (!params.productId || l.product_id === params.productId),
  )

  // Monthly breakdown
  for (const s of sales) {
    const monthKey = s.sale_datetime.substring(0, 7)
    const mItem = monthsInQuarter.find((m) => m.month === monthKey)
    if (mItem) {
      mItem.orders_count += 1
      mItem.sales_value = Number((mItem.sales_value + s.total).toFixed(2))
      mItem.units_sold += s.total_qty
    }
  }

  // Product breakdown
  const prodMap = new Map<string, ProductBreakdownItem>()
  for (const l of lines) {
    const p = memoryInventory.find((i) => i.product_id === l.product_id)
    if (!prodMap.has(l.product_id)) {
      prodMap.set(l.product_id, {
        product_id: l.product_id,
        product_name: p ? p.product_name : l.products?.name ?? 'Product',
        sku_code: p ? p.sku_code : l.products?.sku_code ?? 'SKU',
        units_sold: 0,
        sales_value: 0,
      })
    }
    const pItem = prodMap.get(l.product_id)!
    pItem.units_sold += l.qty
    pItem.sales_value = Number((pItem.sales_value + l.line_total).toFixed(2))
  }

  const totalUnits = monthsInQuarter.reduce((acc, m) => acc + m.units_sold, 0)
  const totalValue = Number(monthsInQuarter.reduce((acc, m) => acc + m.sales_value, 0).toFixed(2))

  return {
    quarter: targetQuarter,
    date_range: { from: fromDate.split('T')[0], to: toDate.split('T')[0] },
    monthly_breakdown: monthsInQuarter,
    product_breakdown: Array.from(prodMap.values()).sort((a, b) => b.sales_value - a.sales_value),
    summary: {
      total_units_sold: totalUnits,
      total_sales_value: totalValue,
      orders_count: sales.length,
    },
  }
}

/**
 * 3. GET /api/reports/sales/yearly
 */
export async function getYearlySalesReport(params: {
  storeId?: string
  productId?: string
  year?: number
}): Promise<YearlyReportResponse> {
  const targetYear = params.year ?? new Date().getFullYear()
  const fromDate = `${targetYear}-01-01T00:00:00Z`
  const toDate = `${targetYear}-12-31T23:59:59Z`

  const shortMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const months: MonthlyTrendItem[] = shortMonths.map((name, idx) => ({
    month: `${targetYear}-${String(idx + 1).padStart(2, '0')}`,
    label: name,
    units_sold: 0,
    sales_value: 0,
    orders_count: 0,
  }))

  // DB-backed computation (real deployment). In-memory fallback below is mock only.
  if (!isMockSupabase) {
    let q = supabase
      .from('sales')
      .select('id, store_id, sale_datetime, total, total_qty')
      .gte('sale_datetime', fromDate)
      .lte('sale_datetime', toDate)
      .eq('status', 'active')
    if (params.storeId) q = q.eq('store_id', params.storeId)
    const { data, error } = await q
    if (error) {
      throw new AppError(500, `Failed to load yearly sales report: ${error.message}`, 'DB_ERROR')
    }

    const salesRows = (data ?? []) as DbSaleRow[]
    for (const s of salesRows) {
      const monthKey = s.sale_datetime.substring(0, 7)
      const mItem = months.find((m) => m.month === monthKey)
      if (mItem) {
        mItem.orders_count += 1
        mItem.sales_value = round2(mItem.sales_value + Number(s.total))
        mItem.units_sold += Number(s.total_qty)
      }
    }

    const totalUnits = months.reduce((acc, m) => acc + m.units_sold, 0)
    const totalValue = round2(months.reduce((acc, m) => acc + m.sales_value, 0))
    const avgMonthly = round2(totalValue / 12)

    return {
      year: targetYear,
      monthly_breakdown: months,
      summary: {
        total_units_sold: totalUnits,
        total_sales_value: totalValue,
        orders_count: salesRows.length,
        average_monthly_sales: avgMonthly,
      },
    }
  }

  const sales = memorySales.filter(
    (s) =>
      s.status === 'active' &&
      s.sale_datetime >= fromDate &&
      s.sale_datetime <= toDate &&
      (!params.storeId || s.store_id === params.storeId),
  )

  for (const s of sales) {
    const monthKey = s.sale_datetime.substring(0, 7)
    const mItem = months.find((m) => m.month === monthKey)
    if (mItem) {
      mItem.orders_count += 1
      mItem.sales_value = Number((mItem.sales_value + s.total).toFixed(2))
      mItem.units_sold += s.total_qty
    }
  }

  const totalUnits = months.reduce((acc, m) => acc + m.units_sold, 0)
  const totalValue = Number(months.reduce((acc, m) => acc + m.sales_value, 0).toFixed(2))
  const avgMonthly = Number((totalValue / 12).toFixed(2))

  return {
    year: targetYear,
    monthly_breakdown: months,
    summary: {
      total_units_sold: totalUnits,
      total_sales_value: totalValue,
      orders_count: sales.length,
      average_monthly_sales: avgMonthly,
    },
  }
}

/**
 * 4. GET /api/reports/store-performance
 */
export async function getStorePerformanceReport(params: {
  storeId?: string
  from?: string
  to?: string
}): Promise<StorePerformanceResponse> {
  // DB-backed computation (real deployment). In-memory fallback below is mock only.
  if (!isMockSupabase) {
    const { data: storeRows, error: storeErr } = await supabase
      .from('stores')
      .select('id, name, code, city')
    if (storeErr) {
      throw new AppError(500, `Failed to load stores: ${storeErr.message}`, 'DB_ERROR')
    }

    let q = supabase
      .from('sales')
      .select('store_id, sale_datetime, total, total_qty')
      .eq('status', 'active')
    if (params.storeId) q = q.eq('store_id', params.storeId)
    if (params.from) q = q.gte('sale_datetime', params.from)
    if (params.to) q = q.lte('sale_datetime', params.to)
    const { data, error } = await q
    if (error) {
      throw new AppError(500, `Failed to load store performance report: ${error.message}`, 'DB_ERROR')
    }

    const totals = new Map<string, { value: number; units: number; orders: number }>()
    for (const s of (data ?? []) as Array<{
      store_id: string
      total: string | number
      total_qty: string | number
    }>) {
      const cur = totals.get(s.store_id) ?? { value: 0, units: 0, orders: 0 }
      cur.value += Number(s.total)
      cur.units += Number(s.total_qty)
      cur.orders += 1
      totals.set(s.store_id, cur)
    }

    const items: StorePerformanceItem[] = (storeRows ?? []).map((st) => {
      const t = totals.get(st.id) ?? { value: 0, units: 0, orders: 0 }
      return {
        store_id: st.id,
        store_name: st.name,
        store_code: st.code,
        city: st.city,
        total_sales_value: round2(t.value),
        total_units_sold: t.units,
        total_orders: t.orders,
        average_order_value: t.orders > 0 ? round2(t.value / t.orders) : 0,
      }
    })
    items.sort((a, b) => b.total_sales_value - a.total_sales_value)

    const totalRev = round2(items.reduce((sum, s) => sum + s.total_sales_value, 0))
    const totalOrders = items.reduce((sum, s) => sum + s.total_orders, 0)
    const totalUnits = items.reduce((sum, s) => sum + s.total_units_sold, 0)
    const avgStoreRev = items.length > 0 ? round2(totalRev / items.length) : 0

    return {
      stores: items,
      comparison: {
        best_performing_store: items[0]?.store_name ?? null,
        total_revenue: totalRev,
        average_store_revenue: avgStoreRev,
      },
      summary: {
        total_revenue: totalRev,
        total_orders: totalOrders,
        total_units_sold: totalUnits,
      },
    }
  }

  const storesToAnalyze = params.storeId
    ? [STORE_MAP[params.storeId]].filter(Boolean)
    : Object.values(STORE_MAP)

  const items: StorePerformanceItem[] = []

  for (const store of storesToAnalyze) {
    const matchingSales = memorySales.filter(
      (s) =>
        s.status === 'active' &&
        s.store_id === store.id &&
        (!params.from || s.sale_datetime >= params.from) &&
        (!params.to || s.sale_datetime <= params.to),
    )

    const totalSales = Number(
      matchingSales.reduce((sum, s) => sum + s.total, 0).toFixed(2),
    )
    const totalUnits = matchingSales.reduce((sum, s) => sum + s.total_qty, 0)
    const totalOrders = matchingSales.length
    const aov = totalOrders > 0 ? Number((totalSales / totalOrders).toFixed(2)) : 0

    items.push({
      store_id: store.id,
      store_name: store.name,
      store_code: store.code,
      city: store.city,
      total_sales_value: totalSales,
      total_units_sold: totalUnits,
      total_orders: totalOrders,
      average_order_value: aov,
    })
  }

  // Sort by revenue descending
  items.sort((a, b) => b.total_sales_value - a.total_sales_value)

  const totalRev = Number(items.reduce((sum, s) => sum + s.total_sales_value, 0).toFixed(2))
  const totalOrders = items.reduce((sum, s) => sum + s.total_orders, 0)
  const totalUnits = items.reduce((sum, s) => sum + s.total_units_sold, 0)
  const avgStoreRev = items.length > 0 ? Number((totalRev / items.length).toFixed(2)) : 0

  return {
    stores: items,
    comparison: {
      best_performing_store: items[0]?.store_name ?? null,
      total_revenue: totalRev,
      average_store_revenue: avgStoreRev,
    },
    summary: {
      total_revenue: totalRev,
      total_orders: totalOrders,
      total_units_sold: totalUnits,
    },
  }
}

