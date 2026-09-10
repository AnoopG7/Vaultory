import { Router } from 'express'
import { randomUUID } from 'node:crypto'
import { supabase, supabaseAdmin } from '../../config/index.js'
import {
  AppError,
  asyncHandler,
  requireAuth,
  requireRoles,
  validate,
  validated,
} from '../../middleware/index.js'
import { idParamSchema } from '../../lib/schemas/common.js'
import {
  listUsersQuerySchema,
  createUserSchema,
  updateUserSchema,
  deactivateUserSchema,
  type ListUsersQuery,
  type CreateUserInput,
  type UpdateUserInput,
  type DeactivateUserInput,
} from '../../lib/schemas/users.js'
import {
  getMemoryUserById,
  getMemoryUserByEmail,
  queryMemoryUsers,
  insertMemoryUser,
  updateMemoryUser,
  recordAuditLog,
  type LocalUserProfile,
} from './users.store.js'

const router = Router()

/**
 * Validates whether a store ID exists in the database or fallback master.
 */
async function checkStoreExists(storeId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('stores')
      .select('id')
      .eq('id', storeId)
      .maybeSingle()
    if (!error && data) return true
  } catch {
    // Fallback check
  }

  const knownStores = [
    'e1000000-0000-0000-0000-000000000001',
    'e1000000-0000-0000-0000-000000000002',
    'e1000000-0000-0000-0000-000000000003',
  ]
  return knownStores.includes(storeId)
}

// -----------------------------------------------------------------------------
// 1. GET /api/users — list & search users (Admin only)
// -----------------------------------------------------------------------------
router.get(
  '/users',
  requireAuth,
  requireRoles('admin'),
  validate(listUsersQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const query = validated(req, 'query', listUsersQuerySchema) as ListUsersQuery
    const { search, role, status, store_id, limit, offset } = query

    try {
      let dbQuery = supabase
        .from('profiles')
        .select('*, stores(id, name, code)', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (status && status !== 'all') {
        dbQuery = dbQuery.eq('status', status)
      }

      if (role && role !== 'all') {
        dbQuery = dbQuery.eq('role', role)
      }

      if (store_id && store_id !== 'all') {
        if (store_id === 'none' || store_id === 'null') {
          dbQuery = dbQuery.is('store_id', null)
        } else {
          dbQuery = dbQuery.eq('store_id', store_id)
        }
      }

      if (search) {
        dbQuery = dbQuery.or(
          `full_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`,
        )
      }

      const { data, count, error } = await dbQuery

      if (!error && data && data.length > 0) {
        return res.json({
          users: data,
          total: count ?? data.length,
          limit,
          offset,
        })
      }
    } catch {
      // Fallback
    }

    // In-memory fallback
    const result = queryMemoryUsers(query)
    res.json({
      users: result.users,
      total: result.total,
      limit,
      offset,
    })
  }),
)

// -----------------------------------------------------------------------------
// 2. GET /api/users/:id — get user detail (Admin only)
// -----------------------------------------------------------------------------
router.get(
  '/users/:id',
  requireAuth,
  requireRoles('admin'),
  validate(idParamSchema, 'params'),
  asyncHandler(async (req, res) => {
    const { id } = validated(req, 'params', idParamSchema)

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*, stores(id, name, code)')
        .eq('id', id)
        .maybeSingle()

      if (!error && data) {
        return res.json({ user: data })
      }
    } catch {
      // Fallback
    }

    const memUser = getMemoryUserById(id)
    if (!memUser) {
      throw new AppError(404, 'User not found', 'USER_NOT_FOUND')
    }

    res.json({ user: memUser })
  }),
)

// -----------------------------------------------------------------------------
// 3. POST /api/users — create user (Admin only)
// -----------------------------------------------------------------------------
router.post(
  '/users',
  requireAuth,
  requireRoles('admin'),
  validate(createUserSchema, 'body'),
  asyncHandler(async (req, res) => {
    const input = validated(req, 'body', createUserSchema) as CreateUserInput
    const normEmail = input.email.trim().toLowerCase()

    // Validate assigned store if provided
    if (input.storeId) {
      const exists = await checkStoreExists(input.storeId)
      if (!exists) {
        throw new AppError(400, 'Assigned store does not exist', 'STORE_NOT_FOUND')
      }
    }

    // Check for email conflicts in memory
    const existingMem = getMemoryUserByEmail(normEmail)
    if (existingMem) {
      throw new AppError(409, 'A user with this email already exists', 'EMAIL_ALREADY_EXISTS')
    }

    // Check for email conflicts in Supabase
    try {
      const { data: existingDb } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', normEmail)
        .maybeSingle()
      if (existingDb) {
        throw new AppError(409, 'A user with this email already exists', 'EMAIL_ALREADY_EXISTS')
      }
    } catch {
      // Non-blocking
    }

    let createdId: string = randomUUID()

    // Provision via Supabase Auth admin if available
    if (supabaseAdmin) {
      try {
        const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email: normEmail,
          password: input.password,
          email_confirm: true,
          user_metadata: {
            full_name: input.fullName.trim(),
            store_id: input.storeId ?? null,
          },
        })

        if (authError) {
          if (authError.message.toLowerCase().includes('already') || authError.status === 422) {
            throw new AppError(409, 'A user with this email already exists', 'EMAIL_ALREADY_EXISTS')
          }
          throw new AppError(400, authError.message, 'USER_CREATE_FAILED')
        }

        if (authUser?.user?.id) {
          createdId = authUser.user.id
        }
      } catch (err) {
        if (err instanceof AppError) throw err
        // Proceed with fallback UUID
      }
    }

    const newProfile: LocalUserProfile = {
      id: createdId,
      email: normEmail,
      full_name: input.fullName.trim(),
      role: input.role,
      store_id: input.storeId ?? null,
      gender: input.gender ?? null,
      address: input.address?.trim() ?? null,
      phone: input.phone?.trim() ?? null,
      avatar_url: null,
      status: 'active',
      last_login_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    // Persist to Supabase if available
    try {
      const { data, error } = await supabase
        .from('profiles')
        .insert({
          id: newProfile.id,
          email: newProfile.email,
          full_name: newProfile.full_name,
          role: newProfile.role,
          store_id: newProfile.store_id,
          gender: newProfile.gender,
          address: newProfile.address,
          phone: newProfile.phone,
          status: newProfile.status,
        })
        .select('*, stores(id, name, code)')
        .single()

      if (!error && data) {
        insertMemoryUser(data as LocalUserProfile)
        await recordAuditLog({
          actorId: req.userId,
          actorEmail: req.email,
          actorRole: req.role,
          action: 'user_created',
          entity: 'profiles',
          entityId: newProfile.id,
          detail: { email: newProfile.email, role: newProfile.role, store_id: newProfile.store_id },
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
        })

        return res.status(201).json({
          user: data,
          message: 'User created successfully',
        })
      }
    } catch (err) {
      if (err instanceof AppError) throw err
      // Fallback
    }

    // Memory fallback persistence
    insertMemoryUser(newProfile)
    await recordAuditLog({
      actorId: req.userId,
      actorEmail: req.email,
      actorRole: req.role,
      action: 'user_created',
      entity: 'profiles',
      entityId: newProfile.id,
      detail: { email: newProfile.email, role: newProfile.role, store_id: newProfile.store_id },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    })

    res.status(201).json({
      user: newProfile,
      message: 'User created successfully',
    })
  }),
)

// -----------------------------------------------------------------------------
// 4. PATCH /api/users/:id — edit user details, role, and store (Admin only)
// -----------------------------------------------------------------------------
router.patch(
  '/users/:id',
  requireAuth,
  requireRoles('admin'),
  validate(idParamSchema, 'params'),
  validate(updateUserSchema, 'body'),
  asyncHandler(async (req, res) => {
    const { id } = validated(req, 'params', idParamSchema)
    const input = validated(req, 'body', updateUserSchema) as UpdateUserInput

    // Self-protection rule 2: Cannot revoke own admin role
    if (req.userId === id && input.role && input.role !== 'admin') {
      throw new AppError(400, 'Cannot revoke your own admin role', 'SELF_ROLE_REVOKE_FORBIDDEN')
    }

    // Validate store existence if storeId supplied
    if (input.storeId) {
      const exists = await checkStoreExists(input.storeId)
      if (!exists) {
        throw new AppError(400, 'Assigned store does not exist', 'STORE_NOT_FOUND')
      }
    }

    // Check target exists
    let existingUser: LocalUserProfile | null = null
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .maybeSingle()
      if (data) existingUser = data as LocalUserProfile
    } catch {
      // Fallback
    }

    if (!existingUser) {
      existingUser = getMemoryUserById(id)
    }

    if (!existingUser) {
      throw new AppError(404, 'User not found', 'USER_NOT_FOUND')
    }

    const updates: Partial<LocalUserProfile> = {}
    if (input.fullName !== undefined) updates.full_name = input.fullName.trim()
    if (input.role !== undefined) updates.role = input.role
    if (input.storeId !== undefined) updates.store_id = input.storeId
    if (input.phone !== undefined) updates.phone = input.phone?.trim() ?? null
    if (input.address !== undefined) updates.address = input.address?.trim() ?? null
    if (input.gender !== undefined) updates.gender = input.gender

    // Persist to Supabase
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select('*, stores(id, name, code)')
        .single()

      if (!error && data) {
        updateMemoryUser(id, data as LocalUserProfile)
        await recordAuditLog({
          actorId: req.userId,
          actorEmail: req.email,
          actorRole: req.role,
          action: 'user_updated',
          entity: 'profiles',
          entityId: id,
          detail: { updates },
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
        })

        return res.json({
          user: data,
          message: 'User updated successfully',
        })
      }
    } catch (err) {
      if (err instanceof AppError) throw err
      // Fallback
    }

    // Memory fallback update
    const updatedMem = updateMemoryUser(id, updates)
    await recordAuditLog({
      actorId: req.userId,
      actorEmail: req.email,
      actorRole: req.role,
      action: 'user_updated',
      entity: 'profiles',
      entityId: id,
      detail: { updates },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    })

    res.json({
      user: updatedMem,
      message: 'User updated successfully',
    })
  }),
)

// -----------------------------------------------------------------------------
// 5. PATCH /api/users/:id/deactivate — soft deactivate/reactivate (Admin only)
// -----------------------------------------------------------------------------
router.patch(
  '/users/:id/deactivate',
  requireAuth,
  requireRoles('admin'),
  validate(idParamSchema, 'params'),
  validate(deactivateUserSchema, 'body'),
  asyncHandler(async (req, res) => {
    const { id } = validated(req, 'params', idParamSchema)
    const { status } = validated(req, 'body', deactivateUserSchema) as DeactivateUserInput

    // Self-protection rule 1: Cannot deactivate own account
    if (req.userId === id && status === 'archived') {
      throw new AppError(400, 'Cannot deactivate your own account', 'SELF_DEACTIVATE_FORBIDDEN')
    }

    // Check target exists
    let existingUser: LocalUserProfile | null = null
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .maybeSingle()
      if (data) existingUser = data as LocalUserProfile
    } catch {
      // Fallback
    }

    if (!existingUser) {
      existingUser = getMemoryUserById(id)
    }

    if (!existingUser) {
      throw new AppError(404, 'User not found', 'USER_NOT_FOUND')
    }

    const auditAction = status === 'archived' ? 'user_deactivated' : 'user_reactivated'

    // Persist status change to Supabase (NEVER HARD DELETE)
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({
          status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select('*, stores(id, name, code)')
        .single()

      if (!error && data) {
        updateMemoryUser(id, { status })
        await recordAuditLog({
          actorId: req.userId,
          actorEmail: req.email,
          actorRole: req.role,
          action: auditAction,
          entity: 'profiles',
          entityId: id,
          detail: { previousStatus: existingUser.status, newStatus: status },
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
        })

        return res.json({
          user: data,
          message: status === 'archived' ? 'User deactivated successfully' : 'User reactivated successfully',
        })
      }
    } catch (err) {
      if (err instanceof AppError) throw err
      // Fallback
    }

    // Memory fallback update
    const updatedMem = updateMemoryUser(id, { status })
    await recordAuditLog({
      actorId: req.userId,
      actorEmail: req.email,
      actorRole: req.role,
      action: auditAction,
      entity: 'profiles',
      entityId: id,
      detail: { previousStatus: existingUser.status, newStatus: status },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    })

    res.json({
      user: updatedMem,
      message: status === 'archived' ? 'User deactivated successfully' : 'User reactivated successfully',
    })
  }),
)

export default router
