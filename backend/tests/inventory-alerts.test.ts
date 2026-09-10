import type { Server } from 'node:http'
import { createApp } from '../src/app.js'
import {
  computeStockStatus,
  memoryInventory,
} from '../src/modules/inventory/inventory.store.js'
import {
  evaluateItemAlert,
  memoryAlerts,
  memoryAlertPreferences,
} from '../src/modules/alerts/alerts.store.js'

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

async function runTests() {
  console.log('\n======================================================')
  console.log('  VAULTORY SAFETY STOCK & ALERTS TEST SUITE')
  console.log('======================================================\n')

  await startServer()

  const adminToken = 'dev-admin-token'
  const staffToken = 'dev-token:00000000-0000-0000-0000-000000000002'

  try {
    // -------------------------------------------------------------------------
    // 1. UNIT STOCK DETECTION TESTS
    // -------------------------------------------------------------------------
    console.log('1. Stock Status Detection Logic:')

    assert(
      computeStockStatus(20, 10) === 'in_stock',
      'quantity = 20, reorder = 10 => in_stock (NORMAL)'
    )
    assert(
      computeStockStatus(10, 10) === 'low',
      'quantity = 10, reorder = 10 => low (LOW_STOCK)'
    )
    assert(
      computeStockStatus(5, 10) === 'low',
      'quantity = 5, reorder = 10 => low (LOW_STOCK)'
    )
    assert(
      computeStockStatus(1, 10) === 'low',
      'quantity = 1, reorder = 10 => low (LOW_STOCK)'
    )
    assert(
      computeStockStatus(0, 10) === 'out_of_stock',
      'quantity = 0, reorder = 10 => out_of_stock'
    )
    assert(
      computeStockStatus(-2, 10) === 'out_of_stock',
      'quantity = -2, reorder = 10 => out_of_stock'
    )
    assert(
      computeStockStatus(30, 10, 25) === 'over_stock',
      'quantity = 30, reorder = 10, target = 25 => over_stock'
    )

    // Recovery transitions
    let simulatedQty = 0
    let reorder = 10
    assert(
      computeStockStatus(simulatedQty, reorder) === 'out_of_stock',
      'Initial stock = 0 is out_of_stock'
    )
    simulatedQty = 25
    assert(
      computeStockStatus(simulatedQty, reorder) === 'in_stock',
      'Restocked to 25 recovers to in_stock (OUT_OF_STOCK -> NORMAL)'
    )
    simulatedQty = 4
    assert(
      computeStockStatus(simulatedQty, reorder) === 'low',
      'Depleted to 4 transitions to low_stock'
    )
    simulatedQty = 30
    assert(
      computeStockStatus(simulatedQty, reorder) === 'in_stock',
      'Replenished to 30 recovers to in_stock (LOW_STOCK -> NORMAL)'
    )

    // -------------------------------------------------------------------------
    // 2. THRESHOLD CONFIGURATION ENDPOINT TESTS
    // -------------------------------------------------------------------------
    console.log('\n2. Safety Stock & Reorder Point Configuration:')

    const testProductId = 'd1000000-0000-0000-0000-000000000001'

    // 2a. Unauthenticated update rejected (401)
    const unauthRes = await fetch(`${baseUrl}/inventory/${testProductId}/thresholds`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ safetyStock: 10, reorderPoint: 20 }),
    })
    assert(unauthRes.status === 401, 'Unauthenticated threshold update rejected (401)')

    // 2b. Negative safety stock rejected (400)
    const negSafetyRes = await fetch(`${baseUrl}/inventory/${testProductId}/thresholds`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ safetyStock: -5, reorderPoint: 20 }),
    })
    assert(negSafetyRes.status === 400, 'Negative safety stock rejected (400)')

    // 2c. Negative reorder point rejected (400)
    const negReorderRes = await fetch(`${baseUrl}/inventory/${testProductId}/thresholds`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ safetyStock: 10, reorderPoint: -10 }),
    })
    assert(negReorderRes.status === 400, 'Negative reorder point rejected (400)')

    // 2d. Reorder point lower than safety stock rejected (400)
    const invalidRatioRes = await fetch(`${baseUrl}/inventory/${testProductId}/thresholds`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ safetyStock: 30, reorderPoint: 15 }),
    })
    assert(invalidRatioRes.status === 400, 'Reorder point < safety stock rejected (400)')

    // 2e. Valid configuration accepted (200)
    const validConfigRes = await fetch(`${baseUrl}/inventory/${testProductId}/thresholds`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        locationId: 'a1000000-0000-0000-0000-000000000001',
        safetyStock: 15,
        reorderPoint: 25,
      }),
    })
    assert(validConfigRes.status === 200, 'Valid threshold configuration accepted (200)')
    const validConfigData = await validConfigRes.json()
    assert(
      validConfigData.data?.safetyStock === 15 && validConfigData.data?.reorderPoint === 25,
      'Persisted thresholds returned in update response (safety: 15, reorder: 25)'
    )

    // 2f. Query inventory reflects configured thresholds
    const listRes = await fetch(`${baseUrl}/inventory?search=PELEC-001`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    })
    assert(listRes.status === 200, 'List inventory succeeds (200)')
    const listData = await listRes.json()
    const updatedItem = listData.data?.find((i: any) => i.product_id === testProductId)
    assert(
      Boolean(updatedItem && Number(updatedItem.reorder_point) === 25),
      'Updated reorder point reflected in inventory listing'
    )

    // 2g. PUT /safety-stock/:productId/:locationId endpoint works
    const putSsRes = await fetch(`${baseUrl}/safety-stock/${testProductId}/global`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ safety_stock: 12, reorder_point: 22 }),
    })
    assert(putSsRes.status === 200, 'PUT /safety-stock/:productId/:locationId succeeds (200)')

    // -------------------------------------------------------------------------
    // 3. ALERT GENERATION & DEDUPLICATION TESTS
    // -------------------------------------------------------------------------
    console.log('\n3. Alert Generation & Deduplication:')

    // Reset memory alerts for clean test
    memoryAlerts.length = 0

    // 3a. Generate low stock alert
    const testItem = {
      product_id: 'd1000000-0000-0000-0000-000000000099',
      location_id: 'a1000000-0000-0000-0000-000000000001',
      product_name: 'Test Alert Product',
      sku_code: 'PALERT-001',
      location_name: 'Store A — MG Road',
      qty_on_hand: 5,
      reorder_point: 10,
    }

    const alert1 = await evaluateItemAlert(testItem)
    assert(Boolean(alert1 && alert1.type === 'low_stock'), 'Low stock condition creates low_stock alert')

    // 3b. Duplicate prevention: evaluating again does NOT create duplicate alert
    const countBefore = memoryAlerts.filter(
      (a) => a.product_id === testItem.product_id && a.type === 'low_stock' && !a.is_resolved
    ).length
    await evaluateItemAlert(testItem)
    await evaluateItemAlert(testItem)
    const countAfter = memoryAlerts.filter(
      (a) => a.product_id === testItem.product_id && a.type === 'low_stock' && !a.is_resolved
    ).length
    assert(countBefore === 1 && countAfter === 1, 'Duplicate alerts prevented for repeated evaluation')

    // 3c. Stock drops to 0 -> Transitions to out_of_stock and resolves low_stock
    testItem.qty_on_hand = 0
    const alert2 = await evaluateItemAlert(testItem)
    assert(Boolean(alert2 && alert2.type === 'out_of_stock'), 'Stock 0 creates out_of_stock alert')

    const prevLowResolved = memoryAlerts.find(
      (a) => a.product_id === testItem.product_id && a.type === 'low_stock'
    )?.is_resolved
    assert(prevLowResolved === true, 'Previous low_stock alert resolved when transitioning to out_of_stock')

    // 3d. Inventory recovers -> resolves alerts
    testItem.qty_on_hand = 20
    await evaluateItemAlert(testItem)
    const outResolved = memoryAlerts.find(
      (a) => a.product_id === testItem.product_id && a.type === 'out_of_stock'
    )?.is_resolved
    assert(outResolved === true, 'Inventory recovery resolves out_of_stock alert')

    // -------------------------------------------------------------------------
    // 4. ALERTS CENTER ENDPOINTS & READ TRACKING
    // -------------------------------------------------------------------------
    console.log('\n4. Alerts Center Endpoints & Read State:')

    // Create an active low-stock alert
    testItem.qty_on_hand = 3
    const activeAlert = await evaluateItemAlert(testItem)
    assert(Boolean(activeAlert), 'Active test alert generated')

    // 4a. GET /alerts
    const getAlertsRes = await fetch(`${baseUrl}/alerts`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    })
    assert(getAlertsRes.status === 200, 'GET /api/alerts succeeds (200)')
    const alertsData = await getAlertsRes.json()
    assert(Array.isArray(alertsData.alerts), 'Alerts response contains alerts array')

    // 4b. GET /alerts/unread-count
    const unreadCountRes = await fetch(`${baseUrl}/alerts/unread-count`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    })
    assert(unreadCountRes.status === 200, 'GET /api/alerts/unread-count succeeds (200)')
    const unreadData = await unreadCountRes.json()
    assert(typeof unreadData.unreadCount === 'number', 'Unread count is a numeric value')

    // 4c. Mark alert as read
    if (activeAlert) {
      const readRes = await fetch(`${baseUrl}/alerts/${activeAlert.id}/read`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${adminToken}` },
      })
      assert(readRes.status === 200, 'PATCH /api/alerts/:id/read succeeds (200)')

      // Verify read status reflected
      const verifyReadRes = await fetch(`${baseUrl}/alerts`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      })
      const verifyData = await verifyReadRes.json()
      const marked = verifyData.alerts.find((a: any) => a.id === activeAlert.id)
      assert(Boolean(marked?.is_read), 'Alert read state is persisted and returned as read')
    }

    // -------------------------------------------------------------------------
    // 5. ALERT PREFERENCES CONFIGURATION & BACKEND ENFORCEMENT
    // -------------------------------------------------------------------------
    console.log('\n5. Alert Preferences Configuration & Enforcement:')

    const adminUserId = '00000000-0000-0000-0000-000000000001'

    // 5a. GET /alerts/preferences
    const getPrefsRes = await fetch(`${baseUrl}/alerts/preferences`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    })
    assert(getPrefsRes.status === 200, 'GET /api/alerts/preferences succeeds (200)')
    const prefsData = await getPrefsRes.json()
    assert(
      prefsData.data?.notify_low_stock !== undefined && prefsData.data?.notify_out_of_stock !== undefined,
      'Alert preferences contain notify_low_stock and notify_out_of_stock'
    )

    // 5b. Update preferences: disable low stock alerts
    const updatePrefsRes = await fetch(`${baseUrl}/alerts/preferences`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ notify_low_stock: false, notify_out_of_stock: true }),
    })
    assert(updatePrefsRes.status === 200, 'PATCH /api/alerts/preferences succeeds (200)')
    const updatedPrefsData = await updatePrefsRes.json()
    assert(
      updatedPrefsData.data?.notify_low_stock === false,
      'Preferences update saved notify_low_stock = false'
    )

    // 5c. Preferences persist across calls
    const recheckPrefsRes = await fetch(`${baseUrl}/alerts/preferences`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    })
    const rechecked = await recheckPrefsRes.json()
    assert(
      rechecked.data?.notify_low_stock === false,
      'Disabled notify_low_stock persisted across requests'
    )

    // 5d. Backend enforces suppression: low_stock alerts are filtered out
    // Create an unread low-stock alert
    const itemForSuppression = {
      product_id: 'd1000000-0000-0000-0000-000000000088',
      location_id: 'a1000000-0000-0000-0000-000000000001',
      product_name: 'Suppressed Item',
      sku_code: 'PSUPP-001',
      location_name: 'Store A',
      qty_on_hand: 2,
      reorder_point: 10,
    }
    await evaluateItemAlert(itemForSuppression)

    const listWithSuppression = await fetch(`${baseUrl}/alerts`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    })
    const suppData = await listWithSuppression.json()
    const hasLowStockAlert = suppData.alerts?.some((a: any) => a.type === 'low_stock')
    assert(!hasLowStockAlert, 'Backend strictly suppresses low_stock alerts when notify_low_stock is false')

    // 5e. Re-enabling low-stock alerts makes them visible again
    await fetch(`${baseUrl}/alerts/preferences`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ notify_low_stock: true }),
    })

    const listReenabled = await fetch(`${baseUrl}/alerts`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    })
    const reenabledData = await listReenabled.json()
    const hasLowStockNow = reenabledData.alerts?.some((a: any) => a.type === 'low_stock')
    assert(hasLowStockNow, 'Re-enabling notify_low_stock surfaces low_stock alerts again')

  } finally {
    await stopServer()
  }

  console.log('\n======================================================')
  console.log(`  RESULTS: ${passedTests} passed, ${failedTests} failed`)
  console.log('======================================================\n')

  if (failedTests > 0) {
    process.exit(1)
  }
}

runTests().catch((err) => {
  console.error('Unhandled test error:', err)
  process.exit(1)
})
