import { Router, type Request } from 'express'
import { supabase } from '../../config/index.js'
import { AppError, asyncHandler, requireAuth, requireRoles, validate, validated } from '../../middleware/index.js'
import {
  acceptAiRecommendationSchema,
  aiRecommendationIdParamSchema,
  autoOrderTriggerSchema,
  forecastTriggerSchema,
  listRecommendationsQuerySchema,
  modifyAiRecommendationSchema,
  rejectAiRecommendationSchema,
} from '../../lib/schemas/ai.js'
import {
  actOnRecommendation,
  createDemandForecastRecommendation,
  generateReorderRecommendations,
  generateWarehouseRecommendations,
  getRecommendation,
  listRecommendations,
  rejectRecommendation,
} from './ai.store.js'

const router = Router()

function actorFromReq(req: Request) {
  return { id: req.userId, email: req.email, role: req.role }
}

// -----------------------------------------------------------------------------
// 1. GET /api/ai/recommendations — list, filterable by type/status/product/location
// -----------------------------------------------------------------------------
router.get(
  '/ai/recommendations',
  requireAuth,
  validate(listRecommendationsQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const q = validated(req, 'query', listRecommendationsQuerySchema)
    const result = await listRecommendations({
      type: q.type,
      status: q.status,
      productId: q.productId,
      locationId: q.locationId,
      limit: q.limit,
      offset: q.offset,
    })
    res.json(result)
  }),
)

// -----------------------------------------------------------------------------
// 2. GET /api/ai/recommendations/:id
// -----------------------------------------------------------------------------
router.get(
  '/ai/recommendations/:id',
  requireAuth,
  validate(aiRecommendationIdParamSchema, 'params'),
  asyncHandler(async (req, res) => {
    const { id } = validated(req, 'params', aiRecommendationIdParamSchema)
    const recommendation = await getRecommendation(id)
    if (!recommendation) {
      throw new AppError(404, 'Recommendation not found', 'NOT_FOUND')
    }
    res.json({ recommendation })
  }),
)

// -----------------------------------------------------------------------------
// 3. POST /api/ai/recommendations/:id/accept — creates an ai_auto PO for
//    reorder_quantity; applies safety-stock rule updates for warehouse/safety.
// -----------------------------------------------------------------------------
router.post(
  '/ai/recommendations/:id/accept',
  requireAuth,
  requireRoles('admin'),
  validate(aiRecommendationIdParamSchema, 'params'),
  validate(acceptAiRecommendationSchema),
  asyncHandler(async (req, res) => {
    const { id } = validated(req, 'params', aiRecommendationIdParamSchema)
    const body = validated(req, 'body', acceptAiRecommendationSchema)
    const result = await actOnRecommendation(id, actorFromReq(req), 'accepted', body.acceptedValue)
    res.json({
      recommendation: result.recommendation,
      purchase_order: result.purchase_order,
      message: result.message,
    })
  }),
)

// -----------------------------------------------------------------------------
// 4. POST /api/ai/recommendations/:id/modify — edit the value, then accept.
// -----------------------------------------------------------------------------
router.post(
  '/ai/recommendations/:id/modify',
  requireAuth,
  requireRoles('admin'),
  validate(aiRecommendationIdParamSchema, 'params'),
  validate(modifyAiRecommendationSchema),
  asyncHandler(async (req, res) => {
    const { id } = validated(req, 'params', aiRecommendationIdParamSchema)
    const body = validated(req, 'body', modifyAiRecommendationSchema)
    const result = await actOnRecommendation(id, actorFromReq(req), 'modified', body.acceptedValue)
    res.json({
      recommendation: result.recommendation,
      purchase_order: result.purchase_order,
      message: result.message,
    })
  }),
)

// -----------------------------------------------------------------------------
// 5. POST /api/ai/recommendations/:id/reject
// -----------------------------------------------------------------------------
router.post(
  '/ai/recommendations/:id/reject',
  requireAuth,
  requireRoles('admin'),
  validate(aiRecommendationIdParamSchema, 'params'),
  validate(rejectAiRecommendationSchema),
  asyncHandler(async (req, res) => {
    const { id } = validated(req, 'params', aiRecommendationIdParamSchema)
    const body = validated(req, 'body', rejectAiRecommendationSchema)
    const result = await rejectRecommendation(id, actorFromReq(req), body.rejectionReason)
    res.json(result)
  }),
)

// -----------------------------------------------------------------------------
// 6. POST /api/ai/forecast — Groq + moving-average fallback, persisted as a
//    `demand_forecast` recommendation for auditability (SRS §8.3).
// -----------------------------------------------------------------------------
router.post(
  '/ai/forecast',
  requireAuth,
  requireRoles('admin'),
  validate(forecastTriggerSchema),
  asyncHandler(async (req, res) => {
    const body = validated(req, 'body', forecastTriggerSchema)
    const { data: product } = await supabase
      .from('products')
      .select('id, name, sku_code')
      .eq('id', body.productId)
      .maybeSingle()
    if (!product) {
      throw new AppError(404, 'Product not found', 'NOT_FOUND')
    }

    const result = await createDemandForecastRecommendation({
      productId: String(product.id),
      productName: String(product.name),
      skuCode: String(product.sku_code),
      locationId: body.locationId,
      horizonDays: body.horizonDays,
    })

    if (!result.forecast) {
      throw new AppError(422, 'Insufficient sales history to forecast this product', 'INSUFFICIENT_HISTORY')
    }

    res.json({ forecast: result.forecast, recommendation: result.recommendation })
  }),
)

// -----------------------------------------------------------------------------
// 7. POST /api/ai/auto-order — scan inventory and emit reorder recommendations
//    (never creates a PO without an accept / auto-approve consent flag).
// -----------------------------------------------------------------------------
router.post(
  '/ai/auto-order',
  requireAuth,
  requireRoles('admin'),
  validate(autoOrderTriggerSchema),
  asyncHandler(async (req, res) => {
    const body = validated(req, 'body', autoOrderTriggerSchema)
    const result = await generateReorderRecommendations({
      destinationId: body.destinationId,
      dryRun: body.dryRun,
      actor: actorFromReq(req),
    })
    res.json(result)
  }),
)

// -----------------------------------------------------------------------------
// 8. GET /api/ai/warehouse-recommendations — per-product warehouse stock levels
// -----------------------------------------------------------------------------
router.get(
  '/ai/warehouse-recommendations',
  requireAuth,
  requireRoles('admin', 'senior_stakeholder'),
  asyncHandler(async (_req, res) => {
    const recommendations = await generateWarehouseRecommendations()
    res.json({ recommendations })
  }),
)

export default router