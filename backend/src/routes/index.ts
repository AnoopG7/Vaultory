import { Router } from 'express'
import { authRoutes } from '../modules/auth/index.js'
import { healthRoutes } from '../modules/health/index.js'
import { salesRoutes } from '../modules/sales/index.js'
import { dashboardRoutes } from '../modules/dashboard/index.js'
import { productsRoutes } from '../modules/products/index.js'
import { storesRoutes } from '../modules/stores/index.js'
import { referenceRoutes } from '../modules/reference/index.js'
import { suppliersRoutes } from '../modules/suppliers/index.js'
import { purchaseOrdersRoutes } from '../modules/purchase-orders/index.js'
import { usersRoutes } from '../modules/users/index.js'
import { inventoryRoutes } from '../modules/inventory/index.js'
import { alertsRoutes } from '../modules/alerts/index.js'
import { auditRoutes } from '../modules/audit/index.js'
import { reportsRoutes } from '../modules/reports/index.js'
import { categoriesRoutes } from '../modules/categories/index.js'
import { unitsRoutes } from '../modules/units/index.js'
import { aiRoutes } from '../modules/ai/index.js'

/**
 * Central API router (mounted at /api in app.ts).
 *
 * Each feature module defines its full route paths (e.g. /auth/signin,
 * /health) so they are mounted here at the root:
 *
 *   api.use('/', authRoutes)    -> /api/auth/*, /api/auth/me, ...
 *   api.use('/', healthRoutes)  -> /api/health
 *
 * New modules are added here with a single use() line,
 * keeping app.ts clean and routing centralized.
 */
const api = Router()

api.use('/', authRoutes)
api.use('/', healthRoutes)
api.use('/', salesRoutes)
api.use('/', dashboardRoutes)
// Products module owns GET /api/products (list + CRUD, VAU-018). Mounted
// before referenceRoutes so the legacy dropdown route is superseded; its
// shape stays compatible (id, sku_code, name, sale_price, status).
api.use('/', productsRoutes)
// Stores module owns GET /api/stores and /api/locations (list + CRUD, FR-INV-02).
// Mounted before referenceRoutes so rich listings and management supersede
// the basic reference dropdowns while maintaining public signup compatibility.
api.use('/', storesRoutes)
api.use('/', referenceRoutes)
api.use('/', suppliersRoutes)
api.use('/', purchaseOrdersRoutes)
api.use('/', usersRoutes)
api.use('/', inventoryRoutes)
api.use('/', alertsRoutes)
api.use('/', auditRoutes)
api.use('/', reportsRoutes)
api.use('/', productsRoutes)
api.use('/', categoriesRoutes)
api.use('/', unitsRoutes)
api.use('/', aiRoutes)

export default api

