import { z } from 'zod'
import { emailSchema, idParamSchema, shortCodeSchema, textSchema, uuidSchema } from './common.js'
import { entityStatusSchema, locationTypeSchema } from './enums.js'

/**
 * Locations module schemas. Maps to `locations` in schema.sql.
 * locations covers BOTH store-locations (type='store', store_id set) and
 * warehouses (type='warehouse', store_id NULL).
 */

export const createLocationSchema = z.object({
  type: locationTypeSchema,
  storeId: uuidSchema.nullish(), // owning store for type='store'; NULL for warehouse
  name: z.string().trim().min(1).max(120),
  code: shortCodeSchema, // [M2] case-insensitive CITEXT
  city: z.string().trim().max(100).optional(),
  address: textSchema.optional(),
  phone: z.string().trim().max(20).optional(),
  email: emailSchema.nullish(),
  isDefault: z.boolean().default(false),
  status: entityStatusSchema.default('active'),
})
export type CreateLocationInput = z.infer<typeof createLocationSchema>

export const updateLocationSchema = createLocationSchema.partial()
export type UpdateLocationInput = z.infer<typeof updateLocationSchema>

// locations DB row shape. type is immutable (DB trigger F5).
export const locationSchema = createLocationSchema.extend({
  id: uuidSchema,
  store_id: uuidSchema.nullable(),
  code: z.string(),
  is_default: z.boolean(),
  status: entityStatusSchema,
  created_at: z.string(),
  updated_at: z.string(),
})
export type Location = z.infer<typeof locationSchema>

export const locationIdParamSchema = idParamSchema
