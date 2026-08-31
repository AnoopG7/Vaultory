import { z } from 'zod'
import { nonNegativeMoneySchema, positiveQtySchema, uuidSchema } from './common'
import { saleStatusSchema } from './common'

/**
 * Sales module schemas (frontend — zod v4). Maps to `sales`, `sale_lines`,
 * `sale_returns`, and their line tables.
 */

export const saleLineItemSchema = z.object({
  productId: uuidSchema,
  qty: positiveQtySchema,
  unitPrice: nonNegativeMoneySchema,
})
export type SaleLineItem = z.infer<typeof saleLineItemSchema>

export const createSaleSchema = z.object({
  storeId: uuidSchema,
  saleDatetime: z.string().datetime({ offset: true }).optional(),
  lines: z.array(saleLineItemSchema).min(1, 'At least one line item is required'),
  discount: nonNegativeMoneySchema.default(0),
  notes: z.string().trim().optional(),
})
export type CreateSaleInput = z.infer<typeof createSaleSchema>

export const voidSaleSchema = z.object({
  reason: z.string().trim().min(1, 'Void reason is required'),
})
export type VoidSaleInput = z.infer<typeof voidSaleSchema>

export const saleLineSchema = z.object({
  id: uuidSchema,
  sale_id: uuidSchema,
  product_id: uuidSchema,
  qty: positiveQtySchema,
  unit_price: nonNegativeMoneySchema,
  line_total: nonNegativeMoneySchema,
})
export type SaleLine = z.infer<typeof saleLineSchema>

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
