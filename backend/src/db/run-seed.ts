import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { supabase } from '../config/index.js'

/**
 * Replays backend/src/db/seed.sql against a real Supabase project over
 * PostgREST using the service-role key (bypasses RLS). Keeps seed.sql as the
 * single source of truth — no second data copy to maintain.
 *
 * Note: DDL (functions/triggers) cannot run over REST; apply schema.sql /
 * migration files in the Supabase SQL editor (or via psql with a connection
 * string) before/after as needed.
 */

const __dirname = dirname(fileURLToPath(import.meta.url))
const seedPath = join(__dirname, 'seed.sql')

type Cell = string | number | boolean | null

function splitTopLevel(s: string): string[] {
  const parts: string[] = []
  let cur = ''
  let inStr = false
  for (let i = 0; i < s.length; i++) {
    const ch = s[i]
    if (inStr) {
      cur += ch
      if (ch === "'") {
        if (s[i + 1] === "'") {
          cur += "'"
          i++
        } else {
          inStr = false
        }
      }
      continue
    }
    if (ch === "'") {
      inStr = true
      cur += ch
    } else if (ch === ',') {
      parts.push(cur.trim())
      cur = ''
    } else {
      cur += ch
    }
  }
  if (cur.trim()) parts.push(cur.trim())
  return parts
}

function parseValue(v: string): Cell {
  if (v === 'NULL') return null
  if (v.startsWith("'")) return v.slice(1, -1).replace(/''/g, "'")
  if (/^TRUE$/i.test(v)) return true
  if (/^FALSE$/i.test(v)) return false
  const n = Number(v)
  return Number.isNaN(n) ? v : n
}

function parseInsert(sql: string): { table: string; rowObjects: Record<string, Cell>[] } | null {
  const head = /INSERT\s+INTO\s+([a-z_][a-z0-9_]*)\s*\(([\s\S]*?)\)\s*VALUES\s*/i.exec(sql)
  if (!head) return null
  const table = head[1]
  const columns = splitTopLevel(head[2])
  const valuesText = sql.slice(head.index + head[0].length)

  const groups: string[] = []
  let depth = 0
  let cur = ''
  let inStr = false
  for (let i = 0; i < valuesText.length; i++) {
    const ch = valuesText[i]
    if (inStr) {
      cur += ch
      if (ch === "'") {
        if (valuesText[i + 1] === "'") {
          cur += "'"
          i++
        } else {
          inStr = false
        }
      }
      continue
    }
    if (ch === "'") {
      inStr = true
      cur += ch
    } else if (ch === '-' && valuesText[i + 1] === '-') {
      while (i < valuesText.length && valuesText[i] !== '\n') i++
    } else if (ch === '(') {
      if (depth === 0) {
        cur = ''
        depth = 1
      } else {
        depth++
        cur += ch
      }
    } else if (ch === ')') {
      depth--
      if (depth === 0) {
        groups.push(cur.trim())
      } else {
        cur += ch
      }
    } else {
      if (depth > 0) cur += ch
    }
  }

  const rowObjects = groups.map((g) => {
    const cells = splitTopLevel(g)
    if (cells.length !== columns.length) {
      throw new Error(`Column count mismatch on ${table}: ${columns.length} cols vs ${cells.length} cells in row: ${g.slice(0, 80)}`)
    }
    const obj: Record<string, Cell> = {}
    columns.forEach((c, i) => {
      obj[c] = parseValue(cells[i])
    })
    return obj
  })
  return { table, rowObjects }
}

async function main() {
  const sql = readFileSync(seedPath, 'utf8')
  const statements = sql.split(';').map((s) => s.trim()).filter((s) => s.length > 0)

  const inserts: { table: string; rowObjects: Record<string, Cell>[] }[] = []
  for (const stmt of statements) {
    const parsed = parseInsert(stmt)
    if (parsed) inserts.push(parsed)
  }

  console.log(`Parsed ${inserts.length} INSERT statements from ${seedPath}`)

  const { count: existingStores, error: storesErr } = await supabase
    .from('stores')
    .select('id', { count: 'exact', head: true })
  if (storesErr) throw new Error(`Cannot read stores: ${storesErr.message}`)
  if ((existingStores ?? 0) > 0) {
    console.log('Stores table already has data — seed already applied. Aborting to avoid duplicates.')
    process.exit(0)
  }

  let total = 0
  for (const { table, rowObjects } of inserts) {
    const { error } = await supabase.from(table).insert(rowObjects)
    if (error) {
      console.error(`FAILED inserting ${rowObjects.length} rows into ${table}: ${error.message}`)
      process.exit(1)
    }
    total += rowObjects.length
    console.log(`  inserted ${rowObjects.length} rows into ${table}`)
  }

  console.log(`Seed complete: ${total} rows inserted.`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})