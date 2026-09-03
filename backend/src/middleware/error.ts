import type { Request, Response, NextFunction } from 'express'
import { ZodError } from 'zod'
import { isProd } from '../config/env.js'

/** Application error with an HTTP status code. */
export class AppError extends Error {
  statusCode: number
  code?: string
  details?: Record<string, unknown>

  constructor(
    statusCode: number,
    message: string,
    code?: string,
    details?: Record<string, unknown>,
  ) {
    super(message)
    this.name = 'AppError'
    this.statusCode = statusCode
    this.code = code
    this.details = details
  }
}

/** 404 handler - registered after all routes. */
export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({
    error: 'Not Found',
    message: 'The requested resource does not exist.',
  })
}

/** Centralized error handler - registered last. */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  // Zod validation errors -> 400 with field details.
  if (err instanceof ZodError) {
    res.status(400).json({
      error: 'Validation Error',
      message: 'Invalid request data.',
      details: err.flatten().fieldErrors,
    })
    return
  }

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: err.message,
      message: err.message,
      ...(err.code ? { code: err.code } : {}),
      ...(err.details ? { details: err.details } : {}),
    })
    return
  }

  // Unknown error -> 500 (no internals leaked in production).
  console.error('Unhandled error:', err)
  res.status(500).json({
    error: 'Internal Server Error',
    message: isProd ? 'Something went wrong.' : (err as Error).message,
  })
}
