import { z } from 'zod'
import { emailSchema, genderSchema, userRoleSchema } from './common'

/**
 * Auth form schemas (frontend — zod v4).
 * Mirror backend/src/lib/schemas/auth.ts so client + server agree.
 */

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
})
export type SignInInput = z.infer<typeof signInSchema>

export const signUpSchema = z.object({
  email: emailSchema,
  password: z.string().min(8, 'Password must be at least 8 characters').max(72),
  fullName: z.string().trim().min(1, 'Full name is required').max(200),
  role: userRoleSchema.default('store_staff'),
  storeId: z.uuid().nullable().optional(),
  gender: genderSchema.optional(),
  phone: z.string().trim().max(20).optional(),
})
export type SignUpInput = z.infer<typeof signUpSchema>

export const otpSchema = z.object({
  email: emailSchema,
})

export const verifyOtpSchema = z.object({
  email: emailSchema,
  token: z.string().min(1, 'OTP code is required').max(64),
})

export const forgotPasswordSchema = z.object({
  email: emailSchema,
})

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1, 'Reset token is required'),
    password: z.string().min(8, 'Password must be at least 8 characters').max(72),
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>
