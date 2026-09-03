import type { Request, Response, NextFunction } from 'express'
import { supabase } from '../config/index.js'
import { AppError } from './error.js'

export type Role = 'admin' | 'store_staff' | 'sales_personnel' | 'senior_stakeholder'

/** Attached to req by requireAuth(). */
declare module 'express' {
  interface Request {
    userId?: string
    email?: string
    role?: Role
    storeId?: string | null
  }
}

/**
 * Verifies the Bearer token via Supabase Auth and attaches the authenticated
 * user to the request. JWT signature/expiry are validated by Supabase.
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

  const appMetadata = (user.app_metadata ?? {}) as { role?: Role; store_id?: string | null }
  const storeId =
    (user.app_metadata?.store_id as string | null | undefined) ??
    (user.user_metadata?.store_id as string | null | undefined) ??
    null

  req.userId = user.id
  req.email = user.email
  req.role = appMetadata.role ?? 'store_staff'
  req.storeId = storeId

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
