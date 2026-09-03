import { z } from 'zod'
import { EntityStatus } from './common.schema.js'

// ---------------------------------------------------------------------------
// Suppliers — Request schemas
// ---------------------------------------------------------------------------

export const ListSuppliersQuery = z.object({
  search: z.string().max(200).optional(),
  status: EntityStatus.optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
})
export type ListSuppliersQuery = z.infer<typeof ListSuppliersQuery>

export const CreateSupplierRequest = z.object({
  name: z.string().min(1).max(200),
  code: z.string().max(50).nullable().optional(),
  contact_person: z.string().max(200).nullable().optional(),
  phone: z.string().max(20).nullable().optional(),
  email: z.string().email().nullable().optional(),
  address: z.string().nullable().optional(),
  city: z.string().max(100).nullable().optional(),
  lead_time_days: z.number().int().positive().default(7),
  payment_terms: z.string().max(100).nullable().optional(),
  credit_limit: z.number().min(0).nullable().optional(),
  notes: z.string().nullable().optional(),
})
export type CreateSupplierRequest = z.infer<typeof CreateSupplierRequest>

export const UpdateSupplierRequest = z.object({
  name: z.string().min(1).max(200).optional(),
  code: z.string().max(50).nullable().optional(),
  contact_person: z.string().max(200).nullable().optional(),
  phone: z.string().max(20).nullable().optional(),
  email: z.string().email().nullable().optional(),
  address: z.string().nullable().optional(),
  city: z.string().max(100).nullable().optional(),
  lead_time_days: z.number().int().positive().optional(),
  payment_terms: z.string().max(100).nullable().optional(),
  credit_limit: z.number().min(0).nullable().optional(),
  notes: z.string().nullable().optional(),
  status: EntityStatus.optional(),
})
export type UpdateSupplierRequest = z.infer<typeof UpdateSupplierRequest>

export const SupplierIdParam = z.object({
  id: z.string().uuid(),
})
export type SupplierIdParam = z.infer<typeof SupplierIdParam>

export const MapSupplierProductsRequest = z.object({
  products: z.array(
    z.object({
      product_id: z.string().uuid(),
      unit_cost: z.number().min(0).nullable().optional(),
      lead_time_override: z.number().int().positive().nullable().optional(),
      is_preferred: z.boolean().default(false),
    }),
  ),
})
export type MapSupplierProductsRequest = z.infer<typeof MapSupplierProductsRequest>

// ---------------------------------------------------------------------------
// Suppliers — Response schemas
// ---------------------------------------------------------------------------

export const SupplierResponse = z.object({
  id: z.string().uuid(),
  name: z.string(),
  code: z.string().nullable(),
  contact_person: z.string().nullable(),
  phone: z.string().nullable(),
  email: z.string().nullable(),
  address: z.string().nullable(),
  city: z.string().nullable(),
  lead_time_days: z.number().int(),
  payment_terms: z.string().nullable(), // masked for non-admin
  credit_limit: z.number().nullable(), // masked for non-admin
  total_pos: z.number().int(),
  on_time_deliveries: z.number().int(),
  avg_lead_time_days: z.number().nullable(),
  notes: z.string().nullable(),
  status: EntityStatus,
  created_at: z.string(),
  updated_at: z.string(),
})
export type SupplierResponse = z.infer<typeof SupplierResponse>

export const SupplierListResponse = z.object({
  suppliers: z.array(SupplierResponse),
  total: z.number().int(),
  limit: z.number().int(),
  offset: z.number().int(),
})
export type SupplierListResponse = z.infer<typeof SupplierListResponse>

export const SupplierDetailResponse = z.object({
  supplier: SupplierResponse,
})
export type SupplierDetailResponse = z.infer<typeof SupplierDetailResponse>

export const SupplierProductMapping = z.object({
  supplier_id: z.string().uuid(),
  product_id: z.string().uuid(),
  unit_cost: z.number().nullable(),
  lead_time_override: z.number().int().nullable(),
  is_preferred: z.boolean(),
  created_at: z.string(),
  // Joined fields
  product_name: z.string().optional(),
  sku_code: z.string().optional(),
})
export type SupplierProductMapping = z.infer<typeof SupplierProductMapping>

export const SupplierProductsResponse = z.object({
  products: z.array(SupplierProductMapping),
})
export type SupplierProductsResponse = z.infer<typeof SupplierProductsResponse>

export const SupplierPerformanceResponse = z.object({
  supplier_id: z.string().uuid(),
  total_pos: z.number().int(),
  on_time_deliveries: z.number().int(),
  on_time_percentage: z.number(),
  avg_lead_time_days: z.number().nullable(),
  effective_lead_time_days: z.number().nullable(),
})
export type SupplierPerformanceResponse = z.infer<typeof SupplierPerformanceResponse>
