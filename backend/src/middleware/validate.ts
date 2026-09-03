import type { Request, Response, NextFunction } from 'express'
import { z, type ZodType } from 'zod'
import { AppError } from './error.js'

/**
 * Validated request data attached by `validate()`.
 *
 * After a schema passes, the parsed (defaults applied, coerced) values are
 * stored here so route handlers read validated data instead of raw input.
 */
declare module 'express' {
  interface Request {
    validatedData?: {
      body?: unknown
      query?: unknown
      params?: unknown
    }
  }
}

/** Helper to read the validated body/query/params from a request, typed. */
export function validated<S extends z.ZodType, O = z.output<S>>(
  req: Request,
  source: 'body' | 'query' | 'params' = 'body',
  _schema?: S,
): O {
  return req.validatedData?.[source] as O
}

/**
 * Validate request body / query / params against a Zod schema and attach the
 * parsed result to `req.validatedData.<source>`.
 *
 * Throws a ZodError (handled by the central error handler as 400).
 */
export function validate<S extends ZodType>(
  schema: S,
  source: 'body' | 'query' | 'params' = 'body',
) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const raw = source === 'body' ? req.body : source === 'query' ? req.query : req.params
    const parsed = schema.safeParse(raw)
    if (!parsed.success) {
      throw new AppError(
        400,
        'Invalid request data.',
        'VALIDATION_ERROR',
        parsed.error.flatten().fieldErrors as Record<string, unknown>,
      )
    }
    req.validatedData = { ...req.validatedData, [source]: parsed.data }
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

// Re-export z so schemas can be reused inline if needed.
export { z }
export type { ZodType }
