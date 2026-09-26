import { Router } from 'express'
import {
  AppError,
  asyncHandler,
  requireAuth,
  validate,
  validated,
} from '../../middleware/index.js'
import {
  createSaleSchema,
  listReturnsQuerySchema,
  listSalesQuerySchema,
  returnSaleSchema,
  saleIdParamSchema,
  voidSaleSchema,
} from '../../lib/schemas/index.js'
import {
  createSaleTransaction,
  getSaleDetail,
  processSaleReturnTransaction,
  querySaleReturns,
  querySales,
  voidSaleTransaction,
} from './sales.store.js'

const router = Router()

/**
 * Roles allowed to record or return a sale (BRD §12).
 * Admin, sales personnel and store staff record sales at the POS; store staff
 * are restricted to their own assigned store (enforced in the create handler).
 */
const SALE_WRITE_ROLES = ['admin', 'store_staff', 'sales_personnel']

/** Assert the caller may record sales or returns (server-side RBAC per BRD §12). */
function assertCanWriteSale(role: string | undefined): void {
  if (!role || !SALE_WRITE_ROLES.includes(role)) {
    throw new AppError(403, 'You do not have permission to record sales or returns', 'FORBIDDEN')
  }
}

/**
 * Store staff may only ring up sales at their own assigned store. Mirrors the
 * scoping used by the list/detail handlers so a sale can never be recorded
 * against another store (or with no store assignment at all).
 */
function assertStoreScope(actor: {
  role: string | undefined
  storeId: string | null | undefined
}, storeId: string | undefined): void {
  if (actor.role !== 'store_staff' && actor.role !== 'sales_personnel') return
  if (!actor.storeId) {
    throw new AppError(403, 'You are not assigned to a store. Contact an administrator.', 'FORBIDDEN')
  }
  if (storeId && actor.storeId !== storeId) {
    throw new AppError(403, 'You can only record sales at your own store', 'FORBIDDEN')
  }
}

// ---------------------------------------------------------------------------
// POST /api/sales — record a sale (auto stock deduction + audit trail)
// ---------------------------------------------------------------------------
router.post(
  '/sales',
  requireAuth,
  validate(createSaleSchema),
  asyncHandler(async (req, res) => {
    assertCanWriteSale(req.role)

    const payload = validated(req, 'body', createSaleSchema)

    assertStoreScope({ role: req.role, storeId: req.storeId }, payload.storeId)

    const sale = await createSaleTransaction(
      payload,
      {
        id: req.userId,
        email: req.email,
        role: req.role,
      },
      {
        ip: req.ip,
        userAgent: req.get('user-agent'),
      },
    )

    res.status(201).json({ sale })
  }),
)

// ---------------------------------------------------------------------------
// GET /api/sales — list sales with filters + pagination
// ---------------------------------------------------------------------------
router.get(
  '/sales',
  requireAuth,
  validate(listSalesQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const { storeId, from, to, status, limit, offset } = validated(
      req,
      'query',
      listSalesQuerySchema,
    )

    // Store Staff are scoped to their own store (BRD §12: view own store).
    if (req.role === 'store_staff' && req.storeId && storeId && storeId !== req.storeId) {
      throw new AppError(403, 'You can only view your own store', 'FORBIDDEN')
    }
    const effectiveStore = req.role === 'store_staff' && req.storeId ? req.storeId : storeId

    const { sales, total } = await querySales({
      store_id: effectiveStore,
      from,
      to,
      status: status as 'active' | 'voided' | undefined,
      limit,
      offset,
    })

    res.json({ sales, total, limit, offset })
  }),
)

// ---------------------------------------------------------------------------
// GET /api/sales/returns — list return records (must be before /sales/:id)
// ---------------------------------------------------------------------------
router.get(
  '/sales/returns',
  requireAuth,
  validate(listReturnsQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const { saleId, storeId, limit, offset } = validated(req, 'query', listReturnsQuerySchema)

    // Store Staff scoped to their own store
    if (req.role === 'store_staff' && req.storeId && storeId && storeId !== req.storeId) {
      throw new AppError(403, 'You can only view your own store', 'FORBIDDEN')
    }
    const effectiveStore = req.role === 'store_staff' && req.storeId ? req.storeId : storeId

    const { returns, total } = await querySaleReturns({
      sale_id: saleId,
      store_id: effectiveStore,
      limit,
      offset,
    })

    res.json({ returns, total, limit, offset })
  }),
)

// ---------------------------------------------------------------------------
// GET /api/sales/:id — sale detail with line items & returns
// ---------------------------------------------------------------------------
router.get(
  '/sales/:id',
  requireAuth,
  validate(saleIdParamSchema, 'params'),
  asyncHandler(async (req, res) => {
    const { id } = validated(req, 'params', saleIdParamSchema)
    const detail = await getSaleDetail(id)

    // Store staff can only view sales from their store
    if (req.role === 'store_staff' && req.storeId && detail.sale.store_id !== req.storeId) {
      throw new AppError(403, 'You can only view sales from your own store', 'FORBIDDEN')
    }

    res.json(detail)
  }),
)

// ---------------------------------------------------------------------------
// POST /api/sales/:id/void — Admin-only, restores stock, marks voided, audits
// ---------------------------------------------------------------------------
router.post(
  '/sales/:id/void',
  requireAuth,
  validate(saleIdParamSchema, 'params'),
  validate(voidSaleSchema),
  asyncHandler(async (req, res) => {
    if (req.role !== 'admin') {
      throw new AppError(403, 'Only an admin can void a sale', 'FORBIDDEN')
    }

    const { id } = validated(req, 'params', saleIdParamSchema)
    const payload = validated(req, 'body', voidSaleSchema)

    const result = await voidSaleTransaction(
      id,
      payload,
      {
        id: req.userId,
        email: req.email,
        role: req.role,
      },
      {
        ip: req.ip,
        userAgent: req.get('user-agent'),
      },
    )

    res.json(result)
  }),
)

// ---------------------------------------------------------------------------
// POST /api/sales/:id/return — process sale return (restores stock + audits)
// ---------------------------------------------------------------------------
router.post(
  '/sales/:id/return',
  requireAuth,
  validate(saleIdParamSchema, 'params'),
  validate(returnSaleSchema),
  asyncHandler(async (req, res) => {
    assertCanWriteSale(req.role)

    const { id } = validated(req, 'params', saleIdParamSchema)
    const payload = validated(req, 'body', returnSaleSchema)

    const result = await processSaleReturnTransaction(
      id,
      payload,
      {
        id: req.userId,
        email: req.email,
        role: req.role,
      },
      {
        ip: req.ip,
        userAgent: req.get('user-agent'),
      },
    )

    res.status(201).json(result)
  }),
)

// ---------------------------------------------------------------------------
// GET /api/sales/:id/returns — returns for a specific sale
// ---------------------------------------------------------------------------
router.get(
  '/sales/:id/returns',
  requireAuth,
  validate(saleIdParamSchema, 'params'),
  asyncHandler(async (req, res) => {
    const { id } = validated(req, 'params', saleIdParamSchema)
    const { returns } = await querySaleReturns({ sale_id: id })
    res.json({ returns })
  }),
)

export default router