export type Role = 'owner' | 'store_manager' | 'staff'

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
