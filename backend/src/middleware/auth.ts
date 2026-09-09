import type { Request, Response, NextFunction } from 'express'
import { supabase } from '../config/index.js'
import { AppError } from './error.js'

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
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token)

  if (error || !user) {
    throw new AppError(401, 'Invalid or expired session', 'UNAUTHENTICATED')
  }

  req.userId = user.id
  req.email = user.email

  // Role/store from the profiles row when present; fall back to JWT metadata.
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, store_id, full_name')
    .eq('id', user.id)
    .maybeSingle()

  if (profile) {
    req.role = (profile.role as Role) ?? DEFAULT_ROLE
    req.storeId = (profile.store_id as string | null) ?? null
    req.fullName = (profile.full_name as string | null) ?? null
  } else {
    const appMetadata = (user.app_metadata ?? {}) as { role?: Role; store_id?: string | null }
    req.role = appMetadata.role ?? DEFAULT_ROLE
    req.storeId =
      (appMetadata.store_id as string | null | undefined) ??
      (user.user_metadata?.store_id as string | null | undefined) ??
      null
    req.fullName = null
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
