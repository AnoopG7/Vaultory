import { z } from 'zod'
import { dateStringSchema, uuidSchema } from './common.js'

/**
 * Reports module schemas — query params for the sales reports endpoints.
 */

// Query: /reports/sales/daily   (store, product, date)
export const dailyReportQuerySchema = z.object({
  storeId: uuidSchema.optional(),
  store_id: uuidSchema.optional(),
  productId: uuidSchema.optional(),
  product_id: uuidSchema.optional(),
  date: dateStringSchema.optional(),
  format: z.enum(['json', 'csv']).optional(),
})
export type DailyReportQuery = z.infer<typeof dailyReportQuerySchema>

// Query: /reports/sales/quarterly   (store, product, quarter YYYY-Qq)
export const quarterlyReportQuerySchema = z.object({
  storeId: uuidSchema.optional(),
  store_id: uuidSchema.optional(),
  productId: uuidSchema.optional(),
  product_id: uuidSchema.optional(),
  quarter: z.string().regex(/^\d{4}-Q[1-4]$/, 'Expected YYYY-Qq').optional(),
  format: z.enum(['json', 'csv']).optional(),
})
export type QuarterlyReportQuery = z.infer<typeof quarterlyReportQuerySchema>

// Query: /reports/sales/yearly  (store, product, year YYYY)
export const yearlyReportQuerySchema = z.object({
  storeId: uuidSchema.optional(),
  store_id: uuidSchema.optional(),
  productId: uuidSchema.optional(),
  product_id: uuidSchema.optional(),
  year: z.coerce.number().int().min(2000).max(2100).optional(),
  format: z.enum(['json', 'csv']).optional(),
})
export type YearlyReportQuery = z.infer<typeof yearlyReportQuerySchema>

// Query: /reports/store-performance
export const storePerformanceQuerySchema = z.object({
  storeId: uuidSchema.optional(),
  store_id: uuidSchema.optional(),
  from: dateStringSchema.optional(),
  to: dateStringSchema.optional(),
  format: z.enum(['json', 'csv']).optional(),
})
export type StorePerformanceQuery = z.infer<typeof storePerformanceQuerySchema>
