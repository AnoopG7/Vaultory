import { z } from 'zod'
import { uuidSchema } from './common'
import { entityStatusSchema } from './common'

/**
 * Units (measurement) module schemas (frontend — zod v4). Maps to `units`.
 */

export const createUnitSchema = z.object({
  name: z.string().trim().min(1).max(100),
  abbreviation: z.string().trim().max(10).optional(),
})
export type CreateUnitInput = z.infer<typeof createUnitSchema>

export const updateUnitSchema = createUnitSchema.partial()
export type UpdateUnitInput = z.infer<typeof updateUnitSchema>

export const unitSchema = createUnitSchema.extend({
  id: uuidSchema,
  abbreviation: z.string().nullable(),
  status: entityStatusSchema,
})
export type Unit = z.infer<typeof unitSchema>
