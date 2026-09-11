import { Router } from 'express'
import { randomUUID } from 'node:crypto'
import { supabase, env } from '../../config/index.js'
import { AppError, asyncHandler, requireAuth, validate, validated } from '../../middleware/index.js'
import { maskSensitive } from '../../lib/mask.js'
import {
  createProductSchema,
  updateProductSchema,
  listProductsQuerySchema,
  productIdParamSchema,
  type CreateProductInput,
  type UpdateProductInput,
  type ListProductsQuery,
} from '../../lib/schemas/index.js'
import { memoryCategories, findDescendantCategoryIds } from '../categories/index.js'
import { memoryUnits } from '../units/index.js'
import {
  memoryProducts,
  syncProductToMockStores,
  registerProductInMockStores,
  validateStockLevels,
  type LocalProduct,
} from './products.store.js'

const router = Router()

/** Skip Supabase entirely when running against the mock/offline Supabase URL. */
const isMockSupabase = !env.SUPABASE_URL || env.SUPABASE_URL.includes('mock') || env.SUPABASE_URL.includes('localhost')

/** Roles permitted to create/update/archive products (Admin only per SRS §4.1.1). */
const PRODUCT_WRITE_ROLES = ['admin']

function assertCanManageProducts(role: string | undefined): void {
  if (!role || !PRODUCT_WRITE_ROLES.includes(role)) {
    throw new AppError(403, 'You do not have permission to manage products (Admin only)', 'FORBIDDEN')
  }
}

interface ProductRow {
  id: string
  sku_code: string
  name: string
  description: string | null
  category_id: string
  unit_id: string
  cost_price: number | string | null
  sale_price: number | string | null
  default_safety_stock: number | string | null
  default_reorder_point: number | string | null
  default_target_level: number | string | null
  is_perishable: boolean | null
  shelf_life_days: number | null
  status: string
  created_by: string | null
  created_at: string
  updated_at: string
  categories?: { name?: string } | null
  units?: { name?: string; abbreviation?: string | null } | null
}

function num(v: number | string | null | undefined): number {
  return v == null ? 0 : Number(v)
}

function toProductDto(row: ProductRow | LocalProduct, role: string | undefined) {
  const categoryName =
    'categories' in row && row.categories ? row.categories.name : null
  const unitName =
    'units' in row && row.units ? row.units.name : null

  return {
    id: row.id,
    sku_code: row.sku_code,
    name: row.name,
    description: row.description,
    category_id: row.category_id,
    category_name: categoryName ?? null,
    unit_id: row.unit_id,
    unit_name: unitName ?? null,
    // cost_price is MASKED for non-authorized roles (SRS §7)
    cost_price: maskSensitive(num(row.cost_price), role),
    sale_price: num(row.sale_price),
    default_safety_stock: num(row.default_safety_stock),
    default_reorder_point: num(row.default_reorder_point),
    default_target_level: num(row.default_target_level),
    is_perishable: row.is_perishable ?? false,
    shelf_life_days: row.shelf_life_days,
    status: row.status,
    created_by: row.created_by,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

function toLocalProduct(row: ProductRow): LocalProduct {
  return {
    id: row.id,
    sku_code: row.sku_code,
    name: row.name,
    description: row.description,
    category_id: row.category_id,
    unit_id: row.unit_id,
    cost_price: num(row.cost_price),
    sale_price: num(row.sale_price),
    default_safety_stock: num(row.default_safety_stock),
    default_reorder_point: num(row.default_reorder_point),
    default_target_level: num(row.default_target_level),
    is_perishable: row.is_perishable ?? false,
    shelf_life_days: row.shelf_life_days,
    status: (row.status === 'archived' ? 'archived' : 'active') as LocalProduct['status'],
    created_by: row.created_by,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

/** Map a camelCase zod input to snake_case DB columns. */
function toProductColumns(input: CreateProductInput | UpdateProductInput): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  if (input.sku_code !== undefined) out.sku_code = input.sku_code
  if (input.name !== undefined) out.name = input.name
  if (input.description !== undefined) out.description = input.description
  if ((input as CreateProductInput).categoryId !== undefined) out.category_id = (input as CreateProductInput).categoryId
  if ((input as CreateProductInput).unitId !== undefined) out.unit_id = (input as CreateProductInput).unitId
  if ((input as { cost_price?: number }).cost_price !== undefined) out.cost_price = (input as { cost_price?: number }).cost_price
  if ((input as { sale_price?: number }).sale_price !== undefined) out.sale_price = (input as { sale_price?: number }).sale_price
  if ((input as { default_safety_stock?: number }).default_safety_stock !== undefined) out.default_safety_stock = (input as { default_safety_stock?: number }).default_safety_stock
  if ((input as { default_reorder_point?: number }).default_reorder_point !== undefined) out.default_reorder_point = (input as { default_reorder_point?: number }).default_reorder_point
  if ((input as { default_target_level?: number }).default_target_level !== undefined) out.default_target_level = (input as { default_target_level?: number }).default_target_level
  if (input.is_perishable !== undefined) out.is_perishable = input.is_perishable
  if (input.shelf_life_days !== undefined) out.shelf_life_days = input.shelf_life_days
  if (input.status !== undefined) out.status = input.status
  if (input.image_url !== undefined) out.image_url = input.image_url
  if (input.barcode !== undefined) out.barcode = input.barcode
  if (input.notes !== undefined) out.notes = input.notes
  return out
}

// -----------------------------------------------------------------------------
// 1. GET /api/products — list products (search, category/status filter, pagination)
// -----------------------------------------------------------------------------
router.get(
  '/products',
  requireAuth,
  validate(listProductsQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const { search, categoryId, status, limit, offset } = validated(req, 'query', listProductsQuerySchema) as ListProductsQuery

    // A category filter matches the category AND all of its sub-categories
    // (any depth), so a broad parent selection returns everything beneath it.
    const categoryIds = categoryId ? findDescendantCategoryIds(categoryId) : null

    if (!isMockSupabase) {
      try {
        let query = supabase
          .from('products')
          .select('id, sku_code, name, description, category_id, unit_id, cost_price, sale_price, default_safety_stock, default_reorder_point, default_target_level, is_perishable, shelf_life_days, status, created_by, created_at, updated_at, categories(name), units(name)', { count: 'exact' })
          .order('name', { ascending: true })
          .range(offset, offset + limit - 1)

        if (status && status !== 'all') {
          query = query.eq('status', status)
        } else {
          query = query.neq('status', 'archived')
        }
        if (categoryIds) query = query.in('category_id', [...categoryIds])
        if (search) {
          query = query.or(`name.ilike.%${search}%,sku_code.ilike.%${search}%`)
        }

        const { data, count, error } = await query
        if (!error && data) {
          return res.json({
            products: data.map((p) => toProductDto(p as unknown as ProductRow, req.role)),
            total: count ?? data.length,
            limit,
            offset,
          })
        }
      } catch {
        // Fallback to in-memory store
      }
    }

    let filtered = [...memoryProducts]
    if (status && status !== 'all') {
      filtered = filtered.filter((p) => p.status === status)
    } else {
      filtered = filtered.filter((p) => p.status !== 'archived')
    }
    if (categoryIds) filtered = filtered.filter((p) => categoryIds.has(p.category_id))
    if (search) {
      const q = search.toLowerCase()
      filtered = filtered.filter(
        (p) => p.name.toLowerCase().includes(q) || p.sku_code.toLowerCase().includes(q),
      )
    }
    filtered.sort((a, b) => a.name.localeCompare(b.name))

    const total = filtered.length
    const page = filtered.slice(offset, offset + limit)
    const rows: ProductRow[] = page
    const dto = rows.map((p) => {
      const cat = memoryCategories.find((c) => c.id === p.category_id)
      const unit = memoryUnits.find((u) => u.id === p.unit_id)
      return toProductDto({ ...p, categories: cat ? { name: cat.name } : null, units: unit ? { name: unit.name, abbreviation: unit.abbreviation } : null }, req.role)
    })

    res.json({ products: dto, total, limit, offset })
  }),
)

// -----------------------------------------------------------------------------
// 2. POST /api/products — create product (Admin only)
// -----------------------------------------------------------------------------
router.post(
  '/products',
  requireAuth,
  validate(createProductSchema),
  asyncHandler(async (req, res) => {
    assertCanManageProducts(req.role)

    const input = validated(req, 'body', createProductSchema) as CreateProductInput

    // Business rule: target >= reorder >= safety.
    const levels = validateStockLevels(input.default_target_level ?? 0, input.default_reorder_point ?? 0, input.default_safety_stock ?? 0)
    if (!levels.ok) {
      throw new AppError(422, levels.message!, 'INVALID_STOCK_LEVELS')
    }
    // DB consistency: perishable products must declare a shelf life.
    if (input.is_perishable && (input.shelf_life_days == null || input.shelf_life_days <= 0)) {
      throw new AppError(422, 'Perishable products require a positive shelf_life_days', 'INVALID_PERISHABLE')
    }
    // Reference checks for fallback mode (SQL mode enforces via FKs).
    if (!memoryCategories.some((c) => c.id === input.categoryId) || !memoryUnits.some((u) => u.id === input.unitId)) {
      throw new AppError(400, 'Category or unit does not exist', 'INVALID_REFERENCE')
    }
    if (memoryProducts.some((p) => p.sku_code.toLowerCase() === input.sku_code.toLowerCase())) {
      throw new AppError(409, 'SKU code already exists', 'SKU_ALREADY_EXISTS')
    }

    const now = new Date().toISOString()
    const newRecord: LocalProduct = {
      id: randomUUID(),
      sku_code: input.sku_code,
      name: input.name,
      description: input.description ?? null,
      category_id: input.categoryId,
      unit_id: input.unitId,
      cost_price: input.cost_price,
      sale_price: input.sale_price,
      default_safety_stock: input.default_safety_stock ?? 0,
      default_reorder_point: input.default_reorder_point ?? 0,
      default_target_level: input.default_target_level ?? 0,
      is_perishable: input.is_perishable ?? false,
      shelf_life_days: input.shelf_life_days ?? null,
      status: input.status ?? 'active',
      created_by: req.userId ?? null,
      created_at: now,
      updated_at: now,
    }

    if (!isMockSupabase) {
      try {
        const { data, error } = await supabase
          .from('products')
          .insert({ ...toProductColumns(input), created_by: req.userId ?? null })
          .select('id, sku_code, name, description, category_id, unit_id, cost_price, sale_price, default_safety_stock, default_reorder_point, default_target_level, is_perishable, shelf_life_days, status, created_by, created_at, updated_at, categories(name), units(name)')
          .single()

        if (!error && data) {
          const local = toLocalProduct(data as unknown as ProductRow)
          memoryProducts.unshift(local)
          registerProductInMockStores(local)
          return res.status(201).json({ product: toProductDto(data as unknown as ProductRow, req.role) })
        }
        if (error?.code === '23505') {
          throw new AppError(409, 'SKU code already exists', 'SKU_ALREADY_EXISTS')
        }
        if (error?.code === '23503') {
          throw new AppError(400, 'Category or unit does not exist', 'INVALID_REFERENCE')
        }
      } catch (e) {
        if (e instanceof AppError) throw e
        // Fallback to in-memory store on transport/other errors
      }
    }

    memoryProducts.unshift(newRecord)
    registerProductInMockStores(newRecord)
    res.status(201).json({
      product: toProductDto(
        { ...newRecord, categories: { name: memoryCategories.find((c) => c.id === newRecord.category_id)?.name ?? '—' }, units: { name: memoryUnits.find((u) => u.id === newRecord.unit_id)?.name ?? '—' } },
        req.role,
      ),
    })
  }),
)

// -----------------------------------------------------------------------------
// 3. GET /api/products/:id — product detail (masked cost for non-admin)
// -----------------------------------------------------------------------------
router.get(
  '/products/:id',
  requireAuth,
  validate(productIdParamSchema, 'params'),
  asyncHandler(async (req, res) => {
    const { id } = validated(req, 'params', productIdParamSchema)

    if (!isMockSupabase) {
      try {
        const { data, error } = await supabase
          .from('products')
          .select('id, sku_code, name, description, category_id, unit_id, cost_price, sale_price, default_safety_stock, default_reorder_point, default_target_level, is_perishable, shelf_life_days, status, created_by, created_at, updated_at, categories(name), units(name)')
          .eq('id', id)
          .maybeSingle()
        if (!error && data) {
          return res.json({ product: toProductDto(data as unknown as ProductRow, req.role) })
        }
      } catch {
        // Fallback
      }
    }

    const found = memoryProducts.find((p) => p.id === id)
    if (!found) throw new AppError(404, 'Product not found', 'PRODUCT_NOT_FOUND')

    const cat = memoryCategories.find((c) => c.id === found.category_id)
    const unit = memoryUnits.find((u) => u.id === found.unit_id)
    res.json({
      product: toProductDto(
        { ...found, categories: cat ? { name: cat.name } : null, units: unit ? { name: unit.name, abbreviation: unit.abbreviation } : null },
        req.role,
      ),
    })
  }),
)

// -----------------------------------------------------------------------------
// 4. PATCH /api/products/:id — update product (Admin only)
// -----------------------------------------------------------------------------
router.patch(
  '/products/:id',
  requireAuth,
  validate(productIdParamSchema, 'params'),
  validate(updateProductSchema),
  asyncHandler(async (req, res) => {
    assertCanManageProducts(req.role)

    const { id } = validated(req, 'params', productIdParamSchema)
    const updates = validated(req, 'body', updateProductSchema) as UpdateProductInput

    // Resolve current values (memory-first validation; mirrors DB CHECKs).
    const memIdx = memoryProducts.findIndex((p) => p.id === id)
    if (memIdx >= 0) {
      const current = memoryProducts[memIdx]

      if (updates.sku_code !== undefined && updates.sku_code.toLowerCase() !== current.sku_code.toLowerCase()) {
        if (memoryProducts.some((p) => p.id !== id && p.sku_code.toLowerCase() === updates.sku_code!.toLowerCase())) {
          throw new AppError(409, 'SKU code already exists', 'SKU_ALREADY_EXISTS')
        }
      }

      if (updates.categoryId !== undefined && !memoryCategories.some((c) => c.id === updates.categoryId)) {
        throw new AppError(400, 'Category does not exist', 'INVALID_REFERENCE')
      }
      if (updates.unitId !== undefined && !memoryUnits.some((u) => u.id === updates.unitId)) {
        throw new AppError(400, 'Unit does not exist', 'INVALID_REFERENCE')
      }

      const target = updates.default_target_level ?? current.default_target_level
      const reorder = updates.default_reorder_point ?? current.default_reorder_point
      const safety = updates.default_safety_stock ?? current.default_safety_stock
      const levels = validateStockLevels(target, reorder, safety)
      if (!levels.ok) {
        throw new AppError(422, levels.message!, 'INVALID_STOCK_LEVELS')
      }

      const isPerishable = updates.is_perishable ?? current.is_perishable
      const shelfLife = updates.shelf_life_days !== undefined ? updates.shelf_life_days : current.shelf_life_days
      if (isPerishable && (shelfLife == null || shelfLife <= 0)) {
        throw new AppError(422, 'Perishable products require a positive shelf_life_days', 'INVALID_PERISHABLE')
      }
    }

    const columns: Record<string, unknown> = {
      ...toProductColumns(updates),
      updated_at: new Date().toISOString(),
    }

    if (!isMockSupabase) {
      try {
        const { data, error } = await supabase
          .from('products')
          .update(columns)
          .eq('id', id)
          .select('id, sku_code, name, description, category_id, unit_id, cost_price, sale_price, default_safety_stock, default_reorder_point, default_target_level, is_perishable, shelf_life_days, status, created_by, created_at, updated_at, categories(name), units(name)')
          .maybeSingle()

        if (!error && data) {
          const local = toLocalProduct(data as unknown as ProductRow)
          const idx = memoryProducts.findIndex((p) => p.id === id)
          if (idx >= 0) memoryProducts[idx] = local
          else memoryProducts.unshift(local)
          syncProductToMockStores(local)
          registerProductInMockStores(local)
          return res.json({ product: toProductDto(data as unknown as ProductRow, req.role) })
        }
        if (error?.code === '23505') {
          throw new AppError(409, 'SKU code already exists', 'SKU_ALREADY_EXISTS')
        }
        if (error?.code === '23514') {
          throw new AppError(422, 'Invalid product values (target must be >= reorder >= safety)', 'INVALID_STOCK_LEVELS')
        }
      } catch (e) {
        if (e instanceof AppError) throw e
        // Fallback to in-memory store on transport/other errors
      }
    }

    const idx = memoryProducts.findIndex((p) => p.id === id)
    if (idx < 0) throw new AppError(404, 'Product not found', 'PRODUCT_NOT_FOUND')

    const current = memoryProducts[idx]
    const updated: LocalProduct = {
      ...current,
      sku_code: updates.sku_code ?? current.sku_code,
      name: updates.name ?? current.name,
      description: updates.description !== undefined ? updates.description ?? null : current.description,
      category_id: updates.categoryId ?? current.category_id,
      unit_id: updates.unitId ?? current.unit_id,
      cost_price: updates.cost_price ?? current.cost_price,
      sale_price: updates.sale_price ?? current.sale_price,
      default_safety_stock: updates.default_safety_stock ?? current.default_safety_stock,
      default_reorder_point: updates.default_reorder_point ?? current.default_reorder_point,
      default_target_level: updates.default_target_level ?? current.default_target_level,
      is_perishable: updates.is_perishable ?? current.is_perishable,
      shelf_life_days: updates.shelf_life_days !== undefined ? updates.shelf_life_days : current.shelf_life_days,
      status: updates.status ?? current.status,
      updated_at: new Date().toISOString(),
    }
    memoryProducts[idx] = updated
    syncProductToMockStores(updated)
    registerProductInMockStores(updated)

    const cat = memoryCategories.find((c) => c.id === updated.category_id)
    const unit = memoryUnits.find((u) => u.id === updated.unit_id)
    res.json({
      product: toProductDto(
        { ...updated, categories: cat ? { name: cat.name } : null, units: unit ? { name: unit.name, abbreviation: unit.abbreviation } : null },
        req.role,
      ),
    })
  }),
)

// -----------------------------------------------------------------------------
// 5. PATCH /api/products/:id/archive — soft archive (Admin only)
// -----------------------------------------------------------------------------
router.patch(
  '/products/:id/archive',
  requireAuth,
  validate(productIdParamSchema, 'params'),
  asyncHandler(async (req, res) => {
    assertCanManageProducts(req.role)

    const { id } = validated(req, 'params', productIdParamSchema)

    if (!isMockSupabase) {
      try {
        const { data, error } = await supabase
          .from('products')
          .update({ status: 'archived', updated_at: new Date().toISOString() })
          .eq('id', id)
          .select('id, sku_code, name, description, category_id, unit_id, cost_price, sale_price, default_safety_stock, default_reorder_point, default_target_level, is_perishable, shelf_life_days, status, created_at, updated_at')
          .maybeSingle()

        if (!error && data) {
          const local = { ...toLocalProduct(data as unknown as ProductRow), created_by: req.userId ?? null }
          const idx = memoryProducts.findIndex((p) => p.id === id)
          if (idx >= 0) memoryProducts[idx] = local
          syncProductToMockStores(local)
          return res.json({ message: 'Product archived successfully', product: toProductDto(data as unknown as ProductRow, req.role) })
        }
      } catch {
        // Fallback
      }
    }

    const idx = memoryProducts.findIndex((p) => p.id === id)
    if (idx < 0) throw new AppError(404, 'Product not found', 'PRODUCT_NOT_FOUND')

    const updated: LocalProduct = { ...memoryProducts[idx], status: 'archived', updated_at: new Date().toISOString() }
    memoryProducts[idx] = updated
    syncProductToMockStores(updated)

    res.json({ message: 'Product archived successfully' })
  }),
)

export default router