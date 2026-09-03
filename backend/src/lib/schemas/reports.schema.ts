import { z } from 'zod'

// ---------------------------------------------------------------------------
// Reports — Request schemas
// ---------------------------------------------------------------------------

export const DailyReportQuery = z.object({
  store_id: z.string().uuid().optional(),
  product_id: z.string().uuid().optional(),
  date: z.string().date(), // YYYY-MM-DD
  limit: z.coerce.number().int().min(1).max(500).default(100),
  offset: z.coerce.number().int().min(0).default(0),
})
export type DailyReportQuery = z.infer<typeof DailyReportQuery>

export const QuarterlyReportQuery = z.object({
  store_id: z.string().uuid().optional(),
  product_id: z.string().uuid().optional(),
  quarter: z.string().regex(/^\d{4}-Q[1-4]$/, 'Format: YYYY-Qq (e.g. 2026-Q3)'),
  limit: z.coerce.number().int().min(1).max(500).default(100),
  offset: z.coerce.number().int().min(0).default(0),
})
export type QuarterlyReportQuery = z.infer<typeof QuarterlyReportQuery>

export const YearlyReportQuery = z.object({
  store_id: z.string().uuid().optional(),
  product_id: z.string().uuid().optional(),
  year: z.coerce.number().int().min(2020).max(2100),
  limit: z.coerce.number().int().min(1).max(500).default(100),
  offset: z.coerce.number().int().min(0).default(0),
})
export type YearlyReportQuery = z.infer<typeof YearlyReportQuery>

export const StorePerformanceQuery = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
})
export type StorePerformanceQuery = z.infer<typeof StorePerformanceQuery>

// ---------------------------------------------------------------------------
// Reports — Response schemas
// ---------------------------------------------------------------------------

export const DailyReportRow = z.object({
  sale_date: z.string(),
  store_id: z.string().uuid().nullable(),
  store_name: z.string().nullable(),
  product_id: z.string().uuid().nullable(),
  product_name: z.string().nullable(),
  sku_code: z.string().nullable(),
  units_sold: z.number(),
  sales_value: z.number(),
})
export type DailyReportRow = z.infer<typeof DailyReportRow>

export const DailyReportResponse = z.object({
  date: z.string(),
  rows: z.array(DailyReportRow),
  total_units: z.number(),
  total_value: z.number(),
})
export type DailyReportResponse = z.infer<typeof DailyReportResponse>

export const QuarterlyReportRow = z.object({
  quarter: z.string(),
  store_id: z.string().uuid().nullable(),
  store_name: z.string().nullable(),
  product_id: z.string().uuid().nullable(),
  product_name: z.string().nullable(),
  sku_code: z.string().nullable(),
  units_sold: z.number(),
  sales_value: z.number(),
})
export type QuarterlyReportRow = z.infer<typeof QuarterlyReportRow>

export const QuarterlyReportResponse = z.object({
  quarter: z.string(),
  rows: z.array(QuarterlyReportRow),
  total_units: z.number(),
  total_value: z.number(),
})
export type QuarterlyReportResponse = z.infer<typeof QuarterlyReportResponse>

export const YearlyReportRow = z.object({
  year: z.number().int(),
  month: z.number().int(),
  store_id: z.string().uuid().nullable(),
  store_name: z.string().nullable(),
  product_id: z.string().uuid().nullable(),
  product_name: z.string().nullable(),
  sku_code: z.string().nullable(),
  units_sold: z.number(),
  sales_value: z.number(),
})
export type YearlyReportRow = z.infer<typeof YearlyReportRow>

export const YearlyReportResponse = z.object({
  year: z.number().int(),
  rows: z.array(YearlyReportRow),
  total_units: z.number(),
  total_value: z.number(),
})
export type YearlyReportResponse = z.infer<typeof YearlyReportResponse>

export const StorePerformanceRow = z.object({
  store_id: z.string().uuid(),
  store_name: z.string(),
  store_code: z.string(),
  total_sales: z.number(),
  total_units: z.number(),
  sale_count: z.number().int(),
  avg_sale_value: z.number(),
})
export type StorePerformanceRow = z.infer<typeof StorePerformanceRow>

export const StorePerformanceResponse = z.object({
  stores: z.array(StorePerformanceRow),
  period: z
    .object({
      from: z.string().nullable(),
      to: z.string().nullable(),
    })
    .optional(),
})
export type StorePerformanceResponse = z.infer<typeof StorePerformanceResponse>
