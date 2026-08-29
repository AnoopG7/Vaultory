import express, { Express } from 'express'
import helmet from 'helmet'
import cors from 'cors'
import morgan from 'morgan'
import rateLimit from 'express-rate-limit'
import { env, isProd } from './config/index.js'
import { errorHandler, notFoundHandler } from './middleware/index.js'
import api from './routes/index.js'

export function createApp(): Express {
  const app = express()

  app.disable('x-powered-by')
  app.use(helmet())
  app.use(
    cors({
      origin: env.CLIENT_ORIGIN,
      credentials: true,
    }),
  )
  app.use(express.json({ limit: '1mb' }))

  if (!isProd) {
    app.use(morgan('dev'))
  }

  // Global rate limit (rough abuse protection; refined per-route later).
  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 500,
      standardHeaders: 'draft-8',
      legacyHeaders: false,
    }),
  )

  // API routes (health, auth, and all feature modules via the routes barrel)
  app.use('/api', api)

  // 404 + centralized error handling
  app.use(notFoundHandler)
  app.use(errorHandler)

  return app
}
