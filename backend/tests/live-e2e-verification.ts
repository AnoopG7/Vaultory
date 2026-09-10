/**
 * Complete Live End-to-End Acceptance Test for:
 * Safety Stock, Reorder Point & Inventory Alerting
 * Running against live API on http://localhost:4000
 */

const API_BASE = 'http://localhost:4000/api'

interface SigninResponse {
  user: {
    id: string
    email: string
    name: string
    role: string
    store_id: string | null
  }
  token: string
}

async function run() {
  console.log('===============================================================')
  console.log('  LIVE END-TO-END ACCEPTANCE SUITE — INVENTORY & ALERTING')
  console.log('===============================================================\n')

  let passed = 0
  let failed = 0

  function assert(condition: boolean, msg: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${msg}`)
      passed++
    } else {
      console.error(`  ❌ FAIL: ${msg}`)
      failed++
    }
  }

  // 1. Authentication
  console.log('1. Authentication:')
  const token = 'dev-admin-token'
  assert(Boolean(token), 'Admin token initialized (dev-admin-token)')

  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  }

  // Verify auth with /auth/me
  const meRes = await fetch(`${API_BASE}/auth/me`, {
    headers: authHeaders,
  })
  assert(meRes.ok, `GET /api/auth/me succeeds with admin token (${meRes.status})`)
  const meData = await meRes.json()
  assert(meData.user?.role === 'admin', `Authenticated user has admin role (${meData.user?.role})`)

  // 2. Fetch inventory for PELEC-001
  console.log('\n2. Inventory Retrieval:')
  const invRes = await fetch(`${API_BASE}/inventory?search=PELEC-001`, {
    headers: authHeaders,
  })
  assert(invRes.ok, `GET /api/inventory?search=PELEC-001 succeeds (${invRes.status})`)
  const invData = await invRes.json()
  assert(Array.isArray(invData.data) && invData.data.length > 0, 'Inventory items found for PELEC-001')

  const targetItem = invData.data[0]
  console.log(`   Found SKU: ${targetItem.sku_code}, Product: "${targetItem.product_name}", Qty on hand: ${targetItem.qty_on_hand}, Location: "${targetItem.location_name}"`)
  const productId = targetItem.product_id
  const locationId = targetItem.location_id
  const currentQty = targetItem.qty_on_hand

  // 3. Test Invalid Threshold Configurations
  console.log('\n3. Threshold Validation Rules:')
  const negSafetyRes = await fetch(`${API_BASE}/inventory/${productId}/thresholds`, {
    method: 'PATCH',
    headers: authHeaders,
    body: JSON.stringify({
      locationId,
      safetyStock: -5,
      reorderPoint: 20,
    }),
  })
  assert(negSafetyRes.status === 400, 'Negative safety stock is rejected (400)')

  const invalidOrderRes = await fetch(`${API_BASE}/inventory/${productId}/thresholds`, {
    method: 'PATCH',
    headers: authHeaders,
    body: JSON.stringify({
      locationId,
      safetyStock: 30,
      reorderPoint: 15,
    }),
  })
  assert(invalidOrderRes.status === 400, 'Reorder point < safety stock is rejected (400)')

  // 4. Configure Valid Thresholds triggering LOW STOCK condition
  // If currentQty is 45, setting reorderPoint = 50 and safetyStock = 20 ensures 45 <= 50 => LOW STOCK!
  console.log('\n4. Configure Thresholds & Trigger Low Stock Detection:')
  const newSafety = 20
  const newReorder = Math.max(50, Math.ceil(currentQty) + 5)
  const newTarget = 100

  const updateRes = await fetch(`${API_BASE}/inventory/${productId}/thresholds`, {
    method: 'PATCH',
    headers: authHeaders,
    body: JSON.stringify({
      locationId,
      safetyStock: newSafety,
      reorderPoint: newReorder,
      targetLevel: newTarget,
    }),
  })
  assert(updateRes.ok, `PATCH /inventory/:id/thresholds accepted (Status ${updateRes.status})`)
  const updateData = await updateRes.json()
  assert(updateData.success === true, 'Response indicates success')

  // Verify updated inventory item and status
  const checkInvRes = await fetch(`${API_BASE}/inventory?search=PELEC-001`, {
    headers: authHeaders,
  })
  const checkInvData = await checkInvRes.json()
  const updatedItem = checkInvData.data.find(
    (i: { product_id: string; location_id: string }) =>
      i.product_id === productId && i.location_id === locationId
  )
  assert(Boolean(updatedItem), 'Updated item retrieved from inventory')
  assert(
    Number(updatedItem.safety_stock) === newSafety,
    `Safety stock persisted correctly as ${newSafety} (got ${updatedItem.safety_stock})`
  )
  assert(
    Number(updatedItem.reorder_point) === newReorder,
    `Reorder point persisted correctly as ${newReorder} (got ${updatedItem.reorder_point})`
  )
  assert(
    updatedItem.stock_status === 'low',
    `Stock status correctly detected as "low" since qty ${currentQty} <= reorder point ${newReorder}`
  )

  // 5. Verify Alert Created in Alerts Center
  console.log('\n5. Alerts Center Surfacing & Notification:')
  const alertsRes = await fetch(`${API_BASE}/alerts?productId=${productId}`, {
    headers: authHeaders,
  })
  assert(alertsRes.ok, `GET /api/alerts?productId=${productId} succeeds (${alertsRes.status})`)
  const alertsData = await alertsRes.json()
  assert(Array.isArray(alertsData.alerts), 'Alerts response contains alerts array')

  const lowStockAlert = alertsData.alerts.find(
    (a: { product_id: string; type: string; is_resolved: boolean }) =>
      a.product_id === productId && a.type === 'low_stock' && !a.is_resolved
  )
  assert(Boolean(lowStockAlert), 'Active Low Stock Alert created for product in alerts center')
  if (lowStockAlert) {
    console.log(`   Alert Title: "${lowStockAlert.title}"`)
    console.log(`   Alert Message: "${lowStockAlert.message}"`)
    console.log(`   Priority: ${lowStockAlert.priority}, Type: ${lowStockAlert.type}`)
    assert(lowStockAlert.type === 'low_stock', 'Alert type is low_stock')
    assert(
      lowStockAlert.priority === 'medium' ||
        lowStockAlert.priority === 'high' ||
        lowStockAlert.priority === 'urgent',
      `Alert priority is valid (${lowStockAlert.priority})`
    )
  }

  // 6. Unread Counter & Mark as Read
  console.log('\n6. Unread Counter & Read Tracking:')
  const unreadRes = await fetch(`${API_BASE}/alerts/unread-count`, {
    headers: authHeaders,
  })
  assert(unreadRes.ok, `GET /api/alerts/unread-count succeeds (${unreadRes.status})`)
  const unreadData = await unreadRes.json()
  assert(typeof unreadData.unreadCount === 'number' && unreadData.unreadCount >= 0, `Unread count returned: ${unreadData.unreadCount}`)

  if (lowStockAlert) {
    const markReadRes = await fetch(`${API_BASE}/alerts/${lowStockAlert.id}/read`, {
      method: 'PATCH',
      headers: authHeaders,
      body: JSON.stringify({}),
    })
    assert(markReadRes.ok, `PATCH /api/alerts/:id/read succeeds (${markReadRes.status})`)

    const recheckAlertsRes = await fetch(`${API_BASE}/alerts?productId=${productId}`, {
      headers: authHeaders,
    })
    const recheckAlertsData = await recheckAlertsRes.json()
    const targetAlertRead = recheckAlertsData.alerts.find(
      (a: { id: string }) => a.id === lowStockAlert.id
    )
    assert(targetAlertRead?.is_read === true, 'Alert marked as read is persisted as is_read: true')
  }

  // 7. Alert Preferences Configuration & Enforcement
  console.log('\n7. User Alert Preferences:')
  const getPrefsRes = await fetch(`${API_BASE}/alerts/preferences`, {
    headers: authHeaders,
  })
  assert(getPrefsRes.ok, `GET /api/alerts/preferences succeeds (${getPrefsRes.status})`)
  const prefsData = await getPrefsRes.json()
  assert(prefsData.data && typeof prefsData.data.notify_low_stock === 'boolean', 'Preferences object contains notify_low_stock boolean')
  assert(typeof prefsData.data.notify_out_of_stock === 'boolean', 'Preferences object contains notify_out_of_stock boolean')

  // Disable low_stock notifications
  const patchPrefsRes = await fetch(`${API_BASE}/alerts/preferences`, {
    method: 'PATCH',
    headers: authHeaders,
    body: JSON.stringify({
      notify_low_stock: false,
    }),
  })
  assert(patchPrefsRes.ok, `PATCH /api/alerts/preferences with notify_low_stock: false succeeds (${patchPrefsRes.status})`)
  const patchPrefsData = await patchPrefsRes.json()
  assert(patchPrefsData.data.notify_low_stock === false, 'notify_low_stock saved as false')

  // Re-query alerts — low_stock alerts should now be filtered out for this user!
  const filteredAlertsRes = await fetch(`${API_BASE}/alerts?productId=${productId}`, {
    headers: authHeaders,
  })
  const filteredAlertsData = await filteredAlertsRes.json()
  const suppressedAlert = filteredAlertsData.alerts.find(
    (a: { product_id: string; type: string }) => a.product_id === productId && a.type === 'low_stock'
  )
  assert(!suppressedAlert, 'Low stock alerts strictly suppressed by backend when preference notify_low_stock is false')

  // Restore low_stock notification to true
  const restorePrefsRes = await fetch(`${API_BASE}/alerts/preferences`, {
    method: 'PATCH',
    headers: authHeaders,
    body: JSON.stringify({
      notify_low_stock: true,
    }),
  })
  assert(restorePrefsRes.ok, 'Restored notify_low_stock to true')

  const restoredAlertsRes = await fetch(`${API_BASE}/alerts?productId=${productId}`, {
    headers: authHeaders,
  })
  const restoredAlertsData = await restoredAlertsRes.json()
  const surfacedAlert = restoredAlertsData.alerts.find(
    (a: { product_id: string; type: string }) => a.product_id === productId && a.type === 'low_stock'
  )
  assert(Boolean(surfacedAlert), 'Low stock alerts surfaced again when preference is re-enabled')

  // 8. Test Stock Recovery / Threshold Lowering (Auto-Resolve)
  console.log('\n8. Stock Recovery & Auto-Resolution:')
  // Lower reorder point below currentQty (e.g. reorderPoint = 30 when currentQty is 45)
  const recoverRes = await fetch(`${API_BASE}/inventory/${productId}/thresholds`, {
    method: 'PATCH',
    headers: authHeaders,
    body: JSON.stringify({
      locationId,
      safetyStock: 15,
      reorderPoint: 30,
      targetLevel: 100,
    }),
  })
  assert(recoverRes.ok, `Lowering reorder point below current quantity (${recoverRes.status})`)

  const recoveredInvRes = await fetch(`${API_BASE}/inventory?search=PELEC-001`, {
    headers: authHeaders,
  })
  const recoveredInvData = await recoveredInvRes.json()
  const normalItem = recoveredInvData.data.find(
    (i: { product_id: string; location_id: string }) =>
      i.product_id === productId && i.location_id === locationId
  )
  assert(
    normalItem?.stock_status === 'in_stock',
    `Stock status recovered to "in_stock" (qty ${currentQty} > reorder point 30)`
  )

  const resolvedAlertsRes = await fetch(`${API_BASE}/alerts?productId=${productId}`, {
    headers: authHeaders,
  })
  const resolvedAlertsData = await resolvedAlertsRes.json()
  const activeAlertAfterRecovery = resolvedAlertsData.alerts.find(
    (a: { product_id: string; location_id: string | null; type: string; is_resolved: boolean }) =>
      a.product_id === productId &&
      a.location_id === locationId &&
      a.type === 'low_stock' &&
      !a.is_resolved
  )
  if (activeAlertAfterRecovery) {
    console.log('Active alert found:', activeAlertAfterRecovery)
  }
  assert(!activeAlertAfterRecovery, 'Alert is automatically resolved upon inventory recovery')

  console.log('\n===============================================================')
  console.log(`  E2E ACCEPTANCE SUMMARY: ${passed} passed, ${failed} failed`)
  console.log('===============================================================\n')

  if (failed > 0) {
    process.exit(1)
  }
}

run().catch((err) => {
  console.error('Fatal error during E2E acceptance test:', err)
  process.exit(1)
})
