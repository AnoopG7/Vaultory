import { randomUUID } from 'node:crypto'
import { env, supabase } from '../../config/index.js'
import { AppError } from '../../middleware/error.js'
import type { Role } from '../../middleware/auth.js'
import {
  aiRecommendationSchema,
  createAiRecommendationSchema,
  type AiRecommendation,
  type CreateAiRecommendationInput,
} from '../../lib/schemas/ai.js'
import { memoryAlerts } from '../alerts/alerts.store.js'
import {
  demandForecast,
  getAppSetting,
  type ForecastResult,
} from './ai.engine.js'

/**
 * AI module persistence + orchestration (SRS §8).
 *
 * Writes/reads `ai_recommendations`, creates `ai_recommendation` alerts, and —
 * on ACCEPT of a reorder_quantity recommendation — creates an `ai_auto` PO
 * (source = 'ai_auto', linked via ai_recommendation_id). Warehouse/safety
 * recommendations update `safety_stock_rules`. DB is the source of truth in
 * production; a small in-memory fallback keeps local/mock mode functional.
 */

const isMockSupabase =
  !env.SUPABASE_URL ||
  env.SUPABASE_URL.includes('mock') ||
  env.SUPABASE_URL.includes('localhost')

const OPEN_PO_STATUSES = ['draft', 'sent', 'partially_received']

export interface EnrichedRecommendation extends AiRecommendation {
  product_name?: string
  sku_code?: string
  location_name?: string
}

export interface WarehouseRecommendation {
  product_id: string
  product_name: string
  sku_code: string
  location_id: string
  location_name: string
  current_stock: number
  recommended_stock_level: number
  reasoning: string
  confidence: number | null
  model_used: string | null
}

// -----------------------------------------------------------------------------
// In-memory fallback store (mock/local mode)
// -----------------------------------------------------------------------------
const memoryRecommendations: EnrichedRecommendation[] = []

const memoryLocations: Record<string, { name: string; type: string }> = {
  'a1000000-0000-0000-0000-000000000001': { name: 'Store A — MG Road', type: 'store' },
  'a1000000-0000-0000-0000-000000000002': { name: 'Store B — Andheri', type: 'store' },
  'a1000000-0000-0000-0000-000000000003': { name: 'Store C — Thane', type: 'store' },
  'a1000000-0000-0000-0000-000000000004': { name: 'Central Warehouse', type: 'warehouse' },
}

const memoryProducts: Record<string, { name: string; sku_code: string }> = {
  'd1000000-0000-0000-0000-000000000001': { name: 'USB-C Charging Cable 1m', sku_code: 'PELEC-001' },
  'd1000000-0000-0000-0000-000000000002': { name: 'Wireless Earbuds Pro', sku_code: 'PELEC-002' },
  'd1000000-0000-0000-0000-000000000007': { name: 'Whole Wheat Bread 400g', sku_code: 'PGROC-003' },
}

const memoryInventory: Array<{ product_id: string; location_id: string; qty_on_hand: number }> = [
  { product_id: 'd1000000-0000-0000-0000-000000000001', location_id: 'a1000000-0000-0000-0000-000000000001', qty_on_hand: 45 },
  { product_id: 'd1000000-0000-0000-0000-000000000002', location_id: 'a1000000-0000-0000-0000-000000000001', qty_on_hand: 12 },
  { product_id: 'd1000000-0000-0000-0000-000000000007', location_id: 'a1000000-0000-0000-0000-000000000001', qty_on_hand: 18 },
  { product_id: 'd1000000-0000-0000-0000-000000000001', location_id: 'a1000000-0000-0000-0000-000000000002', qty_on_hand: 14 },
  { product_id: 'd1000000-0000-0000-0000-000000000001', location_id: 'a1000000-0000-0000-0000-000000000004', qty_on_hand: 200 },
]

const memoryRules: Record<string, { reorder_point: number; target_level: number; auto_order_enabled: boolean }> = {
  'd1000000-0000-0000-0000-000000000001::a1000000-0000-0000-0000-000000000001': { reorder_point: 30, target_level: 60, auto_order_enabled: true },
  'd1000000-0000-0000-0000-000000000002::a1000000-0000-0000-0000-000000000001': { reorder_point: 15, target_level: 30, auto_order_enabled: true },
  'd1000000-0000-0000-0000-000000000007::a1000000-0000-0000-0000-000000000001': { reorder_point: 30, target_level: 60, auto_order_enabled: true },
  'd1000000-0000-0000-0000-000000000001::a1000000-0000-0000-0000-000000000002': { reorder_point: 20, target_level: 50, auto_order_enabled: true },
}

// memorySupplierProducts for mock mode: product → preferred supplier
const memorySuppliers: Record<string, { supplier_id: string; lead_time_days: number; unit_cost: number }> = {
  'd1000000-0000-0000-0000-000000000001': { supplier_id: 'b1000000-0000-0000-0000-000000000001', lead_time_days: 5, unit_cost: 120 },
  'd1000000-0000-0000-0000-000000000002': { supplier_id: 'b1000000-0000-0000-0000-000000000001', lead_time_days: 6, unit_cost: 800 },
  'd1000000-0000-0000-0000-000000000007': { supplier_id: 'b1000000-0000-0000-0000-000000000002', lead_time_days: 1, unit_cost: 25 },
}

function mockName(productId: string, locationId: string): { product_name?: string; sku_code?: string; location_name?: string } {
  const p = memoryProducts[productId]
  const loc = memoryLocations[locationId]
  return {
    product_name: p?.name,
    sku_code: p?.sku_code,
    location_name: loc?.name,
  }
}

// -----------------------------------------------------------------------------
// Row mapping helpers
// -----------------------------------------------------------------------------
function toEnriched(row: Record<string, unknown>): EnrichedRecommendation {
  return {
    ...aiRecommendationSchema.parse(row),
    product_name: (row.products as { name?: string } | undefined)?.name,
    sku_code: (row.products as { sku_code?: string } | undefined)?.sku_code,
    location_name: (row.locations as { name?: string } | undefined)?.name,
  }
}

// -----------------------------------------------------------------------------
// 1. LIST + GET
// -----------------------------------------------------------------------------
export interface ListRecommendationsQuery {
  type?: string
  status?: string
  productId?: string
  locationId?: string
  limit?: number
  offset?: number
}

interface RecommendationSummary {
  total: number
  pending: number
  accepted: number
  modified: number
  rejected: number
}

function statusSummary(recs: Array<{ status?: string | null }>): RecommendationSummary {
  const summary: RecommendationSummary = { total: recs.length, pending: 0, accepted: 0, modified: 0, rejected: 0 }
  for (const r of recs) {
    switch (r.status) {
      case 'pending': summary.pending += 1; break
      case 'accepted': summary.accepted += 1; break
      case 'modified': summary.modified += 1; break
      case 'rejected': summary.rejected += 1; break
      default: break
    }
  }
  return summary
}

export async function listRecommendations(
  query: ListRecommendationsQuery,
): Promise<{ recommendations: EnrichedRecommendation[]; total: number; limit: number; offset: number; summary: RecommendationSummary }> {
  const limit = query.limit ?? 50
  const offset = query.offset ?? 0

  if (!isMockSupabase) {
    try {
      const dataQuery = supabase
        .from('ai_recommendations')
        .select('*, products(name, sku_code), locations(name)', { count: 'exact' })
      const statusQuery = supabase.from('ai_recommendations').select('status')

      if (query.status) dataQuery.eq('status', query.status)
      if (query.type) {
        dataQuery.eq('type', query.type)
        statusQuery.eq('type', query.type)
      }
      if (query.productId) {
        dataQuery.eq('product_id', query.productId)
        statusQuery.eq('product_id', query.productId)
      }
      if (query.locationId) {
        dataQuery.eq('location_id', query.locationId)
        statusQuery.eq('location_id', query.locationId)
      }

      // Status breakdown ignores the `status` filter so the header KPI cards
      // always reflect pending/accepted/modified/rejected totals.
      const [{ data, count, error }, statusRes] = await Promise.all([
        dataQuery.order('created_at', { ascending: false }).range(offset, offset + limit - 1),
        statusQuery,
      ])

      if (!error && data) {
        return {
          recommendations: data.map((r) => toEnriched(r)),
          total: count ?? data.length,
          limit,
          offset,
          summary: statusSummary((statusRes.data ?? []) as Array<{ status: string }>),
        }
      }
    } catch {
      // Fall through to memory
    }
  }

  let filtered = [...memoryRecommendations]
  if (query.type) filtered = filtered.filter((r) => r.type === query.type)
  if (query.status) filtered = filtered.filter((r) => r.status === query.status)
  if (query.productId) filtered = filtered.filter((r) => r.product_id === query.productId)
  if (query.locationId) filtered = filtered.filter((r) => r.location_id === query.locationId)

  return {
    recommendations: filtered.slice(offset, offset + limit),
    total: filtered.length,
    limit,
    offset,
    summary: statusSummary(filtered),
  }
}

export async function getRecommendation(id: string): Promise<EnrichedRecommendation | null> {
  if (!isMockSupabase) {
    try {
      const { data, error } = await supabase
        .from('ai_recommendations')
        .select('*, products(name, sku_code), locations(name)')
        .eq('id', id)
        .maybeSingle()
      if (!error && data) return toEnriched(data)
    } catch {
      // Fall through to memory
    }
  }
  return memoryRecommendations.find((r) => r.id === id) ?? null
}

// -----------------------------------------------------------------------------
// 2. INSERT + ALERTS
// -----------------------------------------------------------------------------
export async function insertRecommendation(
  input: CreateAiRecommendationInput,
): Promise<EnrichedRecommendation> {
  const parsed = createAiRecommendationSchema.parse(input)
  const newRecId = randomUUID()

  const dbRow = {
    id: newRecId,
    type: parsed.type,
    product_id: parsed.productId,
    location_id: parsed.locationId ?? null,
    recommended_value: parsed.recommendedValue,
    current_value: parsed.currentValue ?? null,
    reasoning: parsed.reasoning,
    model_used: parsed.modelUsed ?? null,
    confidence: parsed.confidence ?? null,
    input_data: parsed.inputData ?? null,
    expires_at: parsed.expiresAt ?? null,
  }

  let created: Record<string, unknown> | null = null
  if (!isMockSupabase) {
    try {
      const { data, error } = await supabase
        .from('ai_recommendations')
        .insert(dbRow)
        .select('*, products(name, sku_code), locations(name)')
        .single()
      if (!error && data) created = data
    } catch {
      // Fall back to memory
    }
  }

  const memNameMap = mockName(dbRow.product_id, dbRow.location_id ?? '')
  const memoryRow: EnrichedRecommendation = {
    ...aiRecommendationSchema.parse({
      ...dbRow,
      status: 'pending',
      accepted_value: null,
      acted_on_by: null,
      acted_on_at: null,
      rejection_reason: null,
      resulting_po_id: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }),
    product_name: memNameMap.product_name,
    sku_code: memNameMap.sku_code,
    location_name: memNameMap.location_name,
  }
  memoryRecommendations.unshift(memoryRow)

  return created ? toEnriched(created) : memoryRow
}

export async function createRecommendationAlert(rec: EnrichedRecommendation): Promise<void> {
  const title =
    rec.type === 'reorder_quantity'
      ? `Reorder suggestion: ${rec.product_name ?? 'Product'}`
      : `AI recommendation: ${rec.product_name ?? 'Product'}`

  const now = new Date().toISOString()
  if (!isMockSupabase) {
    try {
      await supabase.from('alerts').insert({
        type: 'ai_recommendation',
        priority: 'medium',
        title,
        message: rec.reasoning,
        product_id: rec.product_id,
        location_id: rec.location_id,
        ai_recommendation_id: rec.id,
        target_roles: ['admin'],
        is_resolved: false,
        created_at: now,
      })
      return
    } catch {
      // Fall through to memory
    }
  }

  memoryAlerts.unshift({
    id: randomUUID(),
    type: 'ai_recommendation',
    priority: 'medium',
    title,
    message: rec.reasoning,
    product_id: rec.product_id,
    location_id: rec.location_id,
    po_id: null,
    ai_recommendation_id: rec.id,
    target_roles: ['admin'],
    is_resolved: false,
    resolved_at: null,
    resolved_by: null,
    expires_at: null,
    created_at: now,
  })
}

// -----------------------------------------------------------------------------
// 3. Reference data helpers (supplier, rules, open POs)
// -----------------------------------------------------------------------------
interface PreferredSupplier {
  supplier_id: string
  unit_cost: number | null
  lead_time_days: number
}

async function resolveSupplierForProduct(
  productId: string,
): Promise<PreferredSupplier | null> {
  const defaultLead = await getAppSetting('ai_default_lead_time_days', 7)

  if (!isMockSupabase) {
    try {
      const { data, error } = await supabase
        .from('supplier_products')
        .select('supplier_id, unit_cost, lead_time_override, suppliers!inner(lead_time_days)')
        .eq('product_id', productId)
        .order('is_preferred', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (!error && data) {
        const sup = Array.isArray(data.suppliers) ? data.suppliers[0] : data.suppliers
        return {
          supplier_id: String(data.supplier_id),
          unit_cost: data.unit_cost != null ? Number(data.unit_cost) : null,
          lead_time_days: data.lead_time_override ?? sup?.lead_time_days ?? defaultLead,
        }
      }
    } catch {
      // Fall through to memory
    }
    return null
  }

  const mem = memorySuppliers[productId]
  return mem ? { supplier_id: mem.supplier_id, unit_cost: mem.unit_cost, lead_time_days: mem.lead_time_days } : null
}

interface EffectiveRules {
  safety_stock: number
  reorder_point: number
  target_level: number
  auto_order_enabled: boolean
  auto_approve: boolean
}

async function getEffectiveRules(
  productId: string,
  locationId: string,
): Promise<EffectiveRules> {
  if (!isMockSupabase) {
    try {
      const { data: prod } = await supabase
        .from('products')
        .select('default_safety_stock, default_reorder_point, default_target_level')
        .eq('id', productId)
        .maybeSingle()
      const [locRuleRes, globalRuleRes] = await Promise.all([
        supabase
          .from('safety_stock_rules')
          .select('safety_stock, reorder_point, target_level, auto_order_enabled, auto_approve')
          .eq('product_id', productId)
          .eq('location_id', locationId)
          .maybeSingle(),
        supabase
          .from('safety_stock_rules')
          .select('safety_stock, reorder_point, target_level, auto_order_enabled, auto_approve')
          .eq('product_id', productId)
          .is('location_id', null)
          .maybeSingle(),
      ])
      const locRule = locRuleRes.data
      const globalRule = globalRuleRes.data
      const defaults = {
        safety_stock: Number(prod?.default_safety_stock ?? 0),
        reorder_point: Number(prod?.default_reorder_point ?? 0),
        target_level: Number(prod?.default_target_level ?? 0),
      }
      return {
        safety_stock: Number(locRule?.safety_stock ?? globalRule?.safety_stock ?? defaults.safety_stock),
        reorder_point: Number(locRule?.reorder_point ?? globalRule?.reorder_point ?? defaults.reorder_point),
        target_level: Number(locRule?.target_level ?? globalRule?.target_level ?? defaults.target_level),
        auto_order_enabled: Boolean(locRule?.auto_order_enabled ?? globalRule?.auto_order_enabled ?? false),
        auto_approve: Boolean(locRule?.auto_approve ?? globalRule?.auto_approve ?? false),
      }
    } catch {
      // Fall through to memory
    }
  }

  const key = `${productId}::${locationId}`
  const mem = memoryRules[key]
  if (mem) {
    return {
      safety_stock: mem.reorder_point * 0.5,
      reorder_point: mem.reorder_point,
      target_level: mem.target_level,
      auto_order_enabled: mem.auto_order_enabled,
      auto_approve: false,
    }
  }
  const loc = memoryLocations[locationId]
  if (!loc) {
    return { safety_stock: 0, reorder_point: 0, target_level: 0, auto_order_enabled: false, auto_approve: false }
  }
  const productKey = Object.keys(memoryRules).find((k) => k.startsWith(`${productId}::`))
  const rule = productKey ? memoryRules[productKey] : undefined
  return {
    safety_stock: rule ? rule.reorder_point * 0.5 : 0,
    reorder_point: rule?.reorder_point ?? 100,
    target_level: rule?.target_level ?? 200,
    auto_order_enabled: rule?.auto_order_enabled ?? false,
    auto_approve: false,
  }
}

interface OpenPoInfo {
  id: string
  po_number: string
  status: string
}

async function findOpenPoForProduct(
  productId: string,
  locationId: string,
): Promise<OpenPoInfo | null> {
  if (!isMockSupabase) {
    try {
      const { data: pos } = await supabase
        .from('purchase_orders')
        .select('id, po_number, status')
        .in('status', OPEN_PO_STATUSES)
        .eq('destination_id', locationId)
      const poIds = (pos ?? []).map((p) => p.id)
      if (poIds.length === 0) return null

      const { data: lines } = await supabase
        .from('po_lines')
        .select('po_id, product_id, qty_ordered, qty_received')
        .eq('product_id', productId)
        .in('po_id', poIds)
      const match = (lines ?? []).find(
        (l) => Number(l.qty_ordered) > Number(l.qty_received),
      )
      if (!match) return null
      const po = (pos ?? []).find((p) => p.id === match.po_id)
      return po ? { id: String(po.id), po_number: String(po.po_number), status: String(po.status) } : null
    } catch {
      // Fall through to memory
    }
    return null
  }

  return null // Mock mode has no open-PO visibility in this module.
}

// -----------------------------------------------------------------------------
// 4. REORDER SCAN (auto-order)
// -----------------------------------------------------------------------------
interface ReorderCandidate {
  product_id: string
  product_name: string
  sku_code: string
  location_id: string
  location_name: string
  qty_on_hand: number
  reorder_point: number
  target_level: number
  open_po_qty: number
  forecast_prediction: number | null
  supplier_id: string
  recommended_value: number
  reasoning: string
  model_used: string | null
  confidence: number | null
  auto_approve: boolean
}

export async function generateReorderRecommendations(params: {
  destinationId?: string
  dryRun?: boolean
  actor?: { id?: string; email?: string; role?: Role }
}) {
  const { dryRun = false, actor } = params

  interface InventoryRow {
    product_id: string
    location_id: string
    qty_on_hand: number
    products?: { name?: string; sku_code?: string }
    locations?: { name?: string }
  }

  let inventoryRows: InventoryRow[] = []
  let locationNames = new Map<string, string>()
  let productNames = new Map<string, { name: string; sku_code: string }>()

  if (!isMockSupabase) {
    try {
      const [invRes, locRes, prodRes] = await Promise.all([
        supabase.from('inventory').select('product_id, location_id, qty_on_hand, products(name, sku_code), locations(name)'),
        supabase.from('locations').select('id, name'),
        supabase.from('products').select('id, name, sku_code, status').eq('status', 'active'),
      ])
      inventoryRows = (invRes.data ?? []) as InventoryRow[]
      locationNames = new Map((locRes.data ?? []).map((l) => [String(l.id), String(l.name)]))
      productNames = new Map(((prodRes.data ?? []) as Array<{ id: string; name: string; sku_code: string }>).map((p) => [p.id, { name: p.name, sku_code: p.sku_code }]))
    } catch {
      inventoryRows = []
    }
  }

  if (isMockSupabase) {
    inventoryRows = memoryInventory.map((r) => ({
      ...r,
      products: memoryProducts[r.product_id],
      locations: memoryLocations[r.location_id],
    }))
  }

  const candidates: ReorderCandidate[] = []
  const skippedDuplicates: Array<{ product_id: string; product_name: string; location_id: string; location_name: string; open_po_number: string; open_status: string; qty_on_hand: number; reorder_point: number }> = []
  const unmappedProducts: Array<{ product_id: string; product_name: string; location_id: string; location_name: string; qty_on_hand: number; reorder_point: number }> = []

  for (const row of inventoryRows) {
    const productId = String(row.product_id)
    const locationId = String(row.location_id)
    if (params.destinationId && locationId !== params.destinationId) continue

    const nameInfo = row.products
      ? { name: row.products.name ?? 'Product', sku_code: row.products.sku_code ?? 'SKU' }
      : productNames.get(productId) ?? { name: 'Product', sku_code: 'SKU' }
    const locationName = row.locations?.name ?? locationNames.get(locationId) ?? memoryLocations[locationId]?.name ?? 'Location'

    const rules = await getEffectiveRules(productId, locationId)
    if (row.qty_on_hand > rules.reorder_point) continue
    if (!rules.auto_order_enabled) continue

    const supplier = await resolveSupplierForProduct(productId)
    if (!supplier) {
      unmappedProducts.push({
        product_id: productId,
        product_name: nameInfo.name,
        location_id: locationId,
        location_name: locationName,
        qty_on_hand: row.qty_on_hand,
        reorder_point: rules.reorder_point,
      })
      continue
    }

    const openPo = await findOpenPoForProduct(productId, locationId)
    if (openPo) {
      skippedDuplicates.push({
        product_id: productId,
        product_name: nameInfo.name,
        location_id: locationId,
        location_name: locationName,
        open_po_number: openPo.po_number,
        open_status: openPo.status,
        qty_on_hand: row.qty_on_hand,
        reorder_point: rules.reorder_point,
      })
      continue
    }

    const leadTime = supplier.lead_time_days

    const forecast = await demandForecast({
      productId,
      productName: nameInfo.name,
      skuCode: nameInfo.sku_code,
      locationId,
      horizonDays: leadTime,
    })

    let reorderQty = Math.max(0, rules.target_level - row.qty_on_hand)
    if (forecast && !forecast.insufficient_history) {
      reorderQty = Math.max(reorderQty, forecast.predicted_demand)
    }
    if (reorderQty <= 0) continue

    const reasoning =
      forecast && !forecast.insufficient_history
        ? `Stock (${row.qty_on_hand}) is at/below reorder point (${rules.reorder_point}). Projected ${forecast.predicted_demand} units needed over the ${leadTime}-day lead time; ordering ${reorderQty} units to reach target ${rules.target_level}. ${forecast.reasoning}`
        : `Stock (${row.qty_on_hand}) is at/below reorder point (${rules.reorder_point}). No sufficient sales history; ordering ${reorderQty} units to reach target ${rules.target_level}.`

    candidates.push({
      product_id: productId,
      product_name: nameInfo.name,
      sku_code: nameInfo.sku_code,
      location_id: locationId,
      location_name: locationName,
      qty_on_hand: row.qty_on_hand,
      reorder_point: rules.reorder_point,
      target_level: rules.target_level,
      open_po_qty: 0,
      forecast_prediction: forecast?.insufficient_history ? null : forecast?.predicted_demand ?? null,
      supplier_id: supplier.supplier_id,
      recommended_value: reorderQty,
      reasoning,
      model_used: forecast?.model_used ?? 'deterministic-sma',
      confidence: forecast?.confidence ?? null,
      auto_approve: rules.auto_approve,
    })
  }

  if (dryRun) {
    return {
      dry_run: true,
      scanned_items_count: inventoryRows.length,
      candidates,
      potential_recommendations_count: candidates.length,
      skipped_duplicates: skippedDuplicates,
      unmapped_products: unmappedProducts,
    }
  }

  // Persist recommendations (and auto-accept when the rule allows it).
  let recommendationsCreated = 0
  let poCreated = 0
  const createdRecommendations: ReorderCandidate[] = []

  for (const c of candidates) {
    const rec = await insertRecommendation({
      type: 'reorder_quantity',
      productId: c.product_id,
      locationId: c.location_id,
      recommendedValue: c.recommended_value,
      currentValue: c.qty_on_hand,
      reasoning: c.reasoning,
      modelUsed: c.model_used,
      confidence: c.confidence,
      inputData: {
        qty_on_hand: c.qty_on_hand,
        reorder_point: c.reorder_point,
        target_level: c.target_level,
        lead_time_days: 0,
        open_po_qty: c.open_po_qty,
        auto_order_enabled: true,
      },
    })
    void rec
    recommendationsCreated += 1
    await createRecommendationAlert(rec)
    createdRecommendations.push(c)

    if (c.auto_approve) {
      const outcome = await actOnRecommendation(rec.id, actor ?? { id: 'system', email: 'ai-auto-order', role: 'admin' }, 'accepted')
      if (outcome.purchase_order) poCreated += 1
    }
  }

  return {
    dry_run: false,
    scanned_items_count: inventoryRows.length,
    recommendations_created: recommendationsCreated,
    po_created: poCreated,
    skipped_duplicates: skippedDuplicates,
    unmapped_products: unmappedProducts,
    created_recommendations: createdRecommendations,
  }
}

// -----------------------------------------------------------------------------
// 5. WAREHOUSE STOCK-LEVEL RECOMMENDATIONS
// -----------------------------------------------------------------------------
export async function generateWarehouseRecommendations(): Promise<WarehouseRecommendation[]> {
  const safetyBuffer = await getAppSetting('ai_safety_buffer_pct', 0.2)
  const defaultLead = await getAppSetting('ai_default_lead_time_days', 7)

  interface WarehouseRow {
    id: string
    name: string
    inventory?: Array<{
      product_id: string
      qty_on_hand: number
      products?: { name?: string; sku_code?: string }
    }>
  }

  let warehouses: WarehouseRow[] = []

  if (!isMockSupabase) {
    try {
      const { data } = await supabase
        .from('locations')
        .select('id, name, inventory(product_id, qty_on_hand, products(name, sku_code))')
        .eq('type', 'warehouse')
        .eq('status', 'active')
      warehouses = (data ?? []) as WarehouseRow[]
    } catch {
      warehouses = []
    }
  }

  if (warehouses.length === 0) {
    warehouses = [
      {
        id: 'a1000000-0000-0000-0000-000000000004',
        name: 'Central Warehouse',
        inventory: [
          { product_id: 'd1000000-0000-0000-0000-000000000001', qty_on_hand: 200, products: memoryProducts['d1000000-0000-0000-0000-000000000001'] },
          { product_id: 'd1000000-0000-0000-0000-000000000002', qty_on_hand: 80, products: memoryProducts['d1000000-0000-0000-0000-000000000002'] },
        ],
      },
    ]
  }

  const results: WarehouseRecommendation[] = []

  for (const wh of warehouses) {
    const items = wh.inventory ?? []
    for (const item of items) {
      const productId = String(item.product_id)
      const name = item.products?.name ?? 'Product'
      const sku = item.products?.sku_code ?? 'SKU'
      const onHand = Number(item.qty_on_hand)

      const leadTime = defaultLead
      const horizon = Math.max(1, Math.round(leadTime * (1 + safetyBuffer)))
      const forecast = await demandForecast({
        productId,
        productName: name,
        skuCode: sku,
        locationId: null,
        horizonDays: horizon,
      })

      const rules = await getEffectiveRules(productId, wh.id)
      let recommended: number
      let reasoning: string

      if (forecast && !forecast.insufficient_history) {
        recommended = Math.round(forecast.predicted_demand)
        const lower = rules.target_level > 0 ? rules.safety_stock : 0
        const upper = rules.target_level > 0 ? rules.target_level : recommended * 2
        recommended = Math.max(lower, Math.min(recommended, Math.max(upper, recommended)))
        reasoning = `Based on recent sales, expected ~${forecast.predicted_demand} units over the next ${leadTime}-day lead time + ${Math.round(safetyBuffer * 100)}% buffer. ${forecast.reasoning}`
      } else {
        recommended = rules.target_level > 0 ? rules.target_level : Math.round(onHand * 0.1)
        reasoning = `Insufficient sales history for a statistical forecast; proposing the configured target level (${recommended}).`
      }

      const rec = await insertRecommendation({
        type: 'warehouse_stock_level',
        productId,
        locationId: wh.id,
        recommendedValue: recommended,
        currentValue: onHand,
        reasoning,
        modelUsed: forecast?.model_used ?? null,
        confidence: forecast?.confidence ?? null,
        inputData: { current_stock: onHand, lead_time_days: leadTime, safety_buffer_pct: safetyBuffer },
      })
      await createRecommendationAlert(rec)

      results.push({
        product_id: productId,
        product_name: name,
        sku_code: sku,
        location_id: wh.id,
        location_name: wh.name,
        current_stock: onHand,
        recommended_stock_level: recommended,
        reasoning,
        confidence: forecast?.confidence ?? null,
        model_used: forecast?.model_used ?? null,
      })
    }
  }

  return results
}

// -----------------------------------------------------------------------------
// 6. ACCEPT / MODIFY / REJECT
// -----------------------------------------------------------------------------
function dateDaysFromNow(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

/** Only attach a real profile id to `created_by`; dev/system actors fall back to NULL. */
async function resolveCreatedBy(actorId?: string): Promise<string | null> {
  if (!actorId || isMockSupabase) return null
  try {
    const { data } = await supabase.from('profiles').select('id').eq('id', actorId).maybeSingle()
    return data ? String(data.id) : null
  } catch {
    return null
  }
}

/** po_lines.unit_cost is NOT NULL — fall back to masked cost_price, then 60% of sale_price. */
async function resolveUnitCost(supplier: PreferredSupplier, productId: string): Promise<number> {
  if (supplier.unit_cost != null && Number(supplier.unit_cost) > 0) return Number(supplier.unit_cost)
  if (!isMockSupabase) {
    try {
      const { data } = await supabase.from('products').select('cost_price, sale_price').eq('id', productId).maybeSingle()
      const cost = Number(data?.cost_price)
      if (Number.isFinite(cost) && cost > 0) return cost
      const sale = Number(data?.sale_price)
      if (Number.isFinite(sale) && sale > 0) return Math.round(sale * 0.6)
    } catch {
      // Fall through to 0 (a valid NOT NULL value)
    }
  }
  return 0
}

async function createAutoPurchaseOrder(
  rec: EnrichedRecommendation,
  qty: number,
  actor: { id?: string; email?: string; role?: Role },
  supplier: PreferredSupplier,
): Promise<{ id: string; po_number: string; destination_id: string } | null> {
  if (isMockSupabase) return null

  try {
    const expectedDate = dateDaysFromNow(supplier.lead_time_days)

    const seq = await supabase.rpc('generate_po_number')
    if (seq.error || !seq.data) {
      throw new AppError(500, `Failed to allocate purchase order number: ${seq.error?.message ?? 'no number returned'}`, 'DB_ERROR')
    }

    const { data: po, error: poErr } = await supabase
      .from('purchase_orders')
      .insert({
        po_number: String(seq.data),
        supplier_id: supplier.supplier_id,
        destination_id: rec.location_id,
        source: 'ai_auto',
        status: 'draft',
        expected_date: expectedDate,
        created_by: await resolveCreatedBy(actor?.id),
        ai_recommendation_id: rec.id,
        notes: 'AI-generated reorder from an accepted recommendation.',
      })
      .select('id, po_number, destination_id')
      .single()
    if (poErr || !po) {
      throw new AppError(500, `Failed to create purchase order: ${poErr?.message ?? 'unknown error'}`, 'DB_ERROR')
    }

    const unitCost = await resolveUnitCost(supplier, rec.product_id)
    const { error: lineErr } = await supabase.from('po_lines').insert({
      po_id: po.id,
      product_id: rec.product_id,
      qty_ordered: qty,
      unit_cost: unitCost,
      notes: 'AI reorder',
    })
    if (lineErr) {
      throw new AppError(500, `Failed to write purchase order lines: ${lineErr.message}`, 'DB_ERROR')
    }

    return { id: String(po.id), po_number: String(po.po_number), destination_id: String(po.destination_id) }
  } catch (err) {
    throw new AppError(500, `Failed to create AI purchase order: ${err instanceof Error ? err.message : 'unknown error'}`, 'DB_ERROR')
  }
}

async function applySafetyRuleUpdate(
  rec: EnrichedRecommendation,
  value: number,
): Promise<void> {
  const current = await getEffectiveRules(rec.product_id, rec.location_id ?? '')

  const patch: {
    safety_stock?: number
    reorder_point?: number
    target_level?: number
    auto_order_enabled?: boolean
  } = {}

  if (rec.type === 'warehouse_stock_level') {
    const target = Math.max(value, current.reorder_point, current.safety_stock)
    patch.target_level = target
    patch.auto_order_enabled = current.auto_order_enabled
  } else if (rec.type === 'safety_stock_suggest') {
    const safety = Math.max(0, value)
    const reorder = Math.max(safety, current.reorder_point)
    patch.safety_stock = safety
    patch.reorder_point = reorder
    patch.target_level = Math.max(reorder, current.target_level)
    patch.auto_order_enabled = current.auto_order_enabled
  } else {
    return
  }

  if (isMockSupabase) {
    const key = `${rec.product_id}::${rec.location_id}`
    const existing = memoryRules[key]
    if (existing) {
      Object.assign(existing, patch)
    } else {
      memoryRules[key] = {
        reorder_point: patch.reorder_point ?? 0,
        target_level: patch.target_level ?? 0,
        auto_order_enabled: patch.auto_order_enabled ?? false,
      }
    }
    return
  }

  const { data: existing } = await supabase
    .from('safety_stock_rules')
    .select('id')
    .eq('product_id', rec.product_id)
    .eq('location_id', rec.location_id)
    .maybeSingle()

  if (existing) {
    await supabase
      .from('safety_stock_rules')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', existing.id)
  } else {
    await supabase.from('safety_stock_rules').insert({
      product_id: rec.product_id,
      location_id: rec.location_id,
      safety_stock: patch.safety_stock ?? current.safety_stock,
      reorder_point: patch.reorder_point ?? current.reorder_point,
      target_level: patch.target_level ?? current.target_level,
      auto_order_enabled: patch.auto_order_enabled ?? false,
    })
  }
}

async function markActed(recId: string, patch: Record<string, unknown>): Promise<EnrichedRecommendation | null> {
  if (!isMockSupabase) {
    try {
      const { data, error } = await supabase
        .from('ai_recommendations')
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq('id', recId)
        .select('*, products(name, sku_code), locations(name)')
        .single()
      if (!error && data) {
        const idx = memoryRecommendations.findIndex((r) => r.id === recId)
        if (idx >= 0) memoryRecommendations.splice(idx, 1, toEnriched(data))
        return toEnriched(data)
      }
    } catch {
      // Fall through to memory
    }
  }

  const mem = memoryRecommendations.find((r) => r.id === recId)
  if (!mem) return null
  Object.assign(mem, { ...patch, updated_at: new Date().toISOString() })
  return { ...mem }
}

export async function actOnRecommendation(
  id: string,
  actor: { id?: string; email?: string; role?: Role },
  action: 'accepted' | 'modified' = 'accepted',
  acceptedValue?: number,
): Promise<{ recommendation: EnrichedRecommendation; purchase_order?: { id: string; po_number: string; destination_id: string } | null; message: string }> {
  const rec = await getRecommendation(id)
  if (!rec) {
    throw new AppError(404, 'Recommendation not found', 'NOT_FOUND')
  }
  if (rec.status !== 'pending') {
    throw new AppError(409, 'Recommendation has already been acted upon', 'ALREADY_ACTED')
  }

  const finalValue = acceptedValue !== undefined ? Math.max(0, Math.round(acceptedValue)) : Number(rec.recommended_value)
  const now = new Date().toISOString()
  const actedOnBy = await resolveCreatedBy(actor?.id)
  let purchaseOrder: { id: string; po_number: string; destination_id: string } | null | undefined
  let message: string

  if (rec.type === 'reorder_quantity') {
    const existingOpenPo = await findOpenPoForProduct(rec.product_id, rec.location_id ?? '')
    if (existingOpenPo) {
      message = `An open PO (${existingOpenPo.po_number}) already covers this product at this location; recommendation linked instead of reordering.`
      await markActed(id, {
        status: action,
        accepted_value: finalValue,
        acted_on_by: actedOnBy,
        acted_on_at: now,
        resulting_po_id: existingOpenPo.id,
      })
      return { recommendation: { ...rec, status: action, accepted_value: finalValue, resulting_po_id: existingOpenPo.id }, purchase_order: null, message }
    }

    const supplier = await resolveSupplierForProduct(rec.product_id)
    if (!supplier) {
      throw new AppError(422, 'No supplier is mapped for this product. Map a supplier before accepting.', 'NO_SUPPLIER')
    }

    purchaseOrder = await createAutoPurchaseOrder(rec, finalValue, actor, supplier)
    message = action === 'modified'
      ? `Recommendation modified to ${finalValue} units and accepted. Purchase order ${purchaseOrder?.po_number ?? ''} created.`
      : `Recommendation accepted. Purchase order ${purchaseOrder?.po_number ?? ''} created.`
  } else if (rec.type === 'warehouse_stock_level' || rec.type === 'safety_stock_suggest') {
    await applySafetyRuleUpdate(rec, finalValue)
    message = action === 'modified'
      ? `Recommendation modified to ${finalValue} and applied to safety stock rules.`
      : `Recommendation accepted and applied to safety stock rules.`
  } else {
    message = 'Recommendation accepted (no side-effect action).'
  }

  await markActed(id, {
    status: action,
    accepted_value: finalValue,
    acted_on_by: actedOnBy,
    acted_on_at: now,
    resulting_po_id: purchaseOrder?.id ?? null,
  })

  const updated = await getRecommendation(id)
  return {
    recommendation: updated ?? { ...rec, status: action, accepted_value: finalValue },
    purchase_order: purchaseOrder ?? null,
    message: message || 'Recommendation accepted.',
  }
}

export async function rejectRecommendation(
  id: string,
  actor: { id?: string; email?: string; role?: Role },
  rejectionReason?: string,
): Promise<{ recommendation: EnrichedRecommendation; message: string }> {
  const rec = await getRecommendation(id)
  if (!rec) {
    throw new AppError(404, 'Recommendation not found', 'NOT_FOUND')
  }
  if (rec.status !== 'pending') {
    throw new AppError(409, 'Recommendation has already been acted upon', 'ALREADY_ACTED')
  }

  const actedOnBy = await resolveCreatedBy(actor?.id)
  const updated = await markActed(id, {
    status: 'rejected',
    rejection_reason: rejectionReason?.trim() ? rejectionReason.trim() : null,
    acted_on_by: actedOnBy,
    acted_on_at: new Date().toISOString(),
  })

  return {
    recommendation: updated ?? { ...rec, status: 'rejected' as const, acted_on_by: actor?.id ?? null },
    message: 'Recommendation rejected.',
  }
}

// -----------------------------------------------------------------------------
// 7. DEMAND FORECAST (persisted as a `demand_forecast` recommendation)
// -----------------------------------------------------------------------------
export async function createDemandForecastRecommendation(input: {
  productId: string
  productName: string
  skuCode: string
  locationId?: string | null
  horizonDays: number
}): Promise<{ forecast: ForecastResult | null; recommendation: EnrichedRecommendation | null }> {
  const horizonDays = Math.max(1, Math.round(input.horizonDays))
  const forecast = await demandForecast({
    productId: input.productId,
    productName: input.productName,
    skuCode: input.skuCode,
    locationId: input.locationId,
    horizonDays,
  })

  if (!forecast) {
    return { forecast: null, recommendation: null }
  }

  const recommendation = await insertRecommendation({
    type: 'demand_forecast',
    productId: input.productId,
    locationId: input.locationId,
    recommendedValue: forecast.predicted_demand,
    reasoning: forecast.reasoning,
    modelUsed: forecast.model_used,
    confidence: forecast.confidence,
    inputData: { horizon_days: horizonDays },
  })

  return { forecast, recommendation }
}