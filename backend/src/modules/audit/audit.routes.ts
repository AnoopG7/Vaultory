import { Router } from 'express'
import { env, supabase } from '../../config/index.js'
import {
  asyncHandler,
  requireAuth,
  requireRoles,
  validate,
  validated,
} from '../../middleware/index.js'
import { auditLogsQuerySchema } from '../../lib/schemas/audit.js'
import { memoryAuditLogs } from '../users/users.store.js'

const router = Router()
const isMockSupabase = !env.SUPABASE_URL || env.SUPABASE_URL.includes('mock') || env.SUPABASE_URL.includes('localhost')

/**
 * GET /api/audit-logs
 * List audit logs with filters (actor, role, action, entity, entityId, date range) + pagination.
 * Accessible to admin and sales_personnel (for sales audit trail).
 */
router.get(
  '/audit-logs',
  requireAuth,
  requireRoles('admin', 'sales_personnel'),
  validate(auditLogsQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const {
      actorId,
      actorRole,
      action,
      entity,
      entityId,
      from,
      to,
      limit,
      offset,
    } = validated(req, 'query', auditLogsQuerySchema)

    // Try Supabase first
    if (!isMockSupabase) {
      try {
        let query = supabase
          .from('audit_logs')
          .select('*', { count: 'exact' })
          .order('created_at', { ascending: false })

      if (actorId) query = query.eq('actor_id', actorId)
      if (actorRole) query = query.eq('actor_role', actorRole)
      if (action) query = query.eq('action', action)
      if (entity) query = query.eq('entity', entity)
      if (entityId) query = query.eq('entity_id', entityId)
      if (from) query = query.gte('created_at', from)
      if (to) query = query.lte('created_at', to)

      query = query.range(offset, offset + limit - 1)

      const { data, count, error } = await query
      if (!error && data && data.length > 0) {
        return res.json({
          logs: data,
          total: count ?? data.length,
          limit,
          offset,
        })
      }
    } catch {
      // Fallback to in-memory store
    }
    }

    // In-memory fallback
    let filtered = [...memoryAuditLogs]

    if (actorId) filtered = filtered.filter((l) => l.actor_id === actorId)
    if (actorRole) filtered = filtered.filter((l) => l.actor_role === actorRole)
    if (action) filtered = filtered.filter((l) => l.action === action)
    if (entity) filtered = filtered.filter((l) => l.entity === entity)
    if (entityId) filtered = filtered.filter((l) => l.entity_id === entityId)
    if (from) filtered = filtered.filter((l) => l.created_at >= from)
    if (to) filtered = filtered.filter((l) => l.created_at <= to)

    res.json({
      logs: filtered.slice(offset, offset + limit),
      total: filtered.length,
      limit,
      offset,
    })
  }),
)

export default router
