import { z } from 'zod'
import { nonNegativeQtySchema, positiveQtySchema, uuidSchema } from './common'

/**
 * Inventory & stock module schemas (frontend — zod v4).
 * Maps to `inventory`, `stock_movements`, and fn_mutate_stock.
 */

export const stockInSchema = z.object({
  productId: uuidSchema,
  locationId: uuidSchema,
  qty: positiveQtySchema,
  poId: uuidSchema.nullish(),
  poLineId: uuidSchema.nullish(),
  reason: z.string().trim().optional(),
  notes: z.string().trim().optional(),
  earliestExpiryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
})
export type StockInInput = z.infer<typeof stockInSchema>

export const stockOutSchema = z.object({
  productId: uuidSchema,
  locationId: uuidSchema,
  qty: positiveQtySchema,
  reason: z.string().trim().min(1, 'Reason is required for stock-out'),
  notes: z.string().trim().optional(),
})
export type StockOutInput = z.infer<typeof stockOutSchema>

export const transferSchema = z.object({
  productId: uuidSchema,
  sourceLocationId: uuidSchema,
  destinationLocationId: uuidSchema,
  qty: positiveQtySchema,
  notes: z.string().trim().optional(),
})
export type TransferInput = z.infer<typeof transferSchema>

export const adjustSchema = z.object({
  productId: uuidSchema,
  locationId: uuidSchema,
  newQty: nonNegativeQtySchema,
  reason: z.string().trim().optional(),
  notes: z.string().trim().optional(),
})
export type AdjustInput = z.infer<typeof adjustSchema>

export const receivePoSchema = z.object({
  poId: uuidSchema,
  poLineId: uuidSchema,
  productId: uuidSchema,
  locationId: uuidSchema,
  qtyReceived: positiveQtySchema,
  notes: z.string().trim().optional(),
  earliestExpiryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
})
export type ReceivePoInput = z.infer<typeof receivePoSchema>

export const inventoryRowSchema = z.object({
  product_id: uuidSchema,
  location_id: uuidSchema,
  qty_on_hand: nonNegativeQtySchema,
  earliest_expiry_date: z.string().nullable(),
  last_counted_at: z.string().nullable(),
  last_movement_at: z.string().nullable(),
})
export type InventoryRow = z.infer<typeof inventoryRowSchema>
