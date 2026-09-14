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
  modelUsed: z.string().trim().max(100).nullish(),
  confidence: z.coerce.number().min(0).max(1).nullish(),
  expiresAt: z.string().datetime().nullish(),
})
export type CreateAiRecommendationInput = z.infer<typeof createAiRecommendationSchema>

export const forecastTriggerSchema = z.object({
  productId: uuidSchema,
  locationId: uuidSchema.nullish(),
  horizonDays: z.coerce.number().int().min(1).max(365).default(30),
})
export type ForecastTriggerInput = z.infer<typeof forecastTriggerSchema>

export const autoOrderTriggerSchema = z.object({
  destinationId: uuidSchema.optional(),
  dryRun: z.boolean().optional().default(false),
})
export type AutoOrderTriggerInput = z.infer<typeof autoOrderTriggerSchema>

export const acceptAiRecommendationSchema = z.object({
  acceptedValue: nonNegativeMoneySchema.optional(),
})
export type AcceptAiRecommendationInput = z.infer<typeof acceptAiRecommendationSchema>

export const modifyAiRecommendationSchema = z.object({
  acceptedValue: nonNegativeMoneySchema,
})
export type ModifyAiRecommendationInput = z.infer<typeof modifyAiRecommendationSchema>

export const rejectAiRecommendationSchema = z.object({
  rejectionReason: z.string().trim().optional(),
})
export type RejectRecommendationInput = z.infer<typeof rejectAiRecommendationSchema>

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
