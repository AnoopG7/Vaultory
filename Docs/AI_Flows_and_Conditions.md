# AI Flows & Conditions

Logic lives in `backend/src/modules/ai/` (`ai.engine.ts`, `ai.store.ts`,
`ai.routes.ts`). Supabase is used strictly as Postgres; RBAC is enforced in the
Express service, which writes with the **service-role** client (bypasses RLS).
Groq is advisory — no stock-affecting mutation happens unless a human accepts /
modifies / rejects, or a rule is flagged `auto_approve`.

## 0. Overview

```
                        +---------------------------------------------+
                        |                BROWSER / UI                 |
                        |  /auto-order page  +  purchase-orders page  |
                        +---------------------------------------------+
                                            |
                                            | HTTP (JWT / dev token)
                                            v
+-------------------------------------------------------------------------+
|                          EXPRESS SERVICE  (port 4000)                    |
|                                                                          |
|  ai.routes.ts  --->  ai.store.ts (scans, forecasts, act/reject logic)    |
|                              |                           |               |
|              +---------------+              +-------------+------------+  |
|              | service-role client         | service-role client       |  |
|              v                             v                           |  |
|  +-------------------------------+  +---------------------------+       |  |
|  |  GROQ (external LLM)          |  |  SUPABASE / POSTGRES      |       |  |
|  |  single structured response   |  |  inventory, rules,        |       |  |
|  |  (advisory only)              |  |  sales, POs, alerts,      |       |  |
|  +-------------------------------+  |  ai_recommendations       |       |  |
|                                     +---------------------------+       |  |
+-------------------------------------------------------------------------+
                    |
                    | AI NEVER mutates stock directly
                    | (except auto_approve after service logic)
```

## 1. Demand forecast trigger

Endpoints: `POST /api/ai/forecast` (manual) and the internal
`createDemandForecastRecommendation()` used by scans.

```
START
  |
  v
+------------------------------------------+
| clamp horizonDays = max(1, round(input)) |
+------------------------------------------+
  |
  v
+------------------------------------------+
| demandForecast(productId, locationId?)   |
|                                          |
|  windowDays <- ai_forecast_window_days(90)
|  minDays    <- ai_forecast_min_days (14)
+------------------------------------------+
  |
  v
+------------------------------------------+      +-------------------------------+
| loadSalesHistory(...)                    |      | sales = SALE_LINES x SALES    |
| SPARSE daily {date, qty} for window      |----->|  WHERE active & non-voided   |
+------------------------------------------+      |   AND datetime >= now-window |
  |                                             +-------------------------------+
  v
+----------------------+
| history.length == 0? |
+----------------------+
  |        |
  |YES     |NO
  v        v
 null   +----------------------------+
 (no     | history >= minDays        |
 rec)    | AND GROQ_API_KEY set?     |
         +----------------------------+
           |        |
           |YES     |NO
           v        v
  +----------------+   +-----------------+
  |  groqForecast  |   |  SMA fallback   |
  |  (try/catch)   |   |  (deterministic)|
  |  any error ----+-->|                 |
  +----------------+   +-----------------+
           |                 |
           |                 +------------------+
           |                                    |
           v                                    v
  +------------------------------------------------------+
  | ForecastResult: predicted_demand, confidence,         |
  | reasoning, model_used, sourced_from_ai               |
  +------------------------------------------------------+
           |
           v (only on success)
  +-----------------------------------------------+
  | persist demand_forecast recommendation        |
  |   recommended_value = predicted_demand        |
  |   current_value    = NULL                     |
  | raise ai_recommendation alert (target admin)  |
  +-----------------------------------------------+
```

## 2. Reorder scan / auto-order

Endpoint: `POST /api/ai/auto-order` (`dryRun` optional, `destinationId`
optional).

```
START
  |
  v
+-------------------------------------------------------+
| load inventory (product x location, qty_on_hand)      |
| load locations + active products                      |
+-------------------------------------------------------+
  |
  v
FOR EACH (product, location) row
  |
  +---> +--------------------------------------------------+
        | destinationId set AND location != destination?   |
        +--------------------------------------------------+
                  /                       \
                YES/                         \NO
                  v                           v
             (skip row)            +----------------------------+
                                   | qty_on_hand > reorder_point|
                                   |  (getEffectiveRules)       |
                                   +----------------------------+
                                             /               \
                                            /YES             \NO
                                            v                 v
                                       (skip row)  +---------------------------+
                                                   | auto_order_enabled?       |
                                                   +---------------------------+
                                                           /            \
                                                         /YES            \NO
                                                         v                v
                                          +--------------------------+  (skip row)
                                          | resolveSupplierForProduct|
                                          +--------------------------+
                                                  /           \
                                          NO supplier /          \ supplier found
                                                  v               v
                              +--------------------------------+  +----------------------+
                              | unmapped_products bucket      |  | findOpenPoForProduct |
                              +--------------------------------+  +----------------------+
                                                                         /        \
                                                                   open PO/          \ none
                                                                         v           v
                                             +----------------------------+   +------------+
                                             | skipped_duplicates bucket  |   | demandForecast
                                             +----------------------------+   | horizon =  |
                                                                              | lead_time  |
                                                                              +------------+
                                                                                    |
                                                                                    v
                                                                       +------------------------+
                                                                       | reorderQty = max(0,    |
                                                                       |   target - on_hand)    |
                                                                       | if forecast usable:    |
                                                                       |   reorderQty = max(    |
                                                                       |   reorderQty, pred)    |
                                                                       +------------------------+
                                                                                    |
                                                                          reorderQty <= 0?
                                                                                    /\
                                                                                 YES/  \NO
                                                                                   v    v
                                                                             (skip row) +---------+
                                                                                        | candidate|
                                                                                        +---------+
```

OUTCOME:

```
+----------------------------CANDIDATES----------------------------+
| {product, location, qty_on_hand, reorder_point, target_level,    |
|  supplier, recommended_value, forecast_prediction, reasoning,    |
|  model_used, confidence, auto_approve}                           |
+------------------------------------------------------------------+
                    |
        +-----------+-----------+
        |                       |
     dryRun=TRUE             dryRun=FALSE
        |                       |
        v                       v
+-------------------------+  +--------------------------------------------------+
| RETURN candidates       |  | for each candidate:                              |
| NO writes to DB         |  |   insert ai_recommendations (type reorder_qty)   |
|                         |  |   raise alert (target admin)                    |
+-------------------------+  |                                                 |
                             |   if rule.auto_approve:                         |
                             |       actOnRecommendation(..., 'accepted')     |
                             |         as 'system' actor                       |
                             |       ^-> creates an ai_auto PO immediately     |
                             +--------------------------------------------------+
                                                            |
                                                            v
                                            +---------------------------------------------+
                                            | response: recommendations_created,          |
                                            | po_created, skipped_duplicates,             |
                                            | unmapped_products, created_recommendations  |
                                            +---------------------------------------------+
```

Conditions that PREVENT a candidate (in order):

```
  1. qty_on_hand > reorder_point ......... not below threshold
  2. auto_order_enabled = false .......... rule opts out
  3. no preferred supplier ............... goes to unmapped_products (422-later)
  4. open PO already covers item ......... goes to skipped_duplicates
  5. reorderQty <= 0 after forecast ...... nothing to order
```

## 3. Warehouse stock-level scan

Endpoint: `GET /api/ai/warehouse-recommendations`.

```
START
  |
  v
+---------------------------------------------+
| ai_safety_buffer_pct (default 0.20)         |
| ai_default_lead_time_days (default 7)       |
+---------------------------------------------+
  |
  v
+---------------------------------------------+
| load ACTIVE warehouses with inventory embed |
+---------------------------------------------+
  |
  v
FOR EACH warehouse item
  |
  +->  horizon = lead_time x (1 + safety_buffer)
  |    forecast(productId, locationId = NULL)   <- warehouse-level, not store
  |
  +--+------------------- YES --------> recommended = predicted_demand
     | forecast usable?                       clamp to [safety_stock,
     |                                         max(target_level, pred*2)]
     |
     +------ NO ---------------------> recommended = target_level
                                          (or 10% of on_hand if no target)
  |
  v
+---------------------------------------------+
| insert recommendation (type warehouse_stock) |
| raise alert                                  |
| push {product, recommended_stock_level,...}  |
+---------------------------------------------+
  |
  v
SUMMARY list returned
```

> This scan NEVER creates a PO or moves stock — it only proposes target levels
> for review.

## 4. Accept / Modify (actions with side effects)

Endpoints: `POST /api/ai/recommendations/:id/accept` and `.../modify`
(`admin` role; body uses camelCase `acceptedValue`).

```
START (admin, role-checked)
  |
  v
+----------------------------------+
| getRecommendation(id)            |
+----------------------------------+
  |
  +-- rec == null ---------------> 404 NOT_FOUND
  |
  +-- rec.status != 'pending' ---> 409 ALREADY_ACTED
  |
  v
finalValue = acceptedValue (>= 0, rounded)  OR  recommended_value
  |
  v
+--------------------------------------------------+  (branch by rec.type)
| reorder_quantity?                                |
+--------------------------------------------------+
        |
        v
+--------------------------------------------+   +----------------------------+
| open PO already covers product+location?   |   |                          |
+--------------------------------------------+   |                          |
     |              |                            |                          |
  YES|              |NO                          |                          |
     v              v                            |                          |
+----------------+  +--------------------------+ |                          |
| link rec to    |  | resolve preferred supplier| |                          |
| EXISTING PO     |  +--------------------------+ |                          |
| NO new order    |     |                        |                          |
+----------------+     |NO supplier             |                          |
                       v                        |                          |
                 422 NO_SUPPLIER                |                          |
                       |                        |                          |
                       v YES                    |                          |
              +---------------------------+     |                          |
              | createAutoPurchaseOrder   |     |                          |
              |  1. generate_po_number    |     |                          |
              |     (RPC)                 |     |                          |
              |  2. insert purchase_orders|     |                          |
              |     source=ai_auto        |     |                          |
              |     status=draft          |     |                          |
              |     expected=today+lead   |     |                          |
              |  3. insert po_lines       |     |                          |
              |     unit_cost=resolve     |     |                          |
              +---------------------------+     |                          |
                       |                        |                          |
                       v                        v                          |
+--------------------------------------------------+                      |
| warehouse_stock_level  /  safety_stock_suggest?  |<---------------------+
+--------------------------------------------------+
        |
        v
+--------------------------------------------+
| applySafetyRuleUpdate(rec, finalValue)     |
|   upsert safety_stock_rules               |
|   target_level = finalValue               |
|   (safety_stock / reorder_point kept)     |
+--------------------------------------------+
        |
        v
+--------------------------------------------+      (fall through: any other)
| markActed(recId, {status: accepted|modified, accepted_value, acted_on_at, |
|            acted_on_by: resolveCreatedBy(actor) -> real UUID or NULL,     |
|            resulting_po_id})                                              |
+--------------------------------------------+
        |
        v
+------------------------------------------------+
| response: {recommendation (enriched),          |
|            purchase_order (reorder only),      |
|            message: "[...] PO <nr> created."}  |
+------------------------------------------------+
```

Close-up of PO creation (`createAutoPurchaseOrder`):

```
+---------------------------------------------------------------+
| 1) supabase.rpc('generate_po_number')            -> po_number  |
| 2) INSERT purchase_orders                                     |
|      po_number        = seq                                  |
|      supplier_id      = preferred supplier.id                |
|      destination_id   = rec.location_id                     |
|      source           = 'ai_auto'                            |
|      status           = 'draft'                              |
|      expected_date    = today + lead_time_days               |
|      created_by       = resolveCreatedBy(actor) (UUID|NULL)  |
|      ai_recommendation_id = rec.id                          |
|      notes            = 'AI-generated reorder ...'           |
| 3) INSERT po_lines                                           |
|      product_id = rec.product_id                            |
|      qty_ordered = finalValue                               |
|      unit_cost = supplier.unit_cost                          |
|                  -> products.cost_price                      |
|                  -> 60% of products.sale_price              |
|      notes = 'AI reorder'                                   |
+---------------------------------------------------------------+
```

## 5. Reject

Endpoint: `POST /api/ai/recommendations/:id/reject` (optional
`rejectionReason`).

```
START (admin)
  |
  v
getRecommendation(id)
  |-- rec == null -----------------> 404 NOT_FOUND
  |-- status != 'pending' ---------> 409 ALREADY_ACTED
  |
  v
markActed(id, {
   status          = 'rejected',
   rejection_reason= reason.trim() or NULL,
   acted_on_by     = resolveCreatedBy(actor) (UUID|NULL),
   acted_on_at     = now
})
  |
  v
+--------------------------------------------------+
| NO side effects: no PO, no rule change.           |
| response: {recommendation, message: "Rejected."}  |
+--------------------------------------------------+
```

## 6. Lifetime of a recommendation (state machine)

```
                 +-------------+
                 |   pending   |
                 +-------------+
                    |         |      |
      accept        |  modify |      | reject
      (value stays) | (new    |      | (reason/timestamp)
                    |  value) |      |
        +-----------+    +---|------+
        v                v          v
+-------------+   +------------+   +------------+
|  accepted   |   |  modified  |   |  rejected  |
|             |   |            |   |            |
| accepted_   |   | accepted_  |   | rejection_ |
| value set   |   | value =    |   | reason set |
| + PO created|   | edited qty |   |            |
|  OR rule    |   | + PO/rule  |   | (nothing    |
|  applied    |   |  side fx   |   |  else)     |
+-------------+   +------------+   +------------+

TERMINAL STATES: no re-act. "reorder_quantity" accepted always yields a
purchase_order (linked or new). "warehouse_stock_level" yields a safety rule
update. "demand_forecast" yields nothing beyond the record.
```

## 7. Persistence & failure modes

```
+---------------------------------------------------------------+
| markActed()                                                   |
|   UPDATE ai_recommendations SET <patch>, updated_at=now       |
|   WHERE id = ? RETURNING *  + embeds products/locations       |
|      |                                                         |
|   error?  ---YES--> fall back to in-memory store              |
|      |                                                        |
|      v NO                                                     |
|   return enriched row (payload to caller)                     |
+---------------------------------------------------------------+
```
- `acted_on_by` is a `uuid` column — a non-UUID string (e.g. a dev-token id
  `"dev"`) is rejected by Postgres (`22P02`); the service resolves real
  profile ids only and stores `NULL` otherwise.
- The catch in `markActed` is currently **silent**: a DB write failure leaves
  the row `pending` in Postgres even if the API still reports success. Residual
  risk, documented — the UUID fix removes the common failure path.
- No LLM failure can corrupt stock: forecasting never mutates data; all
  order/rule actions are gated on explicit accept/modify/reject (or
  `auto_approve`).

## 8. Status summary

```
GET /api/ai/recommendations
        |
        v
+-----------------------------------+
| QUERY A: filtered rows (table)    |
| QUERY B: counts IGNORING filter   |
|   summary = {total, pending,      |
|              accepted, modified,  |
|              rejected}            |
+-----------------------------------+
```
Header KPIs come from QUERY B so they stay accurate while the table is
filtered.