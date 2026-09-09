import { z } from 'zod'
import { shortCodeSchema, uuidSchema } from './common'
import { entityStatusSchema } from './common'

/**
 * Stores module schemas (frontend — zod v4). Maps to `stores` in schema.sql.
 */

export const createStoreSchema = z.object({
  name: z.string().trim().min(1).max(200),
  code: shortCodeSchema,
  city: z.string().trim().max(100).optional(),
  state: z.string().trim().max(100).optional(),
  address: z.string().trim().optional(),
  phone: z.string().trim().max(20).optional(),
  email: z.email().nullish(),
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
