import { z } from 'zod'
import { uuidSchema } from './common.js'
import { entityStatusSchema } from './enums.js'

/**
 * Reference data module schemas — lightweight dropdown/list endpoints
 * backing the sales & dashboard UIs (GET /stores, GET /products).
 */

// GET /products — dropdown query params.
export const productDropdownQuerySchema = z.object({
  search: z.string().trim().max(200).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(200),
})
export type ProductDropdownQuery = z.infer<typeof productDropdownQuerySchema>

// GET /products — dropdown row shape (cost_price is MASKED, never returned).
export const productDropdownItemSchema = z.object({
  id: uuidSchema,
  sku_code: z.string(),
  name: z.string(),
  sale_price: z.coerce.number(), // NUMERIC(14,2) arrives as a string
  unit: z.string().nullable(),
  category: z.string().nullable(),
})
export type ProductDropdownItem = z.infer<typeof productDropdownItemSchema>

export const productDropdownResponseSchema = z.object({
  products: z.array(productDropdownItemSchema),
})
export type ProductDropdownResponse = z.infer<typeof productDropdownResponseSchema>

// GET /stores — dropdown row shape.
export const storeDropdownItemSchema = z.object({
  id: uuidSchema,
  name: z.string(),
  code: z.string(),
  city: z.string().nullable(),
  status: entityStatusSchema,
})
export type StoreDropdownItem = z.infer<typeof storeDropdownItemSchema>

export const storeDropdownResponseSchema = z.object({
  stores: z.array(storeDropdownItemSchema),
})
export type StoreDropdownResponse = z.infer<typeof storeDropdownResponseSchema>
