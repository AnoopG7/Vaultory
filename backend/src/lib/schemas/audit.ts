import { z } from 'zod'
import { dateStringSchema, textSchema, uuidSchema } from './common.js'
import { auditActionSchema, userRoleSchema } from './enums.js'

/**
 * Audit module schemas. Maps to `audit_logs` (IMMUTABLE) in schema.sql.
 * GET-only; sensitive values are MASKED in detail JSONB.
 */

// GET /audit-logs query params.
export const auditLogsQuerySchema = z.object({
  actorId: uuidSchema.optional(),
  actorRole: userRoleSchema.optional(),
  action: auditActionSchema.optional(),
  entity: z.string().trim().max(50).optional(),
  entityId: uuidSchema.optional(),
  from: dateStringSchema.optional(),
  to: dateStringSchema.optional(),
  limit: z.coerce.number().int().min(1).max(500).default(100),
  offset: z.coerce.number().int().min(0).default(0),
})
export type AuditLogsQuery = z.infer<typeof auditLogsQuerySchema>

// audit_logs DB row shape.
export const auditLogSchema = z.object({
  id: uuidSchema,
  actor_id: uuidSchema.nullable(),
  actor_email: z.string().nullable(),
  actor_role: userRoleSchema.nullable(),
  action: auditActionSchema,
  entity: z.string(),
  entity_id: uuidSchema.nullable(),
  detail: z.unknown().nullable(),
  ip_address: z.string().nullable(),
  user_agent: z.string().nullable(),
  created_at: z.string(),
})
export type AuditLog = z.infer<typeof auditLogSchema>

// Used to write audit rows from within modules (via Supabase RPC or insert).
export const createAuditLogSchema = z.object({
  actorId: uuidSchema.nullish(),
  actorEmail: z.string().nullish(),
  actorRole: userRoleSchema.nullish(),
  action: auditActionSchema,
  entity: z.string().trim().max(50),
  entityId: uuidSchema.nullish(),
  detail: z.unknown().optional(),
  ipAddress: z.string().nullish(),
  userAgent: textSchema.nullish(),
})
export type CreateAuditLogInput = z.infer<typeof createAuditLogSchema>
