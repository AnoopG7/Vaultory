import { Router } from 'express'
import { requireAuth, asyncHandler, validate } from '../../middleware/index.js'
import {
  signUpSchema,
  signInSchema,
  otpSchema,
  verifyOtpSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from '../../lib/schemas/index.js'
import {
  handleSignup,
  handleSignin,
  handleOtp,
  handleVerifyOtp,
  handleForgotPassword,
  handleResetPassword,
  handleSignout,
  handleMe,
  handleRoles,
} from './auth.controller.js'

const router = Router()

/**
 * POST /api/auth/signup
 * ADMIN-GATED user provisioning: creates a Supabase Auth user + profiles row
 * via the service-role client. Admin creates staff accounts (SRS §12).
 */
router.post('/auth/signup', requireAuth, validate(signUpSchema), asyncHandler(handleSignup))

/** POST /api/auth/signin — email + password. Public. */
router.post('/auth/signin', validate(signInSchema), asyncHandler(handleSignin))

/** POST /api/auth/otp — send email OTP / magic link. Public. */
router.post('/auth/otp', validate(otpSchema), asyncHandler(handleOtp))

/** POST /api/auth/verify-otp — verify a one-time code. */
router.post('/auth/verify-otp', validate(verifyOtpSchema), asyncHandler(handleVerifyOtp))

/** POST /api/auth/forgot-password — trigger reset email. Public. */
router.post('/auth/forgot-password', validate(forgotPasswordSchema), asyncHandler(handleForgotPassword))

/** POST /api/auth/reset-password — set new password with recovery token. */
router.post('/auth/reset-password', validate(resetPasswordSchema), asyncHandler(handleResetPassword))

/** POST /api/auth/signout — invalidate the session. */
router.post('/auth/signout', requireAuth, asyncHandler(handleSignout))

/** GET /api/auth/me — authenticated user, enriched from profiles. */
router.get('/auth/me', requireAuth, asyncHandler(handleMe))

/** GET /api/auth/me/roles — role-gated example. */
router.get('/auth/me/roles', requireAuth, asyncHandler(handleRoles))

export default router
