import { z } from 'zod'
import { AlertType, AlertPriority, UserRole } from './common.schema.js'

// ---------------------------------------------------------------------------
// Alerts — Request schemas
// ---------------------------------------------------------------------------

export const ListAlertsQuery = z.object({
  type: AlertType.optional(),
  priority: AlertPriority.optional(),
  is_resolved: z.coerce.boolean().optional(),
  unread_only: z.coerce.boolean().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
})
export type ListAlertsQuery = z.infer<typeof ListAlertsQuery>

export const AlertIdParam = z.object({
  id: z.string().uuid(),
})
export type AlertIdParam = z.infer<typeof AlertIdParam>

export const MarkAlertReadRequest = z.object({
  dismissed: z.boolean().default(false),
})
export type MarkAlertReadRequest = z.infer<typeof MarkAlertReadRequest>

// ---------------------------------------------------------------------------
// Alerts — Response schemas
// ---------------------------------------------------------------------------

export const AlertResponse = z.object({
  id: z.string().uuid(),
  type: AlertType,
  priority: AlertPriority,
  title: z.string(),
  message: z.string(),
  product_id: z.string().uuid().nullable(),
  location_id: z.string().uuid().nullable(),
  po_id: z.string().uuid().nullable(),
  ai_recommendation_id: z.string().uuid().nullable(),
  target_roles: z.array(UserRole),
  is_resolved: z.boolean(),
  resolved_at: z.string().nullable(),
  resolved_by: z.string().uuid().nullable(),
  expires_at: z.string().nullable(),
  created_at: z.string(),
  // Per-user read status (joined from alert_reads)
  is_read: z.boolean().optional(),
  is_dismissed: z.boolean().optional(),
  read_at: z.string().nullable().optional(),
  // Joined fields
  product_name: z.string().optional(),
  sku_code: z.string().optional(),
  location_name: z.string().optional(),
})
export type AlertResponse = z.infer<typeof AlertResponse>

export const AlertListResponse = z.object({
  alerts: z.array(AlertResponse),
  total: z.number().int(),
  limit: z.number().int(),
  offset: z.number().int(),
})
export type AlertListResponse = z.infer<typeof AlertListResponse>

export const UnreadCountResponse = z.object({
  unread_count: z.number().int(),
})
export type UnreadCountResponse = z.infer<typeof UnreadCountResponse>

// ---------------------------------------------------------------------------
// Alert Preferences — Request schemas
// ---------------------------------------------------------------------------

export const UpdateAlertPreferencesRequest = z.object({
  notify_low_stock: z.boolean().optional(),
  notify_out_of_stock: z.boolean().optional(),
  notify_over_stock: z.boolean().optional(),
  notify_po_created: z.boolean().optional(),
  notify_po_received: z.boolean().optional(),
  notify_po_overdue: z.boolean().optional(),
  notify_ai_recommendation: z.boolean().optional(),
  notify_expiry_warning: z.boolean().optional(),
  email_enabled: z.boolean().optional(),
  email_address: z.string().email().nullable().optional(),
})
export type UpdateAlertPreferencesRequest = z.infer<typeof UpdateAlertPreferencesRequest>

export const AlertPreferencesResponse = z.object({
  user_id: z.string().uuid(),
  notify_low_stock: z.boolean(),
  notify_out_of_stock: z.boolean(),
  notify_over_stock: z.boolean(),
  notify_po_created: z.boolean(),
  notify_po_received: z.boolean(),
  notify_po_overdue: z.boolean(),
  notify_ai_recommendation: z.boolean(),
  notify_expiry_warning: z.boolean(),
  email_enabled: z.boolean(),
  email_address: z.string().nullable(),
  updated_at: z.string(),
})
export type AlertPreferencesResponse = z.infer<typeof AlertPreferencesResponse>
