import { z } from 'zod'
import { nonNegativeQtySchema, positiveQtySchema, textSchema, uuidSchema } from './common.js'

/**
 * Inventory & stock module schemas. Maps to `inventory`, `stock_movements`,
 * and the stock functions (fn_mutate_stock / fn_transfer_stock / fn_receive_po).
 */

// POST /inventory/stock-in — increase on-hand. May optionally link to a PO.
export const stockInSchema = z.object({
  productId: uuidSchema,
  locationId: uuidSchema,
  qty: positiveQtySchema,
  poId: uuidSchema.nullish(),
  poLineId: uuidSchema.nullish(),
  reason: textSchema.optional(),
  notes: textSchema.optional(),
  earliestExpiryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
})
export type StockInInput = z.infer<typeof stockInSchema>

// POST /inventory/stock-out — decrease on-hand (no negative allowed).
export const stockOutSchema = z.object({
  productId: uuidSchema,
  locationId: uuidSchema,
  qty: positiveQtySchema,
  reason: textSchema.min(1, 'Reason is required for stock-out'),
  notes: textSchema.optional(),
})
export type StockOutInput = z.infer<typeof stockOutSchema>

// POST /inventory/transfer — atomic from → to.
export const transferSchema = z.object({
  productId: uuidSchema,
  sourceLocationId: uuidSchema,
  destinationLocationId: uuidSchema,
  qty: positiveQtySchema,
  notes: textSchema.optional(),
})
export type TransferInput = z.infer<typeof transferSchema>

// POST /inventory/adjust — cycle count (variance confirm).
export const adjustSchema = z.object({
  productId: uuidSchema,
  locationId: uuidSchema,
  newQty: nonNegativeQtySchema,
  reason: textSchema.optional(),
  notes: textSchema.optional(),
})
export type AdjustInput = z.infer<typeof adjustSchema>

// POST /inventory/receive-po — goods in (wraps fn_receive_po).
export const receivePoSchema = z.object({
  poId: uuidSchema,
  poLineId: uuidSchema,
  productId: uuidSchema,
  locationId: uuidSchema,
  qtyReceived: positiveQtySchema,
  notes: textSchema.optional(),
  earliestExpiryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
})
export type ReceivePoInput = z.infer<typeof receivePoSchema>

// Inventory row shape (qty_on_hand >= 0 enforced in DB).
export const inventoryRowSchema = z.object({
  product_id: uuidSchema,
  location_id: uuidSchema,
  qty_on_hand: nonNegativeQtySchema,
  earliest_expiry_date: z.string().nullable(),
  last_counted_at: z.string().nullable(),
  last_movement_at: z.string().nullable(),
})
export type InventoryRow = z.infer<typeof inventoryRowSchema>
