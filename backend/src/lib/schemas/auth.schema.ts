import { z } from 'zod'
import { UserRole } from './common.schema.js'

// ---------------------------------------------------------------------------
// Request schemas
// ---------------------------------------------------------------------------

export const SignInRequest = z.object({
  email: z.string().email(),
  password: z.string().min(8),
})
export type SignInRequest = z.infer<typeof SignInRequest>

export const OtpRequest = z.object({
  email: z.string().email(),
})
export type OtpRequest = z.infer<typeof OtpRequest>

export const VerifyOtpRequest = z.object({
  email: z.string().email(),
  token: z.string().min(1),
})
export type VerifyOtpRequest = z.infer<typeof VerifyOtpRequest>

export const ForgotPasswordRequest = z.object({
  email: z.string().email(),
})
export type ForgotPasswordRequest = z.infer<typeof ForgotPasswordRequest>

export const ResetPasswordRequest = z.object({
  token: z.string().min(1),
  password: z.string().min(8),
})
export type ResetPasswordRequest = z.infer<typeof ResetPasswordRequest>

// ---------------------------------------------------------------------------
// Response schemas
// ---------------------------------------------------------------------------

export const AuthUser = z.object({
  id: z.string().uuid(),
  email: z.string(),
  name: z.string(),
  role: UserRole,
  store_id: z.string().uuid().nullable(),
})
export type AuthUser = z.infer<typeof AuthUser>

export const SignInResponse = z.object({
  user: AuthUser,
  token: z.string(),
})
export type SignInResponse = z.infer<typeof SignInResponse>

export const MeResponse = z.object({
  user: AuthUser,
})
export type MeResponse = z.infer<typeof MeResponse>

export const OtpResponse = z.object({
  message: z.string(),
})
export type OtpResponse = z.infer<typeof OtpResponse>
