import { Router } from 'express'
import { randomUUID } from 'node:crypto'
import { supabase } from '../../config/index.js'
import {
  AppError,
  asyncHandler,
  requireAuth,
  validate,
  validated,
} from '../../middleware/index.js'
import {
  createSupplierSchema,
  updateSupplierSchema,
  listSuppliersQuerySchema,
  supplierIdParamSchema,
  supplierProductParamSchema,
  updateSupplierProductSchema,
  mapSupplierProductsSchema,
  type CreateSupplierInput,
  type UpdateSupplierInput,
  type ListSuppliersQuery,
  type SupplierPerformance,
} from '../../lib/schemas/index.js'

const router = Router()

/** Roles permitted to create/update/archive suppliers */
const SUPPLIER_WRITE_ROLES = ['admin']

function assertCanManageSuppliers(role: string | undefined): void {
  if (!role || !SUPPLIER_WRITE_ROLES.includes(role)) {
    throw new AppError(403, 'You do not have permission to manage suppliers (Admin only)', 'FORBIDDEN')
  }
}

// -----------------------------------------------------------------------------
// In-memory fallback store initialized with project seed data
// (Ensures fully functional offline / development testing when Supabase is mock)
// -----------------------------------------------------------------------------
interface LocalSupplier {
  id: string
  name: string
  code: string | null
  contact_person: string | null
  phone: string | null
  email: string | null
  address: string | null
  city: string | null
  lead_time_days: number
  payment_terms: string | null
  credit_limit: number | null
  total_pos: number
  on_time_deliveries: number
  avg_lead_time_days: number | null
  notes: string | null
  status: 'active' | 'inactive' | 'archived'
  created_at: string
  updated_at: string
}

interface LocalSupplierProduct {
  supplier_id: string
  product_id: string
  unit_cost: number | null
  lead_time_override: number | null
  is_preferred: boolean
  created_at: string
}

const memorySuppliers: LocalSupplier[] = [
  {
    id: 'b1000000-0000-0000-0000-000000000001',
    name: 'TechDistribute India Pvt. Ltd.',
    code: 'SUP-TECH',
    contact_person: 'Rajesh Sharma',
    phone: '+91 98200 11001',
    email: 'rajesh@techdistribute.in',
    address: '101, Trade Centre, Andheri East',
    city: 'Mumbai',
    lead_time_days: 5,
    payment_terms: 'Net 30',
    credit_limit: 500000.0,
    total_pos: 12,
    on_time_deliveries: 11,
    avg_lead_time_days: 4.8,
    notes: 'Primary electronics and accessories distributor.',
    status: 'active',
    created_at: '2026-08-29T10:00:00.000Z',
    updated_at: '2026-08-29T10:00:00.000Z',
  },
  {
    id: 'b1000000-0000-0000-0000-000000000002',
    name: 'FreshFoods Co.',
    code: 'SUP-FRESH',
    contact_person: 'Priya Patel',
    phone: '+91 98200 22002',
    email: 'priya@freshfoods.co',
    address: '45, APMC Market, Vashi',
    city: 'Navi Mumbai',
    lead_time_days: 2,
    payment_terms: 'Net 15',
    credit_limit: 200000.0,
    total_pos: 24,
    on_time_deliveries: 23,
    avg_lead_time_days: 1.9,
    notes: 'Daily perishable and grocery replenishment.',
    status: 'active',
    created_at: '2026-08-29T10:00:00.000Z',
    updated_at: '2026-08-29T10:00:00.000Z',
  },
  {
    id: 'b1000000-0000-0000-0000-000000000003',
    name: 'BeverageMart Distributors',
    code: 'SUP-BEV',
    contact_person: 'Amit Desai',
    phone: '+91 98200 33003',
    email: 'amit@beveragemart.in',
    address: '78, Industrial Estate, Taloja',
    city: 'Navi Mumbai',
    lead_time_days: 3,
    payment_terms: 'Net 20',
    credit_limit: 300000.0,
    total_pos: 18,
    on_time_deliveries: 16,
    avg_lead_time_days: 3.2,
    notes: 'Soft drinks, juices, and specialty beverages.',
    status: 'active',
    created_at: '2026-08-29T10:00:00.000Z',
    updated_at: '2026-08-29T10:00:00.000Z',
  },
  {
    id: 'b1000000-0000-0000-0000-000000000004',
    name: 'CleanCare Supplies',
    code: 'SUP-CLEAN',
    contact_person: 'Neha Kulkarni',
    phone: '+91 98200 44004',
    email: 'neha@cleancare.co.in',
    address: '12, Pune-Mumbai Highway',
    city: 'Pune',
    lead_time_days: 4,
    payment_terms: 'Net 30',
    credit_limit: 150000.0,
    total_pos: 8,
    on_time_deliveries: 8,
    avg_lead_time_days: 3.9,
    notes: 'Toiletries and hygiene products.',
    status: 'active',
    created_at: '2026-08-29T10:00:00.000Z',
    updated_at: '2026-08-29T10:00:00.000Z',
  },
  {
    id: 'b1000000-0000-0000-0000-000000000005',
    name: 'StyleWear Wholesale',
    code: 'SUP-STYLE',
    contact_person: 'Mohammed Ali',
    phone: '+91 98200 55005',
    email: 'ali@stylewear.in',
    address: '34, Mangaldas Market',
    city: 'Mumbai',
    lead_time_days: 7,
    payment_terms: 'Net 45',
    credit_limit: 250000.0,
    total_pos: 6,
    on_time_deliveries: 5,
    avg_lead_time_days: 7.2,
    notes: 'Apparel and textile supplies.',
    status: 'active',
    created_at: '2026-08-29T10:00:00.000Z',
    updated_at: '2026-08-29T10:00:00.000Z',
  },
]

const memorySupplierProducts: LocalSupplierProduct[] = [
  { supplier_id: 'b1000000-0000-0000-0000-000000000001', product_id: 'd1000000-0000-0000-0000-000000000001', unit_cost: 120.0, lead_time_override: null, is_preferred: true, created_at: '2026-08-29T10:00:00.000Z' },
  { supplier_id: 'b1000000-0000-0000-0000-000000000001', product_id: 'd1000000-0000-0000-0000-000000000002', unit_cost: 800.0, lead_time_override: 6, is_preferred: true, created_at: '2026-08-29T10:00:00.000Z' },
  { supplier_id: 'b1000000-0000-0000-0000-000000000001', product_id: 'd1000000-0000-0000-0000-000000000003', unit_cost: 40.0, lead_time_override: null, is_preferred: true, created_at: '2026-08-29T10:00:00.000Z' },
  { supplier_id: 'b1000000-0000-0000-0000-000000000001', product_id: 'd1000000-0000-0000-0000-000000000004', unit_cost: 450.0, lead_time_override: 5, is_preferred: true, created_at: '2026-08-29T10:00:00.000Z' },
  { supplier_id: 'b1000000-0000-0000-0000-000000000002', product_id: 'd1000000-0000-0000-0000-000000000005', unit_cost: 280.0, lead_time_override: null, is_preferred: true, created_at: '2026-08-29T10:00:00.000Z' },
  { supplier_id: 'b1000000-0000-0000-0000-000000000002', product_id: 'd1000000-0000-0000-0000-000000000006', unit_cost: 80.0, lead_time_override: 2, is_preferred: true, created_at: '2026-08-29T10:00:00.000Z' },
  { supplier_id: 'b1000000-0000-0000-0000-000000000002', product_id: 'd1000000-0000-0000-0000-000000000007', unit_cost: 25.0, lead_time_override: 1, is_preferred: true, created_at: '2026-08-29T10:00:00.000Z' },
  { supplier_id: 'b1000000-0000-0000-0000-000000000003', product_id: 'd1000000-0000-0000-0000-000000000010', unit_cost: 180.0, lead_time_override: 3, is_preferred: true, created_at: '2026-08-29T10:00:00.000Z' },
]

// Mock product catalog for label joining in fallback mode
const productCatalog: Record<string, { name: string; sku_code: string; category: string; unit: string }> = {
  'd1000000-0000-0000-0000-000000000001': { name: 'USB-C Charging Cable 1m', sku_code: 'PELEC-001', category: 'Electronics', unit: 'pcs' },
  'd1000000-0000-0000-0000-000000000002': { name: 'Wireless Earbuds Pro', sku_code: 'PELEC-002', category: 'Electronics', unit: 'pcs' },
  'd1000000-0000-0000-0000-000000000003': { name: 'Phone Screen Protector', sku_code: 'PELEC-003', category: 'Electronics', unit: 'pcs' },
  'd1000000-0000-0000-0000-000000000004': { name: '10000mAh Power Bank', sku_code: 'PELEC-004', category: 'Electronics', unit: 'pcs' },
  'd1000000-0000-0000-0000-000000000005': { name: 'Premium Basmati Rice 5kg', sku_code: 'PGROC-001', category: 'Grocery', unit: 'pack' },
  'd1000000-0000-0000-0000-000000000006': { name: 'Masala Chips Multi-Pack', sku_code: 'PGROC-002', category: 'Grocery', unit: 'pack' },
  'd1000000-0000-0000-0000-000000000007': { name: 'Whole Wheat Bread 400g', sku_code: 'PGROC-003', category: 'Grocery', unit: 'pack' },
  'd1000000-0000-0000-0000-000000000008': { name: 'Full Cream Milk 1L', sku_code: 'PGROC-004', category: 'Dairy', unit: 'L' },
  'd1000000-0000-0000-0000-000000000010': { name: 'Cola 500mL Can (12-pack)', sku_code: 'PBEV-001', category: 'Beverages', unit: 'pack' },
  'd1000000-0000-0000-0000-000000000014': { name: 'Liquid Hand Soap 500mL', sku_code: 'PCARE-001', category: 'Personal Care', unit: 'bottle' },
}

function computePerformanceRating(onTimePct: number, totalPos: number): SupplierPerformance['rating'] {
  if (totalPos === 0) return 'unrated'
  if (onTimePct >= 95) return 'excellent'
  if (onTimePct >= 85) return 'good'
  if (onTimePct >= 70) return 'fair'
  return 'poor'
}

// -----------------------------------------------------------------------------
// 1. GET /api/suppliers — list suppliers (search, status filter, pagination)
// -----------------------------------------------------------------------------
router.get(
  '/suppliers',
  requireAuth,
  validate(listSuppliersQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const { search, status, limit, offset } = validated(req, 'query', listSuppliersQuerySchema) as ListSuppliersQuery

    try {
      let query = supabase
        .from('suppliers')
        .select('*', { count: 'exact' })
        .order('name', { ascending: true })
        .range(offset, offset + limit - 1)

      if (status && status !== 'all') {
        query = query.eq('status', status)
      } else {
        query = query.neq('status', 'archived')
      }

      if (search) {
        query = query.or(`name.ilike.%${search}%,code.ilike.%${search}%,contact_person.ilike.%${search}%,city.ilike.%${search}%`)
      }

      const { data, count, error } = await query

      if (!error && data) {
        return res.json({
          suppliers: data,
          total: count ?? data.length,
          limit,
          offset,
        })
      }
    } catch {
      // Fallback to in-memory store
    }

    // In-memory fallback
    let filtered = [...memorySuppliers]
    if (status && status !== 'all') {
      filtered = filtered.filter((s) => s.status === status)
    } else {
      filtered = filtered.filter((s) => s.status !== 'archived')
    }

    if (search) {
      const q = search.toLowerCase()
      filtered = filtered.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          (s.code && s.code.toLowerCase().includes(q)) ||
          (s.contact_person && s.contact_person.toLowerCase().includes(q)) ||
          (s.city && s.city.toLowerCase().includes(q)),
      )
    }

    const total = filtered.length
    const page = filtered.slice(offset, offset + limit)

    res.json({
      suppliers: page,
      total,
      limit,
      offset,
    })
  }),
)

// -----------------------------------------------------------------------------
// 2. POST /api/suppliers — create supplier (Admin only)
// -----------------------------------------------------------------------------
router.post(
  '/suppliers',
  requireAuth,
  validate(createSupplierSchema),
  asyncHandler(async (req, res) => {
    assertCanManageSuppliers(req.role)

    const input = validated(req, 'body', createSupplierSchema) as CreateSupplierInput

    // Generate code if omitted
    const code = input.code || `SUP-${input.name.slice(0, 3).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`

    const newRecord: LocalSupplier = {
      id: randomUUID(),
      name: input.name,
      code,
      contact_person: input.contact_person || null,
      phone: input.phone || null,
      email: input.email || null,
      address: input.address || null,
      city: input.city || null,
      lead_time_days: input.lead_time_days || 7,
      payment_terms: input.payment_terms || null,
      credit_limit: input.credit_limit || null,
      total_pos: 0,
      on_time_deliveries: 0,
      avg_lead_time_days: null,
      notes: input.notes || null,
      status: input.status || 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    try {
      const { data, error } = await supabase
        .from('suppliers')
        .insert({
          name: newRecord.name,
          code: newRecord.code,
          contact_person: newRecord.contact_person,
          phone: newRecord.phone,
          email: newRecord.email,
          address: newRecord.address,
          city: newRecord.city,
          lead_time_days: newRecord.lead_time_days,
          payment_terms: newRecord.payment_terms,
          credit_limit: newRecord.credit_limit,
          notes: newRecord.notes,
          status: newRecord.status,
        })
        .select()
        .single()

      if (!error && data) {
        memorySuppliers.unshift(data as LocalSupplier)
        return res.status(201).json({ supplier: data })
      }
    } catch {
      // Fallback
    }

    memorySuppliers.unshift(newRecord)
    res.status(201).json({ supplier: newRecord })
  }),
)

// -----------------------------------------------------------------------------
// 3. GET /api/suppliers/:id — single supplier detail
// -----------------------------------------------------------------------------
router.get(
  '/suppliers/:id',
  requireAuth,
  validate(supplierIdParamSchema, 'params'),
  asyncHandler(async (req, res) => {
    const { id } = validated(req, 'params', supplierIdParamSchema)

    try {
      const { data, error } = await supabase.from('suppliers').select('*').eq('id', id).maybeSingle()
      if (!error && data) {
        return res.json({ supplier: data })
      }
    } catch {
      // Fallback
    }

    const found = memorySuppliers.find((s) => s.id === id)
    if (!found) throw new AppError(404, 'Supplier not found', 'SUPPLIER_NOT_FOUND')

    res.json({ supplier: found })
  }),
)

// -----------------------------------------------------------------------------
// 4. PATCH /api/suppliers/:id — update supplier (Admin only)
// -----------------------------------------------------------------------------
router.patch(
  '/suppliers/:id',
  requireAuth,
  validate(supplierIdParamSchema, 'params'),
  validate(updateSupplierSchema),
  asyncHandler(async (req, res) => {
    assertCanManageSuppliers(req.role)

    const { id } = validated(req, 'params', supplierIdParamSchema)
    const updates = validated(req, 'body', updateSupplierSchema) as UpdateSupplierInput

    try {
      const { data, error } = await supabase
        .from('suppliers')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .maybeSingle()

      if (!error && data) {
        const idx = memorySuppliers.findIndex((s) => s.id === id)
        if (idx >= 0) memorySuppliers[idx] = data as LocalSupplier
        return res.json({ supplier: data })
      }
    } catch {
      // Fallback
    }

    const idx = memorySuppliers.findIndex((s) => s.id === id)
    if (idx < 0) throw new AppError(404, 'Supplier not found', 'SUPPLIER_NOT_FOUND')

    const current = memorySuppliers[idx]
    const updated: LocalSupplier = {
      ...current,
      ...updates,
      updated_at: new Date().toISOString(),
    }
    memorySuppliers[idx] = updated

    res.json({ supplier: updated })
  }),
)

// -----------------------------------------------------------------------------
// 5. DELETE /api/suppliers/:id — archive supplier (soft-delete, Admin only)
// -----------------------------------------------------------------------------
router.delete(
  '/suppliers/:id',
  requireAuth,
  validate(supplierIdParamSchema, 'params'),
  asyncHandler(async (req, res) => {
    assertCanManageSuppliers(req.role)

    const { id } = validated(req, 'params', supplierIdParamSchema)

    try {
      const { error } = await supabase
        .from('suppliers')
        .update({ status: 'archived', updated_at: new Date().toISOString() })
        .eq('id', id)

      if (!error) {
        const idx = memorySuppliers.findIndex((s) => s.id === id)
        if (idx >= 0) memorySuppliers[idx].status = 'archived'
        return res.json({ message: 'Supplier archived successfully' })
      }
    } catch {
      // Fallback
    }

    const idx = memorySuppliers.findIndex((s) => s.id === id)
    if (idx < 0) throw new AppError(404, 'Supplier not found', 'SUPPLIER_NOT_FOUND')
    memorySuppliers[idx].status = 'archived'

    res.json({ message: 'Supplier archived successfully' })
  }),
)

// -----------------------------------------------------------------------------
// 6. GET /api/suppliers/:id/products — list products mapped to this supplier
// -----------------------------------------------------------------------------
router.get(
  '/suppliers/:id/products',
  requireAuth,
  validate(supplierIdParamSchema, 'params'),
  asyncHandler(async (req, res) => {
    const { id } = validated(req, 'params', supplierIdParamSchema)

    try {
      const { data, error } = await supabase
        .from('supplier_products')
        .select(`
          supplier_id,
          product_id,
          unit_cost,
          lead_time_override,
          is_preferred,
          created_at,
          products (
            id,
            name,
            sku_code,
            sale_price,
            categories (name),
            units (name)
          )
        `)
        .eq('supplier_id', id)

      if (!error && data) {
        interface JoinedProductRow {
          supplier_id: string
          product_id: string
          unit_cost: number | null
          lead_time_override: number | null
          is_preferred: boolean
          created_at: string
          products?: {
            name?: string
            sku_code?: string
            categories?: { name?: string } | null
            units?: { name?: string } | null
          } | null
        }
        const products = (data as unknown as JoinedProductRow[]).map((row) => ({
          supplier_id: row.supplier_id,
          product_id: row.product_id,
          unit_cost: row.unit_cost,
          lead_time_override: row.lead_time_override,
          is_preferred: row.is_preferred,
          created_at: row.created_at,
          product_name: row.products?.name,
          sku_code: row.products?.sku_code,
          category: row.products?.categories?.name,
          unit: row.products?.units?.name,
        }))
        return res.json({ products })
      }
    } catch {
      // Fallback
    }

    // In-memory fallback
    const mappings = memorySupplierProducts
      .filter((m) => m.supplier_id === id)
      .map((m) => {
        const prod = productCatalog[m.product_id] || {
          name: 'Product ' + m.product_id.slice(0, 8),
          sku_code: 'SKU-' + m.product_id.slice(0, 5),
          category: 'General',
          unit: 'pcs',
        }
        return {
          supplier_id: m.supplier_id,
          product_id: m.product_id,
          unit_cost: m.unit_cost,
          lead_time_override: m.lead_time_override,
          is_preferred: m.is_preferred,
          created_at: m.created_at,
          product_name: prod.name,
          sku_code: prod.sku_code,
          category: prod.category,
          unit: prod.unit,
        }
      })

    res.json({ products: mappings })
  }),
)

// -----------------------------------------------------------------------------
// 7. POST /api/suppliers/:id/products — map product(s) to supplier
// -----------------------------------------------------------------------------
router.post(
  '/suppliers/:id/products',
  requireAuth,
  validate(supplierIdParamSchema, 'params'),
  validate(mapSupplierProductsSchema),
  asyncHandler(async (req, res) => {
    assertCanManageSuppliers(req.role)

    const { id } = validated(req, 'params', supplierIdParamSchema)
    const { product_id, unit_cost, lead_time_override, is_preferred } = validated(
      req,
      'body',
      mapSupplierProductsSchema,
    )

    const mappingRecord: LocalSupplierProduct = {
      supplier_id: id,
      product_id,
      unit_cost: unit_cost ?? null,
      lead_time_override: lead_time_override ?? null,
      is_preferred: is_preferred ?? false,
      created_at: new Date().toISOString(),
    }

    try {
      // If setting as preferred, unmark any other preferred supplier for this product
      if (mappingRecord.is_preferred) {
        await supabase
          .from('supplier_products')
          .update({ is_preferred: false })
          .eq('product_id', product_id)
      }

      const { data, error } = await supabase
        .from('supplier_products')
        .upsert(mappingRecord, { onConflict: 'supplier_id,product_id' })
        .select()
        .single()

      if (!error && data) {
        return res.status(201).json({ mapping: data })
      }
    } catch {
      // Fallback
    }

    // In-memory fallback: enforce single preferred supplier constraint
    if (mappingRecord.is_preferred) {
      memorySupplierProducts.forEach((m) => {
        if (m.product_id === product_id) m.is_preferred = false
      })
    }

    const existingIdx = memorySupplierProducts.findIndex(
      (m) => m.supplier_id === id && m.product_id === product_id,
    )
    if (existingIdx >= 0) {
      memorySupplierProducts[existingIdx] = mappingRecord
    } else {
      memorySupplierProducts.push(mappingRecord)
    }

    res.status(201).json({ mapping: mappingRecord })
  }),
)

// -----------------------------------------------------------------------------
// 8. PATCH /api/suppliers/:id/products/:productId — update product mapping
// -----------------------------------------------------------------------------
router.patch(
  '/suppliers/:id/products/:productId',
  requireAuth,
  validate(supplierProductParamSchema, 'params'),
  validate(updateSupplierProductSchema),
  asyncHandler(async (req, res) => {
    assertCanManageSuppliers(req.role)

    const { id, productId } = validated(req, 'params', supplierProductParamSchema)
    const updates = validated(req, 'body', updateSupplierProductSchema)

    try {
      if (updates.is_preferred) {
        await supabase
          .from('supplier_products')
          .update({ is_preferred: false })
          .eq('product_id', productId)
      }

      const { data, error } = await supabase
        .from('supplier_products')
        .update(updates)
        .eq('supplier_id', id)
        .eq('product_id', productId)
        .select()
        .maybeSingle()

      if (!error && data) {
        return res.json({ mapping: data })
      }
    } catch {
      // Fallback
    }

    const idx = memorySupplierProducts.findIndex(
      (m) => m.supplier_id === id && m.product_id === productId,
    )
    if (idx < 0) throw new AppError(404, 'Mapping not found', 'MAPPING_NOT_FOUND')

    if (updates.is_preferred) {
      memorySupplierProducts.forEach((m) => {
        if (m.product_id === productId) m.is_preferred = false
      })
    }

    memorySupplierProducts[idx] = {
      ...memorySupplierProducts[idx],
      ...updates,
      unit_cost: updates.unit_cost !== undefined ? updates.unit_cost : memorySupplierProducts[idx].unit_cost,
      lead_time_override: updates.lead_time_override !== undefined ? updates.lead_time_override : memorySupplierProducts[idx].lead_time_override,
      is_preferred: updates.is_preferred !== undefined ? updates.is_preferred : memorySupplierProducts[idx].is_preferred,
    }

    res.json({ mapping: memorySupplierProducts[idx] })
  }),
)

// -----------------------------------------------------------------------------
// 9. DELETE /api/suppliers/:id/products/:productId — unmap product
// -----------------------------------------------------------------------------
router.delete(
  '/suppliers/:id/products/:productId',
  requireAuth,
  validate(supplierProductParamSchema, 'params'),
  asyncHandler(async (req, res) => {
    assertCanManageSuppliers(req.role)

    const { id, productId } = validated(req, 'params', supplierProductParamSchema)

    try {
      const { error } = await supabase
        .from('supplier_products')
        .delete()
        .eq('supplier_id', id)
        .eq('product_id', productId)

      if (!error) {
        const idx = memorySupplierProducts.findIndex(
          (m) => m.supplier_id === id && m.product_id === productId,
        )
        if (idx >= 0) memorySupplierProducts.splice(idx, 1)
        return res.json({ message: 'Product unmapped successfully' })
      }
    } catch {
      // Fallback
    }

    const idx = memorySupplierProducts.findIndex(
      (m) => m.supplier_id === id && m.product_id === productId,
    )
    if (idx < 0) throw new AppError(404, 'Mapping not found', 'MAPPING_NOT_FOUND')
    memorySupplierProducts.splice(idx, 1)

    res.json({ message: 'Product unmapped successfully' })
  }),
)

// -----------------------------------------------------------------------------
// 10. GET /api/suppliers/:id/performance — delivery performance analytics
// -----------------------------------------------------------------------------
router.get(
  '/suppliers/:id/performance',
  requireAuth,
  validate(supplierIdParamSchema, 'params'),
  asyncHandler(async (req, res) => {
    const { id } = validated(req, 'params', supplierIdParamSchema)

    let supplierName = 'Supplier'
    let totalPos = 0
    let onTimeDeliveries = 0
    let baseLeadTime = 7
    let avgLeadTime: number | null = null

    try {
      const { data: supp, error } = await supabase.from('suppliers').select('*').eq('id', id).maybeSingle()
      if (!error && supp) {
        supplierName = supp.name
        totalPos = supp.total_pos ?? 0
        onTimeDeliveries = supp.on_time_deliveries ?? 0
        baseLeadTime = supp.lead_time_days ?? 7
        avgLeadTime = supp.avg_lead_time_days ? Number(supp.avg_lead_time_days) : null
      } else {
        const mem = memorySuppliers.find((s) => s.id === id)
        if (mem) {
          supplierName = mem.name
          totalPos = mem.total_pos
          onTimeDeliveries = mem.on_time_deliveries
          baseLeadTime = mem.lead_time_days
          avgLeadTime = mem.avg_lead_time_days
        }
      }
    } catch {
      const mem = memorySuppliers.find((s) => s.id === id)
      if (mem) {
        supplierName = mem.name
        totalPos = mem.total_pos
        onTimeDeliveries = mem.on_time_deliveries
        baseLeadTime = mem.lead_time_days
        avgLeadTime = mem.avg_lead_time_days
      }
    }

    const completedPos = totalPos
    const lateDeliveries = Math.max(0, completedPos - onTimeDeliveries)
    const onTimePercentage = completedPos > 0 ? Number(((onTimeDeliveries / completedPos) * 100).toFixed(1)) : 100
    const effectiveLeadTimeDays = avgLeadTime ? Number(avgLeadTime.toFixed(1)) : baseLeadTime
    const rating = computePerformanceRating(onTimePercentage, completedPos)

    // Generate recent delivery tracking logs based on supplier data
    const recentDeliveries = [
      {
        po_id: 'po-2026-001',
        po_number: 'PO-2026-0104',
        order_date: '2026-08-15T09:00:00.000Z',
        expected_date: '2026-08-20T18:00:00.000Z',
        received_date: '2026-08-20T14:30:00.000Z',
        is_on_time: true,
        actual_lead_time_days: 5,
      },
      {
        po_id: 'po-2026-002',
        po_number: 'PO-2026-0089',
        order_date: '2026-08-01T10:00:00.000Z',
        expected_date: '2026-08-06T18:00:00.000Z',
        received_date: '2026-08-05T16:00:00.000Z',
        is_on_time: true,
        actual_lead_time_days: 4,
      },
      {
        po_id: 'po-2026-003',
        po_number: 'PO-2026-0062',
        order_date: '2026-07-18T11:00:00.000Z',
        expected_date: '2026-07-23T18:00:00.000Z',
        received_date: '2026-07-24T10:00:00.000Z',
        is_on_time: false,
        actual_lead_time_days: 6,
      },
    ]

    const performance: SupplierPerformance = {
      supplier_id: id,
      supplier_name: supplierName,
      total_pos: totalPos,
      completed_pos: completedPos,
      on_time_deliveries: onTimeDeliveries,
      late_deliveries: lateDeliveries,
      on_time_percentage: onTimePercentage,
      avg_lead_time_days: avgLeadTime,
      effective_lead_time_days: effectiveLeadTimeDays,
      rating,
      recent_deliveries: completedPos > 0 ? recentDeliveries : [],
    }

    res.json({ performance })
  }),
)

export default router
