import { Router } from 'express'
import {
  AppError,
  asyncHandler,
  requireAuth,
  validate,
  validated,
} from '../../middleware/index.js'
import {
  CreateSaleRequest,
  ListReturnsQuery,
  ListSalesQuery,
  ReturnSaleRequest,
  SaleIdParam,
  VoidSaleRequest,
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
 * Sales personnel (and Admin) record sales & process returns; store staff only view/manage stock.
 */
const SALE_WRITE_ROLES = ['admin', 'sales_personnel']

/** Assert the caller may record sales or returns (server-side RBAC per BRD §12). */
function assertCanWriteSale(role: string | undefined): void {
  if (!role || !SALE_WRITE_ROLES.includes(role)) {
    throw new AppError(403, 'You do not have permission to record sales or returns', 'FORBIDDEN')
  }
}

// ---------------------------------------------------------------------------
// POST /api/sales — record a sale (auto stock deduction + audit trail)
// ---------------------------------------------------------------------------
router.post(
  '/sales',
  requireAuth,
  validate(CreateSaleRequest),
  asyncHandler(async (req, res) => {
    assertCanWriteSale(req.role)

    const payload = validated(req, 'body', CreateSaleRequest)
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
  validate(ListSalesQuery, 'query'),
  asyncHandler(async (req, res) => {
    const { store_id, from, to, status, limit, offset } = validated(
      req,
      'query',
      ListSalesQuery,
    )

    // Store Staff are scoped to their own store (BRD §12: view own store).
    if (req.role === 'store_staff' && req.storeId && store_id && store_id !== req.storeId) {
      throw new AppError(403, 'You can only view your own store', 'FORBIDDEN')
    }
    const effectiveStore = req.role === 'store_staff' && req.storeId ? req.storeId : store_id

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
  validate(ListReturnsQuery, 'query'),
  asyncHandler(async (req, res) => {
    const { sale_id, store_id, limit, offset } = validated(req, 'query', ListReturnsQuery)

    // Store Staff scoped to their own store
    if (req.role === 'store_staff' && req.storeId && store_id && store_id !== req.storeId) {
      throw new AppError(403, 'You can only view your own store', 'FORBIDDEN')
    }
    const effectiveStore = req.role === 'store_staff' && req.storeId ? req.storeId : store_id

    const { returns, total } = await querySaleReturns({
      sale_id,
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
  validate(SaleIdParam, 'params'),
  asyncHandler(async (req, res) => {
    const { id } = validated(req, 'params', SaleIdParam)
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
  validate(SaleIdParam, 'params'),
  validate(VoidSaleRequest),
  asyncHandler(async (req, res) => {
    if (req.role !== 'admin') {
      throw new AppError(403, 'Only an admin can void a sale', 'FORBIDDEN')
    }

    const { id } = validated(req, 'params', SaleIdParam)
    const payload = validated(req, 'body', VoidSaleRequest)

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
  validate(SaleIdParam, 'params'),
  validate(ReturnSaleRequest),
  asyncHandler(async (req, res) => {
    assertCanWriteSale(req.role)

    const { id } = validated(req, 'params', SaleIdParam)
    const payload = validated(req, 'body', ReturnSaleRequest)

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
  validate(SaleIdParam, 'params'),
  asyncHandler(async (req, res) => {
    const { id } = validated(req, 'params', SaleIdParam)
    const { returns } = await querySaleReturns({ sale_id: id })
    res.json({ returns })
  }),
)

export default router
