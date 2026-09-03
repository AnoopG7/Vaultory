import { z } from 'zod'

// ---------------------------------------------------------------------------
// Settings — Request schemas
// ---------------------------------------------------------------------------

export const UpdateSettingRequest = z.object({
  value: z.union([z.string(), z.number(), z.boolean(), z.array(z.any()), z.record(z.string(), z.any())]),
})
export type UpdateSettingRequest = z.infer<typeof UpdateSettingRequest>

export const SettingKeyParam = z.object({
  key: z.string().max(100),
})
export type SettingKeyParam = z.infer<typeof SettingKeyParam>

// ---------------------------------------------------------------------------
// Settings — Response schemas
// ---------------------------------------------------------------------------

export const SettingResponse = z.object({
  key: z.string(),
  value: z.union([z.string(), z.number(), z.boolean(), z.array(z.any()), z.record(z.string(), z.any())]),
  description: z.string().nullable(),
  updated_by: z.string().uuid().nullable(),
  updated_at: z.string(),
})
export type SettingResponse = z.infer<typeof SettingResponse>

export const SettingListResponse = z.object({
  settings: z.array(SettingResponse),
})
export type SettingListResponse = z.infer<typeof SettingListResponse>

// ---------------------------------------------------------------------------
// Onboarding — Response schemas
// ---------------------------------------------------------------------------

export const OnboardingProgressResponse = z.object({
  user_id: z.string().uuid(),
  is_completed: z.boolean(),
  current_step: z.number().int().min(1).max(6),
  step1_locations: z.boolean(),
  step2_users: z.boolean(),
  step3_products: z.boolean(),
  step4_suppliers: z.boolean(),
  step5_stock: z.boolean(),
  step6_safety: z.boolean(),
  skipped: z.boolean(),
  completed_at: z.string().nullable(),
  updated_at: z.string(),
})
export type OnboardingProgressResponse = z.infer<typeof OnboardingProgressResponse>

export const UpdateOnboardingStepRequest = z.object({
  current_step: z.number().int().min(1).max(6),
  step1_locations: z.boolean().optional(),
  step2_users: z.boolean().optional(),
  step3_products: z.boolean().optional(),
  step4_suppliers: z.boolean().optional(),
  step5_stock: z.boolean().optional(),
  step6_safety: z.boolean().optional(),
})
export type UpdateOnboardingStepRequest = z.infer<typeof UpdateOnboardingStepRequest>

// ---------------------------------------------------------------------------
// Audit Logs — Request schemas
// ---------------------------------------------------------------------------

export const ListAuditLogsQuery = z.object({
  actor_id: z.string().uuid().optional(),
  action: z.string().optional(),
  entity: z.string().max(50).optional(),
  entity_id: z.string().uuid().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
})
export type ListAuditLogsQuery = z.infer<typeof ListAuditLogsQuery>

// ---------------------------------------------------------------------------
// Audit Logs — Response schemas
// ---------------------------------------------------------------------------

export const AuditLogResponse = z.object({
  id: z.string().uuid(),
  actor_id: z.string().uuid().nullable(),
  actor_email: z.string().nullable(),
  actor_role: z.string().nullable(),
  action: z.string(),
  entity: z.string(),
  entity_id: z.string().uuid().nullable(),
  detail: z.record(z.string(), z.unknown()).nullable(),
  ip_address: z.string().nullable(),
  user_agent: z.string().nullable(),
  created_at: z.string(),
})
export type AuditLogResponse = z.infer<typeof AuditLogResponse>

export const AuditLogListResponse = z.object({
  logs: z.array(AuditLogResponse),
  total: z.number().int(),
  limit: z.number().int(),
  offset: z.number().int(),
})
export type AuditLogListResponse = z.infer<typeof AuditLogListResponse>

// ---------------------------------------------------------------------------
// Bulk Import — Request schemas
// ---------------------------------------------------------------------------

export const BulkImportResponse = z.object({
  total_rows: z.number().int(),
  successful: z.number().int(),
  failed: z.number().int(),
  errors: z.array(
    z.object({
      row: z.number().int(),
      message: z.string(),
    }),
  ),
})
export type BulkImportResponse = z.infer<typeof BulkImportResponse>

// ---------------------------------------------------------------------------
// Locations — Request schemas
// ---------------------------------------------------------------------------

export const ListLocationsQuery = z.object({
  type: z.enum(['store', 'warehouse']).optional(),
  store_id: z.string().uuid().optional(),
  status: z.enum(['active', 'archived']).optional(),
})
export type ListLocationsQuery = z.infer<typeof ListLocationsQuery>

export const CreateLocationRequest = z.object({
  type: z.enum(['store', 'warehouse']),
  store_id: z.string().uuid().nullable().optional(),
  name: z.string().min(1).max(120),
  code: z.string().min(1).max(50),
  city: z.string().max(100).nullable().optional(),
  address: z.string().nullable().optional(),
  phone: z.string().max(20).nullable().optional(),
  email: z.string().email().nullable().optional(),
  is_default: z.boolean().default(false),
})
export type CreateLocationRequest = z.infer<typeof CreateLocationRequest>

export const UpdateLocationRequest = z.object({
  name: z.string().min(1).max(120).optional(),
  city: z.string().max(100).nullable().optional(),
  address: z.string().nullable().optional(),
  phone: z.string().max(20).nullable().optional(),
  email: z.string().email().nullable().optional(),
  is_default: z.boolean().optional(),
  status: z.enum(['active', 'archived']).optional(),
})
export type UpdateLocationRequest = z.infer<typeof UpdateLocationRequest>

export const LocationIdParam = z.object({
  id: z.string().uuid(),
})
export type LocationIdParam = z.infer<typeof LocationIdParam>

export const LocationResponse = z.object({
  id: z.string().uuid(),
  type: z.enum(['store', 'warehouse']),
  store_id: z.string().uuid().nullable(),
  name: z.string(),
  code: z.string(),
  city: z.string().nullable(),
  address: z.string().nullable(),
  phone: z.string().nullable(),
  email: z.string().nullable(),
  is_default: z.boolean(),
  status: z.enum(['active', 'archived']),
  created_at: z.string(),
  updated_at: z.string(),
  // Joined fields
  store_name: z.string().optional(),
})
export type LocationResponse = z.infer<typeof LocationResponse>

export const LocationListResponse = z.object({
  locations: z.array(LocationResponse),
})
export type LocationListResponse = z.infer<typeof LocationListResponse>

// ---------------------------------------------------------------------------
// Stores — Request schemas
// ---------------------------------------------------------------------------

export const ListStoresQuery = z.object({
  status: z.enum(['active', 'archived']).optional(),
})
export type ListStoresQuery = z.infer<typeof ListStoresQuery>

export const CreateStoreRequest = z.object({
  name: z.string().min(1).max(120),
  code: z.string().min(1).max(50),
  city: z.string().max(100).nullable().optional(),
  state: z.string().max(100).nullable().optional(),
  address: z.string().nullable().optional(),
  phone: z.string().max(20).nullable().optional(),
  email: z.string().email().nullable().optional(),
})
export type CreateStoreRequest = z.infer<typeof CreateStoreRequest>

export const UpdateStoreRequest = z.object({
  name: z.string().min(1).max(120).optional(),
  city: z.string().max(100).nullable().optional(),
  state: z.string().max(100).nullable().optional(),
  address: z.string().nullable().optional(),
  phone: z.string().max(20).nullable().optional(),
  email: z.string().email().nullable().optional(),
  status: z.enum(['active', 'archived']).optional(),
})
export type UpdateStoreRequest = z.infer<typeof UpdateStoreRequest>

export const StoreIdParam = z.object({
  id: z.string().uuid(),
})
export type StoreIdParam = z.infer<typeof StoreIdParam>

export const StoreDetailResponse = z.object({
  store: z.object({
    id: z.string().uuid(),
    name: z.string(),
    code: z.string(),
    city: z.string().nullable(),
    state: z.string().nullable(),
    address: z.string().nullable(),
    phone: z.string().nullable(),
    email: z.string().nullable(),
    status: z.enum(['active', 'archived']),
    created_at: z.string(),
    updated_at: z.string(),
  }),
})
export type StoreDetailResponse = z.infer<typeof StoreDetailResponse>

export const StoreListResponse = z.object({
  stores: z.array(
    z.object({
      id: z.string().uuid(),
      name: z.string(),
      code: z.string(),
      city: z.string().nullable(),
      state: z.string().nullable(),
      status: z.enum(['active', 'archived']),
      created_at: z.string(),
    }),
  ),
})
export type StoreListResponse = z.infer<typeof StoreListResponse>
