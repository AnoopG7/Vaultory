// Master references from seed.sql, kept in one neutral place so the
// products, purchase-orders and inventory modules share a single catalog
// without creating circular imports.

export const memoryLocations: Record<
  string,
  { name: string; code: string; type: 'store' | 'warehouse'; city: string }
> = {
  'a1000000-0000-0000-0000-000000000001': { name: 'Store A — MG Road', code: 'STORE-A', type: 'store', city: 'Mumbai' },
  'a1000000-0000-0000-0000-000000000002': { name: 'Store B — Andheri', code: 'STORE-B', type: 'store', city: 'Mumbai' },
  'a1000000-0000-0000-0000-000000000003': { name: 'Store C — Thane', code: 'STORE-C', type: 'store', city: 'Thane' },
  'a1000000-0000-0000-0000-000000000004': { name: 'Central Warehouse', code: 'WH-CENTRAL', type: 'warehouse', city: 'Mumbai' },
}

export const memoryProductsList: Record<
  string,
  {
    name: string
    sku_code: string
    category: string
    unit: string
    cost_price: number
    sale_price: number
    default_safety_stock: number
    default_reorder_point: number
    default_target_level: number
    is_perishable: boolean
    shelf_life_days: number | null
  }
> = {
  'd1000000-0000-0000-0000-000000000001': { name: 'USB-C Charging Cable 1m', sku_code: 'PELEC-001', category: 'Electronics', unit: 'pcs', cost_price: 120, sale_price: 299, default_safety_stock: 15, default_reorder_point: 30, default_target_level: 60, is_perishable: false, shelf_life_days: null },
  'd1000000-0000-0000-0000-000000000002': { name: 'Wireless Earbuds Pro', sku_code: 'PELEC-002', category: 'Electronics', unit: 'pcs', cost_price: 800, sale_price: 1999, default_safety_stock: 8, default_reorder_point: 15, default_target_level: 30, is_perishable: false, shelf_life_days: null },
  'd1000000-0000-0000-0000-000000000003': { name: 'Phone Screen Protector', sku_code: 'PELEC-003', category: 'Electronics', unit: 'pcs', cost_price: 40, sale_price: 149, default_safety_stock: 30, default_reorder_point: 60, default_target_level: 120, is_perishable: false, shelf_life_days: null },
  'd1000000-0000-0000-0000-000000000004': { name: '10000mAh Power Bank', sku_code: 'PELEC-004', category: 'Electronics', unit: 'pcs', cost_price: 450, sale_price: 999, default_safety_stock: 10, default_reorder_point: 20, default_target_level: 40, is_perishable: false, shelf_life_days: null },
  'd1000000-0000-0000-0000-000000000005': { name: 'Premium Basmati Rice 5kg', sku_code: 'PGROC-001', category: 'Grocery', unit: 'pack', cost_price: 280, sale_price: 450, default_safety_stock: 20, default_reorder_point: 35, default_target_level: 70, is_perishable: false, shelf_life_days: 365 },
  'd1000000-0000-0000-0000-000000000006': { name: 'Masala Chips Multi-Pack', sku_code: 'PGROC-002', category: 'Grocery', unit: 'pack', cost_price: 80, sale_price: 120, default_safety_stock: 25, default_reorder_point: 50, default_target_level: 100, is_perishable: true, shelf_life_days: 90 },
  'd1000000-0000-0000-0000-000000000007': { name: 'Whole Wheat Bread 400g', sku_code: 'PGROC-003', category: 'Grocery', unit: 'pack', cost_price: 25, sale_price: 45, default_safety_stock: 15, default_reorder_point: 30, default_target_level: 60, is_perishable: true, shelf_life_days: 5 },
  'd1000000-0000-0000-0000-000000000008': { name: 'Full Cream Milk 1L', sku_code: 'PGROC-004', category: 'Dairy', unit: 'L', cost_price: 52, sale_price: 68, default_safety_stock: 20, default_reorder_point: 40, default_target_level: 80, is_perishable: true, shelf_life_days: 7 },
  'd1000000-0000-0000-0000-000000000009': { name: 'Greek Yogurt 400g', sku_code: 'PGROC-005', category: 'Dairy', unit: 'cup', cost_price: 65, sale_price: 95, default_safety_stock: 10, default_reorder_point: 20, default_target_level: 40, is_perishable: true, shelf_life_days: 21 },
  'd1000000-0000-0000-0000-000000000010': { name: 'Cola 500mL Can (12-pack)', sku_code: 'PBEV-001', category: 'Beverages', unit: 'pack', cost_price: 180, sale_price: 300, default_safety_stock: 15, default_reorder_point: 30, default_target_level: 60, is_perishable: false, shelf_life_days: 180 },
  'd1000000-0000-0000-0000-000000000014': { name: 'Liquid Hand Soap 500mL', sku_code: 'PCARE-001', category: 'Personal Care', unit: 'bottle', cost_price: 75, sale_price: 129, default_safety_stock: 15, default_reorder_point: 25, default_target_level: 50, is_perishable: false, shelf_life_days: 730 },
}