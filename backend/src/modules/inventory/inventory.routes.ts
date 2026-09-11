import { Router } from 'express'
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
  listMovementsQuerySchema,
  stockInSchema,
  stockOutSchema,
  transferSchema,
  adjustSchema,
} from '../../lib/schemas/inventory.js'
import {
  queryInventory,
  getInventoryItem,
  updateThresholds,
  mutateStock,
  transferStock,
  queryMovements,
} from './inventory.store.js'
import { evaluateItemAlert, syncInventoryAlerts } from '../alerts/alerts.store.js'
import { findMemoryPurchaseOrder } from '../purchase-orders/purchase-orders.routes.js'

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
    const item = await getInventoryItem(productId, locationId)
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

    if (safetyStock < 0 || reorderPoint < 0) {
      throw new AppError(
        400,
        'Safety stock and reorder point cannot be negative',
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

    if (safetyStock < 0 || reorderPoint < 0) {
      throw new AppError(
        400,
        'Safety stock and reorder point cannot be negative',
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
  }),
)

// ---------------------------------------------------------------------------
// 5. POST /api/inventory/stock-in
// ---------------------------------------------------------------------------
router.post(
  '/inventory/stock-in',
  requireAuth,
  requireRoles('admin', 'store_staff'),
  validate(stockInSchema),
  asyncHandler(async (req, res) => {
    const body = validated<typeof stockInSchema>(req, 'body')

    if (body.poId) {
      const po = findMemoryPurchaseOrder(body.poId)
      if (!po) {
        throw new AppError(404, 'Purchase order not found for the provided poId', 'PO_NOT_FOUND')
      }
    }

    const movement = await mutateStock({
      productId: body.productId,
      locationId: body.locationId,
      type: 'stock_in',
      qty: body.qty,
      reason: body.reason,
      notes: body.notes,
      poId: body.poId,
      poLineId: body.poLineId,
      earliestExpiryDate: body.earliestExpiryDate,
      actor: req.userId
        ? { id: req.userId, email: req.email ?? '', role: req.role ?? 'admin' }
        : undefined,
    })

    const affected = await getInventoryItem(body.productId, body.locationId)
    if (affected) {
      syncInventoryAlerts([affected]).catch(() => {})
    }

    res.status(201).json({
      movement_id: movement.id,
      product_id: movement.product_id,
      location_id: movement.location_id,
      qty_before: movement.qty_before,
      qty_after: movement.qty_after,
      message: 'Stock-in recorded successfully',
    })
  }),
)

// ---------------------------------------------------------------------------
// 6. POST /api/inventory/stock-out
// ---------------------------------------------------------------------------
router.post(
  '/inventory/stock-out',
  requireAuth,
  requireRoles('admin', 'store_staff'),
  validate(stockOutSchema),
  asyncHandler(async (req, res) => {
    const body = validated<typeof stockOutSchema>(req, 'body')

    const movement = await mutateStock({
      productId: body.productId,
      locationId: body.locationId,
      type: 'stock_out',
      qty: -Math.abs(body.qty),
      reason: body.reason,
      notes: body.notes,
      actor: req.userId
        ? { id: req.userId, email: req.email ?? '', role: req.role ?? 'admin' }
        : undefined,
    })

    const affected = await getInventoryItem(body.productId, body.locationId)
    if (affected) {
      syncInventoryAlerts([affected]).catch(() => {})
    }

    res.status(201).json({
      movement_id: movement.id,
      product_id: movement.product_id,
      location_id: movement.location_id,
      qty_before: movement.qty_before,
      qty_after: movement.qty_after,
      message: 'Stock-out recorded successfully',
    })
  }),
)

// ---------------------------------------------------------------------------
// 7. POST /api/inventory/transfer
// ---------------------------------------------------------------------------
router.post(
  '/inventory/transfer',
  requireAuth,
  requireRoles('admin', 'store_staff'),
  validate(transferSchema),
  asyncHandler(async (req, res) => {
    const body = validated<typeof transferSchema>(req, 'body')

    const result = await transferStock({
      productId: body.productId,
      sourceLocationId: body.sourceLocationId,
      destinationLocationId: body.destinationLocationId,
      qty: body.qty,
      notes: body.notes,
      actor: req.userId
        ? { id: req.userId, email: req.email ?? '', role: req.role ?? 'admin' }
        : undefined,
    })

    const [sourceItem, destItem] = await Promise.all([
      getInventoryItem(body.productId, body.sourceLocationId),
      getInventoryItem(body.productId, body.destinationLocationId),
    ])
    syncInventoryAlerts([sourceItem, destItem].filter(Boolean) as NonNullable<typeof sourceItem>[]).catch(() => {})

    res.status(201).json({
      transfer_ref: result.transfer_ref,
      source_movement_id: result.source_movement_id,
      dest_movement_id: result.dest_movement_id,
      message: 'Stock transferred successfully',
    })
  }),
)

// ---------------------------------------------------------------------------
// 8. POST /api/inventory/adjust
// ---------------------------------------------------------------------------
router.post(
  '/inventory/adjust',
  requireAuth,
  requireRoles('admin', 'store_staff'),
  validate(adjustSchema),
  asyncHandler(async (req, res) => {
    const body = validated<typeof adjustSchema>(req, 'body')

    const existing = await getInventoryItem(body.productId, body.locationId)
    const currentQty = existing?.qty_on_hand ?? 0
    const delta = body.newQty - currentQty

    const movement = await mutateStock({
      productId: body.productId,
      locationId: body.locationId,
      type: 'adjustment',
      qty: delta,
      reason: body.reason,
      notes: body.notes,
      actor: req.userId
        ? { id: req.userId, email: req.email ?? '', role: req.role ?? 'admin' }
        : undefined,
    })

    const affected = await getInventoryItem(body.productId, body.locationId)
    if (affected) {
      syncInventoryAlerts([affected]).catch(() => {})
    }

    res.status(201).json({
      movement_id: movement.id,
      product_id: movement.product_id,
      location_id: movement.location_id,
      qty_before: movement.qty_before,
      qty_after: movement.qty_after,
      message: 'Stock adjustment recorded successfully',
    })
  }),
)

// ---------------------------------------------------------------------------
// 9. GET /api/inventory/movements
// ---------------------------------------------------------------------------
router.get(
  '/inventory/movements',
  requireAuth,
  validate(listMovementsQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const query = validated<typeof listMovementsQuerySchema>(req, 'query')
    const result = await queryMovements(query, req.role, req.storeId)

    res.json({
      movements: result.movements,
      total: result.total,
      limit: result.limit,
      offset: result.offset,
    })
  }),
)

export default router
