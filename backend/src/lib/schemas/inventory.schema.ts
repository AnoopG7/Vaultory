import { z } from 'zod'
import { EntityStatus, StockStatus, MovementType } from './common.schema.js'

// ---------------------------------------------------------------------------
// Inventory — Request schemas
// ---------------------------------------------------------------------------

export const ListInventoryQuery = z.object({
  location_id: z.string().uuid().optional(),
  product_id: z.string().uuid().optional(),
  stock_status: StockStatus.optional(),
  category_id: z.string().uuid().optional(),
  search: z.string().max(200).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
})
export type ListInventoryQuery = z.infer<typeof ListInventoryQuery>

export const InventoryItemParam = z.object({
  productId: z.string().uuid(),
  locationId: z.string().uuid(),
})
export type InventoryItemParam = z.infer<typeof InventoryItemParam>

export const StockInRequest = z.object({
  product_id: z.string().uuid(),
  location_id: z.string().uuid(),
  qty: z.number().positive('Quantity must be greater than zero'),
  po_id: z.string().uuid().nullable().optional(),
  po_line_id: z.string().uuid().nullable().optional(),
  reason: z.string().max(2000).optional(),
  notes: z.string().max(2000).optional(),
  earliest_expiry_date: z.string().date().nullable().optional(),
})
export type StockInRequest = z.infer<typeof StockInRequest>

export const StockOutRequest = z.object({
  product_id: z.string().uuid(),
  location_id: z.string().uuid(),
  qty: z.number().positive('Quantity must be greater than zero'),
  reason: z.string().min(1, 'Reason is required for stock-out'),
  notes: z.string().max(2000).optional(),
})
export type StockOutRequest = z.infer<typeof StockOutRequest>

export const TransferStockRequest = z.object({
  product_id: z.string().uuid(),
  source_location_id: z.string().uuid(),
  dest_location_id: z.string().uuid(),
  qty: z.number().positive('Quantity must be greater than zero'),
  notes: z.string().max(2000).optional(),
})
export type TransferStockRequest = z.infer<typeof TransferStockRequest>

export const AdjustStockRequest = z.object({
  product_id: z.string().uuid(),
  location_id: z.string().uuid(),
  new_qty: z.number().min(0, 'New quantity cannot be negative'),
  reason: z.string().min(1, 'Reason is required for adjustment'),
  notes: z.string().max(2000).optional(),
})
export type AdjustStockRequest = z.infer<typeof AdjustStockRequest>

// ---------------------------------------------------------------------------
// Inventory — Response schemas
// ---------------------------------------------------------------------------

export const InventoryItem = z.object({
  product_id: z.string().uuid(),
  location_id: z.string().uuid(),
  qty_on_hand: z.number(),
  earliest_expiry_date: z.string().nullable(),
  last_movement_at: z.string().nullable(),
  sku_code: z.string(),
  product_name: z.string(),
  sale_price: z.number(),
  cost_price: z.number(), // masked for non-admin
  product_status: EntityStatus,
  is_perishable: z.boolean(),
  category_id: z.string().uuid(),
  category_name: z.string(),
  unit_name: z.string(),
  location_name: z.string(),
  location_type: z.enum(['store', 'warehouse']),
  safety_stock: z.number(),
  reorder_point: z.number(),
  target_level: z.number(),
  auto_order_enabled: z.boolean(),
  stock_status: StockStatus,
})
export type InventoryItem = z.infer<typeof InventoryItem>

export const InventoryListResponse = z.object({
  data: z.array(InventoryItem),
  total: z.number().int(),
  limit: z.number().int(),
  offset: z.number().int(),
})
export type InventoryListResponse = z.infer<typeof InventoryListResponse>

export const InventoryDetailResponse = z.object({
  item: InventoryItem,
})
export type InventoryDetailResponse = z.infer<typeof InventoryDetailResponse>

export const StockMutationResponse = z.object({
  movement_id: z.string().uuid(),
  product_id: z.string().uuid(),
  location_id: z.string().uuid(),
  qty_before: z.number(),
  qty_after: z.number(),
  message: z.string(),
})
export type StockMutationResponse = z.infer<typeof StockMutationResponse>

export const TransferResponse = z.object({
  transfer_ref: z.string().uuid(),
  source_movement_id: z.string().uuid(),
  dest_movement_id: z.string().uuid(),
  message: z.string(),
})
export type TransferResponse = z.infer<typeof TransferResponse>

// ---------------------------------------------------------------------------
// Stock Movements — Response schemas
// ---------------------------------------------------------------------------

export const StockMovementItem = z.object({
  id: z.string().uuid(),
  product_id: z.string().uuid(),
  location_id: z.string().uuid(),
  type: MovementType,
  qty: z.number(),
  qty_before: z.number().nullable(),
  qty_after: z.number().nullable(),
  sale_id: z.string().uuid().nullable(),
  po_id: z.string().uuid().nullable(),
  return_id: z.string().uuid().nullable(),
  transfer_ref: z.string().uuid().nullable(),
  reason: z.string().nullable(),
  notes: z.string().nullable(),
  created_by: z.string().uuid().nullable(),
  created_at: z.string(),
  // Joined fields
  product_name: z.string().optional(),
  sku_code: z.string().optional(),
  location_name: z.string().optional(),
})
export type StockMovementItem = z.infer<typeof StockMovementItem>

export const StockMovementListResponse = z.object({
  movements: z.array(StockMovementItem),
  total: z.number().int(),
  limit: z.number().int(),
  offset: z.number().int(),
})
export type StockMovementListResponse = z.infer<typeof StockMovementListResponse>

export const ListStockMovementsQuery = z.object({
  product_id: z.string().uuid().optional(),
  location_id: z.string().uuid().optional(),
  type: MovementType.optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
})
export type ListStockMovementsQuery = z.infer<typeof ListStockMovementsQuery>
