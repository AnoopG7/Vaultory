import { z } from 'zod'
import { dateStringSchema, uuidSchema } from './common.js'

/**
 * Reports module schemas — query params for the sales reports endpoints.
 */

// Query: /reports/sales/daily   (store, product, date)
export const dailyReportQuerySchema = z.object({
  storeId: uuidSchema.optional(),
  productId: uuidSchema.optional(),
  date: dateStringSchema,
})

// Query: /reports/sales/quarterly   (store, product, quarter YYYY-Qq)
export const quarterlyReportQuerySchema = z.object({
  storeId: uuidSchema.optional(),
  productId: uuidSchema.optional(),
  quarter: z.string().regex(/^\d{4}-Q[1-4]$/, 'Expected YYYY-Qq'),
})

// Query: /reports/sales/yearly  (store, product, year YYYY)
export const yearlyReportQuerySchema = z.object({
  storeId: uuidSchema.optional(),
  productId: uuidSchema.optional(),
  year: z.coerce.number().int().min(2000).max(2100),
})

// Query: /reports/store-performance
export const storePerformanceQuerySchema = z.object({
  storeId: uuidSchema.optional(),
  from: dateStringSchema.optional(),
  to: dateStringSchema.optional(),
})
