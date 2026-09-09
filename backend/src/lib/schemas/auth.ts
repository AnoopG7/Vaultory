import { z } from 'zod'
import { emailSchema, uuidSchema } from './common.js'
import { genderSchema, userRoleSchema } from './enums.js'

/**
 * Auth module schemas. Map to:
 *   - Supabase Auth flows (signup/signin/otp/verify/forgot/reset/signout)
 *   - the `profiles` table (DB source of truth for role/store/name)
 */

// POST /auth/signup — create a user + profile (admin-gated).
// Student users are created manually by an Admin via the user-admin flow,
// so signup carries profile details (role, optional store).
export const signUpSchema = z.object({
  email: emailSchema,
  password: z.string().min(8, 'Password must be at least 8 characters').max(72),
  fullName: z.string().trim().min(1, 'Full name is required').max(200),
  role: userRoleSchema.default('store_staff'),
  storeId: uuidSchema.nullish(),
  gender: genderSchema.optional(),
  address: z.string().trim().max(2000).optional(),
  phone: z.string().trim().max(20).optional(),
})
export type SignUpInput = z.infer<typeof signUpSchema>

// POST /auth/signin
export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
})
export type SignInInput = z.infer<typeof signInSchema>

// POST /auth/otp — send email OTP / magic link
export const otpSchema = z.object({
  email: emailSchema,
})

// POST /auth/verify-otp — verify a one-time code
export const verifyOtpSchema = z.object({
  email: emailSchema,
  token: z.string().min(1, 'OTP token is required').max(64),
})
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>

// POST /auth/forgot-password — trigger password reset email
export const forgotPasswordSchema = z.object({
  email: emailSchema,
})

// POST /auth/reset-password — set a new password with the recovery token
export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(72),
})
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>

// User shape returned to the client (from the profiles table / auth.me).
export const userSchema = z.object({
  id: uuidSchema,
  email: emailSchema,
  fullName: z.string(),
  role: userRoleSchema,
  storeId: uuidSchema.nullable(),
  gender: genderSchema.nullable(),
  avatarUrl: z.string().nullable(),
})
export type UserShape = z.infer<typeof userSchema>

// GET /auth/me response
export const meResponseSchema = z.object({
  user: userSchema,
})
