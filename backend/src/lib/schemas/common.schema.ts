import { z } from 'zod'

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const UserRole = z.enum([
  'admin',
  'store_staff',
  'sales_personnel',
  'senior_stakeholder',
])
export type UserRole = z.infer<typeof UserRole>

export const EntityStatus = z.enum(['active', 'archived'])
export type EntityStatus = z.infer<typeof EntityStatus>

export const LocationType = z.enum(['store', 'warehouse'])
export type LocationType = z.infer<typeof LocationType>

export const Gender = z.enum(['male', 'female', 'other', 'prefer_not_to_say'])
export type Gender = z.infer<typeof Gender>

export const StockStatus = z.enum(['out_of_stock', 'low', 'in_stock', 'over_stock'])
export type StockStatus = z.infer<typeof StockStatus>

export const MovementType = z.enum([
  'stock_in',
  'stock_out',
  'transfer_out',
  'transfer_in',
  'adjustment',
  'sale',
  'sale_void',
  'sale_return',
  'po_receipt',
])
export type MovementType = z.infer<typeof MovementType>

export const PoStatus = z.enum([
  'draft',
  'sent',
  'partially_received',
  'received',
  'closed',
  'cancelled',
])
export type PoStatus = z.infer<typeof PoStatus>

export const PoSource = z.enum(['manual', 'ai_auto'])
export type PoSource = z.infer<typeof PoSource>

export const SaleStatus = z.enum(['active', 'voided'])
export type SaleStatus = z.infer<typeof SaleStatus>

export const AlertType = z.enum([
  'low_stock',
  'out_of_stock',
  'over_stock',
  'po_created',
  'po_received',
  'po_overdue',
  'ai_recommendation',
  'no_supplier',
  'missing_lead_time',
  'expiry_warning',
  'system',
])
export type AlertType = z.infer<typeof AlertType>

export const AlertPriority = z.enum(['low', 'medium', 'high', 'critical'])
export type AlertPriority = z.infer<typeof AlertPriority>

export const AiRecommendationType = z.enum([
  'reorder_quantity',
  'warehouse_stock_level',
  'safety_stock_suggest',
  'demand_forecast',
])
export type AiRecommendationType = z.infer<typeof AiRecommendationType>

export const AiRecommendationStatus = z.enum([
  'pending',
  'accepted',
  'modified',
  'rejected',
  'expired',
])
export type AiRecommendationStatus = z.infer<typeof AiRecommendationStatus>

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------

export const PaginationQuery = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
})
export type PaginationQuery = z.infer<typeof PaginationQuery>

export const PaginatedResponse = <T extends z.ZodType>(itemSchema: T) =>
  z.object({
    data: z.array(itemSchema),
    total: z.number().int(),
    limit: z.number().int(),
    offset: z.number().int(),
  })

// ---------------------------------------------------------------------------
// Common params / body
// ---------------------------------------------------------------------------

export const IdParam = z.object({
  id: z.string().uuid(),
})
export type IdParam = z.infer<typeof IdParam>

export const UuidBody = z.object({
  id: z.string().uuid(),
})

// ---------------------------------------------------------------------------
// Error envelope
// ---------------------------------------------------------------------------

export const ErrorEnvelope = z.object({
  error: z.string(),
  message: z.string(),
  code: z.string().optional(),
})
export type ErrorEnvelope = z.infer<typeof ErrorEnvelope>

// ---------------------------------------------------------------------------
// Success message
// ---------------------------------------------------------------------------

export const SuccessMessage = z.object({
  message: z.string(),
})
export type SuccessMessage = z.infer<typeof SuccessMessage>

// ---------------------------------------------------------------------------
// Date range filter
// ---------------------------------------------------------------------------

export const DateRangeQuery = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
})
export type DateRangeQuery = z.infer<typeof DateRangeQuery>

// ---------------------------------------------------------------------------
// Store-scoped query
// ---------------------------------------------------------------------------

export const StoreScopedQuery = z.object({
  store_id: z.string().uuid().optional(),
})
export type StoreScopedQuery = z.infer<typeof StoreScopedQuery>

// ---------------------------------------------------------------------------
// Search query
// ---------------------------------------------------------------------------

export const SearchQuery = z.object({
  search: z.string().max(200).optional(),
})
export type SearchQuery = z.infer<typeof SearchQuery>

// ---------------------------------------------------------------------------
// Status filter
// ---------------------------------------------------------------------------

export const StatusFilter = z.object({
  status: EntityStatus.optional(),
})
export type StatusFilter = z.infer<typeof StatusFilter>

// ---------------------------------------------------------------------------
// Masked field indicator
// ---------------------------------------------------------------------------

export type MaskedField<T> = T | '••••'
