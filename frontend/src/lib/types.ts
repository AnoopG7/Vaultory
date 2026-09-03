/**
 * DB-derived domain types.
 *
 * Source of truth is `backend/src/db/schema.sql` and the matching zod
 * validation schemas in `frontend/src/lib/schemas`. Keep enum/field names in
 * sync with the backend API responses (which map snake_case DB columns into
 * these camelCase shapes).
 */

// ---- Roles / enums (mirror backend user_role enum + friends) ----
export type UserRole = 'admin' | 'store_staff' | 'sales_personnel' | 'senior_stakeholder'

export type EntityStatus = 'active' | 'archived'
export type LocationType = 'store' | 'warehouse'
export type Gender = 'male' | 'female' | 'other' | 'prefer_not_to_say'

export type StockStatus = 'out_of_stock' | 'low' | 'in_stock' | 'over_stock'
export type MovementType =
  | 'stock_in'
  | 'stock_out'
  | 'transfer_out'
  | 'transfer_in'
  | 'adjustment'
  | 'sale'
  | 'sale_void'
  | 'sale_return'
  | 'po_receipt'

export type PoStatus = 'draft' | 'sent' | 'partially_received' | 'received' | 'closed' | 'cancelled'
export type PoSource = 'manual' | 'ai_auto'
export type SaleStatus = 'active' | 'voided'

export type AlertType =
  | 'low_stock'
  | 'out_of_stock'
  | 'over_stock'
  | 'po_created'
  | 'po_received'
  | 'po_overdue'
  | 'ai_recommendation'
  | 'no_supplier'
  | 'missing_lead_time'
  | 'expiry_warning'
  | 'system'
export type AlertPriority = 'low' | 'medium' | 'high' | 'critical'

export type AiRecommendationType =
  | 'reorder_quantity'
  | 'warehouse_stock_level'
  | 'safety_stock_suggest'
  | 'demand_forecast'
export type AiRecommendationStatus = 'pending' | 'accepted' | 'modified' | 'rejected' | 'expired'

// ---- Auth ----
export interface User {
  id: string
  email: string
  fullName: string
  role: UserRole
  storeId: string | null
  gender: Gender | null
  avatarUrl: string | null
}

export interface SignInResponse {
  user: User
  token: string
  refresh_token: string | null
  expires_at: number | null
}

// ---- Master data ----
export interface Store {
  id: string
  name: string
  code: string
  city: string | null
  state: string | null
  address: string | null
  phone: string | null
  email: string | null
  status: EntityStatus
  created_at: string
  updated_at: string
}

export interface Location {
  id: string
  type: LocationType
  store_id: string | null
  name: string
  code: string
  city: string | null
  address: string | null
  phone: string | null
  email: string | null
  is_default: boolean
  status: EntityStatus
  created_at: string
  updated_at: string
}

export interface Category {
  id: string
  name: string
  parent_id: string | null
  sort_order: number
  status: EntityStatus
  created_at: string
  updated_at: string
}

export interface Unit {
  id: string
  name: string
  abbreviation: string | null
  status: EntityStatus
}

export interface Product {
  id: string
  sku_code: string
  name: string
  description: string | null
  category_id: string
  unit_id: string
  sale_price: number
  default_safety_stock: number
  default_reorder_point: number
  default_target_level: number
  is_perishable: boolean
  shelf_life_days: number | null
  image_url: string | null
  barcode: string | null
  weight: number | null
  weight_unit: string | null
  notes: string | null
  status: EntityStatus
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface Supplier {
  id: string
  name: string
  code: string | null
  contact_person: string | null
  phone: string | null
  email: string | null
  address: string | null
  city: string | null
  lead_time_days: number
  notes: string | null
  status: EntityStatus
  created_at: string
  updated_at: string
}

// ---- Inventory / safety stock ----
export interface InventoryRow {
  product_id: string
  location_id: string
  qty_on_hand: number
  earliest_expiry_date: string | null
  last_counted_at: string | null
  last_movement_at: string | null
}

export interface SafetyStockRule {
  id: string
  product_id: string
  location_id: string | null
  safety_stock: number
  reorder_point: number
  target_level: number
  auto_order_enabled: boolean
  auto_approve: boolean
  created_at: string
  updated_at: string
}

// ---- Purchasing ----
export interface PurchaseOrder {
  id: string
  po_number: string
  supplier_id: string
  destination_id: string
  source: PoSource
  status: PoStatus
  order_date: string
  expected_date: string | null
  received_date: string | null
  total_items: number
  total_qty_ordered: number
  total_qty_received: number
  total_cost: number
  created_by: string | null
  ai_recommendation_id: string | null
  notes: string | null
  created_at: string
}

export interface PoLine {
  id: string
  po_id: string
  product_id: string
  qty_ordered: number
  qty_received: number
  unit_cost: number
  line_total: number
}

// ---- Sales ----
export interface Sale {
  id: string
  sale_number: string
  store_id: string
  sale_datetime: string
  total_items: number
  total_qty: number
  subtotal: number
  discount: number
  total: number
  status: SaleStatus
  voided_by: string | null
  voided_at: string | null
  void_reason: string | null
  created_by: string | null
  created_at: string
}

export interface SaleLine {
  id: string
  sale_id: string
  product_id: string
  qty: number
  unit_price: number
  line_total: number
}

// ---- Alerts ----
export interface Alert {
  id: string
  type: AlertType
  priority: AlertPriority
  title: string
  message: string
  product_id: string | null
  location_id: string | null
  po_id: string | null
  ai_recommendation_id: string | null
  target_roles: UserRole[]
  is_resolved: boolean
  resolved_at: string | null
  resolved_by: string | null
  expires_at: string | null
  created_at: string
}

// ---- AI recommendations ----
export interface AiRecommendation {
  id: string
  type: AiRecommendationType
  status: AiRecommendationStatus
  product_id: string
  location_id: string | null
  recommended_value: number
  current_value: number | null
  reasoning: string
  model_used: string | null
  confidence: number | null
  accepted_value: number | null
  acted_on_by: string | null
  acted_on_at: string | null
  rejection_reason: string | null
  resulting_po_id: string | null
  expires_at: string | null
  created_at: string
  updated_at: string
}

// ---- Envelopes ----
export interface Paginated<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
}
