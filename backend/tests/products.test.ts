import type { Server } from 'node:http'
import { createApp } from '../src/app.js'
import { deriveSkuPrefix, validateStockLevels } from '../src/modules/products/products.store.js'

let server: Server
let baseUrl: string

async function startServer(): Promise<void> {
  const app = createApp()
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => {
      const addr = server.address()
      if (addr && typeof addr === 'object') {
        baseUrl = `http://localhost:${addr.port}/api`
      }
      resolve()
    })
  })
}

async function stopServer(): Promise<void> {
  if (server) {
    await new Promise<void>((resolve) => server.close(() => resolve()))
  }
}

let passedTests = 0
let failedTests = 0

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`)
    passedTests++
  } else {
    console.error(`  ❌ FAIL: ${message}`)
    failedTests++
  }
}

async function api(path: string, options: { headers?: Record<string, string>; method?: string; body?: unknown } = {}) {
  const res = await fetch(baseUrl + path, {
    method: options.method ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  })
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>
  return { res, json }
}

const adminHeaders = { Authorization: 'Bearer dev-admin-token' }
const staffHeaders = { Authorization: 'Bearer dev-token:00000000-0000-0000-0000-000000000002' }

const GROCERY = 'c1000000-0000-0000-0000-000000000002'
const ELECTRONICS = 'c1000000-0000-0000-0000-000000000001'
const PIECES = 'f1000000-0000-0000-0000-000000000001'

async function runTests() {
  console.log('\n======================================================')
  console.log('  VAULTORY PRODUCTS & CATEGORIES TEST SUITE (VAU-018)')
  console.log('======================================================\n')

  await startServer()

  try {
    // -------------------------------------------------------------------------
    // 0. PURE HELPER UNIT TESTS
    // -------------------------------------------------------------------------
    console.log('\n[Helpers]')
    assert(deriveSkuPrefix('Electronics') === 'ELEC', 'deriveSkuPrefix("Electronics") -> ELEC')
    assert(deriveSkuPrefix('Grocery') === 'GROC', 'deriveSkuPrefix("Grocery") -> GROC')
    assert(deriveSkuPrefix('Soft Drinks') === 'SD', 'deriveSkuPrefix("Soft Drinks") -> SD')
    assert(deriveSkuPrefix('') === 'GEN', 'deriveSkuPrefix("") -> GEN fallback')
    assert(validateStockLevels(30, 20, 10).ok === true, 'target 30 >= reorder 20 >= safety 10 is valid')
    assert(validateStockLevels(10, 20, 30).ok === false, 'target < reorder is invalid')
    assert(validateStockLevels(20, 10, 30).ok === false, 'reorder < safety is invalid')

    // -------------------------------------------------------------------------
    // 1. CREATE PRODUCT (Admin)
    // -------------------------------------------------------------------------
    console.log('\n[Product Create]')
    const createBody = {
      sku_code: 'PTEST-001',
      name: 'Vaultory Test Widget',
      description: 'A product created by the automated test suite',
      categoryId: GROCERY,
      unitId: PIECES,
      cost_price: 100,
      sale_price: 200,
      default_safety_stock: 10,
      default_reorder_point: 20,
      default_target_level: 30,
    }
    const created = await api('/products', { method: 'POST', headers: adminHeaders, body: createBody })
    assert(created.res.status === 201, 'Admin can create a valid product (201)')
    const newProduct = created.json.product as { id: string; sku_code: string; name: string; cost_price: number }
    assert(newProduct?.sku_code === 'PTEST-001', 'Created product returns its SKU')
    assert(newProduct?.cost_price === 100, 'Admin sees clear-text cost_price')
    const newProductId = newProduct?.id

    // -------------------------------------------------------------------------
    // 2. DUPLICATE SKU REJECTED
    // -------------------------------------------------------------------------
    const dup = await api('/products', { method: 'POST', headers: adminHeaders, body: createBody })
    assert(dup.res.status === 409 && dup.json.code === 'SKU_ALREADY_EXISTS', 'Duplicate SKU rejected (409 SKU_ALREADY_EXISTS)')

    // -------------------------------------------------------------------------
    // 3. INVALID STOCK LEVELS REJECTED
    // -------------------------------------------------------------------------
    const badLevels = await api('/products', {
      method: 'POST',
      headers: adminHeaders,
      body: { ...createBody, sku_code: 'PTEST-002', default_target_level: 10, default_reorder_point: 20, default_safety_stock: 30 },
    })
    assert(badLevels.res.status === 422 && badLevels.json.code === 'INVALID_STOCK_LEVELS', 'target < reorder < safety rejected (422 INVALID_STOCK_LEVELS)')

    // -------------------------------------------------------------------------
    // 4. NEGATIVE PRICE REJECTED
    // -------------------------------------------------------------------------
    const negPrice = await api('/products', {
      method: 'POST',
      headers: adminHeaders,
      body: { ...createBody, sku_code: 'PTEST-003', cost_price: -5 },
    })
    assert(negPrice.res.status === 400, 'Negative cost price rejected (400 VALIDATION_ERROR)')

    // -------------------------------------------------------------------------
    // 5. NON-ADMIN CANNOT CREATE
    // -------------------------------------------------------------------------
    const staffCreate = await api('/products', { method: 'POST', headers: staffHeaders, body: createBody })
    assert(staffCreate.res.status === 403, 'Non-admin create rejected (403 FORBIDDEN)')

    // -------------------------------------------------------------------------
    // 6. EDIT PRODUCT (Admin)
    // -------------------------------------------------------------------------
    console.log('\n[Product Edit]')
    const edited = await api(`/products/${newProductId}`, {
      method: 'PATCH',
      headers: adminHeaders,
      body: { name: 'Vaultory Test Widget R2', sale_price: 250, default_reorder_point: 25 },
    })
    assert(edited.res.status === 200, 'Admin can edit a product (200)')
    assert((edited.json.product as { sale_price?: number; name?: string })?.name === 'Vaultory Test Widget R2', 'Edited name persisted')

    // -------------------------------------------------------------------------
    // 7. COST PRICE MASKING
    // -------------------------------------------------------------------------
    console.log('\n[Masking]')
    const adminList = await api('/products', { headers: adminHeaders })
    const adminRow = (adminList.json.products as Array<{ sku_code: string; cost_price: unknown }>).find((p) => p.sku_code === 'PTEST-001')
    assert(adminRow?.cost_price === 100, 'Admin sees clear-text cost_price in list')

    const staffList = await api('/products', { headers: staffHeaders })
    const staffRow = (staffList.json.products as Array<{ sku_code: string; cost_price: unknown }>).find((p) => p.sku_code === 'PTEST-001')
    assert(staffRow?.cost_price === '••••', 'Cost price masked ("••••") for non-admin')

    const detailAsStaff = await api(`/products/${newProductId}`, { headers: staffHeaders })
    assert(detailAsStaff.json.product && (detailAsStaff.json.product as { cost_price: unknown }).cost_price === '••••', 'Detail cost price masked for non-admin')

    // -------------------------------------------------------------------------
    // 8. SEARCH & FILTER
    // -------------------------------------------------------------------------
    console.log('\n[Search & Filter]')
    const search = await api('/products?search=widget', { headers: adminHeaders })
    assert((search.json.products as Array<{ name: string }>).some((p) => p.name.includes('Widget')), 'Search by name works')

    // Leaf category filter matches products living exactly in that category.
    const SNAKS_LEAF = 'c2000000-0000-0000-0000-000000000003'
    const filterLeaf = await api(`/products?categoryId=${SNAKS_LEAF}`, { headers: adminHeaders })
    assert(
      (filterLeaf.json.products as Array<{ category_id: string }>).every((p) => p.category_id === SNAKS_LEAF),
      'Leaf category filter returns only products in that exact category',
    )

    // Broad parent filter includes products in all sub-categories (any depth).
    const filterParent = await api(`/products?categoryId=${ELECTRONICS}`, { headers: adminHeaders })
    const parentPids = new Set((filterParent.json.products as Array<{ category_id: string }>).map((p) => p.category_id))
    const descendantIds = new Set([
      ELECTRONICS,
      'c2000000-0000-0000-0000-000000000001', // Mobile Accessories
      'c2000000-0000-0000-0000-000000000002', // Audio
    ])
    assert(
      parentPids.size > 0 && [...parentPids].every((id) => descendantIds.has(id)),
      'Parent category filter includes products from its sub-categories',
    )
    assert(
      (filterParent.json.products as Array<{ id: string }>).some((p) => p.id === 'd1000000-0000-0000-0000-000000000002'),
      'Electronics filter surfaces a product living in the Audio sub-category',
    )

    // -------------------------------------------------------------------------
    // 9. ARCHIVE PRODUCT (soft delete)
    // -------------------------------------------------------------------------
    console.log('\n[Archive]')
    const archived = await api(`/products/${newProductId}/archive`, { method: 'PATCH', headers: adminHeaders })
    assert(archived.res.status === 200, 'Archive endpoint succeeds (200)')

    const detailAfter = (await api(`/products/${newProductId}`, { headers: adminHeaders })).json.product as { status: string }
    assert(detailAfter?.status === 'archived', 'Archived product status = archived (history retained)')

    const archivedOnly = await api('/products?status=archived', { headers: adminHeaders })
    assert(
      (archivedOnly.json.products as Array<{ id: string }>).some((p) => p.id === newProductId),
      'Archived product still returned via status=archived filter',
    )

    const activeList = await api('/products?status=active', { headers: adminHeaders })
    assert(
      !(activeList.json.products as Array<{ id: string }>).some((p) => p.id === newProductId),
      'Archived product excluded from active list (blocked from new transactions)',
    )

    // -------------------------------------------------------------------------
    // 10. CATEGORIES — hierarchy CRUD & guards
    // -------------------------------------------------------------------------
    console.log('\n[Categories]')
    const subCat = await api('/categories', {
      method: 'POST',
      headers: adminHeaders,
      body: { name: 'Cables', parentId: ELECTRONICS, sortOrder: 3 },
    })
    assert(subCat.res.status === 201, 'Admin can create a sub-category (201)')
    const subCatId = (subCat.json.category as { id: string })?.id

    const dupCat = await api('/categories', {
      method: 'POST',
      headers: adminHeaders,
      body: { name: 'Cables', parentId: ELECTRONICS },
    })
    assert(dupCat.res.status === 409 && dupCat.json.code === 'CATEGORY_NAME_EXISTS', 'Duplicate sibling category rejected (409)')

    const tree = await api('/categories?tree=true', { headers: adminHeaders })
    const electronicsNode = (tree.json.categories as Array<{ name: string; children: Array<{ name: string }> }>).find((c) => c.name === 'Electronics')
    assert(!!electronicsNode && electronicsNode.children.some((c) => c.name === 'Cables'), 'Tree mode nests sub-category under parent')

    const cycleCat = await api('/categories', { method: 'POST', headers: adminHeaders, body: { name: 'CycleTest', parentId: ELECTRONICS } })
    const cycleSubId = (cycleCat.json.category as { id: string })?.id
    const violates = await api(`/categories/${ELECTRONICS}`, {
      method: 'PATCH',
      headers: adminHeaders,
      body: { parentId: cycleSubId },
    })
    assert(violates.res.status === 422 && violates.json.code === 'CATEGORY_CYCLE_DETECTED', 'Category cycle rejected (422 CATEGORY_CYCLE_DETECTED)')

    const deactivateCat = await api(`/categories/${subCatId}`, { method: 'PATCH', headers: adminHeaders, body: { status: 'archived' } })
    assert(deactivateCat.res.status === 200 && (deactivateCat.json.category as { status?: string })?.status === 'archived', 'Category deactivated via PATCH status (no hard delete)')

    // -------------------------------------------------------------------------
    // 11. UNITS — CRUD & guards
    // -------------------------------------------------------------------------
    console.log('\n[Units]')
    const newUnit = await api('/units', { method: 'POST', headers: adminHeaders, body: { name: 'Cartons', abbreviation: 'ctn' } })
    assert(newUnit.res.status === 201, 'Admin can create a unit (201)')
    const newUnitId = (newUnit.json.unit as { id: string })?.id

    const dupUnit = await api('/units', { method: 'POST', headers: adminHeaders, body: { name: 'Cartons' } })
    assert(dupUnit.res.status === 409 && dupUnit.json.code === 'UNIT_NAME_EXISTS', 'Duplicate unit name rejected (409)')

    const updateUnit = await api(`/units/${newUnitId}`, { method: 'PATCH', headers: adminHeaders, body: { abbreviation: 'CTN' } })
    assert((updateUnit.json.unit as { abbreviation?: string })?.abbreviation === 'CTN', 'Unit edit persists abbreviation')

    const deactivateUnit = await api(`/units/${newUnitId}`, { method: 'PATCH', headers: adminHeaders, body: { status: 'archived' } })
    assert((deactivateUnit.json.unit as { status?: string })?.status === 'archived', 'Unit deactivated via PATCH status (no hard delete)')

    const reactivateUnit = await api(`/units/${newUnitId}`, { method: 'PATCH', headers: adminHeaders, body: { status: 'active' } })
    assert(
      reactivateUnit.res.status === 200 && (reactivateUnit.json.unit as { status?: string })?.status === 'active',
      'Deactivated unit can be reactivated via PATCH status (soft archive is reversible)',
    )

    // -------------------------------------------------------------------------
    // 12. NO HARD-DELETE ROUTES EXIST
    // -------------------------------------------------------------------------
    console.log('\n[No hard delete]')
    const delProduct = await api(`/products/${newProductId}`, { method: 'DELETE', headers: adminHeaders })
    assert(delProduct.res.status === 404, 'No DELETE /products/:id route (soft archive only)')
    const delCategory = await api(`/categories/${subCatId}`, { method: 'DELETE', headers: adminHeaders })
    assert(delCategory.res.status === 404, 'No DELETE /categories/:id route (soft archive only)')
    const delUnit = await api(`/units/${newUnitId}`, { method: 'DELETE', headers: adminHeaders })
    assert(delUnit.res.status === 404, 'No DELETE /units/:id route (soft archive only)')
  } finally {
    await stopServer()
  }

  console.log(`\n======================================================`)
  console.log(`  RESULTS: ${passedTests} passed, ${failedTests} failed`)
  console.log(`======================================================\n`)

  if (failedTests > 0) process.exitCode = 1
}

runTests().catch((err) => {
  console.error('Test runner crashed:', err)
  process.exitCode = 1
})