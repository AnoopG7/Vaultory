// ---------------------------------------------------------------------------
// API Endpoint Catalogue — Vaultory
// ---------------------------------------------------------------------------
// Single source of truth for every route, HTTP method, auth requirement,
// role restrictions, request/response schemas, and error codes.
//
// Use this file as a reference when building or reviewing modules.
// Each entry maps 1:1 to a route in backend/src/modules/<module>/<module>.routes.ts
// ---------------------------------------------------------------------------

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

export interface EndpointEntry {
  method: HttpMethod
  path: string
  description: string
  auth: boolean
  roles?: string[]
  requestSchema?: string
  responseSchema?: string
  errorCodes?: string[]
}

// ────────────────────────────────────────────────────────────────────────────
// 1. AUTH
// ────────────────────────────────────────────────────────────────────────────

export const AUTH_ENDPOINTS: EndpointEntry[] = [
  {
    method: 'POST',
    path: '/api/auth/signin',
    description: 'Email + password sign-in via Supabase Auth',
    auth: false,
    requestSchema: 'SignInRequest',
    responseSchema: 'SignInResponse',
    errorCodes: ['INVALID_CREDENTIALS'],
  },
  {
    method: 'POST',
    path: '/api/auth/otp',
    description: 'Send email OTP / magic link (no password)',
    auth: false,
    requestSchema: 'OtpRequest',
    responseSchema: 'OtpResponse',
    errorCodes: ['OTP_SEND_FAILED'],
  },
  {
    method: 'POST',
    path: '/api/auth/verify-otp',
    description: 'Verify OTP code and return session',
    auth: false,
    requestSchema: 'VerifyOtpRequest',
    responseSchema: 'SignInResponse',
    errorCodes: ['OTP_INVALID', 'OTP_EXPIRED'],
  },
  {
    method: 'POST',
    path: '/api/auth/forgot-password',
    description: 'Trigger password reset email',
    auth: false,
    requestSchema: 'ForgotPasswordRequest',
    responseSchema: 'OtpResponse',
    errorCodes: ['RESET_SEND_FAILED'],
  },
  {
    method: 'POST',
    path: '/api/auth/reset-password',
    description: 'Set new password with reset token',
    auth: false,
    requestSchema: 'AdminResetPasswordRequest',
    responseSchema: 'OtpResponse',
    errorCodes: ['RESET_INVALID', 'RESET_EXPIRED'],
  },
  {
    method: 'POST',
    path: '/api/auth/signout',
    description: 'Invalidate current session',
    auth: true,
    responseSchema: 'SuccessMessage',
  },
  {
    method: 'GET',
    path: '/api/auth/me',
    description: 'Return authenticated user profile with role',
    auth: true,
    responseSchema: 'MeResponse',
  },
]

// ────────────────────────────────────────────────────────────────────────────
// 2. HEALTH
// ────────────────────────────────────────────────────────────────────────────

export const HEALTH_ENDPOINTS: EndpointEntry[] = [
  {
    method: 'GET',
    path: '/api/health',
    description: 'Health check (DB + AI config)',
    auth: false,
    responseSchema: '{ status: string, db: string, ai: string }',
  },
]

// ────────────────────────────────────────────────────────────────────────────
// 3. USERS
// ────────────────────────────────────────────────────────────────────────────

export const USER_ENDPOINTS: EndpointEntry[] = [
  {
    method: 'GET',
    path: '/api/users',
    description: 'List users — searchable, filterable by role/status/store',
    auth: true,
    roles: ['admin'],
    requestSchema: 'ListUsersQuery (query)',
    responseSchema: 'UserListResponse',
  },
  {
    method: 'POST',
    path: '/api/users',
    description: 'Create user (Supabase Auth + profile row)',
    auth: true,
    roles: ['admin'],
    requestSchema: 'CreateUserRequest',
    responseSchema: 'UserCreatedResponse',
    errorCodes: ['EMAIL_ALREADY_EXISTS'],
  },
  {
    method: 'GET',
    path: '/api/users/:id',
    description: 'Get user detail',
    auth: true,
    roles: ['admin'],
    responseSchema: 'UserDetailResponse',
  },
  {
    method: 'PATCH',
    path: '/api/users/:id',
    description: 'Update user name, role, store assignment',
    auth: true,
    roles: ['admin'],
    requestSchema: 'UpdateUserRequest',
    responseSchema: 'UserDetailResponse',
    errorCodes: ['SELF_DEACTIVATE_FORBIDDEN'],
  },
  {
    method: 'PATCH',
    path: '/api/users/:id/deactivate',
    description: 'Soft deactivate user (set status=archived)',
    auth: true,
    roles: ['admin'],
    requestSchema: 'DeactivateUserRequest',
    responseSchema: 'SuccessMessage',
    errorCodes: ['SELF_DEACTIVATE_FORBIDDEN'],
  },
  {
    method: 'POST',
    path: '/api/users/:id/reset-password',
    description: 'Trigger password reset email for user',
    auth: true,
    roles: ['admin'],
    responseSchema: 'SuccessMessage',
  },
]

// ────────────────────────────────────────────────────────────────────────────
// 4. PRODUCTS
// ────────────────────────────────────────────────────────────────────────────

export const PRODUCT_ENDPOINTS: EndpointEntry[] = [
  {
    method: 'GET',
    path: '/api/products',
    description: 'List products — search, filter by category/status, cost_price masked per role',
    auth: true,
    requestSchema: 'ListProductsQuery (query)',
    responseSchema: 'ProductListResponse',
  },
  {
    method: 'POST',
    path: '/api/products',
    description: 'Create product — SKU uniqueness, validate target ≥ reorder ≥ safety',
    auth: true,
    roles: ['admin'],
    requestSchema: 'CreateProductRequest',
    responseSchema: 'ProductDetailResponse',
    errorCodes: ['SKU_ALREADY_EXISTS', 'INVALID_PRICE', 'INVALID_STOCK_LEVELS'],
  },
  {
    method: 'GET',
    path: '/api/products/:id',
    description: 'Product detail — cost_price masked for non-admin',
    auth: true,
    responseSchema: 'ProductDetailResponse',
  },
  {
    method: 'PATCH',
    path: '/api/products/:id',
    description: 'Update product fields',
    auth: true,
    roles: ['admin'],
    requestSchema: 'UpdateProductRequest',
    responseSchema: 'ProductDetailResponse',
    errorCodes: ['SKU_ALREADY_EXISTS', 'INVALID_STOCK_LEVELS'],
  },
  {
    method: 'PATCH',
    path: '/api/products/:id/archive',
    description: 'Soft archive product (blocks new transactions)',
    auth: true,
    roles: ['admin'],
    responseSchema: 'SuccessMessage',
  },
  {
    method: 'GET',
    path: '/api/products/movers',
    description: 'Fast/slow mover classification by sales velocity (90-day rolling)',
    auth: true,
    requestSchema: 'MoverQuery (query)',
    responseSchema: 'MoverResponse',
  },
]

// ────────────────────────────────────────────────────────────────────────────
// 5. CATEGORIES
// ────────────────────────────────────────────────────────────────────────────

export const CATEGORY_ENDPOINTS: EndpointEntry[] = [
  {
    method: 'GET',
    path: '/api/categories',
    description: 'List categories — tree or flat',
    auth: true,
    requestSchema: 'ListCategoriesQuery (query)',
    responseSchema: 'CategoryListResponse',
  },
  {
    method: 'POST',
    path: '/api/categories',
    description: 'Create category (Admin only)',
    auth: true,
    roles: ['admin'],
    requestSchema: 'CreateCategoryRequest',
    responseSchema: 'CategoryResponse',
    errorCodes: ['CATEGORY_NAME_EXISTS', 'CATEGORY_CYCLE_DETECTED'],
  },
  {
    method: 'PATCH',
    path: '/api/categories/:id',
    description: 'Update category',
    auth: true,
    roles: ['admin'],
    requestSchema: 'UpdateCategoryRequest',
    responseSchema: 'CategoryResponse',
    errorCodes: ['CATEGORY_NAME_EXISTS', 'CATEGORY_CYCLE_DETECTED'],
  },
]

// ────────────────────────────────────────────────────────────────────────────
// 6. UNITS
// ────────────────────────────────────────────────────────────────────────────

export const UNIT_ENDPOINTS: EndpointEntry[] = [
  {
    method: 'GET',
    path: '/api/units',
    description: 'List units of measure',
    auth: true,
    responseSchema: 'UnitListResponse',
  },
  {
    method: 'POST',
    path: '/api/units',
    description: 'Create unit (Admin only)',
    auth: true,
    roles: ['admin'],
    requestSchema: 'CreateUnitRequest',
    responseSchema: 'UnitResponse',
    errorCodes: ['UNIT_NAME_EXISTS'],
  },
  {
    method: 'PATCH',
    path: '/api/units/:id',
    description: 'Update unit',
    auth: true,
    roles: ['admin'],
    requestSchema: 'UpdateUnitRequest',
    responseSchema: 'UnitResponse',
    errorCodes: ['UNIT_NAME_EXISTS'],
  },
]

// ────────────────────────────────────────────────────────────────────────────
// 7. LOCATIONS
// ────────────────────────────────────────────────────────────────────────────

export const LOCATION_ENDPOINTS: EndpointEntry[] = [
  {
    method: 'GET',
    path: '/api/locations',
    description: 'List locations — filter by type (store/warehouse), store_id, status',
    auth: true,
    requestSchema: 'ListLocationsQuery (query)',
    responseSchema: 'LocationListResponse',
  },
  {
    method: 'POST',
    path: '/api/locations',
    description: 'Create location (Admin only)',
    auth: true,
    roles: ['admin'],
    requestSchema: 'CreateLocationRequest',
    responseSchema: 'LocationResponse',
    errorCodes: ['LOCATION_CODE_EXISTS', 'DEFAULT_WAREHOUSE_EXISTS'],
  },
  {
    method: 'PATCH',
    path: '/api/locations/:id',
    description: 'Update location (name, city, address, default, status)',
    auth: true,
    roles: ['admin'],
    requestSchema: 'UpdateLocationRequest',
    responseSchema: 'LocationResponse',
    errorCodes: ['LOCATION_TYPE_IMMUTABLE'],
  },
]

// ────────────────────────────────────────────────────────────────────────────
// 8. STORES
// ────────────────────────────────────────────────────────────────────────────

export const STORE_ENDPOINTS: EndpointEntry[] = [
  {
    method: 'GET',
    path: '/api/stores',
    description: 'List stores — filter by status',
    auth: true,
    requestSchema: 'ListStoresQuery (query)',
    responseSchema: 'StoreListResponse',
  },
  {
    method: 'POST',
    path: '/api/stores',
    description: 'Create store (Admin only)',
    auth: true,
    roles: ['admin'],
    requestSchema: 'CreateStoreRequest',
    responseSchema: 'StoreDetailResponse',
    errorCodes: ['STORE_CODE_EXISTS'],
  },
  {
    method: 'GET',
    path: '/api/stores/:id',
    description: 'Store detail',
    auth: true,
    responseSchema: 'StoreDetailResponse',
  },
  {
    method: 'PATCH',
    path: '/api/stores/:id',
    description: 'Update store',
    auth: true,
    roles: ['admin'],
    requestSchema: 'UpdateStoreRequest',
    responseSchema: 'StoreDetailResponse',
    errorCodes: ['STORE_CODE_EXISTS'],
  },
]

// ────────────────────────────────────────────────────────────────────────────
// 9. INVENTORY
// ────────────────────────────────────────────────────────────────────────────

export const INVENTORY_ENDPOINTS: EndpointEntry[] = [
  {
    method: 'GET',
    path: '/api/inventory',
    description: 'Per-location stock grid with computed status badges (IN/LOW/OUT/OVER)',
    auth: true,
    requestSchema: 'ListInventoryQuery (query)',
    responseSchema: 'InventoryListResponse',
  },
  {
    method: 'GET',
    path: '/api/inventory/:productId/:locationId',
    description: 'Single inventory record for a product at a location',
    auth: true,
    responseSchema: 'InventoryDetailResponse',
  },
  {
    method: 'POST',
    path: '/api/inventory/stock-in',
    description: 'Increase stock — optional PO link, writes stock_movements',
    auth: true,
    roles: ['admin', 'store_staff'],
    requestSchema: 'StockInRequest',
    responseSchema: 'StockMutationResponse',
    errorCodes: ['DB_ERROR'],
  },
  {
    method: 'POST',
    path: '/api/inventory/stock-out',
    description: 'Decrease stock — reason required, no-negative guard',
    auth: true,
    roles: ['admin', 'store_staff'],
    requestSchema: 'StockOutRequest',
    responseSchema: 'StockMutationResponse',
    errorCodes: ['INSUFFICIENT_STOCK'],
  },
  {
    method: 'POST',
    path: '/api/inventory/transfer',
    description: 'Atomic stock transfer between two locations (net zero)',
    auth: true,
    roles: ['admin', 'store_staff'],
    requestSchema: 'TransferStockRequest',
    responseSchema: 'TransferResponse',
    errorCodes: ['INSUFFICIENT_STOCK', 'SAME_LOCATION'],
  },
  {
    method: 'POST',
    path: '/api/inventory/adjust',
    description: 'Cycle count adjustment — set qty, reason required',
    auth: true,
    roles: ['admin', 'store_staff'],
    requestSchema: 'AdjustStockRequest',
    responseSchema: 'StockMutationResponse',
  },
  {
    method: 'GET',
    path: '/api/inventory/movements',
    description: 'Stock movement audit trail — filterable by product/location/type/date',
    auth: true,
    requestSchema: 'ListStockMovementsQuery (query)',
    responseSchema: 'StockMovementListResponse',
  },
]

// ────────────────────────────────────────────────────────────────────────────
// 10. SALES
// ────────────────────────────────────────────────────────────────────────────

export const SALES_ENDPOINTS: EndpointEntry[] = [
  {
    method: 'POST',
    path: '/api/sales',
    description: 'Record sale — auto-deducts stock, validates sufficiency',
    auth: true,
    roles: ['admin', 'sales_personnel'],
    requestSchema: 'CreateSaleRequest',
    responseSchema: 'SaleCreatedResponse',
    errorCodes: ['INSUFFICIENT_STOCK'],
  },
  {
    method: 'GET',
    path: '/api/sales',
    description: 'List sales — filter by store/date/status, paginated',
    auth: true,
    requestSchema: 'ListSalesQuery (query)',
    responseSchema: 'SaleListResponse',
  },
  {
    method: 'GET',
    path: '/api/sales/:id',
    description: 'Sale detail with line items',
    auth: true,
    responseSchema: 'SaleDetailResponse',
  },
  {
    method: 'POST',
    path: '/api/sales/:id/void',
    description: 'Void sale (Admin only) — restores stock, marks voided',
    auth: true,
    roles: ['admin'],
    requestSchema: 'VoidSaleRequest',
    responseSchema: 'SuccessMessage',
    errorCodes: ['ALREADY_VOIDED', 'INSUFFICIENT_STOCK'],
  },
  {
    method: 'POST',
    path: '/api/sales/:id/return',
    description: 'Return sale line items — stock increase, negative sale recorded',
    auth: true,
    roles: ['admin', 'sales_personnel'],
    requestSchema: 'ReturnSaleRequest',
    responseSchema: 'SaleReturnDetailResponse',
    errorCodes: ['RETURN_EXCEEDS_SOLD', 'PRODUCT_MISMATCH'],
  },
]

// ────────────────────────────────────────────────────────────────────────────
// 11. PURCHASE ORDERS
// ────────────────────────────────────────────────────────────────────────────

export const PURCHASE_ORDER_ENDPOINTS: EndpointEntry[] = [
  {
    method: 'POST',
    path: '/api/purchase-orders',
    description: 'Create PO — auto-generate po_number, expected_date from lead time',
    auth: true,
    roles: ['admin', 'store_staff'],
    requestSchema: 'CreatePurchaseOrderRequest',
    responseSchema: 'PurchaseOrderDetailResponse',
    errorCodes: ['DUPLICATE_OPEN_PO'],
  },
  {
    method: 'GET',
    path: '/api/purchase-orders',
    description: 'List POs — filter by status/supplier/destination/source',
    auth: true,
    requestSchema: 'ListPurchaseOrdersQuery (query)',
    responseSchema: 'PurchaseOrderListResponse',
  },
  {
    method: 'GET',
    path: '/api/purchase-orders/:id',
    description: 'PO detail with line items + receipt progress',
    auth: true,
    responseSchema: 'PurchaseOrderDetailResponse',
  },
  {
    method: 'PATCH',
    path: '/api/purchase-orders/:id/status',
    description: 'Lifecycle transition — DRAFT→SENT→PARTIALLY_RECEIVED→RECEIVED→CLOSED; any→CANCELLED',
    auth: true,
    roles: ['admin', 'store_staff'],
    requestSchema: 'UpdatePoStatusRequest',
    responseSchema: 'PurchaseOrderDetailResponse',
    errorCodes: ['INVALID_TRANSITION', 'CANCEL_REASON_REQUIRED'],
  },
  {
    method: 'POST',
    path: '/api/purchase-orders/:id/receive',
    description: 'Goods-in — per-line qty, stock increase at destination',
    auth: true,
    roles: ['admin', 'store_staff'],
    requestSchema: 'ReceivePurchaseOrderRequest',
    responseSchema: 'ReceiveGoodsResponse',
    errorCodes: ['OVER_RECEIPT', 'PO_LINE_MISMATCH', 'LOCATION_MISMATCH'],
  },
  {
    method: 'GET',
    path: '/api/purchase-orders/:id/receipts',
    description: 'List receipts for a PO',
    auth: true,
    responseSchema: 'PoReceiptListResponse',
  },
]

// ────────────────────────────────────────────────────────────────────────────
// 12. SUPPLIERS
// ────────────────────────────────────────────────────────────────────────────

export const SUPPLIER_ENDPOINTS: EndpointEntry[] = [
  {
    method: 'GET',
    path: '/api/suppliers',
    description: 'List suppliers — searchable, filterable by status',
    auth: true,
    requestSchema: 'ListSuppliersQuery (query)',
    responseSchema: 'SupplierListResponse',
  },
  {
    method: 'POST',
    path: '/api/suppliers',
    description: 'Create supplier (Admin only)',
    auth: true,
    roles: ['admin'],
    requestSchema: 'CreateSupplierRequest',
    responseSchema: 'SupplierDetailResponse',
    errorCodes: ['SUPPLIER_CODE_EXISTS'],
  },
  {
    method: 'GET',
    path: '/api/suppliers/:id',
    description: 'Supplier detail',
    auth: true,
    responseSchema: 'SupplierDetailResponse',
  },
  {
    method: 'PATCH',
    path: '/api/suppliers/:id',
    description: 'Update supplier',
    auth: true,
    roles: ['admin'],
    requestSchema: 'UpdateSupplierRequest',
    responseSchema: 'SupplierDetailResponse',
    errorCodes: ['SUPPLIER_CODE_EXISTS'],
  },
  {
    method: 'POST',
    path: '/api/suppliers/:id/products',
    description: 'Map products to supplier (M:N)',
    auth: true,
    roles: ['admin'],
    requestSchema: 'MapSupplierProductsRequest',
    responseSchema: 'SupplierProductsResponse',
    errorCodes: ['DUPLICATE_MAPPING'],
  },
  {
    method: 'GET',
    path: '/api/suppliers/:id/products',
    description: 'List supplier product mappings',
    auth: true,
    responseSchema: 'SupplierProductsResponse',
  },
  {
    method: 'GET',
    path: '/api/suppliers/:id/performance',
    description: 'On-time delivery %, effective lead time',
    auth: true,
    responseSchema: 'SupplierPerformanceResponse',
  },
]

// ────────────────────────────────────────────────────────────────────────────
// 13. SAFETY STOCK
// ────────────────────────────────────────────────────────────────────────────

export const SAFETY_STOCK_ENDPOINTS: EndpointEntry[] = [
  {
    method: 'GET',
    path: '/api/safety-stock',
    description: 'List safety stock rules per product/location',
    auth: true,
    requestSchema: 'ListSafetyStockQuery (query)',
    responseSchema: 'SafetyStockListResponse',
  },
  {
    method: 'PUT',
    path: '/api/safety-stock/:productId/:locationId',
    description: 'Upsert safety stock rule — validate target ≥ reorder ≥ safety',
    auth: true,
    roles: ['admin'],
    requestSchema: 'UpsertSafetyStockRequest',
    responseSchema: 'SafetyStockDetailResponse',
    errorCodes: ['INVALID_STOCK_LEVELS'],
  },
]

// ────────────────────────────────────────────────────────────────────────────
// 14. REPORTS
// ────────────────────────────────────────────────────────────────────────────

export const REPORT_ENDPOINTS: EndpointEntry[] = [
  {
    method: 'GET',
    path: '/api/reports/sales/daily',
    description: 'Daily sales report — filter by store/product/date',
    auth: true,
    requestSchema: 'DailyReportQuery (query)',
    responseSchema: 'DailyReportResponse',
  },
  {
    method: 'GET',
    path: '/api/reports/sales/quarterly',
    description: 'Quarterly sales report — filter by store/product/quarter',
    auth: true,
    requestSchema: 'QuarterlyReportQuery (query)',
    responseSchema: 'QuarterlyReportResponse',
  },
  {
    method: 'GET',
    path: '/api/reports/sales/yearly',
    description: 'Yearly sales report — monthly breakdown',
    auth: true,
    requestSchema: 'YearlyReportQuery (query)',
    responseSchema: 'YearlyReportResponse',
  },
  {
    method: 'GET',
    path: '/api/reports/store-performance',
    description: 'Per-store sales totals, cross-store comparison',
    auth: true,
    requestSchema: 'StorePerformanceQuery (query)',
    responseSchema: 'StorePerformanceResponse',
  },
]

// ────────────────────────────────────────────────────────────────────────────
// 15. DASHBOARD
// ────────────────────────────────────────────────────────────────────────────

export const DASHBOARD_ENDPOINTS: EndpointEntry[] = [
  {
    method: 'GET',
    path: '/api/dashboard/summary',
    description: 'Aggregated KPIs — stock value, turnover, low/out counts, today\'s sales',
    auth: true,
    responseSchema: 'DashboardSummaryResponse',
  },
  {
    method: 'GET',
    path: '/api/dashboard/revenue-trend',
    description: 'Daily revenue time series (last N days)',
    auth: true,
    requestSchema: 'RevenueTrendQuery (query)',
    responseSchema: 'RevenueTrendResponse',
  },
  {
    method: 'GET',
    path: '/api/dashboard/top-products',
    description: 'Top N products by qty sold (rolling N days)',
    auth: true,
    requestSchema: 'TopProductsQuery (query)',
    responseSchema: 'TopProductsResponse',
  },
  {
    method: 'GET',
    path: '/api/dashboard/store-comparison',
    description: 'Per-store sales totals for comparison',
    auth: true,
    requestSchema: 'StoreComparisonQuery (query)',
    responseSchema: 'StoreComparisonResponse',
  },
]

// ────────────────────────────────────────────────────────────────────────────
// 16. ALERTS
// ────────────────────────────────────────────────────────────────────────────

export const ALERT_ENDPOINTS: EndpointEntry[] = [
  {
    method: 'GET',
    path: '/api/alerts',
    description: 'Role-scoped alert list — filter by type/priority/read status',
    auth: true,
    requestSchema: 'ListAlertsQuery (query)',
    responseSchema: 'AlertListResponse',
  },
  {
    method: 'GET',
    path: '/api/alerts/unread-count',
    description: 'Unread alert count (for header badge)',
    auth: true,
    responseSchema: 'UnreadCountResponse',
  },
  {
    method: 'PATCH',
    path: '/api/alerts/:id/read',
    description: 'Mark alert as read/dismissed',
    auth: true,
    requestSchema: 'MarkAlertReadRequest',
    responseSchema: 'SuccessMessage',
  },
  {
    method: 'GET',
    path: '/api/alerts/preferences',
    description: 'Get current user alert preferences',
    auth: true,
    responseSchema: 'AlertPreferencesResponse',
  },
  {
    method: 'PATCH',
    path: '/api/alerts/preferences',
    description: 'Update alert preferences (toggle notification types)',
    auth: true,
    requestSchema: 'UpdateAlertPreferencesRequest',
    responseSchema: 'AlertPreferencesResponse',
  },
]

// ────────────────────────────────────────────────────────────────────────────
// 17. AI RECOMMENDATIONS
// ────────────────────────────────────────────────────────────────────────────

export const AI_ENDPOINTS: EndpointEntry[] = [
  {
    method: 'GET',
    path: '/api/ai/recommendations',
    description: 'List AI recommendations — filter by type/status/product',
    auth: true,
    requestSchema: 'ListRecommendationsQuery (query)',
    responseSchema: 'RecommendationListResponse',
  },
  {
    method: 'GET',
    path: '/api/ai/recommendations/:id',
    description: 'Recommendation detail',
    auth: true,
    responseSchema: 'RecommendationDetailResponse',
  },
  {
    method: 'POST',
    path: '/api/ai/recommendations/:id/accept',
    description: 'Accept recommendation — creates PO if reorder_quantity',
    auth: true,
    roles: ['admin'],
    requestSchema: 'AcceptRecommendationRequest',
    responseSchema: 'AiRecommendationResponse',
    errorCodes: ['ALREADY_ACTED', 'NO_SUPPLIER'],
  },
  {
    method: 'POST',
    path: '/api/ai/recommendations/:id/modify',
    description: 'Modify recommendation value then accept',
    auth: true,
    roles: ['admin'],
    requestSchema: 'ModifyRecommendationRequest',
    responseSchema: 'AiRecommendationResponse',
    errorCodes: ['ALREADY_ACTED'],
  },
  {
    method: 'POST',
    path: '/api/ai/recommendations/:id/reject',
    description: 'Reject recommendation with reason',
    auth: true,
    roles: ['admin'],
    requestSchema: 'RejectRecommendationRequest',
    responseSchema: 'AiRecommendationResponse',
    errorCodes: ['ALREADY_ACTED'],
  },
  {
    method: 'POST',
    path: '/api/ai/forecast',
    description: 'Trigger demand forecast for a product',
    auth: true,
    roles: ['admin'],
    requestSchema: 'TriggerForecastRequest',
    responseSchema: 'ForecastResponse',
    errorCodes: ['INSUFFICIENT_HISTORY', 'AI_UNAVAILABLE'],
  },
  {
    method: 'POST',
    path: '/api/ai/auto-order',
    description: 'Trigger auto-order scan (creates POs for products below reorder point)',
    auth: true,
    roles: ['admin'],
    requestSchema: 'TriggerAutoOrderRequest',
    responseSchema: 'AutoOrderTriggerResponse',
    errorCodes: ['AI_UNAVAILABLE'],
  },
  {
    method: 'GET',
    path: '/api/ai/warehouse-recommendations',
    description: 'Get warehouse stock level recommendations for all products',
    auth: true,
    roles: ['admin', 'senior_stakeholder'],
    responseSchema: 'WarehouseRecommendationResponse[]',
  },
]

// ────────────────────────────────────────────────────────────────────────────
// 18. SETTINGS
// ────────────────────────────────────────────────────────────────────────────

export const SETTINGS_ENDPOINTS: EndpointEntry[] = [
  {
    method: 'GET',
    path: '/api/settings',
    description: 'List all app settings',
    auth: true,
    roles: ['admin'],
    responseSchema: 'SettingListResponse',
  },
  {
    method: 'GET',
    path: '/api/settings/:key',
    description: 'Get a single setting by key',
    auth: true,
    roles: ['admin'],
    responseSchema: 'SettingResponse',
  },
  {
    method: 'PATCH',
    path: '/api/settings/:key',
    description: 'Update a setting value',
    auth: true,
    roles: ['admin'],
    requestSchema: 'UpdateSettingRequest',
    responseSchema: 'SettingResponse',
  },
]

// ────────────────────────────────────────────────────────────────────────────
// 19. AUDIT LOGS
// ────────────────────────────────────────────────────────────────────────────

export const AUDIT_LOG_ENDPOINTS: EndpointEntry[] = [
  {
    method: 'GET',
    path: '/api/audit-logs',
    description: 'Audit log viewer — filterable by actor/action/entity/date, paginated',
    auth: true,
    roles: ['admin'],
    requestSchema: 'ListAuditLogsQuery (query)',
    responseSchema: 'AuditLogListResponse',
  },
]

// ────────────────────────────────────────────────────────────────────────────
// 20. ONBOARDING
// ────────────────────────────────────────────────────────────────────────────

export const ONBOARDING_ENDPOINTS: EndpointEntry[] = [
  {
    method: 'GET',
    path: '/api/onboarding/progress',
    description: 'Get current user onboarding progress',
    auth: true,
    responseSchema: 'OnboardingProgressResponse',
  },
  {
    method: 'PATCH',
    path: '/api/onboarding/progress',
    description: 'Update onboarding step completion',
    auth: true,
    requestSchema: 'UpdateOnboardingStepRequest',
    responseSchema: 'OnboardingProgressResponse',
  },
  {
    method: 'POST',
    path: '/api/onboarding/skip',
    description: 'Skip onboarding wizard',
    auth: true,
    responseSchema: 'SuccessMessage',
  },
]

// ────────────────────────────────────────────────────────────────────────────
// 21. BULK IMPORT/EXPORT
// ────────────────────────────────────────────────────────────────────────────

export const BULK_ENDPOINTS: EndpointEntry[] = [
  {
    method: 'POST',
    path: '/api/bulk/import/products',
    description: 'CSV import for products — validate, per-row result',
    auth: true,
    roles: ['admin'],
    requestSchema: 'multipart/form-data (CSV file)',
    responseSchema: 'BulkImportResponse',
    errorCodes: ['VALIDATION_ERROR', 'FILE_TOO_LARGE'],
  },
  {
    method: 'GET',
    path: '/api/bulk/export/:entity',
    description: 'CSV export — respects masking (products, suppliers, inventory)',
    auth: true,
    roles: ['admin'],
    responseSchema: 'text/csv (download)',
  },
]

// ────────────────────────────────────────────────────────────────────────────
// ALL ENDPOINTS (combined)
// ────────────────────────────────────────────────────────────────────────────

export const ALL_ENDPOINTS: EndpointEntry[] = [
  ...AUTH_ENDPOINTS,
  ...HEALTH_ENDPOINTS,
  ...USER_ENDPOINTS,
  ...PRODUCT_ENDPOINTS,
  ...CATEGORY_ENDPOINTS,
  ...UNIT_ENDPOINTS,
  ...LOCATION_ENDPOINTS,
  ...STORE_ENDPOINTS,
  ...INVENTORY_ENDPOINTS,
  ...SALES_ENDPOINTS,
  ...PURCHASE_ORDER_ENDPOINTS,
  ...SUPPLIER_ENDPOINTS,
  ...SAFETY_STOCK_ENDPOINTS,
  ...REPORT_ENDPOINTS,
  ...DASHBOARD_ENDPOINTS,
  ...ALERT_ENDPOINTS,
  ...AI_ENDPOINTS,
  ...SETTINGS_ENDPOINTS,
  ...AUDIT_LOG_ENDPOINTS,
  ...ONBOARDING_ENDPOINTS,
  ...BULK_ENDPOINTS,
]

// ────────────────────────────────────────────────────────────────────────────
// Helper: group endpoints by module
// ────────────────────────────────────────────────────────────────────────────

export const ENDPOINTS_BY_MODULE = {
  auth: AUTH_ENDPOINTS,
  health: HEALTH_ENDPOINTS,
  users: USER_ENDPOINTS,
  products: PRODUCT_ENDPOINTS,
  categories: CATEGORY_ENDPOINTS,
  units: UNIT_ENDPOINTS,
  locations: LOCATION_ENDPOINTS,
  stores: STORE_ENDPOINTS,
  inventory: INVENTORY_ENDPOINTS,
  sales: SALES_ENDPOINTS,
  'purchase-orders': PURCHASE_ORDER_ENDPOINTS,
  suppliers: SUPPLIER_ENDPOINTS,
  'safety-stock': SAFETY_STOCK_ENDPOINTS,
  reports: REPORT_ENDPOINTS,
  dashboard: DASHBOARD_ENDPOINTS,
  alerts: ALERT_ENDPOINTS,
  ai: AI_ENDPOINTS,
  settings: SETTINGS_ENDPOINTS,
  'audit-logs': AUDIT_LOG_ENDPOINTS,
  onboarding: ONBOARDING_ENDPOINTS,
  bulk: BULK_ENDPOINTS,
} as const
