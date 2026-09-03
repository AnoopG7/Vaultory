import { z } from 'zod'
import { PoStatus, PoSource } from './common.schema.js'

// ---------------------------------------------------------------------------
// Purchase Orders — Request schemas
// ---------------------------------------------------------------------------

export const ListPurchaseOrdersQuery = z.object({
  status: PoStatus.optional(),
  supplier_id: z.string().uuid().optional(),
  destination_id: z.string().uuid().optional(),
  source: PoSource.optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
})
export type ListPurchaseOrdersQuery = z.infer<typeof ListPurchaseOrdersQuery>

export const PoLineInput = z.object({
  product_id: z.string().uuid(),
  qty_ordered: z.number().positive('Quantity must be greater than zero'),
  unit_cost: z.number().min(0).default(0),
  notes: z.string().max(2000).nullable().optional(),
})
export type PoLineInput = z.infer<typeof PoLineInput>

export const CreatePurchaseOrderRequest = z.object({
  supplier_id: z.string().uuid(),
  destination_id: z.string().uuid(),
  expected_date: z.string().date().nullable().optional(),
  notes: z.string().max(2000).optional(),
  lines: z
    .array(PoLineInput)
    .min(1, 'A purchase order must have at least one line item')
    .max(200, 'A purchase order cannot exceed 200 line items'),
})
export type CreatePurchaseOrderRequest = z.infer<typeof CreatePurchaseOrderRequest>

export const PoIdParam = z.object({
  id: z.string().uuid(),
})
export type PoIdParam = z.infer<typeof PoIdParam>

export const UpdatePoStatusRequest = z.object({
  status: PoStatus,
  cancel_reason: z.string().min(1).optional(),
})
export type UpdatePoStatusRequest = z.infer<typeof UpdatePoStatusRequest>

export const ReceivePoLineInput = z.object({
  po_line_id: z.string().uuid(),
  product_id: z.string().uuid(),
  qty_received: z.number().positive('Quantity received must be greater than zero'),
  earliest_expiry_date: z.string().date().nullable().optional(),
})
export type ReceivePoLineInput = z.infer<typeof ReceivePoLineInput>

export const ReceivePurchaseOrderRequest = z.object({
  notes: z.string().max(2000).optional(),
  lines: z
    .array(ReceivePoLineInput)
    .min(1, 'At least one line must be received'),
})
export type ReceivePurchaseOrderRequest = z.infer<typeof ReceivePurchaseOrderRequest>

// ---------------------------------------------------------------------------
// Purchase Orders — Response schemas
// ---------------------------------------------------------------------------

export const PoLineResponse = z.object({
  id: z.string().uuid(),
  po_id: z.string().uuid(),
  product_id: z.string().uuid(),
  qty_ordered: z.number(),
  qty_received: z.number(),
  unit_cost: z.number(),
  line_total: z.number(),
  notes: z.string().nullable(),
  created_at: z.string(),
  // Joined fields
  product_name: z.string().optional(),
  sku_code: z.string().optional(),
})
export type PoLineResponse = z.infer<typeof PoLineResponse>

export const PurchaseOrderResponse = z.object({
  id: z.string().uuid(),
  po_number: z.string(),
  supplier_id: z.string().uuid(),
  destination_id: z.string().uuid(),
  source: PoSource,
  status: PoStatus,
  order_date: z.string(),
  expected_date: z.string().nullable(),
  received_date: z.string().nullable(),
  total_items: z.number().int(),
  total_qty_ordered: z.number(),
  total_qty_received: z.number(),
  total_cost: z.number(), // masked for non-admin
  created_by: z.string().uuid().nullable(),
  approved_by: z.string().uuid().nullable(),
  approved_at: z.string().nullable(),
  cancelled_by: z.string().uuid().nullable(),
  cancelled_at: z.string().nullable(),
  cancel_reason: z.string().nullable(),
  notes: z.string().nullable(),
  ai_recommendation_id: z.string().uuid().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
  // Joined fields
  supplier_name: z.string().optional(),
  destination_name: z.string().optional(),
})
export type PurchaseOrderResponse = z.infer<typeof PurchaseOrderResponse>

export const PurchaseOrderListResponse = z.object({
  purchase_orders: z.array(PurchaseOrderResponse),
  total: z.number().int(),
  limit: z.number().int(),
  offset: z.number().int(),
})
export type PurchaseOrderListResponse = z.infer<typeof PurchaseOrderListResponse>

export const PurchaseOrderDetailResponse = z.object({
  purchase_order: PurchaseOrderResponse,
  lines: z.array(PoLineResponse),
})
export type PurchaseOrderDetailResponse = z.infer<typeof PurchaseOrderDetailResponse>

// ---------------------------------------------------------------------------
// PO Receipts — Response schemas
// ---------------------------------------------------------------------------

export const PoReceiptLineResponse = z.object({
  id: z.string().uuid(),
  receipt_id: z.string().uuid(),
  po_line_id: z.string().uuid(),
  product_id: z.string().uuid(),
  qty_received: z.number(),
  created_at: z.string(),
})
export type PoReceiptLineResponse = z.infer<typeof PoReceiptLineResponse>

export const PoReceiptResponse = z.object({
  id: z.string().uuid(),
  po_id: z.string().uuid(),
  received_by: z.string().uuid().nullable(),
  received_at: z.string(),
  notes: z.string().nullable(),
  created_at: z.string(),
  lines: z.array(PoReceiptLineResponse),
})
export type PoReceiptResponse = z.infer<typeof PoReceiptResponse>

export const PoReceiptListResponse = z.object({
  receipts: z.array(PoReceiptResponse),
  total: z.number().int(),
})
export type PoReceiptListResponse = z.infer<typeof PoReceiptListResponse>

export const ReceiveGoodsResponse = z.object({
  receipt_id: z.string().uuid(),
  po_id: z.string().uuid(),
  message: z.string(),
})
export type ReceiveGoodsResponse = z.infer<typeof ReceiveGoodsResponse>
