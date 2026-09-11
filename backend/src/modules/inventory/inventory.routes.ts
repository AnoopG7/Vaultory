import { Router } from 'express'
import { supabase } from '../../config/index.js'
import {
  AppError,
  asyncHandler,
  requireAuth,
  requireRoles,
  validate,
  validated,
} from '../../middleware/index.js'
import {
  listInventoryQuerySchema,
} from '../../lib/schemas/inventory.js'
import {
  queryInventory,
  getInventoryItem,
  updateThresholds,
} from './inventory.store.js'
import {
  evaluateItemAlert,
  syncInventoryAlerts,
} from '../alerts/alerts.store.js'

const router = Router()

/**
 * 1. GET /api/inventory
 * Per-location stock grid with computed status badges (in_stock / low / out_of_stock / over_stock).
 */
router.get(
  '/inventory',
  requireAuth,
  validate(listInventoryQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const query = validated<typeof listInventoryQuerySchema>(req, 'query')
    const result = await queryInventory(query, req.role, req.storeId)

    // Sync alerts in background for surfaced items so alerts center reflects detected states
    syncInventoryAlerts(result.data).catch(() => {})

    res.json(result)
  })
)

/**
 * 2. GET /api/inventory/:productId/:locationId
 * Single inventory record for a product at a specific location.
 */
router.get(
  '/inventory/:productId/:locationId',
  requireAuth,
  asyncHandler(async (req, res) => {
    const productId = String(req.params.productId)
    const locationId = String(req.params.locationId)
    const item = await getInventoryItem(productId, locationId, req.role)
    if (!item) {
      throw new AppError(404, 'Inventory record not found', 'NOT_FOUND')
    }

    res.json({ data: item })
  })
)

/**
 * 3. PATCH /api/inventory/:productId/thresholds
 * Configure safety stock & reorder point for a product (global or per-location).
 */
router.patch(
  '/inventory/:productId/thresholds',
  requireAuth,
  requireRoles('admin', 'store_staff'),
  asyncHandler(async (req, res) => {
    const productId = String(req.params.productId)
    const body = req.body ?? {}

    // Support both camelCase and snake_case input
    const rawSafetyStock = body.safetyStock ?? body.safety_stock
    const rawReorderPoint = body.reorderPoint ?? body.reorder_point
    const rawTargetLevel = body.targetLevel ?? body.target_level
    const locationId = body.locationId ?? body.location_id ? String(body.locationId ?? body.location_id) : null

    const safetyStock = Number(rawSafetyStock)
    const reorderPoint = Number(rawReorderPoint)
    const targetLevel = rawTargetLevel !== undefined ? Number(rawTargetLevel) : undefined

    if (isNaN(safetyStock) || isNaN(reorderPoint)) {
      throw new AppError(
        400,
        'Safety stock and reorder point must be valid numbers',
        'INVALID_STOCK_LEVELS'
      )
    }

    if (targetLevel !== undefined && isNaN(targetLevel)) {
      throw new AppError(
        400,
        'Target level must be a valid number',
        'INVALID_STOCK_LEVELS'
      )
    }

    if (safetyStock < 0 || reorderPoint < 0) {
      throw new AppError(
        400,
        'Safety stock and reorder point cannot be negative',
        'INVALID_STOCK_LEVELS'
      )
    }

    if (targetLevel !== undefined && targetLevel < 0) {
      throw new AppError(
        400,
        'Target level cannot be negative',
        'INVALID_STOCK_LEVELS'
      )
    }

    if (reorderPoint < safetyStock) {
      throw new AppError(
        400,
        'Reorder point cannot be less than safety stock',
        'INVALID_STOCK_LEVELS'
      )
    }

    if (targetLevel !== undefined && targetLevel < reorderPoint) {
      throw new AppError(
        400,
        'Target level cannot be less than reorder point',
        'INVALID_STOCK_LEVELS'
      )
    }

    if (req.role === 'store_staff' && req.storeId && locationId) {
      const { data: loc } = await supabase
        .from('locations')
        .select('id')
        .eq('id', locationId)
        .eq('store_id', req.storeId)
        .maybeSingle()
      if (!loc) {
        throw new AppError(403, 'Location does not belong to your store', 'FORBIDDEN')
      }
    }

    const updated = await updateThresholds({
      productId,
      locationId,
      safetyStock,
      reorderPoint,
      targetLevel,
      actor: req.userId
        ? {
            id: req.userId,
            email: req.email ?? '',
            role: req.role ?? 'admin',
          }
        : undefined,
    })

    // Evaluate and sync alerts for affected inventory item
    const affectedItem = await getInventoryItem(productId, locationId)
    if (affectedItem) {
      await evaluateItemAlert(affectedItem)
    }

    res.json({
      success: true,
      message: 'Inventory thresholds updated successfully',
      data: updated,
    })
  })
)

/**
 * 4. PUT /api/safety-stock/:productId/:locationId
 * Spec-compliant endpoint (SAFETY_STOCK_ENDPOINTS).
 */
router.put(
  '/safety-stock/:productId/:locationId',
  requireAuth,
  requireRoles('admin', 'store_staff'),
  asyncHandler(async (req, res) => {
    const productId = String(req.params.productId)
    const rawLoc = String(req.params.locationId)
    const effLocationId = rawLoc === 'global' || rawLoc === 'null' ? null : rawLoc
    const body = req.body ?? {}

    const rawSafetyStock = body.safetyStock ?? body.safety_stock
    const rawReorderPoint = body.reorderPoint ?? body.reorder_point
    const rawTargetLevel = body.targetLevel ?? body.target_level

    const safetyStock = Number(rawSafetyStock)
    const reorderPoint = Number(rawReorderPoint)
    const targetLevel = rawTargetLevel !== undefined ? Number(rawTargetLevel) : undefined

    if (isNaN(safetyStock) || isNaN(reorderPoint)) {
      throw new AppError(
        400,
        'Safety stock and reorder point must be valid numbers',
        'INVALID_STOCK_LEVELS'
      )
    }

    if (targetLevel !== undefined && isNaN(targetLevel)) {
      throw new AppError(
        400,
        'Target level must be a valid number',
        'INVALID_STOCK_LEVELS'
      )
    }

    if (safetyStock < 0 || reorderPoint < 0) {
      throw new AppError(
        400,
        'Safety stock and reorder point cannot be negative',
        'INVALID_STOCK_LEVELS'
      )
    }

    if (targetLevel !== undefined && targetLevel < 0) {
      throw new AppError(
        400,
        'Target level cannot be negative',
        'INVALID_STOCK_LEVELS'
      )
    }

    if (reorderPoint < safetyStock) {
      throw new AppError(
        400,
        'Reorder point cannot be less than safety stock',
        'INVALID_STOCK_LEVELS'
      )
    }

    if (targetLevel !== undefined && targetLevel < reorderPoint) {
      throw new AppError(
        400,
        'Target level cannot be less than reorder point',
        'INVALID_STOCK_LEVELS'
      )
    }

    if (req.role === 'store_staff' && req.storeId && effLocationId) {
      const { data: loc } = await supabase
        .from('locations')
        .select('id')
        .eq('id', effLocationId)
        .eq('store_id', req.storeId)
        .maybeSingle()
      if (!loc) {
        throw new AppError(403, 'Location does not belong to your store', 'FORBIDDEN')
      }
    }

    const updated = await updateThresholds({
      productId,
      locationId: effLocationId,
      safetyStock,
      reorderPoint,
      targetLevel,
      actor: req.userId
        ? {
            id: req.userId,
            email: req.email ?? '',
            role: req.role ?? 'admin',
          }
        : undefined,
    })

    const affectedItem = await getInventoryItem(productId, effLocationId)
    if (affectedItem) {
      await evaluateItemAlert(affectedItem)
    }

    res.json({
      success: true,
      message: 'Safety stock rule updated successfully',
      data: updated,
    })
  })
)

export default router
