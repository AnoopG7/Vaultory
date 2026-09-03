import { Router } from 'express'
import { authRoutes } from '../modules/auth/index.js'
import { healthRoutes } from '../modules/health/index.js'
import { salesRoutes } from '../modules/sales/index.js'
import { dashboardRoutes } from '../modules/dashboard/index.js'
import { referenceRoutes } from '../modules/reference/index.js'

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
api.use('/', referenceRoutes)

export default api
