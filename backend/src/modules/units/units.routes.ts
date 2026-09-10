import { Router } from 'express'
import { randomUUID } from 'node:crypto'
import { supabase, env } from '../../config/index.js'
import { AppError, asyncHandler, requireAuth, validate, validated } from '../../middleware/index.js'
import {
  createUnitSchema,
  updateUnitSchema,
  listUnitsQuerySchema,
  unitIdParamSchema,
  type CreateUnitInput,
  type UpdateUnitInput,
  type ListUnitsQuery,
} from '../../lib/schemas/index.js'
import { memoryUnits, type LocalUnit } from './units.store.js'

const router = Router()

/** Skip Supabase entirely when running against the mock/offline Supabase URL. */
const isMockSupabase = !env.SUPABASE_URL || env.SUPABASE_URL.includes('mock') || env.SUPABASE_URL.includes('localhost')

/** Roles permitted to create/update units (Admin only per endpoints contract). */
const UNIT_WRITE_ROLES = ['admin']

function assertCanManageUnits(role: string | undefined): void {
  if (!role || !UNIT_WRITE_ROLES.includes(role)) {
    throw new AppError(403, 'You do not have permission to manage units (Admin only)', 'FORBIDDEN')
  }
}

function findNameConflict(name: string, excludeId?: string): LocalUnit | undefined {
  return memoryUnits.find((u) => u.id !== excludeId && u.name.toLowerCase() === name.toLowerCase())
}

function toUnitDto(row: LocalUnit | { id: string; name: string; abbreviation?: string | null; status?: string }) {
  return {
    id: row.id,
    name: row.name,
    abbreviation: (row.abbreviation ?? null) as string | null,
    status: (row.status ?? 'active') as 'active' | 'archived',
  }
}

// -----------------------------------------------------------------------------
// 1. GET /api/units — list units of measure (status filter)
// -----------------------------------------------------------------------------
router.get(
  '/units',
  requireAuth,
  validate(listUnitsQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const { status } = validated(req, 'query', listUnitsQuerySchema) as ListUnitsQuery

    if (!isMockSupabase) {
      try {
        let query = supabase.from('units').select('*')
        if (status && status !== 'all') query = query.eq('status', status)
        const { data, error } = await query.order('name', { ascending: true })

        if (!error && data) {
          return res.json({ units: data.map(toUnitDto), total: data.length })
        }
      } catch {
        // Fallback to in-memory store
      }
    }

    let filtered = [...memoryUnits]
    if (status && status !== 'all') {
      filtered = filtered.filter((u) => u.status === status)
    }
    filtered.sort((a, b) => a.name.localeCompare(b.name))

    res.json({ units: filtered.map(toUnitDto), total: filtered.length })
  }),
)

// -----------------------------------------------------------------------------
// 2. POST /api/units — create unit (Admin only)
// -----------------------------------------------------------------------------
router.post(
  '/units',
  requireAuth,
  validate(createUnitSchema),
  asyncHandler(async (req, res) => {
    assertCanManageUnits(req.role)

    const input = validated(req, 'body', createUnitSchema) as CreateUnitInput

    if (findNameConflict(input.name)) {
      throw new AppError(409, 'A unit with this name already exists', 'UNIT_NAME_EXISTS')
    }

    const newRecord: LocalUnit = {
      id: randomUUID(),
      name: input.name,
      abbreviation: input.abbreviation || null,
      status: 'active',
    }

    if (!isMockSupabase) {
      try {
        const { data, error } = await supabase
          .from('units')
          .insert({ name: newRecord.name, abbreviation: newRecord.abbreviation, status: newRecord.status })
          .select()
          .single()

        if (!error && data) {
          memoryUnits.push(toUnitDto(data) as LocalUnit)
          return res.status(201).json({ unit: toUnitDto(data) })
        }
        if (error?.code === '23505') {
          throw new AppError(409, 'A unit with this name already exists', 'UNIT_NAME_EXISTS')
        }
      } catch (e) {
        if (e instanceof AppError) throw e
        // Fallback to in-memory store on transport/other errors
      }
    }

    memoryUnits.push(newRecord)
    res.status(201).json({ unit: toUnitDto(newRecord) })
  }),
)

// -----------------------------------------------------------------------------
// 3. PATCH /api/units/:id — update unit (Admin only; status flip deactivates)
// -----------------------------------------------------------------------------
router.patch(
  '/units/:id',
  requireAuth,
  validate(unitIdParamSchema, 'params'),
  validate(updateUnitSchema),
  asyncHandler(async (req, res) => {
    assertCanManageUnits(req.role)

    const { id } = validated(req, 'params', unitIdParamSchema)
    const updates = validated(req, 'body', updateUnitSchema) as UpdateUnitInput

    const idx = memoryUnits.findIndex((u) => u.id === id)
    if (idx < 0) {
      if (!isMockSupabase) {
        try {
          const { data, error } = await supabase
            .from('units')
            .update({ ...updates, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select()
            .maybeSingle()
          if (!error && data) return res.json({ unit: toUnitDto(data) })
        } catch {
          // noop
        }
      }
      throw new AppError(404, 'Unit not found', 'UNIT_NOT_FOUND')
    }

    const current = memoryUnits[idx]

    if (updates.name !== undefined && findNameConflict(updates.name, id)) {
      throw new AppError(409, 'A unit with this name already exists', 'UNIT_NAME_EXISTS')
    }

    if (!isMockSupabase) {
      try {
        const { data, error } = await supabase
          .from('units')
          .update({ ...updates, updated_at: new Date().toISOString() })
          .eq('id', id)
          .select()
          .maybeSingle()

        if (!error && data) {
          memoryUnits[idx] = { ...current, ...toUnitDto(data) }
          return res.json({ unit: toUnitDto(data) })
        }
        if (error?.code === '23505') {
          throw new AppError(409, 'A unit with this name already exists', 'UNIT_NAME_EXISTS')
        }
      } catch (e) {
        if (e instanceof AppError) throw e
        // Fallback to in-memory store on transport/other errors
      }
    }

    const updated: LocalUnit = {
      ...current,
      name: updates.name !== undefined ? updates.name : current.name,
      abbreviation: updates.abbreviation !== undefined ? updates.abbreviation : current.abbreviation,
      status: updates.status ?? current.status,
    }
    memoryUnits[idx] = updated

    res.json({ unit: toUnitDto(updated) })
  }),
)

export default router