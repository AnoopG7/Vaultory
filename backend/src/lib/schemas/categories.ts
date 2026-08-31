import { z } from 'zod'
import { uuidSchema } from './common.js'
import { entityStatusSchema } from './enums.js'

/**
 * Categories module schemas. Maps to `categories` in schema.sql
 * (self-referencing tree, name+paret UNIQUE).
 */

export const createCategorySchema = z.object({
  name: z.string().trim().min(1).max(100),
  parentId: uuidSchema.nullish(),
  sortOrder: z.coerce.number().int().min(0).default(0),
  status: entityStatusSchema.default('active'),
})
export type CreateCategoryInput = z.infer<typeof createCategorySchema>

export const updateCategorySchema = createCategorySchema.partial()
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>

// categories DB row shape.
export const categorySchema = createCategorySchema.extend({
  id: uuidSchema,
  parent_id: uuidSchema.nullable(),
  sort_order: z.number().int(),
  status: entityStatusSchema,
  created_at: z.string(),
  updated_at: z.string(),
})
export type Category = z.infer<typeof categorySchema>
