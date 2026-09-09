import { z } from 'zod'

/**
 * Enum schemas mirroring `backend/src/db/schema.sql` CREATE TYPE blocks.
 * The DB is the single source of truth — keep these in sync with schema.sql.
 */

// User roles (BRD §12 — 4 roles)
export const userRoleSchema = z.enum([
  'admin',
  'store_staff',
  'sales_personnel',
  'senior_stakeholder',
])
export type UserRole = z.infer<typeof userRoleSchema>

// Entity status (used by most master tables)
export const entityStatusSchema = z.enum(['active', 'archived'])

// Location type (stores vs warehouses)
export const locationTypeSchema = z.enum(['store', 'warehouse'])

// Gender (optional identity field on profiles)
export const genderSchema = z.enum(['male', 'female', 'other', 'prefer_not_to_say'])

// Stock status badges (SRS §4.1.3) — computed at query time
export const stockStatusSchema = z.enum(['out_of_stock', 'low', 'in_stock', 'over_stock'])

// Stock movement types (SRS §4.1.3)
export const movementTypeSchema = z.enum([
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

// Purchase order statuses (SRS §4.4.3)
export const poStatusSchema = z.enum([
  'draft',
  'sent',
  'partially_received',
  'received',
  'closed',
  'cancelled',
])

// Purchase order source
export const poSourceSchema = z.enum(['manual', 'ai_auto'])

// Sale statuses (SRS §4.2.1)
export const saleStatusSchema = z.enum(['active', 'voided'])

// Alert types
export const alertTypeSchema = z.enum([
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

// Alert priority
export const alertPrioritySchema = z.enum(['low', 'medium', 'high', 'critical'])

// AI recommendation types (SRS §8)
export const aiRecommendationTypeSchema = z.enum([
  'reorder_quantity',
  'warehouse_stock_level',
  'safety_stock_suggest',
  'demand_forecast',
])

// AI recommendation acceptance status
export const aiRecommendationStatusSchema = z.enum([
  'pending',
  'accepted',
  'modified',
  'rejected',
  'expired',
])

// Audit log action categories
export const auditActionSchema = z.enum([
  'user_login', 'user_logout', 'user_created', 'user_updated',
  'user_deactivated', 'user_reactivated', 'password_reset',
  'product_created', 'product_updated', 'product_archived', 'product_restored',
  'stock_in', 'stock_out', 'stock_transfer', 'stock_adjustment',
  'sale_created', 'sale_voided', 'sale_returned',
  'po_created', 'po_updated', 'po_sent', 'po_received',
  'po_partially_received', 'po_closed', 'po_cancelled',
  'safety_stock_updated', 'auto_order_toggled',
  'supplier_created', 'supplier_updated', 'supplier_archived',
  'supplier_product_mapped', 'supplier_product_unmapped',
  'ai_recommendation_created', 'ai_recommendation_accepted',
  'ai_recommendation_modified', 'ai_recommendation_rejected',
  'ai_auto_po_created',
  'alert_created', 'alert_read', 'alert_dismissed',
  'category_created', 'category_updated', 'category_archived',
  'unit_created', 'unit_updated',
  'bulk_import', 'bulk_export',
  'setting_updated',
  'sensitive_data_accessed',
])
