import { z } from 'zod'

// ---------------------------------------------------------------------------
// Safety Stock — Request schemas
// ---------------------------------------------------------------------------

export const ListSafetyStockQuery = z.object({
  product_id: z.string().uuid().optional(),
  location_id: z.string().uuid().optional(),
  auto_order_enabled: z.coerce.boolean().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
})
export type ListSafetyStockQuery = z.infer<typeof ListSafetyStockQuery>

export const SafetyStockParam = z.object({
  productId: z.string().uuid(),
  locationId: z.string().uuid(),
})
export type SafetyStockParam = z.infer<typeof SafetyStockParam>

export const UpsertSafetyStockRequest = z.object({
  safety_stock: z.number().min(0),
  reorder_point: z.number().min(0),
  target_level: z.number().min(0),
  auto_order_enabled: z.boolean().default(false),
  auto_approve: z.boolean().default(false),
})
export type UpsertSafetyStockRequest = z.infer<typeof UpsertSafetyStockRequest>

// ---------------------------------------------------------------------------
// Safety Stock — Response schemas
// ---------------------------------------------------------------------------

export const SafetyStockRule = z.object({
  id: z.string().uuid(),
  product_id: z.string().uuid(),
  location_id: z.string().uuid().nullable(),
  safety_stock: z.number(),
  reorder_point: z.number(),
  target_level: z.number(),
  auto_order_enabled: z.boolean(),
  auto_approve: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
  // Joined fields
  product_name: z.string().optional(),
  sku_code: z.string().optional(),
  location_name: z.string().optional(),
})
export type SafetyStockRule = z.infer<typeof SafetyStockRule>

export const SafetyStockListResponse = z.object({
  rules: z.array(SafetyStockRule),
  total: z.number().int(),
  limit: z.number().int(),
  offset: z.number().int(),
})
export type SafetyStockListResponse = z.infer<typeof SafetyStockListResponse>

export const SafetyStockDetailResponse = z.object({
  rule: SafetyStockRule,
})
export type SafetyStockDetailResponse = z.infer<typeof SafetyStockDetailResponse>
