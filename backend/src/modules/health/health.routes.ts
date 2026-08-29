import { Router } from 'express'
import { env } from '../../config/index.js'
import { supabase } from '../../config/index.js'
import { asyncHandler } from '../../middleware/index.js'

const router = Router()

/**
 * Health check used by Render (uptime monitoring) and integration tests.
 * Verifies the service is up and can reach Supabase (Postgres) + returns
 * whether the AI (Groq) integration is configured.
 */
router.get(
  '/health',
  asyncHandler(async (_req, res) => {
    const startedAt = Date.now()

    let db = 'ok'
    let dbError: string | null = null
    try {
      const { error } = await supabase.from('health_check').select('id').limit(1)
      if (error) {
        // Table may not exist yet - still counts as "reachable" if the query runs.
        if (error.code !== '42P01') {
          db = 'error'
          dbError = error.message
        }
      }
    } catch (e) {
      db = 'error'
      dbError = (e as Error).message
    }

    const healthy = db === 'ok'
    res.status(healthy ? 200 : 503).json({
      status: healthy ? 'ok' : 'degraded',
      service: 'vaultory-backend',
      uptime: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
      environment: env.NODE_ENV,
      database: {
        status: db,
        ...(dbError ? { error: dbError } : {}),
      },
      ai: {
        configured: Boolean(env.GROQ_API_KEY),
      },
      latencyMs: Date.now() - startedAt,
    })
  }),
)

export default router
