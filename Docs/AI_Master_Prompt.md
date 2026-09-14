# AI Master Prompt — Demand Forecasting

Source of truth: `backend/src/modules/ai/ai.engine.ts` (`groqForecast()`,
`demandForecast()`, `loadSalesHistory()`).

> The Groq call is a **single-shot, structured-output completion**: one
> `user` message in, one JSON object out. No system prompt, no history, no
> tools. Every input is fetched and sanitised by the Node service first.

---

## 1a. End-to-end pipeline (linear path)

```
+-----------------------------------------------------------------------------------+
|  POST /api/ai/forecast                          OR        internal scan call      |
|  (productId, locationId?, horizonDays)                     (reorder / warehouse)   |
+-----------------------------------------------------------------------------------+
          |
          v
+-----------------------------------------------------------------------------------+
|  demandForecast(productId, locationId?, horizonDays)                               |
|                                                                                   |
|    windowDays  = app_settings.ai_forecast_window_days      (default 90)           |
|    minDays     = app_settings.ai_forecast_min_days         (default 14)           |
|    horizonDays = max(1, round(input.horizonDays))                                  |
+-----------------------------------------------------------------------------------+
          |
          v
+-----------------------------------------------------------------------------------+
|  loadSalesHistory(productId, locationId, windowDays)                               |
|                                                                                   |
|    sale_lines JOIN sales                                                          |
|      WHERE product_id = ?                                                         |
|        AND sales.status = 'active'            (non-voided only)                   |
|        AND sales.sale_datetime >= now - windowDays                                |
|        AND sales.store_id = ?                (when locationId given)              |
|                                                                                   |
|    aggregate ->  daily { date, qty }         (oldest -> newest)                   |
+-----------------------------------------------------------------------------------+
          |
          v
        BRANCH  (see 1b)
          |
          v
+-----------------------------------------------------------------------------------+
|  ForecastResult emitted downstream                                                 |
|                                                                                   |
|    reorder scan  ->  candidate recommended_value (reorder quantity)               |
|    warehouse scan->  candidate target stock level                                 |
|    /forecast     ->  persisted as demand_forecast recommendation + alert          |
+-----------------------------------------------------------------------------------+
```

## 1b. The decision / fallback branch

```
              +--------------------------------------------------------+
              |              history.length == 0 ?                      |
              +--------------------------------------------------------+
                        |                              |
                    YES |                              | NO
                        v                              v
              (no forecast,                       +------------------------------+
               return null)                      |  history >= minDays          |
                                                 |  AND GROQ_API_KEY present?   |
                                                 +------------------------------+
                                                          |            |
                                                       YES|            | NO
                                                          v            v
                                                 +----------------+   +---------------+
                                                 | groqForecast() |   |  SMA fallback |
                                                 |                |   |  (bare)       |
                                                 |  slice last 30 |   |  deterministic|
                                                 |  build prompt  |   +---------------+
                                                 |  POST Groq     |           |
                                                 |  12s / 0.2 /  |           |
                                                 |  json_object   |           |
                                                 +-------+--------+           |
                                                         |                    |
                                        success (valid)  |                    |
                                                         v                    |
                                                 +-----------------------+      |
                                                 |  ForecastResult       |      |
                                                 |  sourced_from_ai=true |      |
                                                 +-----------------------+      |
                                                         |                    |
                                          any failure (no key / HTTP !== 2xx /
                                          empty body / bad JSON / bad forecast)
                                                                  |            |
                                                                  v            |
                                                        +----------------+     |
                                                        | SMA fallback   |<----+
                                                        | (retry path)   |
                                                        +----------------+
                                                                   |
                                                                   v
     +---------------------------------------------------------------------------------+
     |                        ForecastResult  (always well-formed)                       |
     |                                                                                 |
     |   model_used        =  "<GROQ_MODEL> (Groq)"   |   "deterministic-sma"          |
     |   sourced_from_ai   =  true                    |   false                        |
     |   confidence        =  clamped [0,1] or null   |   coverage-based (>= 0.1)      |
     |   insufficient_hist =  false                   |   true (when empty window)     |
     +---------------------------------------------------------------------------------+
```

## 2. Prompt construction (the exact assembly)

Six parts funnel into a single `user` message:

```
 +----------------------+        +----------------------+
 | Part 1 - IDENTITY    |        | Part 2 - PRODUCT     |
 | "You are a retail    |        | "Product: <name>     |
 |  demand forecasting  |        |          (SKU <sku>)"|
 |  assistant for a     |        +----------------------+
 |  multi-store retail  |                   |
 |  chain."             |                   |
 +----------------------+                   |
        |                                   |
        +----------------+------------------+
                         |
                         v
 +----------------------+        +----------------------+
 | Part 3 - HORIZON     |        | Part 4 - HISTORY     |
 | "Forecast the demand |        | "Daily units sold    |
 |  over the next       |        |  over the past       |
 |  <horizonDays> days."|        |  <windowDays> days   |
 +----------------------+        |  (may be sparse):"   |
        |                        |  "                   |
        |                        |   <JSON series>"     |
        |                        +----------------------+
        |                                   |
        +----------------+------------------+
                         |
                         v
 +-----------------------------------------------------------+
 | Part 5 - GUIDANCE                                          |
 | "Estimate a realistic number. Prefer continuity over      |
 |  spikes; round to a whole number."                        |
 +-----------------------------------------------------------+
                         |
                         v
 +-----------------------------------------------------------+
 | Part 6 - OUTPUT CONTRACT                                  |
 | "Respond with JSON only:                                   |
 |    {\"predicted_demand\": number,                          |
 |     \"reasoning\": string,                                 |
 |     \"confidence\": number between 0 and 1}"               |
 +-----------------------------------------------------------+
                         |
                         v
 +-----------------------------------------------------------+
 |  the single `user` message = concatenation of parts 1-6  |
 |                                                           |
 |  `messages: [{ role: "user", content: <that text> }]`     |
 |  `model: GROQ_MODEL`  `temperature: 0.2`                  |
 |  `response_format: { type: "json_object" }`               |
 |  `timeout: 12_000 ms`                                     |
 +-----------------------------------------------------------+
```

Input notes:
- `series` = the **last 30** history points as `[{date, qty}, ...]`, newest last.
- `<horizonDays>` = scan's lead-time horizon (reorder) or
  `lead × (1 + safety buffer)` (warehouse).
- `<windowDays>` = from `app_settings` (default 90).

## 3. Output contract & validation

```
              +--------------------------------------------------+
              |  RAW response from Groq (json_object mode)        |
              |  {"predicted_demand": 84.6, "reasoning": "...",   |
              |   "confidence": 0.87}                             |
              +--------------------------------------------------+
                                |  JSON.parse
                                v
   +--------------------------+   +--------------------------+   +--------------------------+
   | predicted_demand          |   | confidence                |   | reasoning                |
   +--------------------------+   +--------------------------+   +--------------------------+
   |  Number(value)            |   |  Number(value)            |   |  typeof === 'string'     |
   +--------------------+-----+   +--------------------+-----+   +----+---------------------+
                        |                        |                        |
                        v                        v                        v
   +--------------------------+   +--------------------------+   +--------------------------+
   |  finite AND >= 0 ?       |   |  finite ?                 |   |  trim() non-empty ?      |
   +--------------------------+   +--------------------------+   +--------------------------+
        |           |                   |            |                   |            |
       NO|          YES|               NO|            YES|              NO|            YES|
        v            v                   v            v                   v            v
   +----------+   +------------+   +------------+   +----------+   +------------+   +------------+
   | THROW    |   | Math.ceil  |   | confidence |   | clamp to |   | default    |   | keep       |
   | invalid  |   | (whole int)|   | = null     |   | [0,1] 2dp|   | "No       |   | (trimmed)  |
   | forecast |   +------------+   +------------+   +----------+   | explanation|   +------------+
   +----------+        |                |                |         | provided." |
       (->SMA)         +----------------+-------+--------+         +------------+
                                              |
                                              v
   +------------------------------------------------------------------------------+
   |                         ForecastResult (sanitised)                            |
   |   predicted_demand : whole number >= 1                                        |
   |   confidence       : number in [0,1] OR null                                 |
   |   reasoning        : non-empty trimmed string                                 |
   |   model_used       : "<GROQ_MODEL> (Groq)"    sourced_from_ai : true          |
   +------------------------------------------------------------------------------+
```

Any failure in the box below **throws** and the caller falls back to the
deterministic SMA (`AI_Flows_and_Conditions.md` §1):

```
  GROQ_API_KEY missing
  HTTP status != 2xx            (e.g. 404 model_not_found on old model id)
  empty content body
  JSON.parse failure
  predicted_demand not finite or < 0
```

## 4. Degradation & attribution

```
   +--------------------------------------------------------------+
   |   SUCCESS path (Groq)           |   FALLBACK path (SMA)      |
   +--------------------------------------------------------------+
   |   model_used  = "<MODEL>(Groq)" |   model_used =             |
   |                                  |     "deterministic-sma"    |
   |   sourced_from_ai = true        |   sourced_from_ai = false  |
   |   confidence     = number in [0,1] |   confidence = cover-      |
   |                    or null      |     age-based, >= 0.1      |
   +--------------------------------------------------------------+
```

The LLM is **never** called when:
1. `GROQ_API_KEY` is not configured,
2. sales history `< ai_forecast_min_days` (default 14) — SMA runs directly,
3. sales history is empty — `demandForecast()` returns `null`, and the caller
   falls back to target-level shortfall / configured targets (no LLM, no SMA).