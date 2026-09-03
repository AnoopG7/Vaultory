import { z } from 'zod'
import { nonNegativeMoneySchema, positiveQtySchema, uuidSchema } from './common'
import { poSourceSchema, poStatusSchema } from './common'

/**
 * Purchase order module schemas (frontend — zod v4). Maps to `purchase_orders`
 * and `po_lines`. unit_cost is MASKED; total_cost recomputed server-side.
 */

export const poLineItemSchema = z.object({
  productId: uuidSchema,
  qtyOrdered: positiveQtySchema,
  unitCost: nonNegativeMoneySchema.optional(),
})
export type PoLineItem = z.infer<typeof poLineItemSchema>

export const createPurchaseOrderSchema = z.object({
  supplierId: uuidSchema,
  destinationId: uuidSchema,
  lines: z.array(poLineItemSchema).min(1, 'At least one line is required'),
  source: poSourceSchema.default('manual'),
  notes: z.string().trim().optional(),
})
export type CreatePurchaseOrderInput = z.infer<typeof createPurchaseOrderSchema>

export const updatePoStatusSchema = z.object({
  status: poStatusSchema,
})
export type UpdatePoStatusInput = z.infer<typeof updatePoStatusSchema>

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
  total_cost: z.number(),
  created_by: uuidSchema.nullable(),
  ai_recommendation_id: uuidSchema.nullable(),
  notes: z.string().nullable(),
  created_at: z.string(),
})
export type PurchaseOrder = z.infer<typeof purchaseOrderSchema>

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
