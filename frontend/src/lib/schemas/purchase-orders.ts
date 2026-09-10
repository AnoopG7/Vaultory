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
  source: poSourceSchema.optional().default('manual'),
  expectedDate: z.string().optional().nullable(),
  notes: z.string().trim().optional().nullable(),
  allowDuplicate: z.boolean().optional().default(false),
})

export type CreatePurchaseOrderInput = z.infer<typeof createPurchaseOrderSchema>

export const poTransitionStatusSchema = z.enum([
  'draft',
  'sent',
  'partial',
  'partially_received',
  'received',
  'closed',
  'cancelled',
])

export const updatePoStatusSchema = z.object({
  status: poTransitionStatusSchema,
  cancelReason: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
})
export type UpdatePoStatusInput = z.infer<typeof updatePoStatusSchema>

export const receiveLineItemSchema = z.object({
  poLineId: uuidSchema,
  productId: uuidSchema,
  qtyReceived: positiveQtySchema,
  earliestExpiryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
})
export type ReceiveLineItemInput = z.infer<typeof receiveLineItemSchema>

export const receivePurchaseOrderSchema = z.object({
  notes: z.string().trim().optional().nullable(),
  lines: z.array(receiveLineItemSchema).min(1, 'At least one line must be received'),
})
export type ReceivePurchaseOrderInput = z.infer<typeof receivePurchaseOrderSchema>

export const autoTriggerReorderSchema = z.object({
  destinationId: uuidSchema.optional(),
  dryRun: z.boolean().optional().default(false),
})
export type AutoTriggerReorderInput = z.infer<typeof autoTriggerReorderSchema>

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

export interface EnrichedPoLine extends PoLine {
  product_name?: string
  sku_code?: string
  category?: string
  unit?: string
  is_perishable?: boolean
  remaining_qty?: number
}

export interface PurchaseOrderWithRelations extends PurchaseOrder {
  supplier?: {
    name: string
    code: string
    lead_time_days?: number
    email?: string
    phone?: string
  }
  destination?: {
    name: string
    code: string
    type?: 'store' | 'warehouse'
    city?: string
  }
  lines?: EnrichedPoLine[]
  fulfillment_percentage?: number
  receipts?: Array<{
    id: string
    received_at: string
    notes?: string | null
    lines?: Array<{
      id: string
      product_id: string
      product_name?: string
      sku_code?: string
      qty_received: number
      earliest_expiry_date?: string | null
    }>
  }>
}

export interface PurchaseOrderSummary {
  total_pos: number
  draft: number
  sent: number
  partially_received: number
  received: number
  closed: number
  cancelled: number
  total_spend: number
}

