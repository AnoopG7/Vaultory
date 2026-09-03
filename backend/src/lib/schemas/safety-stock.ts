import { z } from 'zod'
import { nonNegativeMoneySchema, uuidSchema } from './common.js'

/**
 * Safety stock module schemas. Maps to `safety_stock_rules` in schema.sql.
 * Business rule (chk_ssr_levels): target >= reorder >= safety.
 */

// PUT /safety-stock/:productId/:locationId — set/update a rule.
// locationId may be omitted for the global rule, or given explicitly.
export const upsertSafetyStockSchema = z.object({
  productId: uuidSchema,
  locationId: uuidSchema.nullish(),
  safetyStock: nonNegativeMoneySchema,
  reorderPoint: nonNegativeMoneySchema,
  targetLevel: nonNegativeMoneySchema,
  autoOrderEnabled: z.boolean().default(false),
  autoApprove: z.boolean().default(false),
})
export type UpsertSafetyStockInput = z.infer<typeof upsertSafetyStockSchema>

// safety_stock_rules DB row shape.
export const safetyStockRuleSchema = z.object({
  id: uuidSchema,
  product_id: uuidSchema,
  location_id: uuidSchema.nullable(),
  safety_stock: nonNegativeMoneySchema,
  reorder_point: nonNegativeMoneySchema,
  target_level: nonNegativeMoneySchema,
  auto_order_enabled: z.boolean(),
  auto_approve: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
})
export type SafetyStockRule = z.infer<typeof safetyStockRuleSchema>
