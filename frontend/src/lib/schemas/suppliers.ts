import { z } from 'zod'
import { emailSchema, nonNegativeMoneySchema, shortCodeSchema, uuidSchema } from './common'
import { entityStatusSchema } from './common'

/**
 * Suppliers module schemas (frontend — zod v4). Maps to `suppliers`
 * and `supplier_products`. Finance fields (credit_limit, payment_terms,
 * unit_cost) are MASKED by the API and not collected on the client.
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
  notes: z.string().trim().optional(),
  status: entityStatusSchema.default('active'),
})
export type CreateSupplierInput = z.infer<typeof createSupplierSchema>

export const updateSupplierSchema = createSupplierSchema.partial()
export type UpdateSupplierInput = z.infer<typeof updateSupplierSchema>

export const mapSupplierProductsSchema = z.object({
  productIds: z.array(uuidSchema).min(1),
  unitCosts: z.record(z.string(), nonNegativeMoneySchema).optional(),
  leadTimeOverrides: z.record(z.string(), z.coerce.number().int().positive()).optional(),
})
export type MapSupplierProductsInput = z.infer<typeof mapSupplierProductsSchema>

export const supplierSchema = createSupplierSchema.extend({
  id: uuidSchema,
  created_at: z.string(),
  updated_at: z.string(),
})
export type Supplier = z.infer<typeof supplierSchema>
