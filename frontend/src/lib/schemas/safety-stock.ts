import { z } from 'zod'
import { nonNegativeMoneySchema, uuidSchema } from './common'

/**
 * Safety stock module schemas (frontend — zod v4). Maps to `safety_stock_rules`.
 * Business rule: target >= reorder >= safety.
 */

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
