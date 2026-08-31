import { z } from 'zod'
import { emailSchema, shortCodeSchema, uuidSchema } from './common'
import { entityStatusSchema, locationTypeSchema } from './common'

/**
 * Locations module schemas (frontend — zod v4). Maps to `locations`.
 * Covers store-locations (type='store') and warehouses (type='warehouse').
 */

export const createLocationSchema = z.object({
  type: locationTypeSchema,
  storeId: uuidSchema.nullish(),
  name: z.string().trim().min(1).max(120),
  code: shortCodeSchema,
  city: z.string().trim().max(100).optional(),
  address: z.string().trim().optional(),
  phone: z.string().trim().max(20).optional(),
  email: emailSchema.nullish(),
  isDefault: z.boolean().default(false),
  status: entityStatusSchema.default('active'),
})
export type CreateLocationInput = z.infer<typeof createLocationSchema>

export const updateLocationSchema = createLocationSchema.partial()
export type UpdateLocationInput = z.infer<typeof updateLocationSchema>

export const locationSchema = createLocationSchema.extend({
  id: uuidSchema,
  store_id: uuidSchema.nullable(),
  is_default: z.boolean(),
  status: entityStatusSchema,
  created_at: z.string(),
  updated_at: z.string(),
})
export type Location = z.infer<typeof locationSchema>
