import { z } from 'zod'
import { idParamSchema, nonNegativeMoneySchema, textSchema, uuidSchema } from './common.js'
import { aiRecommendationStatusSchema, aiRecommendationTypeSchema } from './enums.js'

/**
 * AI module schemas. Maps to `ai_recommendations` in schema.sql.
 * Encouraged acceptance is recorded via accepted_value / acted_on_by.
 */

// POST /ai/recommendations (also issued internally by scheduler)
export const createAiRecommendationSchema = z.object({
  type: aiRecommendationTypeSchema,
  productId: uuidSchema,
  locationId: uuidSchema.nullish(),
  recommendedValue: nonNegativeMoneySchema, // NUMERIC(12,3)
  currentValue: nonNegativeMoneySchema.nullish(),
  reasoning: textSchema.min(1),
  modelUsed: z.string().trim().max(100).optional(),
  confidence: z.coerce.number().min(0).max(1).optional(),
  inputData: z.unknown().optional(),
  expiresAt: z.string().datetime().nullish(),
})
export type CreateAiRecommendationInput = z.infer<typeof createAiRecommendationSchema>

// POST /ai/recommendations/:id/accept | /modify | /reject
export const acceptAiRecommendationSchema = z.object({
  acceptedValue: nonNegativeMoneySchema.optional(),
})
export type AcceptAiRecommendationInput = z.infer<typeof acceptAiRecommendationSchema>

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
  recommended_value: nonNegativeMoneySchema,
  current_value: nonNegativeMoneySchema.nullable(),
  reasoning: z.string(),
  model_used: z.string().nullable(),
  confidence: z.coerce.number().min(0).max(1).nullable(),
  input_data: z.unknown().nullable(),
  accepted_value: nonNegativeMoneySchema.nullable(),
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
