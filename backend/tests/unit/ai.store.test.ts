import { beforeEach, describe, expect, it } from 'vitest'
import {
  getFakeDb,
  resetFakeDb,
  setInsertDefaults,
  setRpcHandler,
} from '../helpers/fake-supabase'
import {
  AI_REC_DEFAULTS,
  REC_D,
  REC_R1,
  REC_R2,
  REC_R3,
  REC_R4,
  REC_REJ,
  REC_S,
  REC_W,
  REC_W2,
  SUP_A,
  aiDb,
  aiOpenPoDb,
} from '../helpers/fixtures/ai'
import { ADMIN, LOC_A, LOC_B, LOC_C, P1, P2, P3 } from '../helpers/fixtures/inventory'
import { AppError } from '../../src/middleware/error'
import {
  actOnRecommendation,
  createDemandForecastRecommendation,
  generateReorderRecommendations,
  generateWarehouseRecommendations,
  getRecommendation,
  insertRecommendation,
  listRecommendations,
  rejectRecommendation,
} from '../../src/modules/ai/ai.store'

const ADMIN_ACTOR = { id: ADMIN, email: 'admin@vaultory.internal', role: 'admin' as const }

// Stock kept on the fake is deterministic: P2 sells 30/day at Store A, so the
// SMA over its 6-day lead time predicts 180 units.
const P2_FORECAST = 180

let poSeq = 1

beforeEach(() => {
  resetFakeDb(aiDb())
  setInsertDefaults('ai_recommendations', AI_REC_DEFAULTS)
  poSeq = 1
  setRpcHandler('generate_po_number', () => `PO-2026-${String(poSeq++).padStart(4, '0')}`)
})

describe('listRecommendations (DB path)', () => {
  it('returns all seeded recommendations with enrichment and a status summary', async () => {
    const res = await listRecommendations({})

    expect(res.limit).toBe(50)
    expect(res.offset).toBe(0)
    expect(res.total).toBe(9)
    expect(res.recommendations).toHaveLength(9)
    // enriched fields
    const r2 = res.recommendations.find((r) => r.id === REC_R2)
    expect(r2?.product_name).toBe('Wireless Earbuds Pro')
    expect(r2?.sku_code).toBe('PELEC-002')
    expect(r2?.location_name).toBe('Store A — MG Road')
    // summary (status breakdown ignores any status filter)
    expect(res.summary).toEqual({ total: 9, pending: 8, accepted: 1, modified: 0, rejected: 0 })
  })

  it('filters by status, type, product, location and paginates', async () => {
    expect((await listRecommendations({ status: 'pending' })).recommendations).toHaveLength(8)
    expect((await listRecommendations({ type: 'reorder_quantity' })).recommendations).toHaveLength(5)
    expect((await listRecommendations({ productId: P2 })).recommendations).toHaveLength(3)
    expect((await listRecommendations({ locationId: LOC_C })).recommendations).toHaveLength(1)
    expect((await listRecommendations({ status: 'accepted', productId: P2 })).recommendations.at(0)?.id).toBe(REC_D)

    const page1 = await listRecommendations({ limit: 2, offset: 0 })
    expect(page1.recommendations).toHaveLength(2)
    expect(page1.total).toBe(9)

    const page5 = await listRecommendations({ limit: 2, offset: 4 })
    expect(page5.recommendations).toHaveLength(2)
    expect(page5.total).toBe(9)

    // status filter does NOT leak into the KPI summary
    const pending = await listRecommendations({ status: 'pending' })
    expect(pending.summary.accepted).toBe(1)
    expect(pending.summary.total).toBe(9)
  })
})

describe('getRecommendation (DB path)', () => {
  it('returns a single enriched recommendation', async () => {
    const rec = await getRecommendation(REC_R2)
    expect(rec?.id).toBe(REC_R2)
    expect(rec?.type).toBe('reorder_quantity')
    expect(rec?.status).toBe('pending')
    expect(rec?.product_name).toBe('Wireless Earbuds Pro')
  })

  it('returns null for an unknown id', async () => {
    expect(await getRecommendation('0000aaaa-0000-0000-0000-00000000ffff')).toBeNull()
  })
})

describe('insertRecommendation + createRecommendationAlert (DB path)', () => {
  it('persists a recommendation and enriches it via product/location embeds', async () => {
    const created = await insertRecommendation({
      type: 'warehouse_stock_level',
      productId: P1,
      locationId: LOC_C,
      recommendedValue: 320,
      currentValue: 200,
      reasoning: 'Raise warehouse target to cover forecast.',
      modelUsed: 'deterministic-sma',
      confidence: 0.1,
      inputData: { horizon_days: 8 },
    })

    expect(created.status).toBe('pending')
    expect(created.product_name).toBe('USB-C Charging Cable 1m')
    expect(created.location_name).toBe('Store A Back Office')

    const row = getFakeDb().ai_recommendations.find((r) => r.id === created.id)
    expect(row?.status).toBe('pending')
    expect(row?.product_id).toBe(P1)
    expect(row?.created_at).toBeDefined()
  })
})

describe('generateReorderRecommendations', () => {
  it('dry run scans inventory and reports only qualified candidates', async () => {
    const res = await generateReorderRecommendations({ dryRun: true })

    expect(res.dry_run).toBe(true)
    expect(res.scanned_items_count).toBe(5)
    expect(res.potential_recommendations_count).toBe(2)

    // P1/LOC_A: qty 45 > reorder 30 -> skipped. P2/LOC_A: SMA forecast 180.
    const p2 = res.candidates.find((c) => c.product_id === P2)
    expect(p2?.location_id).toBe(LOC_A)
    expect(p2?.qty_on_hand).toBe(12)
    expect(p2?.recommended_value).toBe(P2_FORECAST)
    expect(p2?.forecast_prediction).toBe(P2_FORECAST)
    expect(p2?.model_used).toBe('deterministic-sma')
    expect(p2?.confidence).toBeCloseTo(0.1, 2)
    expect(p2?.auto_approve).toBe(false)
    expect(p2?.target_level).toBe(30)
    expect(p2?.reasoning).toContain('Projected 180 units needed over the 6-day lead time')
    expect(p2?.reasoning).toContain('Simple moving average')

    // P1/LOC_B: no sales at Store B -> demandForecast null -> target-level only.
    const p1 = res.candidates.find((c) => c.product_id === P1 && c.location_id === LOC_B)
    expect(p1?.recommended_value).toBe(66)
    expect(p1?.forecast_prediction).toBeNull()
    expect(p1?.reasoning).toContain('No sufficient sales history; ordering 66 units')

    // P3 has no supplier -> unmapped, not a candidate.
    expect(res.unmapped_products).toHaveLength(1)
    expect(res.unmapped_products[0].product_id).toBe(P3)
    expect(res.skipped_duplicates).toHaveLength(0)

    // Dry run must not persist anything.
    expect(getFakeDb().ai_recommendations).toHaveLength(9)
    expect(getFakeDb().alerts ?? []).toHaveLength(0)
  })

  it('honours the destinationId filter', async () => {
    const res = await generateReorderRecommendations({ dryRun: true, destinationId: LOC_A })
    expect(res.candidates).toHaveLength(1)
    expect(res.candidates[0].product_id).toBe(P2)
    expect(res.unmapped_products.map((u) => u.product_id)).toEqual([P3])
  })

  it('flags products already covered by an open PO as skipped duplicates', async () => {
    resetFakeDb(aiOpenPoDb())
    setInsertDefaults('ai_recommendations', AI_REC_DEFAULTS)

    const res = await generateReorderRecommendations({ dryRun: true })

    expect(res.skipped_duplicates).toHaveLength(1)
    expect(res.skipped_duplicates[0].product_id).toBe(P1)
    expect(res.skipped_duplicates[0].location_id).toBe(LOC_B)
    expect(res.skipped_duplicates[0].open_po_number).toBe('PO-LOCB-001')
    expect(res.skipped_duplicates[0].open_status).toBe('sent')
    expect(res.candidates.some((c) => c.product_id === P1)).toBe(false)
  })

  it('persists recommendations and alerts (auto_approve off)', async () => {
    const res = await generateReorderRecommendations({})

    expect(res.dry_run).toBe(false)
    expect(res.recommendations_created).toBe(2)
    expect(res.po_created).toBe(0)
    expect(res.created_recommendations).toHaveLength(2)

    const rows = getFakeDb().ai_recommendations.slice(9)
    expect(rows).toHaveLength(2)
    const newP2 = rows.find((r) => r.product_id === P2 && r.location_id === LOC_A)
    expect(newP2?.recommended_value).toBe(P2_FORECAST)
    expect(newP2?.status).toBe('pending')
    expect(newP2?.input_data).toMatchObject({ qty_on_hand: 12, reorder_point: 15, target_level: 30, auto_order_enabled: true })

    const alerts = getFakeDb().alerts ?? []
    expect(alerts).toHaveLength(2)
    expect(alerts[0].type).toBe('ai_recommendation')
    expect(alerts[0].priority).toBe('medium')
    expect(alerts[0].target_roles).toEqual(['admin'])
    expect(alerts[0].ai_recommendation_id).toBeDefined()
  })

  it('auto-accepts and creates a PO when the rule has auto_approve enabled', async () => {
    resetFakeDb({
      ai_recommendations: [],
      app_settings: [
        { key: 'ai_forecast_window_days', value: '60' },
        { key: 'ai_forecast_min_days', value: '14' },
      ],
      products: [
        { id: P2, name: 'Wireless Earbuds Pro', sku_code: 'PELEC-002', default_safety_stock: 5, default_reorder_point: 10, default_target_level: 40, status: 'active', cost_price: 800, sale_price: 1499 },
      ],
      locations: [
        { id: LOC_A, store_id: 'aaaaaaaa-0000-0000-0000-000000000001', name: 'Store A — MG Road', type: 'store', status: 'active' },
      ],
      inventory: [{ id: 'i1', product_id: P2, location_id: LOC_A, qty_on_hand: 12 }],
      safety_stock_rules: [
        { id: 'rA', product_id: P2, location_id: LOC_A, safety_stock: 5, reorder_point: 15, target_level: 30, auto_order_enabled: true, auto_approve: true },
      ],
      suppliers: [{ id: SUP_A, name: 'ElectroTech Distributors', lead_time_days: 6 }],
      supplier_products: [{ id: 'spA', supplier_id: SUP_A, product_id: P2, is_preferred: true, unit_cost: 800, lead_time_override: null }],
      profiles: [{ id: ADMIN, email: 'admin@vaultory.internal', role: 'admin' }],
      sales: [{ id: 's1', sale_datetime: '2026-09-10T10:00:00.000Z', status: 'active', store_id: 'aaaaaaaa-0000-0000-0000-000000000001', total: 4000, total_qty: 70 }],
      sale_lines: [{ id: 'sl1', sale_id: 's1', product_id: P2, qty: 30 }],
      purchase_orders: [],
      po_lines: [],
    })
    setInsertDefaults('ai_recommendations', AI_REC_DEFAULTS)
    setRpcHandler('generate_po_number', () => `PO-2026-${'0001'}`)

    const res = await generateReorderRecommendations({ actor: ADMIN_ACTOR })

    expect(res.recommendations_created).toBe(1)
    expect(res.po_created).toBe(1)

    const po = getFakeDb().purchase_orders[0]
    expect(po.po_number).toBe('PO-2026-0001')
    expect(po.source).toBe('ai_auto')
    expect(po.status).toBe('draft')
    expect(po.destination_id).toBe(LOC_A)
    expect(po.supplier_id).toBe(SUP_A)
    expect(po.created_by).toBe(ADMIN)
    expect(po.notes).toBe('AI-generated reorder from an accepted recommendation.')

    const line = getFakeDb().po_lines[0]
    expect(line.product_id).toBe(P2)
    expect(line.qty_ordered).toBe(P2_FORECAST)
    expect(line.unit_cost).toBe(800)
    expect(line.notes).toBe('AI reorder')

    const rec = getFakeDb().ai_recommendations[0]
    expect(rec.status).toBe('accepted')
    expect(rec.accepted_value).toBe(P2_FORECAST)
  })
})

describe('generateWarehouseRecommendations', () => {
  it('recommends a warehouse stock level from the SMA forecast', async () => {
    // P1 sells 40/day at Store A (no store filter -> counts for the warehouse).
    // horizon = round(7 * 1.2) = 8 -> predicted 320.
    const results = await generateWarehouseRecommendations()

    expect(results).toHaveLength(1)
    const rec = results[0]
    expect(rec.product_id).toBe(P1)
    expect(rec.product_name).toBe('USB-C Charging Cable 1m')
    expect(rec.location_id).toBe(LOC_C)
    expect(rec.location_name).toBe('Store A Back Office')
    expect(rec.current_stock).toBe(200)
    expect(rec.recommended_stock_level).toBe(320)
    expect(rec.model_used).toBe('deterministic-sma')
    expect(rec.reasoning).toContain('expected ~320 units over the next 7-day lead time + 20% buffer')

    const rows = getFakeDb().ai_recommendations
    const persisted = rows.find((r) => r.type === 'warehouse_stock_level' && r.id !== REC_W && r.id !== REC_W2)
    expect(persisted?.recommended_value).toBe(320)
    expect(persisted?.location_id).toBe(LOC_C)
    expect((getFakeDb().alerts ?? []).length).toBeGreaterThan(0)
  })
})

describe('actOnRecommendation', () => {
  it('accepts a reorder recommendation and creates an ai_auto purchase order', async () => {
    const res = await actOnRecommendation(REC_R2, ADMIN_ACTOR, 'accepted')

    expect(res.purchase_order?.po_number).toBe('PO-2026-0001')
    expect(res.purchase_order?.destination_id).toBe(LOC_A)
    expect(res.message).toBe('Recommendation accepted. Purchase order PO-2026-0001 created.')
    expect(res.recommendation.status).toBe('accepted')
    expect(res.recommendation.accepted_value).toBe(180)
    expect(res.recommendation.acted_on_by).toBe(ADMIN)

    const row = getFakeDb().ai_recommendations.find((r) => r.id === REC_R2)
    expect(row?.status).toBe('accepted')
    expect(row?.resulting_po_id).toBe(res.purchase_order?.id)

    const po = getFakeDb().purchase_orders[0]
    expect(po.ai_recommendation_id).toBe(REC_R2)
    const line = getFakeDb().po_lines[0]
    expect(line.qty_ordered).toBe(180)
    expect(line.unit_cost).toBe(800)
  })

  it('modifies a recommendation before accepting (custom quantity)', async () => {
    const res = await actOnRecommendation(REC_R3, ADMIN_ACTOR, 'modified', 150)

    expect(res.message).toContain('modified to 150 units')
    expect(res.purchase_order?.po_number).toBe('PO-2026-0001')
    expect(res.recommendation.status).toBe('modified')
    expect(res.recommendation.accepted_value).toBe(150)
    expect(getFakeDb().po_lines[0].qty_ordered).toBe(150)
  })

  it('links an existing open PO instead of creating a new one', async () => {
    resetFakeDb(aiOpenPoDb())
    setInsertDefaults('ai_recommendations', AI_REC_DEFAULTS)

    const res = await actOnRecommendation(REC_R4, ADMIN_ACTOR, 'accepted')

    expect(res.purchase_order).toBeNull()
    expect(res.message).toContain('An open PO (PO-LOCA-001) already covers this product')
    expect(res.recommendation.status).toBe('accepted')
    expect(res.recommendation.resulting_po_id).toBe('po-1')
    expect(getFakeDb().purchase_orders).toHaveLength(2)
  })

  it('applies a warehouse recommendation by inserting a safety rule', async () => {
    const res = await actOnRecommendation(REC_W, ADMIN_ACTOR, 'accepted')

    expect(res.message).toContain('applied to safety stock rules')
    expect(res.recommendation.status).toBe('accepted')
    expect(res.recommendation.accepted_value).toBe(250)

    const rule = getFakeDb().safety_stock_rules.find((r) => r.product_id === P1 && r.location_id === LOC_C)
    expect(rule?.target_level).toBe(250)
    expect(rule?.reorder_point).toBe(30) // inherited from the P1 global rule
    expect(rule?.auto_order_enabled).toBe(true)
  })

  it('updates an existing safety rule for a warehouse recommendation', async () => {
    const res = await actOnRecommendation(REC_W2, ADMIN_ACTOR, 'accepted')

    expect(res.recommendation.accepted_value).toBe(90)
    const rule = getFakeDb().safety_stock_rules.find((r) => r.product_id === P1 && r.location_id === LOC_B)
    expect(rule?.id).toBe('r4')
    expect(rule?.target_level).toBe(90)
    expect(rule?.auto_order_enabled).toBe(true)
  })

  it('applies a safety_stock_suggest recommendation', async () => {
    const res = await actOnRecommendation(REC_S, ADMIN_ACTOR, 'accepted')

    expect(res.message).toContain('applied to safety stock rules')
    const rule = getFakeDb().safety_stock_rules.find((r) => r.product_id === P1 && r.location_id === LOC_A)
    expect(rule?.safety_stock).toBe(40)
    expect(rule?.reorder_point).toBe(40)
    expect(rule?.target_level).toBe(100)
  })

  it('rejects when no supplier is mapped (422 NO_SUPPLIER)', async () => {
    await expect(actOnRecommendation(REC_R1, ADMIN_ACTOR, 'accepted')).rejects.toMatchObject({
      statusCode: 422,
      code: 'NO_SUPPLIER',
      message: 'No supplier is mapped for this product. Map a supplier before accepting.',
    })
  })

  it('rejects for an unknown recommendation (404)', async () => {
    await expect(actOnRecommendation('0000aaaa-0000-0000-0000-00000000ffff', ADMIN_ACTOR, 'accepted')).rejects.toMatchObject({
      statusCode: 404,
      code: 'NOT_FOUND',
    })
  })

  it('rejects a recommendation that was already acted upon (409)', async () => {
    await expect(actOnRecommendation(REC_D, ADMIN_ACTOR, 'accepted')).rejects.toMatchObject({
      statusCode: 409,
      code: 'ALREADY_ACTED',
      message: 'Recommendation has already been acted upon',
    })
  })

  it('surfaces a purchase-order failure as a 500 DB_ERROR', async () => {
    setRpcHandler('generate_po_number', () => null)

    const err = await actOnRecommendation(REC_R2, ADMIN_ACTOR, 'accepted').catch((e: unknown) => e)
    expect(err).toBeInstanceOf(AppError)
    expect((err as AppError).statusCode).toBe(500)
    expect((err as AppError).code).toBe('DB_ERROR')
    expect(String((err as AppError).message)).toContain('Failed to create AI purchase order')
  })
})

describe('rejectRecommendation', () => {
  it('rejects a pending recommendation with a trimmed reason', async () => {
    const res = await rejectRecommendation(REC_REJ, ADMIN_ACTOR, '  Not needed for now  ')

    expect(res.message).toBe('Recommendation rejected.')
    expect(res.recommendation.status).toBe('rejected')
    expect(res.recommendation.rejection_reason).toBe('Not needed for now')
    expect(res.recommendation.acted_on_by).toBe(ADMIN)

    const row = getFakeDb().ai_recommendations.find((r) => r.id === REC_REJ)
    expect(row?.status).toBe('rejected')
  })

  it('stores a null reason for whitespace-only input', async () => {
    const res = await rejectRecommendation(REC_REJ, ADMIN_ACTOR, '   ')
    expect(res.recommendation.rejection_reason).toBeNull()
  })

  it('rejects unknown and already-acted recommendations', async () => {
    await expect(rejectRecommendation('0000aaaa-0000-0000-0000-00000000ffff', ADMIN_ACTOR)).rejects.toMatchObject({ statusCode: 404 })
    await expect(rejectRecommendation(REC_D, ADMIN_ACTOR)).rejects.toMatchObject({ statusCode: 409 })
  })
})

describe('createDemandForecastRecommendation', () => {
  it('persists a demand_forecast recommendation from the SMA forecast', async () => {
    const { forecast, recommendation } = await createDemandForecastRecommendation({
      productId: P2,
      productName: 'Wireless Earbuds Pro',
      skuCode: 'PELEC-002',
      locationId: LOC_A,
      horizonDays: 6,
    })

    expect(forecast?.predicted_demand).toBe(180)
    expect(forecast?.sourced_from_ai).toBe(false)
    expect(recommendation?.type).toBe('demand_forecast')
    expect(recommendation?.product_id).toBe(P2)
    expect(recommendation?.location_id).toBe(LOC_A)
    expect(recommendation?.recommended_value).toBe(180)
    expect(recommendation?.model_used).toBe('deterministic-sma')

    const row = getFakeDb().ai_recommendations.find((r) => r.id === recommendation?.id)
    expect(row?.input_data).toEqual({ horizon_days: 6 })
  })
})