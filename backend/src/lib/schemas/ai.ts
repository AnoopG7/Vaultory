import { z } from 'zod'
import { idParamSchema, nonNegativeQtySchema, textSchema, uuidSchema } from './common.js'
import { aiRecommendationStatusSchema, aiRecommendationTypeSchema } from './enums.js'

/**
 * AI module schemas. Maps to `ai_recommendations` in schema.sql.
 * Encouraged acceptance is recorded via accepted_value / acted_on_by.
 */

// GET /ai/recommendations?type=&status=&productId=&locationId=
export const listRecommendationsQuerySchema = z.object({
  type: aiRecommendationTypeSchema.optional(),
  status: aiRecommendationStatusSchema.optional(),
  productId: z.string().uuid().optional(),
  locationId: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
})

// POST /ai/forecast
export const forecastTriggerSchema = z.object({
  productId: uuidSchema,
  locationId: uuidSchema.nullish(),
  horizonDays: z.coerce.number().int().min(1).max(365).default(30),
})

// POST /ai/auto-order
export const autoOrderTriggerSchema = z.object({
  destinationId: uuidSchema.optional(),
  dryRun: z.boolean().optional().default(false),
})

// POST /ai/recommendations (also issued internally by scheduler)
export const createAiRecommendationSchema = z.object({
  type: aiRecommendationTypeSchema,
  productId: uuidSchema,
  locationId: uuidSchema.nullish(),
  recommendedValue: nonNegativeQtySchema, // NUMERIC(12,3)
  currentValue: nonNegativeQtySchema.nullish(),
  reasoning: textSchema.min(1),
  modelUsed: z.string().trim().max(100).nullish(),
  confidence: z.coerce.number().min(0).max(1).nullish(),
  inputData: z.unknown().optional(),
  expiresAt: z.string().datetime().nullish(),
})
export type CreateAiRecommendationInput = z.infer<typeof createAiRecommendationSchema>

// POST /ai/recommendations/:id/accept | /modify | /reject
export const acceptAiRecommendationSchema = z.object({
  acceptedValue: nonNegativeQtySchema.optional(),
})
export type AcceptAiRecommendationInput = z.infer<typeof acceptAiRecommendationSchema>

// POST /ai/recommendations/:id/modify — a value edit, then accept.
export const modifyAiRecommendationSchema = z.object({
  acceptedValue: nonNegativeQtySchema,
})
export type ModifyAiRecommendationInput = z.infer<typeof modifyAiRecommendationSchema>

export const rejectAiRecommendationSchema = z.object({
  rejectionReason: textSchema.optional(),
})

// ai_recommendations DB row shape.
export const aiRecommendationSchema = z.object({
  id: uuidSchema,
  type: aiRecommendationTypeSchema,
  status: aiRecommendationStatusSchema,
  product_id: uuidSchema,
  location_id: uuidSchema.nullable(),
  recommended_value: nonNegativeQtySchema,
  current_value: nonNegativeQtySchema.nullable(),
  reasoning: z.string(),
  model_used: z.string().nullable(),
  confidence: z.coerce.number().min(0).max(1).nullable(),
  input_data: z.unknown().nullable(),
  accepted_value: nonNegativeQtySchema.nullable(),
  acted_on_by: uuidSchema.nullable(),
  acted_on_at: z.string().nullable(),
  rejection_reason: z.string().nullable(),
  resulting_po_id: uuidSchema.nullable(),
  expires_at: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
})
export type AiRecommendation = z.infer<typeof aiRecommendationSchema>

export const aiRecommendationIdParamSchema = idParamSchema
