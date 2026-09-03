import { z } from 'zod'
import { nonNegativeMoneySchema, uuidSchema } from './common'
import { aiRecommendationStatusSchema, aiRecommendationTypeSchema } from './common'

/**
 * AI module schemas (frontend — zod v4). Maps to `ai_recommendations`.
 */

export const createAiRecommendationSchema = z.object({
  type: aiRecommendationTypeSchema,
  productId: uuidSchema,
  locationId: uuidSchema.nullish(),
  recommendedValue: nonNegativeMoneySchema,
  currentValue: nonNegativeMoneySchema.nullish(),
  reasoning: z.string().trim().min(1),
  modelUsed: z.string().trim().max(100).optional(),
  confidence: z.coerce.number().min(0).max(1).optional(),
  expiresAt: z.string().datetime().nullish(),
})
export type CreateAiRecommendationInput = z.infer<typeof createAiRecommendationSchema>

export const acceptAiRecommendationSchema = z.object({
  acceptedValue: nonNegativeMoneySchema.optional(),
})
export type AcceptAiRecommendationInput = z.infer<typeof acceptAiRecommendationSchema>

export const rejectAiRecommendationSchema = z.object({
  rejectionReason: z.string().trim().optional(),
})

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
