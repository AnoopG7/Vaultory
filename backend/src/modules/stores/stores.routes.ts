import { Router, type Request, type Response, type NextFunction } from 'express'
import {
  AppError,
  asyncHandler,
  requireAuth,
  requireRoles,
  validate,
  validated,
} from '../../middleware/index.js'
import {
  createStoreSchema,
  updateStoreSchema,
  storeIdParamSchema,
  listStoresQuerySchema,
  createLocationSchema,
  updateLocationSchema,
  locationIdParamSchema,
  listLocationsQuerySchema,
  type CreateStoreInput,
  type UpdateStoreInput,
  type CreateLocationInput,
  type UpdateLocationInput,
} from '../../lib/schemas/index.js'
import {
  getStoresList,
  getStoreDetail,
  createStore,
  updateStore,
  getLocationsList,
  updateLocation,
  memoryLocations,
  type LocalLocation,
} from './stores.store.js'
import { randomUUID } from 'node:crypto'
import { supabase, env } from '../../config/index.js'
import { recordAuditLog } from '../users/users.store.js'

const isMockSupabase = !env.SUPABASE_URL || env.SUPABASE_URL.includes('mock') || env.SUPABASE_URL.includes('localhost')

const router = Router()

/**
 * Optional authentication middleware for GET /api/stores.
 * If the client presents a valid Bearer token, req.userId and req.role are populated.
 * If unauthenticated (e.g. public signup page requesting active stores), it gracefully continues.
 */
async function optionalAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization
  if (header?.startsWith('Bearer ')) {
    try {
      await requireAuth(req, res, () => {})
    } catch {
      // Ignore unauthenticated or expired token for public read fallback
    }
  }
  next()
}

// ---------------------------------------------------------------------------
// STORES ENDPOINTS
// ---------------------------------------------------------------------------

/**
 * GET /api/stores
 * - Publicly accessible for active store reference (signup dropdown, store selectors).
 * - When authenticated, supports search and status filtering (all, active, inactive),
 *   returning enriched stores with staff count and inventory aggregates.
 */
router.get(
  '/stores',
  optionalAuth,
  validate(listStoresQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const { search, status } = validated(req, 'query', listStoresQuerySchema)

    // If not authenticated, always return active stores for signup compatibility
    if (!req.userId) {
      const activeStores = await getStoresList({ status: 'active' })
      return res.json({ stores: activeStores })
    }

    const stores = await getStoresList({ search, status })
    res.json({ stores })
  }),
)

/**
 * GET /api/stores/:id
 * Store detail view including linked physical location, assigned staff roster,
 * and current stock summary.
 */
router.get(
  '/stores/:id',
  requireAuth,
  validate(storeIdParamSchema, 'params'),
  asyncHandler(async (req, res) => {
    const { id } = validated(req, 'params', storeIdParamSchema)
    const detail = await getStoreDetail(id)
    res.json(detail)
  }),
)

/**
 * POST /api/stores
 * Admin-only: Create a new retail store.
 * Automatically provisions the corresponding physical store-location in `locations`.
 */
router.post(
  '/stores',
  requireAuth,
  requireRoles('admin'),
  validate(createStoreSchema, 'body'),
  asyncHandler(async (req, res) => {
    const body = validated(req, 'body', createStoreSchema) as CreateStoreInput
    const actor = { id: req.userId, email: req.email, role: req.role }

    const result = await createStore(body, actor)
    res.status(201).json(result)
  }),
)

/**
 * PATCH /api/stores/:id
 * Admin-only: Update store attributes and synchronize linked location details.
 */
router.patch(
  '/stores/:id',
  requireAuth,
  requireRoles('admin'),
  validate(storeIdParamSchema, 'params'),
  validate(updateStoreSchema, 'body'),
  asyncHandler(async (req, res) => {
    const { id } = validated(req, 'params', storeIdParamSchema)
    const body = validated(req, 'body', updateStoreSchema) as UpdateStoreInput
    const actor = { id: req.userId, email: req.email, role: req.role }

    const updated = await updateStore(id, body, actor)
    res.json({ store: updated })
  }),
)

// ---------------------------------------------------------------------------
// LOCATIONS ENDPOINTS
// ---------------------------------------------------------------------------

/**
 * GET /api/locations
 * List physical locations (store-locations and warehouses).
 */
router.get(
  '/locations',
  requireAuth,
  validate(listLocationsQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const { search, type, status } = validated(req, 'query', listLocationsQuerySchema)
    const locations = await getLocationsList({ search, type, status })
    res.json({ locations })
  }),
)

/**
 * POST /api/locations
 * Admin-only: Create an independent physical warehouse or location.
 */
router.post(
  '/locations',
  requireAuth,
  requireRoles('admin'),
  validate(createLocationSchema, 'body'),
  asyncHandler(async (req, res) => {
    const body = validated(req, 'body', createLocationSchema) as CreateLocationInput
    const normalizedCode = body.code.toUpperCase().trim()

    // Check code uniqueness
    const exists = memoryLocations.some((l) => l.code.toUpperCase() === normalizedCode)
    if (exists) {
      throw new AppError(409, `Location code "${body.code}" is already in use`, 'LOCATION_CODE_EXISTS')
    }

    if (body.type === 'store' && !body.storeId) {
      throw new AppError(400, 'A store location must reference an existing store (storeId)', 'INVALID_STORE_LOCATION')
    }

    // Default warehouse uniqueness rule
    if (body.type === 'warehouse' && body.isDefault) {
      for (const loc of memoryLocations) {
        if (loc.type === 'warehouse') loc.is_default = false
      }
      if (!isMockSupabase) {
        try {
          await supabase.from('locations').update({ is_default: false }).eq('type', 'warehouse')
        } catch {
          // ignore
        }
      }
    }

    const now = new Date().toISOString()
    const newLocation: LocalLocation = {
      id: randomUUID(),
      type: body.type,
      store_id: body.storeId ?? null,
      name: body.name.trim(),
      code: normalizedCode,
      city: body.city?.trim() ?? null,
      address: body.address?.trim() ?? null,
      phone: body.phone?.trim() ?? null,
      email: body.email?.trim().toLowerCase() ?? null,
      is_default: body.isDefault ?? false,
      status: body.status ?? 'active',
      created_at: now,
      updated_at: now,
    }

    memoryLocations.push(newLocation)

    if (!isMockSupabase) {
      try {
        await supabase.from('locations').insert({
          id: newLocation.id,
          type: newLocation.type,
          store_id: newLocation.store_id,
          name: newLocation.name,
          code: newLocation.code,
          city: newLocation.city,
          address: newLocation.address,
          phone: newLocation.phone,
          email: newLocation.email,
          is_default: newLocation.is_default,
          status: newLocation.status,
        })
      } catch {
        // Non-blocking
      }
    }

    await recordAuditLog({
      actorId: req.userId ?? null,
      actorEmail: req.email ?? null,
      actorRole: req.role ?? null,
      action: 'location_created',
      entity: 'location',
      entityId: newLocation.id,
      detail: {
        code: newLocation.code,
        name: newLocation.name,
        type: newLocation.type,
      },
    })

    res.status(201).json({ location: newLocation })
  }),
)

/**
 * PATCH /api/locations/:id
 * Admin-only: Update location details (name, city, address, default warehouse designation, status).
 */
router.patch(
  '/locations/:id',
  requireAuth,
  requireRoles('admin'),
  validate(locationIdParamSchema, 'params'),
  validate(updateLocationSchema, 'body'),
  asyncHandler(async (req, res) => {
    const { id } = validated(req, 'params', locationIdParamSchema)
    const body = validated(req, 'body', updateLocationSchema) as UpdateLocationInput
    const actor = { id: req.userId, email: req.email, role: req.role }

    const updated = await updateLocation(id, body, actor)
    res.json({ location: updated })
  }),
)

export default router
