import { z } from 'zod'
import { moneySchema, nonNegativeMoneySchema, shortCodeSchema, uuidSchema } from './common'
import { entityStatusSchema } from './common'

/**
 * Products module schemas (frontend — zod v4). Maps to `products`.
 * cost_price is MASKED by the API and not collected on the client.
 * Business rule (chk_product_stock_levels): target >= reorder >= safety.
 */

export const createProductSchema = z.object({
  sku_code: shortCodeSchema,
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().optional(),
  categoryId: uuidSchema,
  unitId: uuidSchema,
  sale_price: nonNegativeMoneySchema,
  default_safety_stock: moneySchema.min(0).default(0),
  default_reorder_point: moneySchema.min(0).default(0),
  default_target_level: moneySchema.min(0).default(0),
  is_perishable: z.boolean().default(false),
  shelf_life_days: z.coerce.number().int().positive().optional(),
  image_url: z.string().trim().url().nullish(),
  barcode: z.string().trim().max(50).optional(),
  weight: z.coerce.number().min(0).optional(),
  weight_unit: z.string().trim().max(10).optional(),
  notes: z.string().trim().optional(),
  status: entityStatusSchema.default('active'),
})
export type CreateProductInput = z.infer<typeof createProductSchema>

export const updateProductSchema = createProductSchema.partial()
export type UpdateProductInput = z.infer<typeof updateProductSchema>

export const productSchema = createProductSchema.extend({
  id: uuidSchema,
  created_by: uuidSchema.nullable(),
  created_at: z.string(),
  updated_at: z.string(),
})
export type Product = z.infer<typeof productSchema>

export const setProductStatusSchema = z.object({
  status: entityStatusSchema,
})
