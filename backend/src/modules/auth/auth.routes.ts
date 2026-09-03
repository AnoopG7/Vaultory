import { Router } from 'express'
import { z } from 'zod'
import { supabase } from '../../config/index.js'
import {
  AppError,
  asyncHandler,
  requireAuth,
  requireRoles,
  validate,
} from '../../middleware/index.js'
import type { Role } from '../../middleware/auth.js'

const router = Router()

const signInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
})

const otpSchema = z.object({
  email: z.string().email(),
})

/** Map a Supabase user into the Vaultory User shape. */
function mapUser(user: {
  id: string
  email?: string | null
  user_metadata?: Record<string, unknown> | null
  app_metadata?: Record<string, unknown> | null
}) {
  return {
    id: user.id,
    email: user.email ?? '',
    name: ((user.user_metadata?.name as string | undefined) ??
      user.email?.split('@')[0] ??
      '') as string,
    role: ((user.app_metadata?.role as Role | undefined) ?? 'store_staff') as Role,
    store_id: ((user.app_metadata?.store_id as string | null | undefined) ?? null) as string | null,
  }
}

/**
 * POST /api/auth/signin
 * Email + password sign-in via Supabase Auth.
 * Public.
 */
router.post(
  '/auth/signin',
  validate(signInSchema),
  asyncHandler(async (req, res) => {
    const { email, password } = req.body

    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error || !data.session) {
      throw new AppError(401, 'Invalid email or password', 'INVALID_CREDENTIALS')
    }

    res.json({
      user: mapUser(data.user),
      token: data.session.access_token,
    })
  }),
)

/**
 * POST /api/auth/otp
 * Email OTP / magic-link sign-in (no password).
 * Public. Sends a one-time link to the given email.
 */
router.post(
  '/auth/otp',
  validate(otpSchema),
  asyncHandler(async (req, res) => {
    const { email } = req.body

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${req.headers.origin ?? ''}/auth` },
    })
    if (error) {
      throw new AppError(400, error.message, 'OTP_SEND_FAILED')
    }

    res.status(202).json({ message: 'If that email exists, a sign-in link has been sent.' })
  }),
)

/**
 * GET /api/auth/me
 * Returns the authenticated user. Protected by Supabase JWT verification.
 */
router.get(
  '/auth/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json({
      user: {
        id: req.userId,
        email: req.email,
        name: req.email?.split('@')[0] ?? '',
        role: req.role,
        store_id: req.storeId,
      },
    })
  }),
)

/**
 * GET /api/auth/me (admin-only example)
 * Demonstrates role enforcement via requireRoles after requireAuth.
 */
router.get(
  '/auth/me/roles',
  requireAuth,
  requireRoles('admin'),
  asyncHandler(async (_req, res) => {
    res.json({ message: 'Only admins can see this endpoint.' })
  }),
)

export default router
