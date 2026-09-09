import { z } from 'zod'
import { uuidSchema } from './common'
import { alertPrioritySchema, alertTypeSchema, userRoleSchema } from './common'

/**
 * Alerts module schemas (frontend — zod v4). Maps to `alerts` and
 * `alert_preferences`. target_roles is a user_role[] array.
 */

export const alertsQuerySchema = z.object({
  type: alertTypeSchema.optional(),
  isResolved: z.boolean().optional(),
  includeRead: z.boolean().default(false),
  productId: uuidSchema.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
})

export const resolveAlertSchema = z.object({
  isResolved: z.literal(true),
})

export const upsertAlertPreferencesSchema = z.object({
  notifyLowStock: z.boolean().default(true),
  notifyOutOfStock: z.boolean().default(true),
  notifyPoCreated: z.boolean().default(true),
  notifyPoReceived: z.boolean().default(true),
  notifyPoOverdue: z.boolean().default(false),
  notifyAiRecommendation: z.boolean().default(true),
  notifyExpiryWarning: z.boolean().default(false),
  emailEnabled: z.boolean().default(false),
  emailAddress: z.string().trim().email().nullish(),
})
export type UpsertAlertPreferencesInput = z.infer<typeof upsertAlertPreferencesSchema>

export const alertSchema = z.object({
  id: uuidSchema,
  type: alertTypeSchema,
  priority: alertPrioritySchema,
  title: z.string(),
  message: z.string(),
  product_id: uuidSchema.nullable(),
  location_id: uuidSchema.nullable(),
  po_id: uuidSchema.nullable(),
  ai_recommendation_id: uuidSchema.nullable(),
  target_roles: z.array(userRoleSchema),
  is_resolved: z.boolean(),
  resolved_at: z.string().nullable(),
  resolved_by: uuidSchema.nullable(),
  expires_at: z.string().nullable(),
  created_at: z.string(),
})
export type Alert = z.infer<typeof alertSchema>
