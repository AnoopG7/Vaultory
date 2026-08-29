import type { Request, Response, NextFunction } from 'express'
import { ZodSchema } from 'zod'
import { AppError } from './error.js'

/**
 * Validate request body / query / params against a Zod schema.
 * Throws a ZodError (handled by the central error handler as 400).
 */
export function validate(schema: ZodSchema, source: 'body' | 'query' | 'params' = 'body') {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const data = source === 'body' ? req.body : source === 'query' ? req.query : req.params
    schema.parse(data)
    next()
  }
}

/** Wrap an async route handler so rejected promises reach the error handler. */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    fn(req, res, next).catch(next)
  }
}

/** Not-found guard used inside modules. Throws a normalized AppError. */
export function assertFound<T>(value: T | null | undefined, resource: string): T {
  if (value == null) {
    throw new AppError(404, `${resource} not found`)
  }
  return value
}
