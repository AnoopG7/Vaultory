import { z } from 'zod'
import { uuidSchema } from './common.js'
import { entityStatusSchema } from './enums.js'

/**
 * Units (measurement) module schemas. Maps to `units` in schema.sql.
 */

export const createUnitSchema = z.object({
  name: z.string().trim().min(1).max(100),
  abbreviation: z.string().trim().max(10).optional(),
})
export type CreateUnitInput = z.infer<typeof createUnitSchema>

export const updateUnitSchema = createUnitSchema.partial()
export type UpdateUnitInput = z.infer<typeof updateUnitSchema>

// units DB row shape.
export const unitSchema = createUnitSchema.extend({
  id: uuidSchema,
  abbreviation: z.string().nullable(),
  status: entityStatusSchema,
})
export type Unit = z.infer<typeof unitSchema>
