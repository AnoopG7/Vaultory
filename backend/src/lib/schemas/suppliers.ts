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

// POST /suppliers/:id/products — map products (many-to-many).
export const mapSupplierProductsSchema = z.object({
  productIds: z.array(uuidSchema).min(1),
  unitCosts: z.record(z.string(), nonNegativeMoneySchema).optional(),
  leadTimeOverrides: z.record(z.string(), z.coerce.number().int().positive()).optional(),
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
export type Supplier = z.infer<typeof supplierSchema>
