import { z } from 'zod'

/**
 * Shared validation primitives (frontend — zod v4).
 * Numeric limits mirror backend NUMERIC columns (money NUMERIC(14,2),
 * qty NUMERIC(12,3)) and the backend common schemas.
 */

export const uuidSchema = z.uuid()

export const shortCodeSchema = z
  .string()
  .trim()
  .min(1)
  .max(30)
  .transform((v) => v.toUpperCase())

export const emailSchema = z.email()

export const moneySchema = z.coerce.number().max(999999999999.99)
export const nonNegativeMoneySchema = z.coerce.number().min(0).max(999999999999.99)

export const qtySchema = z.coerce.number().max(999999999999.999)
export const nonNegativeQtySchema = z.coerce.number().min(0).max(999999999999.999)
export const positiveQtySchema = z.coerce.number().positive().max(999999999999.999)

export const textSchema = z.string().trim().min(1)

export const dateStringSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD')

// ---- Enums (mirror backend enums.ts / schema.sql CREATE TYPE blocks) ----
export const userRoleSchema = z.enum([
  'admin',
  'store_staff',
  'sales_personnel',
  'senior_stakeholder',
])

export const entityStatusSchema = z.enum(['active', 'archived'])
export const locationTypeSchema = z.enum(['store', 'warehouse'])
export const genderSchema = z.enum(['male', 'female', 'other', 'prefer_not_to_say'])

export const stockStatusSchema = z.enum(['out_of_stock', 'low', 'in_stock', 'over_stock'])
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

export const poStatusSchema = z.enum([
  'draft',
  'sent',
  'partially_received',
  'received',
  'closed',
  'cancelled',
])
export const poSourceSchema = z.enum(['manual', 'ai_auto'])
export const saleStatusSchema = z.enum(['active', 'voided'])

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
export const alertPrioritySchema = z.enum(['low', 'medium', 'high', 'critical'])

export const aiRecommendationTypeSchema = z.enum([
  'reorder_quantity',
  'warehouse_stock_level',
  'safety_stock_suggest',
  'demand_forecast',
])
export const aiRecommendationStatusSchema = z.enum([
  'pending',
  'accepted',
  'modified',
  'rejected',
  'expired',
])

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
