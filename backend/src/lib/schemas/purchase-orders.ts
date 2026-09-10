import { z } from 'zod'
import { idParamSchema, moneySchema, nonNegativeMoneySchema, positiveQtySchema, textSchema, uuidSchema } from './common.js'
import { poSourceSchema, poStatusSchema } from './enums.js'

/**
 * Purchase order module schemas. Maps to `purchase_orders`, `po_lines`,
 * `po_receipts`, `po_receipt_lines` in schema.sql.
 */

// A PO line item (supports both camelCase and snake_case inputs).
export const poLineItemSchema = z.object({
  productId: uuidSchema.optional(),
  product_id: uuidSchema.optional(),
  qtyOrdered: positiveQtySchema.optional(),
  qty_ordered: positiveQtySchema.optional(),
  unitCost: nonNegativeMoneySchema.optional(),
  unit_cost: nonNegativeMoneySchema.optional(),
}).refine(
  (data) => Boolean(data.productId || data.product_id),
  { message: 'productId (or product_id) is required' },
).refine(
  (data) => (data.qtyOrdered !== undefined && data.qtyOrdered > 0) || (data.qty_ordered !== undefined && data.qty_ordered > 0),
  { message: 'qtyOrdered (or qty_ordered) must be > 0' },
)
export type PoLineItem = z.infer<typeof poLineItemSchema>

// POST /purchase-orders — manual PO.
export const createPurchaseOrderSchema = z.object({
  supplierId: uuidSchema.optional(),
  supplier_id: uuidSchema.optional(),
  destinationId: uuidSchema.optional(),
  destination_id: uuidSchema.optional(),
  lines: z.array(poLineItemSchema).min(1, 'At least one line is required'),
  source: poSourceSchema.default('manual'),
  expectedDate: z.string().optional().nullable(),
  expected_date: z.string().optional().nullable(),
  notes: textSchema.optional().nullable(),
  allowDuplicate: z.boolean().optional().default(false),
  allow_duplicate: z.boolean().optional().default(false),
}).refine(
  (data) => Boolean(data.supplierId || data.supplier_id),
  { message: 'supplierId (or supplier_id) is required' },
).refine(
  (data) => Boolean(data.destinationId || data.destination_id),
  { message: 'destinationId (or destination_id) is required' },
)
export type CreatePurchaseOrderInput = z.infer<typeof createPurchaseOrderSchema>

// Lifecycle status transition schema (accepts 'partial' as alias for 'partially_received')
export const poTransitionStatusSchema = z.enum([
  'draft',
  'sent',
  'partial',
  'partially_received',
  'received',
  'closed',
  'cancelled',
])

// PATCH /purchase-orders/:id/status — lifecycle transition.
export const updatePoStatusSchema = z.object({
  status: poTransitionStatusSchema,
  cancelReason: z.string().optional().nullable(),
  cancel_reason: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
})
export type UpdatePoStatusInput = z.infer<typeof updatePoStatusSchema>

// Goods-in line item
export const receiveLineItemSchema = z.object({
  poLineId: uuidSchema.optional(),
  po_line_id: uuidSchema.optional(),
  productId: uuidSchema.optional(),
  product_id: uuidSchema.optional(),
  qtyReceived: positiveQtySchema.optional(),
  qty_received: positiveQtySchema.optional(),
  earliestExpiryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  earliest_expiry_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
}).refine(
  (data) => (data.qtyReceived !== undefined && data.qtyReceived > 0) || (data.qty_received !== undefined && data.qty_received > 0),
  { message: 'qtyReceived must be > 0' },
)
export type ReceiveLineItemInput = z.infer<typeof receiveLineItemSchema>

// POST /purchase-orders/:id/receive — goods-in processing
export const receivePurchaseOrderSchema = z.object({
  notes: textSchema.optional().nullable(),
  receivedBy: uuidSchema.optional().nullable(),
  lines: z.array(receiveLineItemSchema).min(1, 'At least one line item must be received'),
})
export type ReceivePurchaseOrderInput = z.infer<typeof receivePurchaseOrderSchema>

// POST /purchase-orders/auto-trigger — automatic PO triggering based on inventory reorder conditions
export const autoTriggerReorderSchema = z.object({
  destinationId: uuidSchema.optional(),
  destination_id: uuidSchema.optional(),
  locationId: uuidSchema.optional(),
  location_id: uuidSchema.optional(),
  dryRun: z.boolean().optional().default(false),
})
export type AutoTriggerReorderInput = z.infer<typeof autoTriggerReorderSchema>

// GET /purchase-orders query params
export const listPurchaseOrdersQuerySchema = z.object({
  status: z.string().optional(),
  supplierId: uuidSchema.optional(),
  supplier_id: uuidSchema.optional(),
  destinationId: uuidSchema.optional(),
  destination_id: uuidSchema.optional(),
  source: z.string().optional(),
  search: z.string().optional(),
  limit: z.coerce.number().int().positive().max(100).default(50),
  offset: z.coerce.number().int().nonnegative().default(0),
})
export type ListPurchaseOrdersQuery = z.infer<typeof listPurchaseOrdersQuerySchema>

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

