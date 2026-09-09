import { z } from 'zod'
import { idParamSchema, moneySchema, nonNegativeMoneySchema, positiveQtySchema, textSchema, uuidSchema } from './common.js'
import { poSourceSchema, poStatusSchema } from './enums.js'

/**
 * Purchase order module schemas. Maps to `purchase_orders`, `po_lines`,
 * `po_receipts`, `po_receipt_lines` in schema.sql.
 */

// A PO line item.
export const poLineItemSchema = z.object({
  productId: uuidSchema,
  qtyOrdered: positiveQtySchema,
  unitCost: nonNegativeMoneySchema.optional(), // MASKED field; defaults to supplier unit_cost
})
export type PoLineItem = z.infer<typeof poLineItemSchema>

// POST /purchase-orders — manual PO.
export const createPurchaseOrderSchema = z.object({
  supplierId: uuidSchema,
  destinationId: uuidSchema,
  lines: z.array(poLineItemSchema).min(1, 'At least one line is required'),
  source: poSourceSchema.default('manual'),
  notes: textSchema.optional(),
})
export type CreatePurchaseOrderInput = z.infer<typeof createPurchaseOrderSchema>

// PATCH /purchase-orders/:id/status — lifecycle transition.
export const updatePoStatusSchema = z.object({
  status: poStatusSchema,
})
export type UpdatePoStatusInput = z.infer<typeof updatePoStatusSchema>

// PO reorder quantity body (AI/manual) per line.
export const poQuantitySchema = positiveQtySchema

// purchase_orders DB row shape.
export const purchaseOrderSchema = z.object({
  id: uuidSchema,
  po_number: z.string(),
  supplier_id: uuidSchema,
  destination_id: uuidSchema,
  source: poSourceSchema,
  status: poStatusSchema,
  order_date: z.string(),
  expected_date: z.string().nullable(),
  received_date: z.string().nullable(),
  total_items: z.number().int().nonnegative(),
  total_qty_ordered: z.number().nonnegative(),
  total_qty_received: z.number().nonnegative(),
  total_cost: moneySchema, // MASKED
  created_by: uuidSchema.nullable(),
  ai_recommendation_id: uuidSchema.nullable(),
  notes: z.string().nullable(),
  created_at: z.string(),
})
export type PurchaseOrder = z.infer<typeof purchaseOrderSchema>

// po_lines DB row shape.
export const poLineSchema = z.object({
  id: uuidSchema,
  po_id: uuidSchema,
  product_id: uuidSchema,
  qty_ordered: positiveQtySchema,
  qty_received: z.number().nonnegative(),
  unit_cost: nonNegativeMoneySchema,
  line_total: nonNegativeMoneySchema,
})
export type PoLine = z.infer<typeof poLineSchema>

export const poIdParamSchema = idParamSchema
