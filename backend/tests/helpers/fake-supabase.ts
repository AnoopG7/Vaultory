/*-------------------------------------------------------------------------*
 * Fake Supabase client for Vitest.
 *
 * A tiny fluent, in-memory stand-in for `@supabase/supabase-js` that lets the
 * real store modules run their logic against seeded JSON "rows". It supports
 * the subset of the PostgREST API the codebase actually uses:
 *
 *   from(table).select(spec, {count}).eq/.neq/.in/.gte/.lte/.gt/.lt
 *                  .order(col,{ascending}).limit(n).single/.maybeSingle
 *                  .insert(...).update(...).upsert(...).delete()
 *   rpc(name, args)
 *   auth.getUser(token)
 *
 * Simple embeds (`products(name, sku_code)`, `sales!inner(...)`,
 * `inventory(product_id, qty_on_hand, products(name, sku_code))`) resolve via
 * a relations registry (FK heuristics + per-table overrides).
 *
 * Semantics:
 *   - `many: true`   -> child table holds the FK (`inventory.location_id`)
 *   - `many: false`  -> parent table row holds the FK (`rec.product_id`)
 *
 * Dotted filters (`eq('sales.status', ...)`) and `!inner` embeds are resolved
 * AFTER the embed projection, so a row with no related row is dropped just as
 * the real PostgREST inner join would.
 *
 * Inserted/upserted rows missing an `id` get a UUID (PostgREST auto-fills the
 * primary key), so stores that read back `select('id').single()` after insert
 * behave like they would against the real API.
 *-------------------------------------------------------------------------*/

import { randomUUID } from 'node:crypto'

export type Row = Record<string, unknown>
export type Database = Record<string, Row[]>

type SimpleOp = 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'is'
type Filter =
  | { op: SimpleOp; col: string; value: unknown }
  | { op: 'in'; col: string; values: unknown[] }
  | { op: 'or'; conditions: Array<{ col: string; op: SimpleOp | 'ilike' | 'like'; value: string }> }
  | { op: 'not'; condition: { col: string; op: SimpleOp | 'ilike' | 'like'; value: string } }

interface Embed {
  rel: string
  inner: boolean
  columns: string[] | '*'
}

interface RelationDef {
  fk: string
  target: string
  many: boolean
}

type RpcHandler = (args?: unknown, body?: unknown) => unknown

interface FakeState {
  db: Database
  relations: Record<string, Record<string, RelationDef>>
  rpcHandlers: Record<string, RpcHandler>
  insertDefaults: Record<string, Row>
  poCounter: { value: number }
  poPrefix: string
}

const DEFAULT_RELATIONS: Record<string, Record<string, RelationDef>> = {
  ai_recommendations: {
    products: { fk: 'product_id', target: 'products', many: false },
    locations: { fk: 'location_id', target: 'locations', many: false },
  },
  inventory: {
    products: { fk: 'product_id', target: 'products', many: false },
    locations: { fk: 'location_id', target: 'locations', many: false },
  },
  locations: {
    inventory: { fk: 'location_id', target: 'inventory', many: true },
    stores: { fk: 'store_id', target: 'stores', many: false },
  },
  purchase_orders: {
    suppliers: { fk: 'supplier_id', target: 'suppliers', many: false },
    locations: { fk: 'destination_id', target: 'locations', many: false },
    po_lines: { fk: 'po_id', target: 'po_lines', many: true },
  },
  po_lines: {
    products: { fk: 'product_id', target: 'products', many: false },
    purchase_orders: { fk: 'po_id', target: 'purchase_orders', many: false },
  },
  po_receipts: {
    po_receipt_lines: { fk: 'receipt_id', target: 'po_receipt_lines', many: true },
  },
  po_receipt_lines: {
    products: { fk: 'product_id', target: 'products', many: false },
  },
  products: {
    categories: { fk: 'category_id', target: 'categories', many: false },
    units: { fk: 'unit_id', target: 'units', many: false },
  },
  sale_lines: {
    sales: { fk: 'sale_id', target: 'sales', many: false },
    products: { fk: 'product_id', target: 'products', many: false },
  },
  supplier_products: {
    suppliers: { fk: 'supplier_id', target: 'suppliers', many: false },
    products: { fk: 'product_id', target: 'products', many: false },
  },
  safety_stock_rules: {
    products: { fk: 'product_id', target: 'products', many: false },
    locations: { fk: 'location_id', target: 'locations', many: false },
  },
  alerts: {
    products: { fk: 'product_id', target: 'products', many: false },
    locations: { fk: 'location_id', target: 'locations', many: false },
  },
}

const state: FakeState = {
  db: {},
  relations: DEFAULT_RELATIONS,
  rpcHandlers: {},
  insertDefaults: {},
  poCounter: { value: 1 },
  poPrefix: 'PO-2026-',
}

export function resetFakeDb(db: Database = {}): void {
  state.db = JSON.parse(JSON.stringify(db))
  state.rpcHandlers = {}
  state.insertDefaults = {}
  state.poCounter = { value: 1 }
}

/**
 * Defaults applied to rows inserted into `table` that omit the columns (e.g.
 * `ai_recommendations.status` defaults to 'pending' in Postgres/DEFERRED here).
 * Explicit row values always win over defaults. Cleared by `resetFakeDb`.
 */
export function setInsertDefaults(table: string, defaults: Row): void {
  state.insertDefaults[table] = { ...defaults }
}

function applyInsertDefaults(table: string, row: Row): Row {
  const defaults = state.insertDefaults[table]
  return defaults ? { ...defaults, ...row } : row
}

export function getFakeDb(): Database {
  return state.db
}

export function addFakeRows(table: string, rows: Row[]): Row[] {
  const list = (state.db[table] ??= [])
  const cloned = JSON.parse(JSON.stringify(rows))
  list.push(...cloned)
  return cloned
}

export function setRpcHandler(name: string, handler: RpcHandler): void {
  state.rpcHandlers[name] = handler
}

export function setFakeRelations(table: string, defs: Record<string, RelationDef>): void {
  state.relations[table] = { ...(state.relations[table] ?? {}), ...defs }
}

/*-------------------------------------------------------------------------*/

function compare(a: unknown, b: unknown): number {
  if (a === null || a === undefined) return b === null || b === undefined ? 0 : -1
  if (b === null || b === undefined) return 1
  const sa = typeof a === 'number' ? String(a) : String(a)
  const sb = typeof b === 'number' ? String(b) : String(b)
  if (sa < sb) return -1
  if (sa > sb) return 1
  return 0
}

function matchesFilter(row: Row, filter: Filter): boolean {
  if (filter.col && filter.col.includes('.')) {
    const [relAlias, sub] = filter.col.split(/\.(.+)/)
    const target = row[strip(relAlias)]
    if (target === undefined || target === null) return false
    const list = Array.isArray(target) ? target : [target]
    return list.some((r) => matchesFilter(r as Row, { ...filter, col: sub }))
  }
  const cell = row[filter.col]
  switch (filter.op) {
    case 'eq':
      return compare(cell, filter.value) === 0
    case 'is':
      return filter.value === null ? cell === null || cell === undefined : compare(cell, filter.value) === 0
    case 'neq':
      return compare(cell, filter.value) !== 0
    case 'gt':
      return compare(cell, filter.value) > 0
    case 'gte':
      return compare(cell, filter.value) >= 0
    case 'lt':
      return compare(cell, filter.value) < 0
    case 'lte':
      return compare(cell, filter.value) <= 0
    case 'in':
      return (filter.values as unknown[]).some((v) => compare(cell, v) === 0)
    case 'or':
      return (filter.conditions as Array<{ col: string; op: string; value: string }>).some((c) =>
        matchesFilter(row, { op: c.op as SimpleOp, col: c.col, value: c.value }),
      )
    case 'not':
      return !matchesFilter(row, { op: filter.condition.op as SimpleOp, col: filter.condition.col, value: filter.condition.value })
    case 'ilike':
    case 'like': {
      const pattern = String(filter.value).toLowerCase().replaceAll('*', '%')
      const regex = new RegExp(`^${pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replaceAll('%', '.*').replaceAll('_', '.')}$`)
      return regex.test(String(cell ?? '').toLowerCase())
    }
    default:
      return true
  }
}

function applyFilters(rows: Row[], filters: Filter[]): Row[] {
  return rows.filter((row) => filters.every((f) => matchesFilter(row, f)))
}

function strip(rel: string): string {
  return rel.split('!')[0]
}

function buildEmbed(rel: string, inner: boolean, columns: string[] | '*', table: string, row: Row): unknown {
  const def = state.relations[table]?.[rel]
  if (!def) return undefined

  const target = def.target
  const rows = state.db[target] ?? []

  let related: Row[]
  if (def.many) {
    related = rows.filter((r) => compare(r[def.fk], row.id) === 0)
  } else {
    const key = row[def.fk]
    if (key === undefined || key === null) related = []
    else related = rows.filter((r) => compare(r.id, key) === 0)
  }

  if (inner && related.length === 0) return null
  const projected = related.map((r) => projectRow(r, target, columns))
  return def.many ? projected : (projected[0] ?? null)
}

function projectRow(row: Row, table: string, spec: string[] | '*'): Row {
  const out: Row = {}
  if (spec === '*') {
    Object.assign(out, row)
    return out
  }
  const cols = spec.filter((c) => !c.includes('('))
  const embeds = spec.filter((c) => c.includes('(')).map(parseEmbed)
  for (const key of cols) {
    if (key === '*') Object.assign(out, row)
    else if (key in row) out[key] = row[key]
  }
  for (const embed of embeds) {
    out[strip(embed.rel)] = buildEmbed(embed.rel, embed.inner, embed.columns, table, row)
  }
  return out
}

function parseEmbed(token: string): Embed {
  const inner = token.includes('!inner')
  const cleaned = token.replace('!inner', '').replace('!left', '')
  const open = cleaned.indexOf('(')
  const rel = strip(cleaned.slice(0, open))
  const innerText = cleaned.slice(open + 1, cleaned.lastIndexOf(')'))
  return { rel, inner, columns: toSelectSpecArray(innerText) }
}

function parseSelectColumns(select: string): string[] {
  const parts: string[] = []
  let depth = 0
  let cur = ''
  for (const ch of select) {
    if (ch === '(' || ch === '{') depth++
    else if (ch === ')' || ch === '}') depth--
    if (ch === ',' && depth === 0) {
      parts.push(cur.trim())
      cur = ''
    } else {
      cur += ch
    }
  }
  if (cur.trim()) parts.push(cur.trim())
  return parts.length ? parts : ['*']
}

function toSelectSpecArray(spec?: string | string[] | null): string[] | '*' {
  if (!spec) return '*'
  if (typeof spec === 'string') return parseSelectColumns(spec)
  return spec
}

/*-------------------------------------------------------------------------*/

export interface FakeResult {
  data: unknown
  error: {
    code?: string
    message: string
    details?: string | null
    hint?: string | null
  } | null
  count?: number | null
}

class QueryBuilder implements PromiseLike<FakeResult> {
  private table: string
  private filters: Filter[] = []
  private orderBy?: { col: string; ascending: boolean }
  private limitCount?: number
  private rangeFrom?: number
  private rangeTo?: number
  private selectSpec?: string | string[]
  private wantCount = false
  private insertRows?: Row[]
  private updatePatch?: Row
  private deleteMode = false
  private resultMode: 'array' | 'single' | 'maybeSingle' = 'array'
  private matchTotal = 0

  constructor(table: string) {
    this.table = table
  }

  select(cols?: string | string[], opts?: { count?: 'exact' | 'planned' | 'estimated' }): this {
    this.selectSpec = cols
    if (opts?.count) this.wantCount = true
    return this
  }

  eq(col: string, value: unknown): this {
    this.filters.push({ op: 'eq', col, value })
    return this
  }

  neq(col: string, value: unknown): this {
    this.filters.push({ op: 'neq', col, value })
    return this
  }

  in(col: string, values: unknown[]): this {
    this.filters.push({ op: 'in', col, values })
    return this
  }

  gt = (col: string, value: unknown): this => this.opFilter('gt', col, value)
  gte = (col: string, value: unknown): this => this.opFilter('gte', col, value)
  lt = (col: string, value: unknown): this => this.opFilter('lt', col, value)
  lte = (col: string, value: unknown): this => this.opFilter('lte', col, value)

  is(col: string, value: unknown): this {
    this.filters.push({ op: 'is', col, value })
    return this
  }

  ilike(col: string, value: string): this {
    this.filters.push({ op: 'ilike', col, value })
    return this
  }

  like(col: string, value: string): this {
    this.filters.push({ op: 'like', col, value })
    return this
  }

  not(col: string, op: unknown, value: unknown): this {
    this.filters.push({ op: 'not', condition: { col, op: String(op) as Filter extends never ? never : SimpleOp, value: String(value) } })
    return this
  }

  filter(col: string, op: unknown, value: unknown): this {
    const s = String(op)
    if (s === 'in') {
      this.filters.push({ op: 'in', col, values: Array.isArray(value) ? (value as unknown[]) : [value] })
    } else {
      this.filters.push({ op: s as SimpleOp, col, value })
    }
    return this
  }

  /** Parse a PostgREST `or(...)` predicate like `product_name.ilike.%x%,sku_code.ilike.%x%`. */
  or(predicate: string): this {
    const opsReg = /\.(ilike|like|eq|neq|gt|gte|lt|lte|in|is)\./
    const conditions = predicate.split(',').map((part) => {
      const m = part.match(opsReg)
      if (!m) return { col: part, op: 'eq' as SimpleOp, value: 'true' }
      const op = m[1] as SimpleOp
      const col = part.slice(0, m.index)
      const value = part.slice((m.index ?? 0) + m[0].length)
      return { col, op, value }
    })
    this.filters.push({ op: 'or', conditions })
    return this
  }

  private opFilter(op: Filter['op'], col: string, value: unknown): this {
    this.filters.push({ op, col, value } as Filter)
    return this
  }

  order(col: string, opts?: { ascending?: boolean }): this {
    this.orderBy = { col, ascending: opts?.ascending ?? true }
    return this
  }

  limit(n: number): this {
    this.limitCount = n
    return this
  }

  range(from: number, to: number): this {
    this.rangeFrom = from
    this.rangeTo = to
    return this
  }

  delete(): this {
    this.deleteMode = true
    return this
  }

  single(): this {
    this.resultMode = 'single'
    return this
  }

  maybeSingle(): this {
    this.resultMode = 'maybeSingle'
    return this
  }

  insert(values: Row | Row[]): this {
    this.insertRows = JSON.parse(JSON.stringify(Array.isArray(values) ? values : [values]))
    return this
  }

  update(values: Row): this {
    this.updatePatch = JSON.parse(JSON.stringify(values))
    return this
  }

  upsert(values: Row | Row[], opts?: { onConflict?: string }): this {
    const list = Array.isArray(values) ? values : [values]
    const pk = opts?.onConflict ?? 'id'
    const tableRows = (state.db[this.table] ??= [])
    for (const value of list) {
      const merged = applyInsertDefaults(this.table, value)
      const idx = tableRows.findIndex((r) => r[pk] === merged[pk])
      if (idx >= 0) tableRows[idx] = { ...tableRows[idx], ...merged }
      else tableRows.push(merged)
    }
    this.insertRows = JSON.parse(JSON.stringify(list))
    return this
  }

  delete_(): this {
    this.deleteMode = true
    return this
  }

  private matchRows(): Row[] {
    const rows = state.db[this.table] ?? []

    // Plain (non-dotted) filters run against raw rows so they can reference
    // columns that are absent from the SELECT projection.
    const dotted = this.filters.filter((f) => f.col && f.col.includes('.'))
    const plain = this.filters.filter((f) => !f.col || !f.col.includes('.'))
    let out = applyFilters(rows, plain)

    // `!inner` embeds and dotted filters (`sales.status`, `sales.sale_datetime`)
    // are resolved on a THROWAWAY projection — the original raw rows are kept
    // so a later projection pass can still resolve the FKs it needs.
    const spec = toSelectSpecArray(this.selectSpec)
    const innerRels = (Array.isArray(spec) ? spec : [])
      .filter((c) => c.includes('!inner'))
      .map((c) => parseEmbed(c).rel)
    if (dotted.length > 0 || innerRels.length > 0) {
      type Candid = { raw: Row; proj: Row }
      const projected: Candid[] = out.map((raw) => ({ raw, proj: projectRow(raw, this.table, spec) }))
      out = projected
        .filter(({ raw, proj }) => {
          if (!dotted.every((f) => matchesFilter(proj, f))) return false
          return innerRels.every((rel) => {
            const v = proj[rel]
            if (v === null || v === undefined) return false
            return !Array.isArray(v) || v.length > 0
          })
        })
        .map(({ raw }) => raw)
    }

    // exact count is measured before order/pagination (PostgREST semantics)
    this.matchTotal = out.length

    if (this.orderBy) {
      const { col, ascending } = this.orderBy
      out = [...out].sort((a, b) => {
        const c = compare(a[col], b[col])
        return ascending ? c : -c
      })
    }
    if (this.limitCount !== undefined) out = out.slice(0, this.limitCount)
    if (this.rangeFrom !== undefined && this.rangeTo !== undefined) {
      out = out.slice(this.rangeFrom, this.rangeTo + 1)
    }
    return out
  }

  private evaluate(): FakeResult {
    if (this.insertRows) {
      const wait = (state.db[this.table] ??= [])
      const rowsWithIds = this.insertRows.map((row) => {
        const merged = applyInsertDefaults(this.table, row)
        return Object.prototype.hasOwnProperty.call(merged, 'id') ? merged : { ...merged, id: randomUUID() }
      })
      wait.push(...rowsWithIds)
      const out = rowsWithIds.map((row) => projectRow(row, this.table, toSelectSpecArray(this.selectSpec)))
      return { data: out, error: null, count: this.wantCount ? out.length : null }
    }

    if (this.updatePatch) {
      const matched = this.matchRows()
      matched.forEach((row) => Object.assign(row, this.updatePatch))
      const out = matched.map((row) => projectRow(row, this.table, toSelectSpecArray(this.selectSpec)))
      return { data: out, error: null, count: this.wantCount ? this.matchTotal : null }
    }

    if (this.deleteMode) {
      const matched = this.matchRows()
      const keep = new Set(matched)
      state.db[this.table] = (state.db[this.table] ?? []).filter((r) => !keep.has(r))
      return { data: null, error: null, count: matched.length }
    }

    const matched = this.matchRows()
    const out = matched.map((row) => projectRow(row, this.table, toSelectSpecArray(this.selectSpec)))
    return {
      data: out,
      error: null,
      count: this.wantCount ? this.matchTotal : null,
    }
  }

  then<T1 = FakeResult, T2 = never>(
    onfulfilled?: ((value: FakeResult) => T1 | PromiseLike<T1>) | null,
    onrejected?: ((reason: unknown) => T2 | PromiseLike<T2>) | null,
  ): Promise<T1 | T2> {
    try {
      let result = this.evaluate()
      const rows = Array.isArray(result.data) ? (result.data as Row[]) : []
      if (this.resultMode === 'single') {
        if (rows.length !== 1) {
          result = {
            data: null,
            error: { code: 'PGRST116', message: 'JSON object requested, multiple (or no) rows returned' },
          }
        } else {
          result = { ...result, data: rows[0] }
        }
      } else if (this.resultMode === 'maybeSingle') {
        result = { ...result, data: rows[0] ?? null }
      }
      return Promise.resolve(onfulfilled ? onfulfilled(result) : result)
    } catch (e) {
      return Promise.reject(onrejected ? onrejected(e) : (e as Error))
    }
  }
}

/*-------------------------------------------------------------------------*/

export interface FakeSupabase {
  from(table: string): QueryBuilder
  rpc(name: string, args?: unknown, body?: unknown): PromiseLike<FakeResult>
  auth: {
    getUser(token: string): Promise<{ data: { user: unknown } | null; error: { message: string } }>
  }
}

export function getFakeSupabase(): FakeSupabase {
  return {
    from: (table: string) => new QueryBuilder(String(table)),
    rpc: (name: string, args?: unknown, body?: unknown) => {
      const handler = state.rpcHandlers[name]
      const value = handler ? handler(args, body) : null
      return Promise.resolve({ data: value, error: null })
    },
    auth: {
      getUser: async () => ({
        data: { user: null },
        error: { message: 'FakeSupabase: no user (real sessions are not available in tests)' },
      }),
    },
  }
}