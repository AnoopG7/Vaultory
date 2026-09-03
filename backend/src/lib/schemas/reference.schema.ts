import { z } from 'zod'

// ---------------------------------------------------------------------------
// Request schemas
// ---------------------------------------------------------------------------

export const ProductDropdownQuery = z.object({
  search: z.string().max(200).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(200),
})
export type ProductDropdownQuery = z.infer<typeof ProductDropdownQuery>

// ---------------------------------------------------------------------------
// Response schemas
// ---------------------------------------------------------------------------

export const StoreDropdownItem = z.object({
  id: z.string().uuid(),
  name: z.string(),
  code: z.string(),
  city: z.string().nullable(),
  status: z.enum(['active', 'archived']),
})
export type StoreDropdownItem = z.infer<typeof StoreDropdownItem>

export const StoreDropdownResponse = z.object({
  stores: z.array(StoreDropdownItem),
})
export type StoreDropdownResponse = z.infer<typeof StoreDropdownResponse>

export const ProductDropdownItem = z.object({
  id: z.string().uuid(),
  sku_code: z.string(),
  name: z.string(),
  sale_price: z.number(),
  unit: z.string().nullable(),
  category: z.string().nullable(),
})
export type ProductDropdownItem = z.infer<typeof ProductDropdownItem>

export const ProductDropdownResponse = z.object({
  products: z.array(ProductDropdownItem),
})
export type ProductDropdownResponse = z.infer<typeof ProductDropdownResponse>
