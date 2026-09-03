import { z } from 'zod'
import { AiRecommendationType, AiRecommendationStatus } from './common.schema.js'

// ---------------------------------------------------------------------------
// AI — Request schemas
// ---------------------------------------------------------------------------

export const ListRecommendationsQuery = z.object({
  type: AiRecommendationType.optional(),
  status: AiRecommendationStatus.optional(),
  product_id: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
})
export type ListRecommendationsQuery = z.infer<typeof ListRecommendationsQuery>

export const RecommendationIdParam = z.object({
  id: z.string().uuid(),
})
export type RecommendationIdParam = z.infer<typeof RecommendationIdParam>

export const AcceptRecommendationRequest = z.object({
  accepted_value: z.number().min(0).nullable().optional(),
})
export type AcceptRecommendationRequest = z.infer<typeof AcceptRecommendationRequest>

export const ModifyRecommendationRequest = z.object({
  modified_value: z.number().min(0),
  reason: z.string().min(1, 'Reason for modification is required'),
})
export type ModifyRecommendationRequest = z.infer<typeof ModifyRecommendationRequest>

export const RejectRecommendationRequest = z.object({
  rejection_reason: z.string().min(1, 'Rejection reason is required'),
})
export type RejectRecommendationRequest = z.infer<typeof RejectRecommendationRequest>

export const TriggerForecastRequest = z.object({
  product_id: z.string().uuid(),
  location_id: z.string().uuid().nullable().optional(),
})
export type TriggerForecastRequest = z.infer<typeof TriggerForecastRequest>

export const TriggerAutoOrderRequest = z.object({
  dry_run: z.boolean().default(false),
})
export type TriggerAutoOrderRequest = z.infer<typeof TriggerAutoOrderRequest>

// ---------------------------------------------------------------------------
// AI — Response schemas
// ---------------------------------------------------------------------------

export const AiRecommendationResponse = z.object({
  id: z.string().uuid(),
  type: AiRecommendationType,
  status: AiRecommendationStatus,
  product_id: z.string().uuid(),
  location_id: z.string().uuid().nullable(),
  recommended_value: z.number(),
  current_value: z.number().nullable(),
  reasoning: z.string(),
  model_used: z.string().nullable(),
  confidence: z.number().nullable(),
  input_data: z.record(z.string(), z.unknown()).nullable(),
  accepted_value: z.number().nullable(),
  acted_on_by: z.string().uuid().nullable(),
  acted_on_at: z.string().nullable(),
  rejection_reason: z.string().nullable(),
  resulting_po_id: z.string().uuid().nullable(),
  expires_at: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
  // Joined fields
  product_name: z.string().optional(),
  sku_code: z.string().optional(),
  location_name: z.string().optional(),
})
export type AiRecommendationResponse = z.infer<typeof AiRecommendationResponse>

export const RecommendationListResponse = z.object({
  recommendations: z.array(AiRecommendationResponse),
  total: z.number().int(),
  limit: z.number().int(),
  offset: z.number().int(),
})
export type RecommendationListResponse = z.infer<typeof RecommendationListResponse>

export const RecommendationDetailResponse = z.object({
  recommendation: AiRecommendationResponse,
})
export type RecommendationDetailResponse = z.infer<typeof RecommendationDetailResponse>

export const ForecastResponse = z.object({
  product_id: z.string().uuid(),
  predicted_demand: z.number(),
  confidence: z.number().nullable(),
  reasoning: z.string(),
  sourced_from_ai: z.boolean(),
  model_used: z.string().nullable(),
})
export type ForecastResponse = z.infer<typeof ForecastResponse>

export const AutoOrderTriggerResponse = z.object({
  message: z.string(),
  dry_run: z.boolean(),
  recommendations_created: z.number().int(),
  po_created: z.number().int(),
  skipped: z.number().int(),
})
export type AutoOrderTriggerResponse = z.infer<typeof AutoOrderTriggerResponse>

export const WarehouseRecommendationResponse = z.object({
  product_id: z.string().uuid(),
  product_name: z.string(),
  sku_code: z.string(),
  location_id: z.string().uuid(),
  location_name: z.string(),
  current_stock: z.number(),
  recommended_stock_level: z.number(),
  reasoning: z.string(),
  confidence: z.number().nullable(),
  model_used: z.string().nullable(),
})
export type WarehouseRecommendationResponse = z.infer<typeof WarehouseRecommendationResponse>
