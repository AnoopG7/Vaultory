# AI Tools — what the model can actually call

> **Current state: the LLM (Groq) has NO tool-calling.** The integration is a
> single-shot, structured-output completion — one `user` message in, one JSON
> object out. No functions exposed to the model, no agent loop, no side
> effects available to it.

## 1. The boundary

```
+-------------------------------------------------------------------------+
|                                                                         |
|                          WHAT THE MODEL CAN SEE                         |
|   +-----------------------------------------------------------------+   |
|   |                                                                 |   |
|   |   product name + SKU                                            |   |
|   |   last 30 days of daily sales (sparse)                          |   |
|   |   horizon + window lengths, advisory frame                      |   |
|   |                                                                 |   |
|   |   (only what the service chooses to put in the prompt)          |   |
|   |                                                                 |   |
|   +-------^---------------------------------^-----------------------+   |
|           | INPUT                           | OUTPUT                     |
|           |                                 v                            |
|   +-------+----------------------------------------+--------------------+|
|   |                 THE LLM                       |                     ||
|   |   one structured response:                    |                     ||
|   |   {predicted_demand, reasoning, confidence}   |                     ||
|   |                                               |                     ||
|   |   NO database  NO filesystem  NO network      |                     ||
|   |   NO write tools  NO tool loop                |                     ||
|   +-------+----------------------------------------+--------------------+|
|           |                                                             |
+-------------------------------------------------------------------------+
           |
           | (just text in / text out)
           v
+-------------------------------------------------------------------------+
|                     THE NODE SERVICE (all real work)                    |
|                                                                         |
|   reads   -> sales, inventory, rules, suppliers, settings (PostgREST)   |
|   writes  -> ai_recommendations, alerts, safety_stock_rules,            |
|              purchase_orders, po_lines                                  |
|   decides -> accept/modify/reject gating, auto_approve, PO creation     |
+-------------------------------------------------------------------------+
```

Key point: the *only* message the model has ever seen is the prompt in
`AI_Master_Prompt.md`. Everything the user perceives as "AI capability" is
Node code running around that single call.

## 2. Capability map — the service-side "tools"

The deterministic operations that surround the one LLM call:

```
                        +-------------------------+
                        |         UI / user        |
                        +-------------------------+
                                   |
                                   v
+--------------------------------------------------------------------------+
|                         ai.store.ts / ai.routes.ts                        |
|                                                                          |
|        +-----------------------------+   +---------------------------+    |
|        | READ TOOLS                  |   | WRITE / ACTION TOOLS      |    |
|        +-----------------------------+   +---------------------------+    |
|        | 1. loadSalesHistory        |   | A. generate_po_number    |    |
|        |    (sale_lines x sales)    |   |    (RPC, PO numbering)   |    |
|        | 2. getAppSetting           |   | B. insert purchase_orders|    |
|        |    (window/min/buffer/lead)|   |    + po_lines (ai_auto)  |    |
|        | 3. getEffectiveRules       |   | C. applySafetyRuleUpdate |    |
|        |    (safety/reorder/target, |   |    (safety_stock_rules   |    |
|        |     auto_order, auto_approve)|  |     upsert)             |    |
|        | 4. resolveSupplierForProduct|  | D. insertRecommendation |    |
|        |    (preferred, lead, cost) |   |    (all 4 rec types)    |    |
|        | 5. findOpenPoForProduct    |   | E. createRecommendationAlert|  |
|        |    (open status, qty<qty_ord)|  |    (alerts row)         |    |
|        | 6. resolveCreatedBy        |   | F. markActed             |    |
|        |    (profile UUID or NULL)  |   |    (accept/modify/reject)   |    |
|        | 7. resolveUnitCost         |   +---------------------------+    |
|        |    (supplier -> cost ->60%)|                                    |
|        +-----------------------------+                                    |
|                                                                          |
| +------------------------------------------------------------------------+|
| | ONLY the signal the model can influence:                               ||
| | a ForecastResult (used to size recommendations).                       ||
| +------------------------------------------------------------------------+|
+--------------------------------------------------------------------------+
        |                                                        |
        v                                                        v
+-----------------+                                     +----------------------+
| GROQ            |                                     | SUPABASE (Postgres)  |
| chat/completions|                                     | (service-role, RLS   |
| (stateless)     |                                     |  bypassed per SRS)   |
+-----------------+                                     +----------------------+
```

## 3. Request / response contract (what a "call" is)

```
USER                                 SERVICE                              GROQ
  |                                     |                                    |
  | POST /api/ai/forecast               |                                    |
  |------------------------------------>|                                    |
  |                                     | demandForecast(productId, ...)     |
  |                                     |  history = loadSalesHistory()      |
  |                                     |  history.length >= minDays?        |
  |                                     |  +-- NO -> SMA (never call Groq)   |
  |                                     |  +-- YES--> chat.completions        |
  |                                     |----------------------------------->|
  |                                     |          (single user message      |
  |                                     |           response_format json)     |
  |                                     |<-----------------------------------|
  |                                     |  validate -> ForecastResult        |
  |   {recommendation, ...}            |                                    |
  |<------------------------------------|                                    |
```

Roles:
- The model is a pure **function** `input -> {predicted_demand, reasoning,
  confidence}`.
- The service owns **persistence, permissions, and gating**.
- The service owns **all fallbacks** (SMA), since the model may fail at any time.

## 4. Why no tool-calling (current rationale)

```
+---------------------------------------------------------------------+
| 1. ADVISORY-ONLY requirement : a model with write tools contradicts  |
|    the guardrail that AI never changes stock without a human gate.   |
|                                                                    |
| 2. LATENCY & COST            : one JSON completion is fast/cheap;   |
|    a tool-fetch loop multiplies round trips.                        |
|                                                                    |
| 3. DETERMINISM               : SMA fallback + JSON contract give    |
|    reproducible, testable behaviour without an agent loop.          |
|                                                                    |
| 4. SECURITY                  : zero SQL / FS / network surface on   |
|    the model side.                                                  |
+---------------------------------------------------------------------+
```

## 5. Possible future (summarised, not implemented)

```
+---------------------------------------------------------------------+
| IF richer analysis is wanted later:                                 |
|                                                                    |
|   expose READ-ONLY tools to Groq function-calling:                 |
|     - get_app_setting        - get_sales_history                   |
|     - get_inventory_snapshot - get_safety_rules                    |
|                                                                    |
|   still under service RBAC, all mutations stay in the service,     |
|   advisory gate + SMA fallback must be preserved.                  |
|   The model never gains write or external-network tools.           |
+---------------------------------------------------------------------+
```