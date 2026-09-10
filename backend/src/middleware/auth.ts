import type { Request, Response, NextFunction } from 'express'
import { supabase } from '../config/index.js'
import { isProd } from '../config/env.js'
import { AppError } from './error.js'
import { getMemoryUserById } from '../modules/users/users.store.js'

/**
 * User roles (BRD §12 — 4 roles). Matches the `user_role` enum in schema.sql.
 * Keep in sync with src/lib/schemas/enums.ts.
 */
export const ROLES = ['admin', 'store_staff', 'sales_personnel', 'senior_stakeholder'] as const
export type Role = (typeof ROLES)[number]

export const DEFAULT_ROLE: Role = 'store_staff'

/** Attached to req by requireAuth(). */
declare module 'express' {
  interface Request {
    userId?: string
    email?: string
    role?: Role
    storeId?: string | null
    fullName?: string | null
  }
}

/**
 * Verifies the Bearer token via Supabase Auth and attaches the authenticated
 * user to the request. JWT signature/expiry are validated by Supabase.
 *
 * Role/store are sourced from the `profiles` row (DB = source of truth),
 * falling back to JWT metadata only when the profile is missing.
 */
export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    throw new AppError(401, 'Missing or malformed Authorization header')
  }

  const token = header.slice('Bearer '.length)

  if (!isProd && (token === 'dev-token' || token === 'dev-admin-token' || token.startsWith('dev-token:'))) {
    let devUserId = '00000000-0000-0000-0000-000000000001'
    if (token.startsWith('dev-token:')) {
      devUserId = token.slice('dev-token:'.length)
    }
    const memUser = getMemoryUserById(devUserId)
    if (memUser && memUser.status !== 'active') {
      throw new AppError(403, 'Account is deactivated. Access denied.', 'ACCOUNT_DEACTIVATED')
    }
    req.userId = devUserId
    req.email = memUser?.email ?? 'admin@vaultory.internal'
    req.role = memUser?.role ?? 'admin'
    req.storeId = memUser?.store_id ?? null
    req.fullName = memUser?.full_name ?? 'Admin User'
    return next()
  }
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token)

  if (error || !user) {
    throw new AppError(401, 'Invalid or expired session', 'UNAUTHENTICATED')
  }

  req.userId = user.id
  req.email = user.email

  // Role/store/status from the profiles row when present; fall back to JWT metadata.
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, store_id, full_name, status')
    .eq('id', user.id)
    .maybeSingle()

  if (profile) {
    if (profile.status && profile.status !== 'active') {
      throw new AppError(403, 'Account is deactivated. Access denied.', 'ACCOUNT_DEACTIVATED')
    }
    req.role = (profile.role as Role) ?? DEFAULT_ROLE
    req.storeId = (profile.store_id as string | null) ?? null
    req.fullName = (profile.full_name as string | null) ?? null
  } else {
    // Check fallback memory store when profiles table doesn't have the row
    const memUser = getMemoryUserById(user.id)
    if (memUser) {
      if (memUser.status !== 'active') {
        throw new AppError(403, 'Account is deactivated. Access denied.', 'ACCOUNT_DEACTIVATED')
      }
      req.role = memUser.role
      req.storeId = memUser.store_id
      req.fullName = memUser.full_name
    } else {
      const appMetadata = (user.app_metadata ?? {}) as { role?: Role; store_id?: string | null; status?: string }
      if (appMetadata.status && appMetadata.status !== 'active') {
        throw new AppError(403, 'Account is deactivated. Access denied.', 'ACCOUNT_DEACTIVATED')
      }
      req.role = appMetadata.role ?? DEFAULT_ROLE
      req.storeId =
        (appMetadata.store_id as string | null | undefined) ??
        (user.user_metadata?.store_id as string | null | undefined) ??
        null
      req.fullName = null
    }
  }

  next()
}

/** Restricts a route to a set of roles. Must be used after requireAuth. */
export function requireRoles(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.role || !roles.includes(req.role)) {
      throw new AppError(403, 'You do not have permission to perform this action', 'FORBIDDEN')
    }
    next()
  }
}
