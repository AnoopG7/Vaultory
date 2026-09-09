import { z } from 'zod'
import { uuidSchema } from './common.js'
import { alertPrioritySchema, alertTypeSchema, userRoleSchema } from './enums.js'

/**
 * Alerts module schemas. Maps to `alerts`, `alert_reads`, `alert_preferences`
 * in schema.sql. target_roles is a user_role[] GIN-indexed array.
 */

// PUT /alerts/:id/read   and   /alerts/:id/dismiss  (toggle reads)
export const markAlertReadSchema = z.object({
  read: z.boolean().default(true),
  dismissed: z.boolean().default(false),
})

// PATCH /alerts/:id/resolve
export const resolveAlertSchema = z.object({
  isResolved: z.literal(true),
})

// GET /alerts query params.
export const alertsQuerySchema = z.object({
  type: alertTypeSchema.optional(),
  isResolved: z.coerce.boolean().optional(),
  includeRead: z.coerce.boolean().default(false),
  productId: uuidSchema.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
})

// PUT /alert-preferences
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

// alerts DB row shape.
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
