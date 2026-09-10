import { Router } from 'express'
import {
  asyncHandler,
  requireAuth,
} from '../../middleware/index.js'
import type { AlertType } from '../../lib/schemas/enums.js'
import {
  queryAlerts,
  getUnreadAlertCount,
  markAlertAsRead,
  markAllAlertsAsRead,
  getUserAlertPreferences,
  updateAlertPreferences,
} from './alerts.store.js'

const router = Router()

/**
 * 1. GET /api/alerts
 * Role-scoped alerts list, respecting user alert preferences (suppresses disabled categories).
 */
router.get(
  '/alerts',
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = req.userId ?? '00000000-0000-0000-0000-000000000001'
    const userRole = req.role ?? 'admin'

    const rawType = req.query.type
    const type = typeof rawType === 'string' ? (rawType as AlertType) : undefined

    const query = {
      type,
      isResolved:
        req.query.isResolved !== undefined
          ? req.query.isResolved === 'true'
          : req.query.is_resolved !== undefined
          ? req.query.is_resolved === 'true'
          : undefined,
      includeRead:
        req.query.includeRead !== undefined
          ? req.query.includeRead === 'true'
          : req.query.include_read !== undefined
          ? req.query.include_read === 'true'
          : true,
      productId: (req.query.productId ?? req.query.product_id) ? String(req.query.productId ?? req.query.product_id) : undefined,
      limit: req.query.limit ? Number(req.query.limit) : 50,
      offset: req.query.offset ? Number(req.query.offset) : 0,
    }

    const result = await queryAlerts(userId, userRole, query)
    res.json(result)
  })
)

/**
 * 2. GET /api/alerts/unread-count
 * Returns unread alert count for header badge.
 */
router.get(
  '/alerts/unread-count',
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = req.userId ?? '00000000-0000-0000-0000-000000000001'
    const userRole = req.role ?? 'admin'

    const count = await getUnreadAlertCount(userId, userRole)
    res.json({ unreadCount: count })
  })
)

/**
 * 3. PATCH /api/alerts/read-all
 * Mark all current active alerts as read for this user.
 */
router.patch(
  '/alerts/read-all',
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = req.userId ?? '00000000-0000-0000-0000-000000000001'
    const userRole = req.role ?? 'admin'

    const marked = await markAllAlertsAsRead(userId, userRole)
    res.json({ success: true, markedCount: marked })
  })
)

/**
 * 4. PATCH or PUT /api/alerts/:id/read
 * Mark a single alert as read for this user.
 */
const markReadHandler = asyncHandler(async (req, res) => {
  const userId = req.userId ?? '00000000-0000-0000-0000-000000000001'
  const id = String(req.params.id)

  await markAlertAsRead(id, userId)
  res.json({ success: true, message: 'Alert marked as read' })
})

router.patch('/alerts/:id/read', requireAuth, markReadHandler)
router.put('/alerts/:id/read', requireAuth, markReadHandler)

/**
 * 5. GET /api/alerts/preferences
 * Return caller's notification preferences.
 */
router.get(
  '/alerts/preferences',
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = req.userId ?? '00000000-0000-0000-0000-000000000001'
    const prefs = await getUserAlertPreferences(userId)
    res.json({ data: prefs })
  })
)

/**
 * 6. PATCH or PUT /api/alerts/preferences
 * Update caller's alert preferences.
 */
const updatePrefsHandler = asyncHandler(async (req, res) => {
  const userId = req.userId ?? '00000000-0000-0000-0000-000000000001'
  const b = req.body ?? {}

  // Accept both camelCase and snake_case keys
  const updates: Record<string, unknown> = {}

  if (b.notifyLowStock !== undefined || b.notify_low_stock !== undefined) {
    updates.notify_low_stock = Boolean(b.notifyLowStock ?? b.notify_low_stock)
  }
  if (b.notifyOutOfStock !== undefined || b.notify_out_of_stock !== undefined) {
    updates.notify_out_of_stock = Boolean(b.notifyOutOfStock ?? b.notify_out_of_stock)
  }
  if (b.notifyPoCreated !== undefined || b.notify_po_created !== undefined) {
    updates.notify_po_created = Boolean(b.notifyPoCreated ?? b.notify_po_created)
  }
  if (b.notifyPoReceived !== undefined || b.notify_po_received !== undefined) {
    updates.notify_po_received = Boolean(b.notifyPoReceived ?? b.notify_po_received)
  }
  if (b.notifyPoOverdue !== undefined || b.notify_po_overdue !== undefined) {
    updates.notify_po_overdue = Boolean(b.notifyPoOverdue ?? b.notify_po_overdue)
  }
  if (b.notifyAiRecommendation !== undefined || b.notify_ai_recommendation !== undefined) {
    updates.notify_ai_recommendation = Boolean(b.notifyAiRecommendation ?? b.notify_ai_recommendation)
  }
  if (b.notifyExpiryWarning !== undefined || b.notify_expiry_warning !== undefined) {
    updates.notify_expiry_warning = Boolean(b.notifyExpiryWarning ?? b.notify_expiry_warning)
  }
  if (b.emailEnabled !== undefined || b.email_enabled !== undefined) {
    updates.email_enabled = Boolean(b.emailEnabled ?? b.email_enabled)
  }
  if (b.emailAddress !== undefined || b.email_address !== undefined) {
    updates.email_address = b.emailAddress ?? b.email_address ?? null
  }

  const updated = await updateAlertPreferences(userId, updates)
  res.json({
    success: true,
    message: 'Alert preferences saved successfully',
    data: updated,
  })
})

router.patch('/alerts/preferences', requireAuth, updatePrefsHandler)
router.put('/alerts/preferences', requireAuth, updatePrefsHandler)

export default router
