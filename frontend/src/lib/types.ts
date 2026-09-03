export type Role = 'admin' | 'store_staff' | 'sales_personnel' | 'senior_stakeholder'

export interface User {
  id: string
  email: string
  name: string
  role: Role
  store_id: string | null
}

export interface Store {
  id: string
  name: string
  location: string
}

export interface Product {
  id: string
  store_id: string
  name: string
  sku: string
  category: string
  unit: string
  price: number
  cost: number
  stock_qty: number
  reorder_point: number
  reorder_qty: number
}

export type OrderStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled'

export interface Order {
  id: string
  store_id: string
  order_number: string
  customer_name: string | null
  total: number
  status: OrderStatus
  created_at: string
}

export interface OrderItem {
  id: string
  order_id: string
  product_id: string
  product_name: string
  qty: number
  unit_price: number
  line_total: number
}

export type PurchaseStatus = 'draft' | 'submitted' | 'received' | 'cancelled'

export interface PurchaseOrder {
  id: string
  store_id: string
  po_number: string
  supplier: string
  total: number
  status: PurchaseStatus
  ai_generated: boolean
  created_at: string
}

export interface Forecast {
  product_id: string
  product_name: string
  store_id: string
  predicted_demand: number
  reorder_level: number
  stock_qty: number
  suggested_qty: number
  confidence: number
  reason?: string
  sourced_from_ai: boolean
}

export interface DashboardSummary {
  total_revenue: number
  orders_count: number
  low_stock_products: number
  auto_orders_pending: number
  revenue_trend: Array<{ date: string; revenue: number }>
  top_products: Array<{ product_name: string; qty_sold: number }>
}

// ----------------------------------------
// Sales & Dashboard (aligned to backend API)
// ----------------------------------------

export type SaleStatus = 'active' | 'voided'

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
  sale_id: string
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

export interface NewStore {
  id: string
  name: string
  code: string
  city: string | null
  status: 'active' | 'archived'
}

export interface NewProduct {
  id: string
  sku_code: string
  name: string
  sale_price: number
  status: 'active' | 'archived'
}

