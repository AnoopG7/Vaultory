import { z } from 'zod'
import { UserRole, EntityStatus, Gender } from './common.schema.js'

// ---------------------------------------------------------------------------
// Request schemas
// ---------------------------------------------------------------------------

export const ListUsersQuery = z.object({
  search: z.string().max(200).optional(),
  role: UserRole.optional(),
  status: EntityStatus.optional(),
  store_id: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
})
export type ListUsersQuery = z.infer<typeof ListUsersQuery>

export const CreateUserRequest = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  full_name: z.string().min(1).max(200),
  role: UserRole.default('store_staff'),
  store_id: z.string().uuid().nullable().optional(),
  gender: Gender.optional(),
  address: z.string().optional(),
  phone: z.string().max(20).optional(),
})
export type CreateUserRequest = z.infer<typeof CreateUserRequest>

export const UpdateUserRequest = z.object({
  full_name: z.string().min(1).max(200).optional(),
  role: UserRole.optional(),
  store_id: z.string().uuid().nullable().optional(),
  gender: Gender.optional(),
  address: z.string().optional(),
  phone: z.string().max(20).optional(),
  status: EntityStatus.optional(),
})
export type UpdateUserRequest = z.infer<typeof UpdateUserRequest>

export const UserIdParam = z.object({
  id: z.string().uuid(),
})
export type UserIdParam = z.infer<typeof UserIdParam>

export const DeactivateUserRequest = z.object({
  status: z.literal('archived'),
})
export type DeactivateUserRequest = z.infer<typeof DeactivateUserRequest>

export const AdminResetPasswordRequest = z.object({
  email: z.string().email(),
})
export type AdminResetPasswordRequest = z.infer<typeof AdminResetPasswordRequest>

// ---------------------------------------------------------------------------
// Response schemas
// ---------------------------------------------------------------------------

export const UserProfile = z.object({
  id: z.string().uuid(),
  email: z.string(),
  full_name: z.string(),
  role: UserRole,
  store_id: z.string().uuid().nullable(),
  gender: Gender.nullable(),
  address: z.string().nullable(),
  avatar_url: z.string().nullable(),
  phone: z.string().nullable(),
  status: EntityStatus,
  last_login_at: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
})
export type UserProfile = z.infer<typeof UserProfile>

export const UserListResponse = z.object({
  users: z.array(UserProfile),
  total: z.number().int(),
  limit: z.number().int(),
  offset: z.number().int(),
})
export type UserListResponse = z.infer<typeof UserListResponse>

export const UserDetailResponse = z.object({
  user: UserProfile,
})
export type UserDetailResponse = z.infer<typeof UserDetailResponse>

export const UserCreatedResponse = z.object({
  user: UserProfile,
  message: z.string(),
})
export type UserCreatedResponse = z.infer<typeof UserCreatedResponse>
