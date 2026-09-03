import { z } from 'zod'

/**
 * Common/primitive schemas shared across all modules.
 * Derived from the DB column types in `backend/src/db/schema.sql`.
 */

// UUID primary key / foreign key (gen_random_uuid())
export const uuidSchema = z.string().uuid()

// IdParam: /api/…/:id
export const idParamSchema = z.object({
  id: uuidSchema,
})

// NUMERIC(14,2) — all monetary values (non-negative unless stated).
export const moneySchema = z.coerce
  .number()
  .max(999999999999.99, 'Value exceeds monetary precision (14,2)')

// NUMERIC(12,3) — all quantities (fractional units: kg, L, g supported).
export const qtySchema = z.coerce.number().max(999999999999.999, 'Value exceeds quantity precision (12,3)')

// Non-negative variants for fields that cannot go below zero.
export const nonNegativeMoneySchema = moneySchema.min(0)
export const nonNegativeQtySchema = qtySchema.min(0)
// Strictly positive quantity.
export const positiveQtySchema = qtySchema.gt(0)

// Enum-like status columns (entity_status).
export const statusSchema = z.enum(['active', 'archived'])

// citext-style short codes / SKUs — trimmed, trimmed-of-spaces, sane length.
export const shortCodeSchema = z
  .string()
  .trim()
  .min(1, 'Code is required')
  .max(50)
  .transform((v) => v.toUpperCase())

// Email (citext columns: profiles.email, suppliers.email, stores.email).
export const emailSchema = z.string().trim().email().max(255)

// Normalized free text (trims surrounding whitespace).
export const textSchema = z.string().trim()

// Pagination params for list endpoints.
export const paginationSchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(200).default(20),
  })
  .default({ page: 1, pageSize: 20 })
export type Pagination = z.infer<typeof paginationSchema>

// Paginated list response envelope.
export const paginatedEnvelopeSchema = z.object({
  items: z.array(z.unknown()),
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
})

// Uniform error envelope ({ error, message, code?, details? }).
export const errorEnvelopeSchema = z.object({
  error: z.string(),
  message: z.string(),
  code: z.string().optional(),
  details: z.unknown().optional(),
})

// ISO date string (YYYY-MM-DD) used for DATE columns.
export const dateStringSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD')

// ISO timestamp (TIMESTAMPTZ).
export const timestampSchema = z.string().datetime({ offset: true })
