import type { Server } from 'node:http'
import { createApp } from '../src/app.js'

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
    headers: { 'Content-Type': 'application/json', ...(options.headers ?? {}) },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  })
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>
  return { res, json }
}

const adminHeaders = { Authorization: 'Bearer dev-admin-token' }
const staffHeaders = { Authorization: 'Bearer dev-token:00000000-0000-0000-0000-000000000002' }

const PRODUCT_A1 = 'd1000000-0000-0000-0000-000000000001'
const LOCATION_A = 'a1000000-0000-0000-0000-000000000001'
const LOCATION_WH = 'a1000000-0000-0000-0000-000000000004'
const VALID_PO_ID = 'f1000000-0000-0000-0000-000000000002'
const VALID_PO_LINE_ID = 'e1000000-0000-0000-0000-000000000003'
const UNKNOWN_PRODUCT = '00000000-0000-0000-0000-000000000099'

async function runTests() {
  console.log('\n=========================================================')
  console.log('  VAULTORY INVENTORY & STOCK OPERATIONS TEST (VAU-29)')
  console.log('=========================================================\n')

  await startServer()

  try {
    // ------------------------------------------------------------------
    // 0. Capture initial qty so tests are resilient to prior suite runs
    // ------------------------------------------------------------------
    const initRes = await api(`/inventory?search=PELEC-001&locationId=${LOCATION_A}`, { headers: adminHeaders })
    assert(initRes.res.ok, 'GET /inventory (seed) succeeds')
    const initData = initRes.json as { data?: Array<{ product_id: string; location_id: string; qty_on_hand: number }> }
    const initialQty = initData.data?.[0]?.qty_on_hand ?? 45
    console.log(`    ℹ️  Initial qty_on_hand for product ${PRODUCT_A1} @ Store A: ${initialQty}`)

    // ------------------------------------------------------------------
    // 1. Stock-In
    // ------------------------------------------------------------------
    console.log('\n--- 1. Stock-In ---')

    const stockInQty = 25
    const stockIn = await api('/inventory/stock-in', {
      method: 'POST',
      headers: adminHeaders,
      body: { productId: PRODUCT_A1, locationId: LOCATION_A, qty: stockInQty, notes: 'Test stock-in' },
    })
    assert(stockIn.res.status === 201, `POST /inventory/stock-in returns 201 (got ${stockIn.res.status})`)
    assert(Boolean(stockIn.json.movement_id), 'Stock-in response includes movement_id')
    assert(stockIn.json.product_id === PRODUCT_A1, 'Stock-in response product_id matches')

    const afterIn = await api(`/inventory?search=PELEC-001&locationId=${LOCATION_A}`, { headers: adminHeaders })
    const inData = afterIn.json as { data?: Array<{ qty_on_hand: number }> }
    const qtyAfterIn = inData.data?.[0]?.qty_on_hand ?? 0
    assert(qtyAfterIn === initialQty + stockInQty, `Qty increased by ${stockInQty} (expected ${initialQty + stockInQty}, got ${qtyAfterIn})`)

    // Stock-in with valid poId
    const stockInPo = await api('/inventory/stock-in', {
      method: 'POST',
      headers: adminHeaders,
      body: { productId: PRODUCT_A1, locationId: LOCATION_A, qty: 5, poId: VALID_PO_ID, poLineId: VALID_PO_LINE_ID },
    })
    assert(stockInPo.res.status === 201, `POST /inventory/stock-in with valid poId returns 201 (got ${stockInPo.res.status})`)

    // Stock-in with invalid poId
    const stockInPoBad = await api('/inventory/stock-in', {
      method: 'POST',
      headers: adminHeaders,
      body: { productId: PRODUCT_A1, locationId: LOCATION_A, qty: 1, poId: UNKNOWN_PRODUCT },
    })
    assert(stockInPoBad.res.status === 404, `POST /inventory/stock-in with invalid poId returns 404 (got ${stockInPoBad.res.status})`)

    // Stock-in unknown product
    const stockInUnknown = await api('/inventory/stock-in', {
      method: 'POST',
      headers: adminHeaders,
      body: { productId: UNKNOWN_PRODUCT, locationId: LOCATION_A, qty: 1 },
    })
    assert(stockInUnknown.res.status === 404, `POST /inventory/stock-in with unknown product returns 404 (got ${stockInUnknown.res.status})`)

    // Stock-in staff
    const stockInStaff = await api('/inventory/stock-in', {
      method: 'POST',
      headers: staffHeaders,
      body: { productId: PRODUCT_A1, locationId: LOCATION_A, qty: 1, notes: 'staff stock-in' },
    })
    assert(stockInStaff.res.status === 201, `POST /inventory/stock-in (store_staff) returns 201 (got ${stockInStaff.res.status})`)

    const totalIn = stockInQty + 5 + 1
    const afterAllIn = await api(`/inventory?search=PELEC-001&locationId=${LOCATION_A}`, { headers: adminHeaders })
    const qtyAfterAllIn = (afterAllIn.json as { data?: Array<{ qty_on_hand: number }> }).data?.[0]?.qty_on_hand ?? 0
    assert(qtyAfterAllIn === initialQty + totalIn, `Qty after all stock-ins correct (expected ${initialQty + totalIn}, got ${qtyAfterAllIn})`)

    // ------------------------------------------------------------------
    // 2. Stock-Out
    // ------------------------------------------------------------------
    console.log('\n--- 2. Stock-Out ---')

    const stockOutQty = 10
    const stockOut = await api('/inventory/stock-out', {
      method: 'POST',
      headers: adminHeaders,
      body: { productId: PRODUCT_A1, locationId: LOCATION_A, qty: stockOutQty, reason: 'Shrinkage adjustment' },
    })
    assert(stockOut.res.status === 201, `POST /inventory/stock-out returns 201 (got ${stockOut.res.status})`)
    assert(Boolean(stockOut.json.movement_id), 'Stock-out response includes movement_id')

    const afterOut = await api(`/inventory?search=PELEC-001&locationId=${LOCATION_A}`, { headers: adminHeaders })
    const qtyAfterOut = (afterOut.json as { data?: Array<{ qty_on_hand: number }> }).data?.[0]?.qty_on_hand ?? 0
    assert(qtyAfterOut === qtyAfterAllIn - stockOutQty, `Qty decreased by ${stockOutQty} (expected ${qtyAfterAllIn - stockOutQty}, got ${qtyAfterOut})`)

    // Stock-out without reason → 400
    const stockOutNoReason = await api('/inventory/stock-out', {
      method: 'POST',
      headers: adminHeaders,
      body: { productId: PRODUCT_A1, locationId: LOCATION_A, qty: 1 },
    })
    assert(stockOutNoReason.res.status === 400, `POST /inventory/stock-out without reason returns 400 (got ${stockOutNoReason.res.status})`)

    // Insufficient stock → 409
    const stockOutTooMuch = await api('/inventory/stock-out', {
      method: 'POST',
      headers: adminHeaders,
      body: { productId: PRODUCT_A1, locationId: LOCATION_A, qty: qtyAfterOut + 1000, reason: 'test insufficient' },
    })
    assert(stockOutTooMuch.res.status === 409, `POST /inventory/stock-out insufficient returns 409 (got ${stockOutTooMuch.res.status})`)

    const afterInsufficient = await api(`/inventory?search=PELEC-001&locationId=${LOCATION_A}`, { headers: adminHeaders })
    const qtyAfterInsufficient = (afterInsufficient.json as { data?: Array<{ qty_on_hand: number }> }).data?.[0]?.qty_on_hand ?? 0
    assert(qtyAfterInsufficient === qtyAfterOut, `Qty unchanged after insufficient stock-out attempt (expected ${qtyAfterOut}, got ${qtyAfterInsufficient})`)

    // ------------------------------------------------------------------
    // 3. Transfer
    // ------------------------------------------------------------------
    console.log('\n--- 3. Transfer ---')

    const transferQty = 5
    const transfer = await api('/inventory/transfer', {
      method: 'POST',
      headers: adminHeaders,
      body: { productId: PRODUCT_A1, sourceLocationId: LOCATION_A, destinationLocationId: LOCATION_WH, qty: transferQty },
    })
    assert(transfer.res.status === 201, `POST /inventory/transfer returns 201 (got ${transfer.res.status})`)
    assert(Boolean(transfer.json.transfer_ref), 'Transfer response includes transfer_ref')
    assert(Boolean(transfer.json.source_movement_id), 'Transfer response includes source_movement_id')
    assert(Boolean(transfer.json.dest_movement_id), 'Transfer response includes dest_movement_id')

    const [afterSource, afterDest] = await Promise.all([
      api(`/inventory?search=PELEC-001&locationId=${LOCATION_A}`, { headers: adminHeaders }),
      api(`/inventory?search=PELEC-001&locationId=${LOCATION_WH}`, { headers: adminHeaders }),
    ])
    const qtySourceAfter = (afterSource.json as { data?: Array<{ qty_on_hand: number }> }).data?.[0]?.qty_on_hand ?? 0
    const qtyDestAfter = (afterDest.json as { data?: Array<{ qty_on_hand: number }> }).data?.[0]?.qty_on_hand ?? 0
    assert(qtySourceAfter === qtyAfterInsufficient - transferQty, `Source qty decreased by ${transferQty} (expected ${qtyAfterInsufficient - transferQty}, got ${qtySourceAfter})`)

    // Same location → 400
    const badTransfer = await api('/inventory/transfer', {
      method: 'POST',
      headers: adminHeaders,
      body: { productId: PRODUCT_A1, sourceLocationId: LOCATION_A, destinationLocationId: LOCATION_A, qty: 1 },
    })
    assert(badTransfer.res.status === 400, `POST /inventory/transfer with same source/dest returns 400 (got ${badTransfer.res.status})`)

    // ------------------------------------------------------------------
    // 4. Adjust
    // ------------------------------------------------------------------
    console.log('\n--- 4. Adjust ---')

    const targetQty = 99
    const adjust = await api('/inventory/adjust', {
      method: 'POST',
      headers: adminHeaders,
      body: { productId: PRODUCT_A1, locationId: LOCATION_A, newQty: targetQty, reason: 'Cycle count correction' },
    })
    assert(adjust.res.status === 201, `POST /inventory/adjust returns 201 (got ${adjust.res.status})`)
    assert(Boolean(adjust.json.movement_id), 'Adjust response includes movement_id')

    const afterAdjust = await api(`/inventory?search=PELEC-001&locationId=${LOCATION_A}`, { headers: adminHeaders })
    const qtyAfterAdjust = (afterAdjust.json as { data?: Array<{ qty_on_hand: number }> }).data?.[0]?.qty_on_hand ?? 0
    assert(qtyAfterAdjust === targetQty, `Qty set to ${targetQty} (got ${qtyAfterAdjust})`)

    // ------------------------------------------------------------------
    // 5. Movements list
    // ------------------------------------------------------------------
    console.log('\n--- 5. Movements ---')

    const movements = await api('/inventory/movements?limit=100', { headers: adminHeaders })
    assert(movements.res.ok, 'GET /inventory/movements returns 200')
    const movBody = movements.json as { movements?: Array<{ type: string; qty: number }>; total?: number }
    assert(Boolean(movBody.movements?.length), `Movement list has entries (count=${movBody.movements?.length ?? 0})`)
    assert(typeof movBody.total === 'number', 'Movement response includes total count')

    const byType = await api('/inventory/movements?type=stock_in&limit=50', { headers: adminHeaders })
    const byTypeBody = byType.json as { movements?: Array<{ type: string }> }
    assert(byTypeBody.movements?.every((m) => m.type === 'stock_in'), 'Movement type filter returns only stock_in entries')

    const byProduct = await api(`/inventory/movements?productId=${PRODUCT_A1}&limit=10`, { headers: adminHeaders })
    const byProductBody = byProduct.json as { movements?: Array<{ product_id: string }> }
    assert(byProductBody.movements?.every((m) => m.product_id === PRODUCT_A1), 'Movement product filter returns only target product entries')

    // ------------------------------------------------------------------
    // 6. RBAC
    // ------------------------------------------------------------------
    console.log('\n--- 6. RBAC ---')

    const unauth = await api('/inventory/stock-in', {
      method: 'POST',
      body: { productId: PRODUCT_A1, locationId: LOCATION_A, qty: 1 },
    })
    assert(unauth.res.status === 401, `POST /inventory/stock-in without auth returns 401 (got ${unauth.res.status})`)

    // ------------------------------------------------------------------
    // Summary
    // ------------------------------------------------------------------
    console.log('\n=========================================================')
    console.log(`  RESULTS: ${passedTests} passed, ${failedTests} failed`)
    console.log('=========================================================\n')

    if (failedTests > 0) {
      process.exitCode = 1
    }
  } finally {
    await stopServer()
  }
}

void runTests()