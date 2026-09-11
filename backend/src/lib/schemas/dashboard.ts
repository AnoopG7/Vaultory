import { z } from 'zod'

/**
 * Dashboard module schemas (BRD FR-MON-02 / Exec dashboard).
 * Query params + response shapes for the aggregated KPI endpoints.
 */

// GET /dashboard/revenue-trend
export const revenueTrendQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(365).default(30),
})
export type RevenueTrendQuery = z.infer<typeof revenueTrendQuerySchema>

// GET /dashboard/top-products
export const topProductsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(10),
  days: z.coerce.number().int().min(1).max(365).default(30),
})
export type TopProductsQuery = z.infer<typeof topProductsQuerySchema>

// GET /dashboard/store-comparison
export const storeComparisonQuerySchema = z.object({
  from: z.string().datetime({ offset: true }).optional(),
  to: z.string().datetime({ offset: true }).optional(),
})
export type StoreComparisonQuery = z.infer<typeof storeComparisonQuerySchema>

// GET /dashboard/summary — aggregated KPI response.
export const dashboardSummaryResponseSchema = z.object({
  total_stock_value: z.coerce.number().nullable(),
  total_stock_units: z.coerce.number().int(),
  inventory_turnover: z.coerce.number().nullable(),
  low_stock_count: z.coerce.number().int(),
  out_of_stock_count: z.coerce.number().int(),
  today_sales_total: z.coerce.number(),
  today_sales_count: z.coerce.number().int(),
  auto_orders_pending: z.coerce.number().int(),
  role_visibility: z.enum(['full', 'sales']),
})

// GET /dashboard/revenue-trend — time series response.
export const revenueTrendResponseSchema = z.object({
  days: z.coerce.number().int(),
  series: z.array(
    z.object({
      date: z.string(),
      revenue: z.coerce.number(),
    }),
  ),
})

// GET /dashboard/top-products — ranked products response.
export const topProductsResponseSchema = z.object({
  days: z.coerce.number().int(),
  top: z.array(
    z.object({
      product_id: z.string().uuid(),
      product_name: z.string(),
      sku_code: z.string(),
      qty_sold: z.number(),
      sales_value: z.number(),
    }),
  ),
})

// GET /dashboard/store-comparison — per-store totals response.
export const storeComparisonResponseSchema = z.object({
  stores: z.array(
    z.object({
      store_id: z.string().uuid(),
      store_name: z.string(),
      store_code: z.string().optional(),
      sales_total: z.number(),
    }),
  ),
})
