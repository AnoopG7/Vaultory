import { z } from 'zod'

// ---------------------------------------------------------------------------
// Request schemas
// ---------------------------------------------------------------------------

export const RevenueTrendQuery = z.object({
  days: z.coerce.number().int().min(1).max(365).default(30),
})
export type RevenueTrendQuery = z.infer<typeof RevenueTrendQuery>

export const TopProductsQuery = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(10),
  days: z.coerce.number().int().min(1).max(365).default(30),
})
export type TopProductsQuery = z.infer<typeof TopProductsQuery>

export const StoreComparisonQuery = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
})
export type StoreComparisonQuery = z.infer<typeof StoreComparisonQuery>

// ---------------------------------------------------------------------------
// Response schemas
// ---------------------------------------------------------------------------

export const DashboardSummaryResponse = z.object({
  total_stock_value: z.number().nullable(),
  total_stock_units: z.number().int(),
  inventory_turnover: z.number().nullable(),
  low_stock_count: z.number().int(),
  out_of_stock_count: z.number().int(),
  today_sales_total: z.number(),
  today_sales_count: z.number().int(),
  auto_orders_pending: z.number().int(),
  role_visibility: z.enum(['full', 'sales']),
})
export type DashboardSummaryResponse = z.infer<typeof DashboardSummaryResponse>

export const RevenuePoint = z.object({
  date: z.string(),
  revenue: z.number(),
})
export type RevenuePoint = z.infer<typeof RevenuePoint>

export const RevenueTrendResponse = z.object({
  days: z.number().int(),
  series: z.array(RevenuePoint),
})
export type RevenueTrendResponse = z.infer<typeof RevenueTrendResponse>

export const TopProduct = z.object({
  product_id: z.string().uuid(),
  product_name: z.string(),
  sku_code: z.string(),
  qty_sold: z.number(),
  sales_value: z.number(),
})
export type TopProduct = z.infer<typeof TopProduct>

export const TopProductsResponse = z.object({
  days: z.number().int(),
  top: z.array(TopProduct),
})
export type TopProductsResponse = z.infer<typeof TopProductsResponse>

export const StoreComparisonRow = z.object({
  store_id: z.string().uuid(),
  store_name: z.string(),
  store_code: z.string().optional(),
  sales_total: z.number(),
})
export type StoreComparisonRow = z.infer<typeof StoreComparisonRow>

export const StoreComparisonResponse = z.object({
  stores: z.array(StoreComparisonRow),
})
export type StoreComparisonResponse = z.infer<typeof StoreComparisonResponse>
