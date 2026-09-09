import { z } from 'zod'
import { emailSchema, shortCodeSchema, uuidSchema } from './common.js'
import { entityStatusSchema } from './enums.js'

/**
 * Stores module schemas. Maps to `stores` (business store master) in schema.sql.
 */

export const createStoreSchema = z.object({
  name: z.string().trim().min(1, 'Store name is required').max(120),
  code: shortCodeSchema,
  city: z.string().trim().max(100).optional(),
  state: z.string().trim().max(100).optional(),
  address: z.string().trim().optional(),
  phone: z.string().trim().max(20).optional(),
  email: emailSchema.nullish(),
  status: entityStatusSchema.default('active'),
})
export type CreateStoreInput = z.infer<typeof createStoreSchema>

export const updateStoreSchema = createStoreSchema.partial()
export type UpdateStoreInput = z.infer<typeof updateStoreSchema>

export const storeSchema = createStoreSchema.extend({
  id: uuidSchema,
  created_at: z.string(),
  updated_at: z.string(),
})
export type Store = z.infer<typeof storeSchema>
