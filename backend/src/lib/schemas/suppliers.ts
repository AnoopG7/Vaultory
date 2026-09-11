import { z } from 'zod'
import { emailSchema, moneySchema, nonNegativeMoneySchema, shortCodeSchema, uuidSchema } from './common.js'
import { entityStatusSchema } from './enums.js'

/**
 * Suppliers module schemas. Maps to `suppliers` and `supplier_products`
 * in schema.sql. Finance fields (payment_terms, credit_limit, unit_cost)
 * are MASKED at the API layer.
 */

export const createSupplierSchema = z.object({
  name: z.string().trim().min(1).max(200),
  code: shortCodeSchema.optional(),
  contact_person: z.string().trim().max(200).optional(),
  phone: z.string().trim().max(20).optional(),
  email: emailSchema.nullish(),
  address: z.string().trim().optional(),
  city: z.string().trim().max(100).optional(),
  lead_time_days: z.coerce.number().int().positive().default(7),
  payment_terms: z.string().trim().max(100).optional(), // MASKED
  credit_limit: nonNegativeMoneySchema.nullish(),        // MASKED
  notes: z.string().trim().optional(),
  status: entityStatusSchema.default('active'),
})
export type CreateSupplierInput = z.infer<typeof createSupplierSchema>

export const updateSupplierSchema = createSupplierSchema.partial()
export type UpdateSupplierInput = z.infer<typeof updateSupplierSchema>

// POST /suppliers/:id/products — map a product to a supplier (many-to-many).
export const mapSupplierProductsSchema = z.object({
  product_id: uuidSchema,
  unit_cost: nonNegativeMoneySchema.nullish(),
  lead_time_override: z.coerce.number().int().positive().nullish(),
  is_preferred: z.boolean().optional(),
})
export type MapSupplierProductsInput = z.infer<typeof mapSupplierProductsSchema>

// supplier_products DB row shape.
export const supplierProductSchema = z.object({
  supplier_id: uuidSchema,
  product_id: uuidSchema,
  unit_cost: nonNegativeMoneySchema.nullable(), // MASKED
  lead_time_override: z.number().int().positive().nullable(),
  is_preferred: z.boolean(),
})

// suppliers DB row shape.
export const supplierSchema = createSupplierSchema.extend({
  id: uuidSchema,
  total_pos: z.number().int().nonnegative(),
  on_time_deliveries: z.number().int().nonnegative(),
  avg_lead_time_days: moneySchema.nullable(),
  created_at: z.string(),
  updated_at: z.string(),
})
export const listSuppliersQuerySchema = z.object({
  search: z.string().trim().optional(),
  status: z.enum(['active', 'inactive', 'archived', 'all']).optional().default('all'),
  limit: z.coerce.number().int().positive().max(100).default(50),
  offset: z.coerce.number().int().nonnegative().default(0),
})
export type ListSuppliersQuery = z.infer<typeof listSuppliersQuerySchema>

export const supplierIdParamSchema = z.object({
  id: uuidSchema,
})
export type SupplierIdParam = z.infer<typeof supplierIdParamSchema>

export const supplierProductParamSchema = z.object({
  id: uuidSchema,
  productId: uuidSchema,
})
export type SupplierProductParam = z.infer<typeof supplierProductParamSchema>

export const updateSupplierProductSchema = z.object({
  unit_cost: nonNegativeMoneySchema.nullish(),
  lead_time_override: z.coerce.number().int().positive().nullish(),
  is_preferred: z.boolean().optional(),
})
export type UpdateSupplierProductInput = z.infer<typeof updateSupplierProductSchema>

// Performance metrics for supplier
export const supplierPerformanceSchema = z.object({
  supplier_id: uuidSchema,
  supplier_name: z.string(),
  total_pos: z.number().int().nonnegative(),
  completed_pos: z.number().int().nonnegative(),
  on_time_deliveries: z.number().int().nonnegative(),
  late_deliveries: z.number().int().nonnegative(),
  on_time_percentage: z.number(),
  avg_lead_time_days: z.number().nullable(),
  effective_lead_time_days: z.number(),
  rating: z.enum(['excellent', 'good', 'fair', 'poor', 'unrated']),
  recent_deliveries: z.array(
    z.object({
      po_id: z.string(),
      po_number: z.string(),
      order_date: z.string(),
      expected_date: z.string(),
      received_date: z.string().nullable(),
      is_on_time: z.boolean(),
      actual_lead_time_days: z.number().nullable(),
    }),
  ).optional(),
})
export type SupplierPerformance = z.infer<typeof supplierPerformanceSchema>
