import { z } from 'zod'
import { emailSchema, uuidSchema } from './common.js'
import { genderSchema, userRoleSchema } from './enums.js'

/**
 * Users (admin) module schemas — create/edit/deactivate users.
 * Signup for self-registration lives in auth.schema.ts; this module is the
 * Admin-managed user administration on top of auth.users + profiles.
 */

// POST /users — admin creates a user via Supabase Auth + profile row.
export const createUserSchema = z.object({
  email: emailSchema,
  password: z.string().min(8).max(72),
  fullName: z.string().trim().min(1).max(200),
  role: userRoleSchema.default('store_staff'),
  storeId: uuidSchema.nullish(),
  gender: genderSchema.optional(),
  address: z.string().trim().max(2000).optional(),
  phone: z.string().trim().max(20).optional(),
})
export type CreateUserInput = z.infer<typeof createUserSchema>

// PATCH /users/:id — edit name / role / store.
export const updateUserSchema = z.object({
  fullName: z.string().trim().min(1).max(200).optional(),
  role: userRoleSchema.optional(),
  storeId: uuidSchema.nullish(),
  phone: z.string().trim().max(20).optional(),
})
export type UpdateUserInput = z.infer<typeof updateUserSchema>

// PATCH /users/:id/deactivate  (and /reactivate) — soft status toggle.
export const deactivateUserSchema = z.object({
  status: z.enum(['active', 'archived']),
})
