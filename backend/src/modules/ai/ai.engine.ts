import { env, supabase } from '../../config/index.js'

/**
 * AI forecasting engine (SRS §8.3).
 *
 * Deterministic inputs (recent sales, window = 90 days default, min 14 days
 * required) are passed to Groq (LLM inference); if the Groq API key is missing,
 * rate-limited, or returns unusable output, we fall back to a simple moving
 * average computed here in Node. AI is advisory — core inventory/sales/alerts
 * never depend on the LLM (SRS §8.4).
 */

const DAY_MS = 86_400_000
const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions'
const GROQ_MODEL = env.GROQ_MODEL
const GROQ_TIMEOUT_MS = 12_000

export interface DemandHistoryPoint {
  date: string
  qty: number
}

export interface ForecastResult {
  predicted_demand: number
  confidence: number | null
  reasoning: string
  model_used: string | null
  sourced_from_ai: boolean
  insufficient_history?: boolean
}

const isMockSupabase =
  !env.SUPABASE_URL ||
  env.SUPABASE_URL.includes('mock') ||
  env.SUPABASE_URL.includes('localhost')

/**
 * Read a numeric app_setting (stored as JSONB), falling back to the default.
 */
export async function getAppSetting(key: string, fallback: number): Promise<number> {
  try {
    const { data, error } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', key)
      .maybeSingle()
    if (error || !data) return fallback
    const value = Number(data.value)
    return Number.isFinite(value) ? value : fallback
  } catch {
    return fallback
  }
}

/**
 * Daily sold quantity for a product over the last `windowDays` (only active,
 * non-voided sales). `locationId` narrows to a store location when provided.
 * Returns one point per day, oldest first — or [] when there is no history.
 */
export async function loadSalesHistory(
  productId: string,
  locationId: string | null | undefined,
  windowDays: number,
): Promise<DemandHistoryPoint[]> {
  const startIso = new Date(Date.now() - windowDays * DAY_MS).toISOString()

  if (!isMockSupabase) {
    try {
      let storeId: string | null = null
      if (locationId) {
        const { data: loc } = await supabase
          .from('locations')
          .select('store_id')
          .eq('id', locationId)
          .maybeSingle()
        storeId = loc?.store_id ?? null
      }

      let q = supabase
        .from('sale_lines')
        .select('qty, sales!inner(sale_datetime, status, store_id)')
        .eq('product_id', productId)
        .eq('sales.status', 'active')
        .gte('sales.sale_datetime', startIso)

      if (storeId) {
        q = q.eq('sales.store_id', storeId)
      }

      const { data, error } = await q
      if (error) return []
      if (!data || data.length === 0) return []

      const daily = new Map<string, number>()
      for (const row of data) {
        const sale = Array.isArray(row.sales) ? row.sales[0] : row.sales
        if (!sale?.sale_datetime) continue
        const day = String(sale.sale_datetime).slice(0, 10)
        daily.set(day, (daily.get(day) ?? 0) + Number(row.qty) || 0)
      }

      return [...daily.entries()]
        .map(([date, qty]) => ({ date, qty }))
        .sort((a, b) => a.date.localeCompare(b.date))
    } catch {
      return []
    }
  }

  // Mock/local mode: no in-memory sales history is shared with this module,
  // so forecasting degrades to "insufficient history" (SRS §8.1 edge case).
  return []
}

/**
 * Deterministic fallback: simple moving average scaled to the horizon.
 * Used when Groq is unavailable or when history is too thin for the LLM.
 */
export function computeMovingAverageForecast(
  history: DemandHistoryPoint[],
  horizonDays: number,
  windowDays: number,
): ForecastResult {
  const cutoff = Date.now() - windowDays * DAY_MS
  const inWindow = history.filter((p) => new Date(p.date).getTime() >= cutoff)

  if (inWindow.length === 0) {
    return {
      predicted_demand: 0,
      confidence: null,
      reasoning: `Insufficient sales history for this product in the last ${windowDays} days. Falling back to target-level shortfall.`,
      model_used: 'deterministic-sma',
      sourced_from_ai: false,
      insufficient_history: true,
    }
  }

  const totalQty = inWindow.reduce((sum, p) => sum + p.qty, 0)
  const dailyMean = totalQty / inWindow.length
  const predictedDemand = Math.max(0, Math.ceil(dailyMean * horizonDays))

  // Confidence grows with history coverage (cap at a 30-day sample).
  const coverage = Math.min(1, inWindow.length / Math.min(windowDays, 30))
  const confidence = Math.max(0.1, Math.round(coverage * 100) / 100)

  return {
    predicted_demand: predictedDemand,
    confidence,
    reasoning: `Simple moving average over ${inWindow.length} days of sales (mean ${dailyMean.toFixed(2)}/day) projected over a ${horizonDays}-day horizon.`,
    model_used: 'deterministic-sma',
    sourced_from_ai: false,
    insufficient_history: false,
  }
}

interface GroqRequest {
  productId: string
  productName: string
  skuCode: string
  history: DemandHistoryPoint[]
  horizonDays: number
  windowDays: number
}

/**
 * Ask Groq for a demand forecast. Advisory only — any failure throws and the
 * caller falls back to the deterministic moving average.
 */
async function groqForecast(req: GroqRequest): Promise<ForecastResult> {
  if (!env.GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY is not configured')
  }

  const series = req.history.slice(-30).map((p) => ({ date: p.date, qty: p.qty }))
  const prompt = [
    'You are a retail demand forecasting assistant for a multi-store retail chain.',
    `Product: ${req.productName} (SKU ${req.skuCode}).`,
    `Forecast the demand over the next ${req.horizonDays} days.`,
    `Daily units sold over the past ${req.windowDays} days (may be sparse):`,
    JSON.stringify(series),
    'Estimate a realistic number. Prefer continuity over spikes; round to a whole number.',
    'Respond with JSON only: {"predicted_demand": number, "reasoning": string, "confidence": number between 0 and 1}.',
  ].join('\n')

  const res = await fetch(GROQ_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      temperature: 0.2,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
    }),
    signal: AbortSignal.timeout(GROQ_TIMEOUT_MS),
  })

  if (!res.ok) {
    throw new Error(`Groq API returned HTTP ${res.status}`)
  }

  const body = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>
  }
  const content = body.choices?.[0]?.message?.content
  if (!content) {
    throw new Error('Groq API returned an empty response')
  }

  const parsed = JSON.parse(content) as {
    predicted_demand?: unknown
    reasoning?: unknown
    confidence?: unknown
  }
  const predicted = Number(parsed.predicted_demand)
  if (!Number.isFinite(predicted) || predicted < 0) {
    throw new Error('Groq API returned an invalid forecast')
  }

  const confidence = Number(parsed.confidence)
  return {
    predicted_demand: Math.ceil(predicted),
    confidence: Number.isFinite(confidence)
      ? Math.max(0, Math.min(1, Number(confidence.toFixed(2))))
      : null,
    reasoning:
      typeof parsed.reasoning === 'string' && parsed.reasoning.trim()
        ? parsed.reasoning.trim()
        : 'No explanation provided.',
    model_used: `${GROQ_MODEL} (Groq)`,
    sourced_from_ai: true,
    insufficient_history: false,
  }
}

/**
 * Lead demand forecast for a product. Returns null when there is insufficient
 * history for either the LLM or the deterministic fallback (SRS §8.1 allows
 * orders to proceed on `target_level − on_hand` in that case).
 */
export async function demandForecast(input: {
  productId: string
  productName: string
  skuCode: string
  locationId?: string | null
  horizonDays: number
  windowDays?: number
}): Promise<ForecastResult | null> {
  const windowDays = input.windowDays ?? (await getAppSetting('ai_forecast_window_days', 90))
  const minDays = await getAppSetting('ai_forecast_min_days', 14)

  const history = await loadSalesHistory(input.productId, input.locationId, windowDays)
  if (history.length === 0) {
    return null
  }

  const horizonDays = Math.max(1, Math.round(input.horizonDays))
  const base = { ...input, history, horizonDays, windowDays }

  if (history.length >= minDays) {
    try {
      return await groqForecast(base)
    } catch {
      // Degrade gracefully to the deterministic fallback (SRS §8.3/§8.4).
    }
  }

  return computeMovingAverageForecast(history, horizonDays, windowDays)
}

export { GROQ_MODEL }