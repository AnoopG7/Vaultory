import { z } from 'zod'
import { uuidSchema } from './common.js'
import { entityStatusSchema } from './enums.js'

/**
 * Units (measurement) module schemas. Maps to `units` in schema.sql.
 */

export const createUnitSchema = z.object({
  name: z.string().trim().min(1).max(100),
  abbreviation: z.string().trim().max(10).optional(),
  status: entityStatusSchema.optional(),
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

// GET /api/units — list query (status filter).
export const listUnitsQuerySchema = z.object({
  status: z.enum(['active', 'archived', 'all']).optional().default('all'),
})
export type ListUnitsQuery = z.infer<typeof listUnitsQuerySchema>

// /api/units/:id param
export const unitIdParamSchema = z.object({
  id: uuidSchema,
})
export type UnitIdParam = z.infer<typeof unitIdParamSchema>
