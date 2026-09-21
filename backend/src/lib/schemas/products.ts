import { z } from 'zod'
import { moneySchema, nonNegativeMoneySchema, shortCodeSchema, uuidSchema } from './common.js'
import { entityStatusSchema } from './enums.js'

/**
 * Products module schemas. Maps to `products` in schema.sql.
 * cost_price is MASKED at the API layer.
 */

// Business rule (chk_product_stock_levels): target >= reorder >= safety
export const createProductSchema = z.object({
  sku_code: shortCodeSchema,
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().optional(),
  categoryId: uuidSchema,
  unitId: uuidSchema,
  cost_price: nonNegativeMoneySchema, // MASKED field
  sale_price: nonNegativeMoneySchema,
  default_safety_stock: moneySchema.min(0),
  default_reorder_point: moneySchema.min(0),
  default_target_level: moneySchema.min(0),
  is_perishable: z.boolean().optional(),
  shelf_life_days: z.coerce.number().int().positive().optional(), // required if perishable
  image_url: z.string().trim().url().nullish(),
  barcode: z.string().trim().max(50).optional(),
  weight: z.coerce.number().min(0).optional(),
  weight_unit: z.string().trim().max(10).optional(),
  notes: z.string().trim().optional(),
  status: entityStatusSchema.optional(),
})
export type CreateProductInput = z.infer<typeof createProductSchema>

export const updateProductSchema = createProductSchema.partial()
export type UpdateProductInput = z.infer<typeof updateProductSchema>

// products DB row shape.
export const productSchema = createProductSchema.extend({
  id: uuidSchema,
  created_by: uuidSchema.nullable(),
  created_at: z.string(),
  updated_at: z.string(),
})
export type Product = z.infer<typeof productSchema>

// Revive/restore / archive body
export const setProductStatusSchema = z.object({
  status: entityStatusSchema,
})

// GET /api/products — list query (search, category/status filter, pagination).
export const listProductsQuerySchema = z.object({
  search: z.string().trim().optional(),
  categoryId: uuidSchema.nullish(),
  status: z.enum(['active', 'archived', 'all']).optional().default('all'),
  limit: z.coerce.number().int().positive().max(200).default(50),
  offset: z.coerce.number().int().nonnegative().default(0),
})
export type ListProductsQuery = z.infer<typeof listProductsQuerySchema>

// /api/products/:id param
export const productIdParamSchema = z.object({
  id: uuidSchema,
})
export type ProductIdParam = z.infer<typeof productIdParamSchema>

// GET /api/products/movers — fast/slow mover classification query
// (window, store, category, classification filter, pagination).
export const moverQuerySchema = z.object({
  windowDays: z.coerce.number().int().min(1).max(750).optional(),
  storeId: uuidSchema.optional(),
  store_id: uuidSchema.optional(),
  categoryId: uuidSchema.optional(),
  category_id: uuidSchema.optional(),
  classification: z.enum(['fast', 'slow', 'normal']).optional(),
  limit: z.coerce.number().int().min(1).max(500).default(100),
})
export type MoverQuery = z.infer<typeof moverQuerySchema>
