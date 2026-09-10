import { Router } from 'express'
import {
  AppError,
  asyncHandler,
  requireAuth,
  validate,
  validated,
} from '../../middleware/index.js'
import {
  DailyReportQuery,
  dailyReportQuerySchema,
  QuarterlyReportQuery,
  quarterlyReportQuerySchema,
  StorePerformanceQuery,
  storePerformanceQuerySchema,
  YearlyReportQuery,
  yearlyReportQuerySchema,
} from '../../lib/schemas/index.js'
import {
  DailyReportResponse,
  getDailySalesReport,
  getQuarterlySalesReport,
  getStorePerformanceReport,
  getYearlySalesReport,
  QuarterlyReportResponse,
  StorePerformanceResponse,
  YearlyReportResponse,
} from './reports.store.js'

const router = Router()

/**
 * Escape a CSV value according to RFC 4180
 */
export function escapeCsv(val: unknown): string {
  if (val === null || val === undefined) return ''
  const str = String(val)
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

export function dailyToCsv(report: DailyReportResponse): string {
  const headers = ['Store Name', 'Store ID', 'Product Name', 'SKU', 'Units Sold', 'Sales Value', 'Date']
  const rows = report.items.map((i) => [
    i.store_name,
    i.store_id,
    i.product_name,
    i.sku_code,
    i.units_sold,
    i.sales_value.toFixed(2),
    i.sale_date,
  ])
  const csvLines = [
    headers.map(escapeCsv).join(','),
    ...rows.map((r) => r.map(escapeCsv).join(',')),
    '',
    `Summary: Total Units,${report.summary.total_units_sold}`,
    `Summary: Total Sales Value,${report.summary.total_sales_value.toFixed(2)}`,
    `Summary: Transactions Count,${report.summary.transactions_count}`,
  ]
  return csvLines.join('\n')
}

export function quarterlyToCsv(report: QuarterlyReportResponse): string {
  const monthHeaders = ['Month', 'Month Name', 'Units Sold', 'Sales Value', 'Orders Count']
  const monthRows = report.monthly_breakdown.map((m) => [
    m.month,
    m.label,
    m.units_sold,
    m.sales_value.toFixed(2),
    m.orders_count,
  ])

  const prodHeaders = ['Product ID', 'Product Name', 'SKU', 'Units Sold', 'Sales Value']
  const prodRows = report.product_breakdown.map((p) => [
    p.product_id,
    p.product_name,
    p.sku_code,
    p.units_sold,
    p.sales_value.toFixed(2),
  ])

  const lines = [
    `Quarter,${report.quarter}`,
    `Date Range,${report.date_range.from} to ${report.date_range.to}`,
    '',
    '--- Monthly Breakdown ---',
    monthHeaders.map(escapeCsv).join(','),
    ...monthRows.map((r) => r.map(escapeCsv).join(',')),
    '',
    '--- Product Breakdown ---',
    prodHeaders.map(escapeCsv).join(','),
    ...prodRows.map((r) => r.map(escapeCsv).join(',')),
    '',
    `Summary: Total Units,${report.summary.total_units_sold}`,
    `Summary: Total Sales Value,${report.summary.total_sales_value.toFixed(2)}`,
    `Summary: Total Orders,${report.summary.orders_count}`,
  ]
  return lines.join('\n')
}

export function yearlyToCsv(report: YearlyReportResponse): string {
  const headers = ['Month', 'Month Name', 'Units Sold', 'Sales Value', 'Orders Count']
  const rows = report.monthly_breakdown.map((m) => [
    m.month,
    m.label,
    m.units_sold,
    m.sales_value.toFixed(2),
    m.orders_count,
  ])
  const lines = [
    `Year,${report.year}`,
    '',
    headers.map(escapeCsv).join(','),
    ...rows.map((r) => r.map(escapeCsv).join(',')),
    '',
    `Summary: Total Units,${report.summary.total_units_sold}`,
    `Summary: Total Sales Value,${report.summary.total_sales_value.toFixed(2)}`,
    `Summary: Total Orders,${report.summary.orders_count}`,
    `Summary: Average Monthly Sales,${report.summary.average_monthly_sales.toFixed(2)}`,
  ]
  return lines.join('\n')
}

export function storePerformanceToCsv(report: StorePerformanceResponse): string {
  const headers = ['Store Name', 'Store Code', 'City', 'Store ID', 'Sales Value', 'Units Sold', 'Orders Count', 'Average Order Value']
  const rows = report.stores.map((s) => [
    s.store_name,
    s.store_code,
    s.city,
    s.store_id,
    s.total_sales_value.toFixed(2),
    s.total_units_sold,
    s.total_orders,
    s.average_order_value.toFixed(2),
  ])
  const lines = [
    headers.map(escapeCsv).join(','),
    ...rows.map((r) => r.map(escapeCsv).join(',')),
    '',
    `Summary: Total Revenue,${report.summary.total_revenue.toFixed(2)}`,
    `Summary: Total Orders,${report.summary.total_orders}`,
    `Summary: Total Units Sold,${report.summary.total_units_sold}`,
    `Comparison: Best Performing Store,${report.comparison.best_performing_store ?? 'N/A'}`,
    `Comparison: Average Store Revenue,${report.comparison.average_store_revenue.toFixed(2)}`,
  ]
  return lines.join('\n')
}

/**
 * Determine effective storeId taking role restrictions into account.
 * Store staff can only view their own store.
 */
function resolveStoreScope(role: string | undefined, userStoreId: string | null | undefined, requestedStoreId?: string): string | undefined {
  if (role === 'store_staff' && userStoreId) {
    if (requestedStoreId && requestedStoreId !== userStoreId) {
      throw new AppError(403, 'You can only view reports for your own store', 'FORBIDDEN')
    }
    return userStoreId
  }
  return requestedStoreId
}

// ---------------------------------------------------------------------------
// GET /api/reports/sales/daily
// ---------------------------------------------------------------------------
router.get(
  '/reports/sales/daily',
  requireAuth,
  validate(dailyReportQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const query = validated(req, 'query', dailyReportQuerySchema) as DailyReportQuery
    const requestedStore = query.storeId || query.store_id
    const effectiveStore = resolveStoreScope(req.role, req.storeId, requestedStore)

    const report = await getDailySalesReport({
      storeId: effectiveStore,
      productId: query.productId || query.product_id,
      date: query.date,
    })

    if (query.format === 'csv') {
      const csv = dailyToCsv(report)
      res.setHeader('Content-Type', 'text/csv')
      res.setHeader('Content-Disposition', `attachment; filename="daily-sales-${report.date}.csv"`)
      return res.send(csv)
    }

    return res.json(report)
  }),
)

// ---------------------------------------------------------------------------
// GET /api/reports/sales/quarterly
// ---------------------------------------------------------------------------
router.get(
  '/reports/sales/quarterly',
  requireAuth,
  validate(quarterlyReportQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const query = validated(req, 'query', quarterlyReportQuerySchema) as QuarterlyReportQuery
    const requestedStore = query.storeId || query.store_id
    const effectiveStore = resolveStoreScope(req.role, req.storeId, requestedStore)

    const report = await getQuarterlySalesReport({
      storeId: effectiveStore,
      productId: query.productId || query.product_id,
      quarter: query.quarter,
    })

    if (query.format === 'csv') {
      const csv = quarterlyToCsv(report)
      res.setHeader('Content-Type', 'text/csv')
      res.setHeader('Content-Disposition', `attachment; filename="quarterly-sales-${report.quarter}.csv"`)
      return res.send(csv)
    }

    return res.json(report)
  }),
)

// ---------------------------------------------------------------------------
// GET /api/reports/sales/yearly
// ---------------------------------------------------------------------------
router.get(
  '/reports/sales/yearly',
  requireAuth,
  validate(yearlyReportQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const query = validated(req, 'query', yearlyReportQuerySchema) as YearlyReportQuery
    const requestedStore = query.storeId || query.store_id
    const effectiveStore = resolveStoreScope(req.role, req.storeId, requestedStore)

    const report = await getYearlySalesReport({
      storeId: effectiveStore,
      productId: query.productId || query.product_id,
      year: query.year,
    })

    if (query.format === 'csv') {
      const csv = yearlyToCsv(report)
      res.setHeader('Content-Type', 'text/csv')
      res.setHeader('Content-Disposition', `attachment; filename="yearly-sales-${report.year}.csv"`)
      return res.send(csv)
    }

    return res.json(report)
  }),
)

// ---------------------------------------------------------------------------
// GET /api/reports/store-performance
// ---------------------------------------------------------------------------
router.get(
  '/reports/store-performance',
  requireAuth,
  validate(storePerformanceQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const query = validated(req, 'query', storePerformanceQuerySchema) as StorePerformanceQuery
    const requestedStore = query.storeId || query.store_id
    const effectiveStore = resolveStoreScope(req.role, req.storeId, requestedStore)

    const report = await getStorePerformanceReport({
      storeId: effectiveStore,
      from: query.from,
      to: query.to,
    })

    if (query.format === 'csv') {
      const csv = storePerformanceToCsv(report)
      res.setHeader('Content-Type', 'text/csv')
      res.setHeader('Content-Disposition', 'attachment; filename="store-performance.csv"')
      return res.send(csv)
    }

    return res.json(report)
  }),
)

export default router
