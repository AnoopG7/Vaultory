import { z } from 'zod'
import { uuidSchema } from './common'
import { entityStatusSchema } from './common'

/**
 * Categories module schemas (frontend — zod v4). Maps to `categories`
 * (self-referencing tree).
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

export const categorySchema = createCategorySchema.extend({
  id: uuidSchema,
  parent_id: uuidSchema.nullable(),
  sort_order: z.number().int(),
  status: entityStatusSchema,
  created_at: z.string(),
  updated_at: z.string(),
})
export type Category = z.infer<typeof categorySchema>
