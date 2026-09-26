import { z } from 'zod'
import { emailSchema, uuidSchema } from './common.js'
import { entityStatusSchema, genderSchema, userRoleSchema } from './enums.js'

/**
 * Users (admin) module schemas — create/edit/deactivate users.
 * Signup for self-registration lives in auth.schema.ts; this module is the
 * Admin-managed user administration on top of auth.users + profiles.
 */

// GET /users query params.
export const listUsersQuerySchema = z.object({
  search: z.string().trim().optional(),
  role: z.union([userRoleSchema, z.literal('all')]).optional(),
  status: z.enum(['active', 'archived', 'all']).default('all'),
  store_id: z.string().trim().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
})
export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>

// POST /users — admin creates a user via Supabase Auth + profile row.
// Store-scoped roles (store_staff / sales_personnel) must be assigned a store,
// otherwise their dashboard/sales/PO views are dead-empty (scoped to nothing).
const SCOPED_ROLES = ['store_staff', 'sales_personnel'] as const

const requireStoreForScopedRole = (value: CreateUserInput | UpdateUserInput, ctx: z.RefinementCtx) => {
  if (SCOPED_ROLES.includes(value.role as (typeof SCOPED_ROLES)[number]) && !value.storeId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['storeId'],
      message: 'A store is required for this role',
    })
  }
}

export const createUserSchema = z.object({
  email: emailSchema,
  password: z.string().min(8, 'Password must be at least 8 characters').max(72),
  fullName: z.string().trim().min(1, 'Full name is required').max(200),
  role: userRoleSchema.default('store_staff'),
  storeId: uuidSchema.nullable().optional(),
  gender: genderSchema.nullable().optional(),
  address: z.string().trim().max(2000).nullable().optional(),
  phone: z.string().trim().max(20).nullable().optional(),
}).superRefine(requireStoreForScopedRole)
export type CreateUserInput = z.infer<typeof createUserSchema>

// PATCH /users/:id — edit name / role / store / details.
export const updateUserSchema = z.object({
  fullName: z.string().trim().min(1, 'Full name cannot be empty').max(200).optional(),
  role: userRoleSchema.optional(),
  storeId: uuidSchema.nullable().optional(),
  phone: z.string().trim().max(20).nullable().optional(),
  address: z.string().trim().max(2000).nullable().optional(),
  gender: genderSchema.nullable().optional(),
}).superRefine((value, ctx) => {
  if (value.role === undefined && value.storeId === undefined) return
  const role = value.role
  if (role !== undefined && SCOPED_ROLES.includes(role as (typeof SCOPED_ROLES)[number]) && value.storeId === undefined) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['storeId'],
      message: 'A store is required for this role',
    })
  }
})
export type UpdateUserInput = z.infer<typeof updateUserSchema>

// PATCH /users/:id/deactivate (and /reactivate) — soft status toggle.
export const deactivateUserSchema = z.object({
  status: entityStatusSchema,
})
export type DeactivateUserInput = z.infer<typeof deactivateUserSchema>

