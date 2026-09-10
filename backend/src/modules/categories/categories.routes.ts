import { Router } from 'express'
import { randomUUID } from 'node:crypto'
import { supabase, env } from '../../config/index.js'
import { AppError, asyncHandler, requireAuth, validate, validated } from '../../middleware/index.js'
import {
  createCategorySchema,
  updateCategorySchema,
  listCategoriesQuerySchema,
  categoryIdParamSchema,
  type CreateCategoryInput,
  type UpdateCategoryInput,
  type ListCategoriesQuery,
} from '../../lib/schemas/index.js'
import { memoryCategories, type LocalCategory } from './categories.store.js'

const router = Router()

/** Skip Supabase entirely when running against the mock/offline Supabase URL. */
const isMockSupabase = !env.SUPABASE_URL || env.SUPABASE_URL.includes('mock') || env.SUPABASE_URL.includes('localhost')

/** Roles permitted to create/update categories (Admin only per endpoints contract). */
const CATEGORY_WRITE_ROLES = ['admin']

function assertCanManageCategories(role: string | undefined): void {
  if (!role || !CATEGORY_WRITE_ROLES.includes(role)) {
    throw new AppError(403, 'You do not have permission to manage categories (Admin only)', 'FORBIDDEN')
  }
}

/** True when the given parent would create a cycle (self / descendant parent). */
function isCategoryCycle(categoryId: string, parentId: string): boolean {
  if (categoryId === parentId) return true
  let current = memoryCategories.find((c) => c.id === parentId) ?? null
  const seen = new Set<string>()
  while (current && current.parent_id && !seen.has(current.id)) {
    seen.add(current.id)
    if (current.parent_id === categoryId) return true
    current = memoryCategories.find((c) => c.id === current!.parent_id) ?? null
  }
  return false
}

/** Find duplicate within the same parent scope (parent_id compares equal incl. NULL). */
function findNameConflict(name: string, parentId: string | null | undefined, excludeId?: string): LocalCategory | undefined {
  return memoryCategories.find(
    (c) =>
      c.id !== excludeId &&
      c.name.toLowerCase() === name.toLowerCase() &&
      ((c.parent_id ?? null) === (parentId ?? null)),
  )
}

/** Normalize a raw category row into the API shape. */
function toCategoryDto(row: LocalCategory | Record<string, unknown>) {
  return {
    id: row.id,
    name: row.name,
    parent_id: (row.parent_id ?? null) as string | null,
    sort_order: Number(row.sort_order ?? 0),
    status: row.status ?? 'active',
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

/** Build a nested tree from a flat list. */
type CategoryTreeNode = LocalCategory & { children: CategoryTreeNode[] }

function buildTree(flat: LocalCategory[]): CategoryTreeNode[] {
  const nodes = new Map<string, CategoryTreeNode>()
  flat.forEach((c) => nodes.set(c.id, { ...c, children: [] }))
  const roots: CategoryTreeNode[] = []
  flat.forEach((c) => {
    const node = nodes.get(c.id)!
    if (c.parent_id && nodes.has(c.parent_id)) {
      nodes.get(c.parent_id)!.children.push(node)
    } else {
      roots.push(node)
    }
  })
  const sortRecursively = (node: CategoryTreeNode) => {
    node.children.sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name))
    node.children.forEach(sortRecursively)
  }
  roots.sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name))
  roots.forEach(sortRecursively)
  return roots
}

// -----------------------------------------------------------------------------
// 1. GET /api/categories — list categories (flat or nested tree)
// -----------------------------------------------------------------------------
router.get(
  '/categories',
  requireAuth,
  validate(listCategoriesQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const { status, tree } = validated(req, 'query', listCategoriesQuerySchema) as ListCategoriesQuery

    if (!isMockSupabase) {
      try {
        let query = supabase.from('categories').select('*')
        if (status && status !== 'all') query = query.eq('status', status)
        const { data, error } = await query.order('sort_order', { ascending: true })

        if (!error && data) {
          const rows = data as unknown as LocalCategory[]
          if (tree === 'true') {
            return res.json({ categories: buildTree(rows), total: rows.length })
          }
          return res.json({ categories: rows.map(toCategoryDto), total: rows.length })
        }
      } catch {
        // Fallback to in-memory store
      }
    }

    let filtered = [...memoryCategories]
    if (status && status !== 'all') {
      filtered = filtered.filter((c) => c.status === status)
    }
    filtered.sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name))

    if (tree === 'true') {
      return res.json({ categories: buildTree(filtered), total: filtered.length })
    }
    res.json({ categories: filtered.map(toCategoryDto), total: filtered.length })
  }),
)

// -----------------------------------------------------------------------------
// 2. POST /api/categories — create category (Admin only)
// -----------------------------------------------------------------------------
router.post(
  '/categories',
  requireAuth,
  validate(createCategorySchema),
  asyncHandler(async (req, res) => {
    assertCanManageCategories(req.role)

    const input = validated(req, 'body', createCategorySchema) as CreateCategoryInput

    // In-memory model (mirrors the DB CHECK/UNIQUE/cycle guards for parity).
    const parentId = input.parentId ?? null
    if (parentId && !memoryCategories.some((c) => c.id === parentId)) {
      throw new AppError(400, 'Parent category not found', 'PARENT_NOT_FOUND')
    }
    if (findNameConflict(input.name, parentId)) {
      throw new AppError(409, 'A category with this name already exists at this level', 'CATEGORY_NAME_EXISTS')
    }

    const newRecord: LocalCategory = {
      id: randomUUID(),
      name: input.name,
      parent_id: parentId,
      sort_order: input.sortOrder ?? 0,
      status: input.status ?? 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    if (!isMockSupabase) {
      try {
        const { data, error } = await supabase
          .from('categories')
          .insert({
            name: newRecord.name,
            parent_id: newRecord.parent_id,
            sort_order: newRecord.sort_order,
            status: newRecord.status,
          })
          .select()
          .single()

        if (!error && data) {
          memoryCategories.push(data as unknown as LocalCategory)
          return res.status(201).json({ category: toCategoryDto(data as unknown as LocalCategory) })
        }
        if (error?.code === '23505') {
          throw new AppError(409, 'A category with this name already exists at this level', 'CATEGORY_NAME_EXISTS')
        }
      } catch (e) {
        if (e instanceof AppError) throw e
        // Fallback to in-memory store on transport/other errors
      }
    }

    memoryCategories.push(newRecord)
    res.status(201).json({ category: toCategoryDto(newRecord) })
  }),
)

// -----------------------------------------------------------------------------
// 3. PATCH /api/categories/:id — update category (Admin only; status flip deactivates)
// -----------------------------------------------------------------------------
router.patch(
  '/categories/:id',
  requireAuth,
  validate(categoryIdParamSchema, 'params'),
  validate(updateCategorySchema),
  asyncHandler(async (req, res) => {
    assertCanManageCategories(req.role)

    const { id } = validated(req, 'params', categoryIdParamSchema)
    const updates = validated(req, 'body', updateCategorySchema) as UpdateCategoryInput

    // In-memory validation first so failures are clean in both modes.
    const idx = memoryCategories.findIndex((c) => c.id === id)
    if (idx < 0) {
      // Let the DB path decide (may exist in prod but not in memory seed).
      if (!isMockSupabase) {
        try {
          const { data, error } = await supabase
            .from('categories')
            .update({ ...updates, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select()
            .maybeSingle()
          if (!error && data) return res.json({ category: toCategoryDto(data as unknown as LocalCategory) })
        } catch {
          // noop
        }
      }
      throw new AppError(404, 'Category not found', 'CATEGORY_NOT_FOUND')
    }

    const current = memoryCategories[idx]

    if (updates.parentId !== undefined && updates.parentId !== (current.parent_id ?? null)) {
      const newParent = updates.parentId ?? null
      if (newParent && !memoryCategories.some((c) => c.id === newParent)) {
        throw new AppError(400, 'Parent category not found', 'PARENT_NOT_FOUND')
      }
      if (newParent && isCategoryCycle(id, newParent)) {
        throw new AppError(422, 'Category cycle detected — parent cannot be a descendant', 'CATEGORY_CYCLE_DETECTED')
      }
    }

    if (updates.name !== undefined) {
      const nextName = updates.name
      const nextParent = updates.parentId !== undefined ? (updates.parentId ?? null) : current.parent_id
      if (findNameConflict(nextName, nextParent, id)) {
        throw new AppError(409, 'A category with this name already exists at this level', 'CATEGORY_NAME_EXISTS')
      }
    }

    if (!isMockSupabase) {
      try {
        const { data, error } = await supabase
          .from('categories')
          .update({ ...updates, parent_id: updates.parentId !== undefined ? updates.parentId : undefined, updated_at: new Date().toISOString() })
          .eq('id', id)
          .select()
          .maybeSingle()

        if (!error && data) {
          memoryCategories[idx] = data as unknown as LocalCategory
          return res.json({ category: toCategoryDto(data as unknown as LocalCategory) })
        }
        if (error?.code === '23505') {
          throw new AppError(409, 'A category with this name already exists at this level', 'CATEGORY_NAME_EXISTS')
        }
      } catch (e) {
        if (e instanceof AppError) throw e
        // Fallback to in-memory store on transport/other errors
      }
    }

    const updated: LocalCategory = {
      ...current,
      name: updates.name !== undefined ? updates.name : current.name,
      parent_id: updates.parentId !== undefined ? (updates.parentId ?? null) : current.parent_id,
      sort_order: updates.sortOrder !== undefined ? updates.sortOrder : current.sort_order,
      status: updates.status ?? current.status,
      updated_at: new Date().toISOString(),
    }
    memoryCategories[idx] = updated

    res.json({ category: toCategoryDto(updated) })
  }),
)

export default router