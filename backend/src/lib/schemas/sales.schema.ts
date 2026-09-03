import { z } from 'zod'
import { SaleStatus } from './common.schema.js'

// ---------------------------------------------------------------------------
// Request schemas
// ---------------------------------------------------------------------------

export const SaleLineInput = z.object({
  product_id: z.string().uuid(),
  qty: z.number().positive('Quantity must be greater than zero'),
  unit_price: z.number().min(0, 'Unit price cannot be negative').nullable().optional(),
})
export type SaleLineInput = z.infer<typeof SaleLineInput>

export const CreateSaleRequest = z.object({
  store_id: z.string().uuid(),
  sale_datetime: z.string().datetime().optional(),
  discount: z.number().min(0).default(0),
  notes: z.string().max(2000).optional(),
  lines: z
    .array(SaleLineInput)
    .min(1, 'A sale must have at least one line item')
    .max(200, 'A sale cannot exceed 200 line items'),
})
export type CreateSaleRequest = z.infer<typeof CreateSaleRequest>

export const ListSalesQuery = z.object({
  store_id: z.string().uuid().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  status: SaleStatus.optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
})
export type ListSalesQuery = z.infer<typeof ListSalesQuery>

export const SaleIdParam = z.object({
  id: z.string().uuid(),
})
export type SaleIdParam = z.infer<typeof SaleIdParam>

export const VoidSaleRequest = z.object({
  reason: z.string().min(1, 'Reason is required to void a sale'),
})
export type VoidSaleRequest = z.infer<typeof VoidSaleRequest>

export const ReturnSaleRequest = z.object({
  reason: z.string().min(1, 'Reason is required'),
  notes: z.string().max(2000).optional(),
  lines: z
    .array(
      z.object({
        sale_line_id: z.string().uuid(),
        product_id: z.string().uuid(),
        qty_returned: z.number().positive(),
      }),
    )
    .min(1, 'At least one return line is required'),
})
export type ReturnSaleRequest = z.infer<typeof ReturnSaleRequest>

// ---------------------------------------------------------------------------
// Response schemas
// ---------------------------------------------------------------------------

export const SaleResponse = z.object({
  id: z.string().uuid(),
  sale_number: z.string(),
  store_id: z.string().uuid(),
  sale_datetime: z.string(),
  total_items: z.number().int(),
  total_qty: z.number(),
  subtotal: z.number(),
  discount: z.number(),
  total: z.number(),
  status: SaleStatus,
  notes: z.string().nullable(),
  created_at: z.string(),
})
export type SaleResponse = z.infer<typeof SaleResponse>

export const SaleDetailResponse = z.object({
  sale: z.object({
    id: z.string().uuid(),
    sale_number: z.string(),
    store_id: z.string().uuid(),
    sale_datetime: z.string(),
    total_items: z.number().int(),
    total_qty: z.number(),
    subtotal: z.number(),
    discount: z.number(),
    total: z.number(),
    status: SaleStatus,
    notes: z.string().nullable(),
    voided_at: z.string().nullable(),
    void_reason: z.string().nullable(),
    created_at: z.string(),
  }),
  lines: z.array(
    z.object({
      id: z.string().uuid(),
      product_id: z.string().uuid(),
      qty: z.number(),
      unit_price: z.number(),
      line_total: z.number(),
      products: z
        .object({
          sku_code: z.string(),
          name: z.string(),
        })
        .nullable()
        .optional(),
    }),
  ),
})
export type SaleDetailResponse = z.infer<typeof SaleDetailResponse>

export const SaleListResponse = z.object({
  sales: z.array(SaleResponse),
  total: z.number().int(),
  limit: z.number().int(),
  offset: z.number().int(),
})
export type SaleListResponse = z.infer<typeof SaleListResponse>

export const SaleCreatedResponse = z.object({
  sale: z.record(z.string(), z.unknown()),
})
export type SaleCreatedResponse = z.infer<typeof SaleCreatedResponse>

// ---------------------------------------------------------------------------
// Sale Return responses
// ---------------------------------------------------------------------------

export const SaleReturnResponse = z.object({
  id: z.string().uuid(),
  sale_id: z.string().uuid(),
  store_id: z.string().uuid(),
  return_datetime: z.string(),
  reason: z.string(),
  refund_amount: z.number(),
  created_at: z.string(),
})
export type SaleReturnResponse = z.infer<typeof SaleReturnResponse>

export const SaleReturnDetailResponse = z.object({
  return: SaleReturnResponse,
  lines: z.array(
    z.object({
      id: z.string().uuid(),
      product_id: z.string().uuid(),
      sale_line_id: z.string().uuid(),
      qty_returned: z.number(),
      unit_price: z.number(),
      line_refund: z.number(),
    }),
  ),
})
export type SaleReturnDetailResponse = z.infer<typeof SaleReturnDetailResponse>
