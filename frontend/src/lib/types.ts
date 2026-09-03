// ---------------------------------------------------------------------------
// Shared TypeScript types — Vaultory Frontend
// ---------------------------------------------------------------------------
// These types mirror the backend Zod schemas from backend/src/lib/schemas/.
// Keep in sync with backend contracts when modifying entities.
// ---------------------------------------------------------------------------

// ── Enums ──────────────────────────────────────────────────────────────────

export type Role = 'admin' | 'store_staff' | 'sales_personnel' | 'senior_stakeholder'

/** Alias to Role (camelCase), mirroring the backend user_role enum. */
export type UserRole = Role

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

export type PoStatus =
  | 'draft'
  | 'sent'
  | 'partially_received'
  | 'received'
  | 'closed'
  | 'cancelled'

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

export type AiRecommendationStatus =
  | 'pending'
  | 'accepted'
  | 'modified'
  | 'rejected'
  | 'expired'

// ── Common ─────────────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  limit: number
  offset: number
}

export interface ErrorEnvelope {
  error: string
  message: string
  code?: string
}

// ── Auth ───────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string
  email: string
  name: string
  role: Role
  store_id: string | null
}

export interface User {
  id: string
  email: string
  fullName: string
  role: UserRole
  storeId: string | null
  gender: Gender | null
  avatarUrl: string | null
  // Back-compat aliases used by a few Rohan pages.
  name?: string
  store_id?: string | null
}

// ── Users ──────────────────────────────────────────────────────────────────

export interface UserProfile {
  id: string
  email: string
  full_name: string
  role: Role
  store_id: string | null
  gender: Gender | null
  address: string | null
  avatar_url: string | null
  phone: string | null
  status: EntityStatus
  last_login_at: string | null
  created_at: string
  updated_at: string
}

export interface UserListResponse {
  users: UserProfile[]
  total: number
  limit: number
  offset: number
}

// ── Stores ─────────────────────────────────────────────────────────────────

export interface Store {
  id: string
  name: string
  code: string
  city: string | null
  state: string | null
  status: EntityStatus
  created_at: string
}

export interface StoreListResponse {
  stores: Store[]
}

export interface StoreDetailResponse {
  store: Store & {
    address: string | null
    phone: string | null
    email: string | null
    updated_at: string
  }
}

/** Lean store item returned by GET /api/stores dropdown (reference module). */
export interface NewStore {
  id: string
  name: string
  code: string
  city: string | null
  status: EntityStatus
}

export interface StoreDropdownResponse {
  stores: NewStore[]
}

/** Lean product item returned by GET /api/products dropdown (reference module). */
export interface NewProduct {
  id: string
  sku_code: string
  name: string
  sale_price: number
  status: EntityStatus
}

export interface ProductDropdownResponse {
  products: NewProduct[]
}

// ── Locations ──────────────────────────────────────────────────────────────

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
  store_name?: string
}

export interface LocationListResponse {
  locations: Location[]
}

// ── Categories ─────────────────────────────────────────────────────────────

export interface Category {
  id: string
  name: string
  parent_id: string | null
  sort_order: number
  status: EntityStatus
  created_at: string
  updated_at: string
}

export interface CategoryListResponse {
  categories: Category[]
}

// ── Units ──────────────────────────────────────────────────────────────────

export interface Unit {
  id: string
  name: string
  abbreviation: string | null
  status: EntityStatus
  created_at: string
  updated_at: string
}

export interface UnitListResponse {
  units: Unit[]
}

// ── Products ───────────────────────────────────────────────────────────────

export interface Product {
  id: string
  sku_code: string
  name: string
  description: string | null
  category_id: string
  unit_id: string
  cost_price: number
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
  created_at: string
  updated_at: string
  category?: { id: string; name: string } | null
  unit?: { id: string; name: string; abbreviation: string | null } | null
}

export interface ProductListResponse {
  products: Product[]
  total: number
  limit: number
  offset: number
}

export interface ProductDetailResponse {
  product: Product
}

export interface MoverItem {
  product_id: string
  product_name: string
  sku_code: string
  total_units_sold: number
  classification: 'fast' | 'slow' | 'normal'
  sales_value: number
}

export interface MoverResponse {
  window_days: number
  items: MoverItem[]
}

// ── Inventory ──────────────────────────────────────────────────────────────

export interface InventoryItem {
  product_id: string
  location_id: string
  qty_on_hand: number
  earliest_expiry_date: string | null
  last_movement_at: string | null
  sku_code: string
  product_name: string
  sale_price: number
  cost_price: number
  product_status: EntityStatus
  is_perishable: boolean
  category_id: string
  category_name: string
  unit_name: string
  location_name: string
  location_type: LocationType
  safety_stock: number
  reorder_point: number
  target_level: number
  auto_order_enabled: boolean
  stock_status: StockStatus
}

export interface InventoryListResponse {
  data: InventoryItem[]
  total: number
  limit: number
  offset: number
}

export interface StockMovement {
  id: string
  product_id: string
  location_id: string
  type: MovementType
  qty: number
  qty_before: number | null
  qty_after: number | null
  sale_id: string | null
  po_id: string | null
  return_id: string | null
  transfer_ref: string | null
  reason: string | null
  notes: string | null
  created_by: string | null
  created_at: string
  product_name?: string
  sku_code?: string
  location_name?: string
}

export interface StockMovementListResponse {
  movements: StockMovement[]
  total: number
  limit: number
  offset: number
}

export interface StockMutationResponse {
  movement_id: string
  product_id: string
  location_id: string
  qty_before: number
  qty_after: number
  message: string
}

export interface TransferResponse {
  transfer_ref: string
  source_movement_id: string
  dest_movement_id: string
  message: string
}

// ── Sales ──────────────────────────────────────────────────────────────────

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
  notes: string | null
  voided_at: string | null
  void_reason: string | null
  created_at: string
}

export interface SaleLine {
  id: string
  sale_id?: string
  product_id: string
  qty: number
  unit_price: number
  line_total: number
  products?: { sku_code: string; name: string } | null
}

export interface SaleListResponse {
  sales: Sale[]
  total: number
  limit: number
  offset: number
}

export interface SaleDetailResponse {
  sale: Sale
  lines: SaleLine[]
}

export interface SaleInputLine {
  product_id: string
  qty: number
  unit_price?: number | null
}

export interface CreateSaleInput {
  store_id: string
  sale_datetime?: string
  discount?: number
  notes?: string
  lines: SaleInputLine[]
}

export interface SaleReturn {
  id: string
  sale_id: string
  store_id: string
  return_datetime: string
  reason: string
  refund_amount: number
  created_at: string
}

export interface SaleReturnLine {
  id: string
  product_id: string
  sale_line_id: string
  qty_returned: number
  unit_price: number
  line_refund: number
}

export interface SaleReturnDetailResponse {
  return: SaleReturn
  lines: SaleReturnLine[]
}

// ── Purchase Orders ────────────────────────────────────────────────────────

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
  approved_by: string | null
  approved_at: string | null
  cancelled_by: string | null
  cancelled_at: string | null
  cancel_reason: string | null
  notes: string | null
  ai_recommendation_id: string | null
  created_at: string
  updated_at: string
  supplier_name?: string
  destination_name?: string
}

export interface PoLine {
  id: string
  po_id: string
  product_id: string
  qty_ordered: number
  qty_received: number
  unit_cost: number
  line_total: number
  notes: string | null
  created_at: string
  product_name?: string
  sku_code?: string
}

export interface PurchaseOrderListResponse {
  purchase_orders: PurchaseOrder[]
  total: number
  limit: number
  offset: number
}

export interface PurchaseOrderDetailResponse {
  purchase_order: PurchaseOrder
  lines: PoLine[]
}

export interface PoReceipt {
  id: string
  po_id: string
  received_by: string | null
  received_at: string
  notes: string | null
  created_at: string
  lines: PoReceiptLine[]
}

export interface PoReceiptLine {
  id: string
  receipt_id: string
  po_line_id: string
  product_id: string
  qty_received: number
  created_at: string
}

// ── Suppliers ──────────────────────────────────────────────────────────────

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
  payment_terms: string | null
  credit_limit: number | null
  total_pos: number
  on_time_deliveries: number
  avg_lead_time_days: number | null
  notes: string | null
  status: EntityStatus
  created_at: string
  updated_at: string
}

export interface SupplierListResponse {
  suppliers: Supplier[]
  total: number
  limit: number
  offset: number
}

export interface SupplierProductMapping {
  supplier_id: string
  product_id: string
  unit_cost: number | null
  lead_time_override: number | null
  is_preferred: boolean
  created_at: string
  product_name?: string
  sku_code?: string
}

export interface SupplierProductsResponse {
  products: SupplierProductMapping[]
}

export interface SupplierPerformance {
  supplier_id: string
  total_pos: number
  on_time_deliveries: number
  on_time_percentage: number
  avg_lead_time_days: number | null
  effective_lead_time_days: number | null
}

// ── Safety Stock ───────────────────────────────────────────────────────────

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
  product_name?: string
  sku_code?: string
  location_name?: string
}

export interface SafetyStockListResponse {
  rules: SafetyStockRule[]
  total: number
  limit: number
  offset: number
}

// ── Alerts ─────────────────────────────────────────────────────────────────

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
  target_roles: Role[]
  is_resolved: boolean
  resolved_at: string | null
  resolved_by: string | null
  expires_at: string | null
  created_at: string
  is_read?: boolean
  is_dismissed?: boolean
  read_at?: string | null
  product_name?: string
  sku_code?: string
  location_name?: string
}

export interface AlertListResponse {
  alerts: Alert[]
  total: number
  limit: number
  offset: number
}

export interface AlertPreferences {
  user_id: string
  notify_low_stock: boolean
  notify_out_of_stock: boolean
  notify_over_stock: boolean
  notify_po_created: boolean
  notify_po_received: boolean
  notify_po_overdue: boolean
  notify_ai_recommendation: boolean
  notify_expiry_warning: boolean
  email_enabled: boolean
  email_address: string | null
  updated_at: string
}

// ── AI Recommendations ─────────────────────────────────────────────────────

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
  input_data: Record<string, unknown> | null
  accepted_value: number | null
  acted_on_by: string | null
  acted_on_at: string | null
  rejection_reason: string | null
  resulting_po_id: string | null
  expires_at: string | null
  created_at: string
  updated_at: string
  product_name?: string
  sku_code?: string
  location_name?: string
}

export interface RecommendationListResponse {
  recommendations: AiRecommendation[]
  total: number
  limit: number
  offset: number
}

export interface Forecast {
  product_id: string
  predicted_demand: number
  confidence: number | null
  reasoning: string
  sourced_from_ai: boolean
  model_used: string | null
}

export interface AutoOrderTriggerResponse {
  message: string
  dry_run: boolean
  recommendations_created: number
  po_created: number
  skipped: number
}

export interface WarehouseRecommendation {
  product_id: string
  product_name: string
  sku_code: string
  location_id: string
  location_name: string
  current_stock: number
  recommended_stock_level: number
  reasoning: string
  confidence: number | null
  model_used: string | null
}

// ── Dashboard ──────────────────────────────────────────────────────────────

export interface DashboardSummaryResponse {
  total_stock_value: number | null
  total_stock_units: number
  inventory_turnover: number | null
  low_stock_count: number
  out_of_stock_count: number
  today_sales_total: number
  today_sales_count: number
  auto_orders_pending: number
  role_visibility: 'full' | 'sales'
}

export interface RevenuePoint {
  date: string
  revenue: number
}

export interface RevenueTrendResponse {
  days: number
  series: RevenuePoint[]
}

export interface TopProduct {
  product_id: string
  product_name: string
  sku_code: string
  qty_sold: number
  sales_value: number
}

export interface TopProductsResponse {
  days: number
  top: TopProduct[]
}

export interface StoreComparisonRow {
  store_id: string
  store_name: string
  store_code?: string
  sales_total: number
}

export interface StoreComparisonResponse {
  stores: StoreComparisonRow[]
}

// ── Reports ────────────────────────────────────────────────────────────────

export interface DailyReportRow {
  sale_date: string
  store_id: string | null
  store_name: string | null
  product_id: string | null
  product_name: string | null
  sku_code: string | null
  units_sold: number
  sales_value: number
}

export interface DailyReportResponse {
  date: string
  rows: DailyReportRow[]
  total_units: number
  total_value: number
}

export interface QuarterlyReportRow {
  quarter: string
  store_id: string | null
  store_name: string | null
  product_id: string | null
  product_name: string | null
  sku_code: string | null
  units_sold: number
  sales_value: number
}

export interface QuarterlyReportResponse {
  quarter: string
  rows: QuarterlyReportRow[]
  total_units: number
  total_value: number
}

export interface YearlyReportRow {
  year: number
  month: number
  store_id: string | null
  store_name: string | null
  product_id: string | null
  product_name: string | null
  sku_code: string | null
  units_sold: number
  sales_value: number
}

export interface YearlyReportResponse {
  year: number
  rows: YearlyReportRow[]
  total_units: number
  total_value: number
}

export interface StorePerformanceRow {
  store_id: string
  store_name: string
  store_code: string
  total_sales: number
  total_units: number
  sale_count: number
  avg_sale_value: number
}

export interface StorePerformanceResponse {
  stores: StorePerformanceRow[]
  period?: { from: string | null; to: string | null }
}

// ── Settings ───────────────────────────────────────────────────────────────

export interface Setting {
  key: string
  value: string | number | boolean | unknown[] | Record<string, unknown>
  description: string | null
  updated_by: string | null
  updated_at: string
}

export interface SettingListResponse {
  settings: Setting[]
}

// ── Audit Logs ─────────────────────────────────────────────────────────────

export interface AuditLog {
  id: string
  actor_id: string | null
  actor_email: string | null
  actor_role: string | null
  action: string
  entity: string
  entity_id: string | null
  detail: Record<string, unknown> | null
  ip_address: string | null
  user_agent: string | null
  created_at: string
}

export interface AuditLogListResponse {
  logs: AuditLog[]
  total: number
  limit: number
  offset: number
}

// ── Onboarding ─────────────────────────────────────────────────────────────

export interface OnboardingProgress {
  user_id: string
  is_completed: boolean
  current_step: number
  step1_locations: boolean
  step2_users: boolean
  step3_products: boolean
  step4_suppliers: boolean
  step5_stock: boolean
  step6_safety: boolean
  skipped: boolean
  completed_at: string | null
  updated_at: string
}

// ── Bulk Import/Export ─────────────────────────────────────────────────────

export interface BulkImportResponse {
  total_rows: number
  successful: number
  failed: number
  errors: Array<{ row: number; message: string }>
}
