import { z } from 'zod'
import { idParamSchema, nonNegativeMoneySchema, positiveQtySchema, textSchema, uuidSchema } from './common.js'
import { saleStatusSchema } from './enums.js'

/**
 * Sales module schemas. Maps to `sales`, `sale_lines`, `sale_returns`,
 * `sale_return_lines` in schema.sql.
 */

// A single sale line item.
export const saleLineItemSchema = z.object({
  productId: uuidSchema,
  qty: positiveQtySchema,
  unitPrice: nonNegativeMoneySchema,
})
export type SaleLineItem = z.infer<typeof saleLineItemSchema>

// POST /sales — record a sale (store, datetime, line items).
export const createSaleSchema = z.object({
  storeId: uuidSchema,
  saleDatetime: z.string().datetime({ offset: true }).optional(),
  lines: z.array(saleLineItemSchema).min(1, 'At least one line item is required'),
  discount: nonNegativeMoneySchema.default(0),
  notes: textSchema.optional(),
})
export type CreateSaleInput = z.infer<typeof createSaleSchema>

// POST /sales/:id/void — Admin only, reason required.
export const voidSaleSchema = z.object({
  reason: textSchema.min(1, 'Void reason is required'),
})
export type VoidSaleInput = z.infer<typeof voidSaleSchema>

// POST /sales/:id/return — return line items (stock increase, negative sale).
export const saleReturnLineSchema = z.object({
  saleLineId: uuidSchema,
  productId: uuidSchema,
  qtyReturned: positiveQtySchema,
  unitPrice: nonNegativeMoneySchema,
})
export type SaleReturnLine = z.infer<typeof saleReturnLineSchema>

export const createSaleReturnSchema = z.object({
  reason: textSchema.min(1, 'Return reason is required'),
  lines: z.array(saleReturnLineSchema).min(1, 'At least one returned line is required'),
  notes: textSchema.optional(),
})
export type CreateSaleReturnInput = z.infer<typeof createSaleReturnSchema>

// sale_lines DB row shape.
export const saleLineSchema = z.object({
  id: uuidSchema,
  sale_id: uuidSchema,
  product_id: uuidSchema,
  qty: positiveQtySchema,
  unit_price: nonNegativeMoneySchema,
  line_total: nonNegativeMoneySchema,
})

// sales DB row shape.
export const saleSchema = z.object({
  id: uuidSchema,
  sale_number: z.string(),
  store_id: uuidSchema,
  sale_datetime: z.string(),
  total_items: z.number().int().nonnegative(),
  total_qty: z.number().nonnegative(),
  subtotal: nonNegativeMoneySchema,
  discount: nonNegativeMoneySchema,
  total: nonNegativeMoneySchema,
  status: saleStatusSchema,
  voided_by: uuidSchema.nullable(),
  voided_at: z.string().nullable(),
  void_reason: z.string().nullable(),
  created_by: uuidSchema.nullable(),
  created_at: z.string(),
})
export type Sale = z.infer<typeof saleSchema>

// Sale detail with lines.
export const saleDetailSchema = saleSchema.extend({
  lines: z.array(saleLineSchema),
})
export type SaleDetail = z.infer<typeof saleDetailSchema>

// Params for an existing sale.
export const saleIdParamSchema = idParamSchema
