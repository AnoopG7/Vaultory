import { memoryInventory } from '../src/modules/inventory/inventory.store.js'
import {
  createSaleTransaction,
  getSaleDetail,
  processSaleReturnTransaction,
  querySaleReturns,
  querySales,
  voidSaleTransaction,
} from '../src/modules/sales/sales.store.js'
import { memoryAuditLogs } from '../src/modules/users/users.store.js'

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
  console.log('  VAULTORY SALES & AUDIT MODULE TEST SUITE')
  console.log('======================================================\n')

  const actor = {
    id: '00000000-0000-0000-0000-000000000001',
    email: 'admin@vaultory.internal',
    role: 'admin' as const,
  }
  const storeA = 'e1000000-0000-0000-0000-000000000001'
  const storeALoc = 'a1000000-0000-0000-0000-000000000001'
  const prod1 = 'd1000000-0000-0000-0000-000000000001' // USB Cable (₹249)

  try {
    // -------------------------------------------------------------------------
    // 1. Initial stock snapshot
    // -------------------------------------------------------------------------
    const initialItem = memoryInventory.find(
      (i) => i.product_id === prod1 && i.location_id === storeALoc,
    )
    const initialQty = initialItem?.qty_on_hand ?? 0
    console.log(`[Setup] Initial on-hand stock for USB Cable at Store A: ${initialQty}`)

    // -------------------------------------------------------------------------
    // 2. Pre-flight stock check: try selling more than available stock
    // -------------------------------------------------------------------------
    console.log('\n[Test 1] Pre-flight stock check: request exceeding on-hand stock')
    let caughtInsufficient = false
    try {
      await createSaleTransaction(
        {
          store_id: storeA,
          discount: 0,
          notes: 'Excessive order test',
          lines: [{ product_id: prod1, qty: initialQty + 999, unit_price: 249 }],
        },
        actor,
      )
    } catch (err: any) {
      if (err?.code === 'INSUFFICIENT_STOCK' && err?.statusCode === 409) {
        caughtInsufficient = true
      }
    }
    assert(caughtInsufficient, 'Rejects sale with 409 INSUFFICIENT_STOCK when quantity exceeds on-hand')

    // -------------------------------------------------------------------------
    // 3. Record valid sale (POS)
    // -------------------------------------------------------------------------
    console.log('\n[Test 2] Record POS sale with 2 units of USB Cable')
    const createdSale = await createSaleTransaction(
      {
        store_id: storeA,
        discount: 48,
        notes: 'POS Register 1 Test Sale',
        lines: [{ product_id: prod1, qty: 2, unit_price: 249 }],
      },
      actor,
    )

    assert(Boolean(createdSale.id), 'Sale created successfully with ID')
    assert(createdSale.subtotal === 498, `Computed subtotal is 498 (got ${createdSale.subtotal})`)
    assert(createdSale.discount === 48, `Applied discount is 48 (got ${createdSale.discount})`)
    assert(createdSale.total === 450, `Computed total is 450 (got ${createdSale.total})`)
    assert(createdSale.status === 'active', 'Sale status is active')

    // Verify stock deduction
    const afterSaleItem = memoryInventory.find(
      (i) => i.product_id === prod1 && i.location_id === storeALoc,
    )
    const afterSaleQty = afterSaleItem?.qty_on_hand ?? 0
    assert(
      afterSaleQty === initialQty - 2,
      `Inventory stock deducted by 2: before=${initialQty}, after=${afterSaleQty}`,
    )

    // -------------------------------------------------------------------------
    // 4. Sale detail with lines
    // -------------------------------------------------------------------------
    console.log('\n[Test 3] Fetch sale detail with line items')
    const detail = await getSaleDetail(createdSale.id)
    assert(detail.lines.length === 1, 'Sale line item returned')
    assert(detail.lines[0].product_id === prod1, 'Sale line has correct product ID')
    const saleLineId = detail.lines[0].id

    // -------------------------------------------------------------------------
    // 5. Process Return on sale item
    // -------------------------------------------------------------------------
    console.log('\n[Test 4] Process Return (1 unit returned)')
    const returnResult = await processSaleReturnTransaction(
      createdSale.id,
      {
        reason: 'Customer returned 1 item - defective cable',
        lines: [{ sale_line_id: saleLineId, product_id: prod1, qty_returned: 1 }],
      },
      actor,
    )

    assert(Boolean(returnResult.return.id), 'Return processed with return ID')
    assert(returnResult.return.refund_amount === 249, `Refund amount is 249 (got ${returnResult.return.refund_amount})`)

    // Verify stock restoration from return
    const afterReturnItem = memoryInventory.find(
      (i) => i.product_id === prod1 && i.location_id === storeALoc,
    )
    assert(
      afterReturnItem?.qty_on_hand === afterSaleQty + 1,
      `Inventory stock restored by 1: now=${afterReturnItem?.qty_on_hand}`,
    )

    // -------------------------------------------------------------------------
    // 6. Return guard: try returning more than remaining sold qty
    // -------------------------------------------------------------------------
    console.log('\n[Test 5] Return guard: reject returning more than sold quantity')
    let caughtExcessReturn = false
    try {
      await processSaleReturnTransaction(
        createdSale.id,
        {
          reason: 'Attempting to return another 2 units when only 1 is left returnable',
          lines: [{ sale_line_id: saleLineId, product_id: prod1, qty_returned: 2 }],
        },
        actor,
      )
    } catch (err: any) {
      if (err?.code === 'RETURN_EXCEEDS_SOLD') {
        caughtExcessReturn = true
      }
    }
    assert(caughtExcessReturn, 'Rejects return with RETURN_EXCEEDS_SOLD when return quantity exceeds remaining sold quantity')

    // -------------------------------------------------------------------------
    // 7. List returns
    // -------------------------------------------------------------------------
    console.log('\n[Test 6] Query sale returns list')
    const { returns } = await querySaleReturns({ sale_id: createdSale.id })
    assert(
      returns.some((r) => r.id === returnResult.return.id),
      'Returns list includes the newly created return record',
    )

    // -------------------------------------------------------------------------
    // 8. Void sale (Admin only)
    // -------------------------------------------------------------------------
    console.log('\n[Test 7] Void sale and restore stock')
    const voidResult = await voidSaleTransaction(
      createdSale.id,
      { reason: 'Entire transaction cancelled by manager' },
      actor,
    )
    assert(voidResult.message.includes('voided'), 'Sale voided successfully')

    const reloadedSale = await getSaleDetail(createdSale.id)
    assert(reloadedSale.sale.status === 'voided', 'Sale status is voided')
    assert(reloadedSale.sale.void_reason === 'Entire transaction cancelled by manager', 'Void reason recorded')

    // Verify returning items on a voided sale is blocked
    let caughtVoidedReturn = false
    try {
      await processSaleReturnTransaction(
        createdSale.id,
        {
          reason: 'Attempt return on voided sale',
          lines: [{ sale_line_id: saleLineId, product_id: prod1, qty_returned: 1 }],
        },
        actor,
      )
    } catch (err: any) {
      if (err?.code === 'SALE_IS_VOIDED') {
        caughtVoidedReturn = true
      }
    }
    assert(caughtVoidedReturn, 'Rejects returns on a voided sale (SALE_IS_VOIDED)')

    // -------------------------------------------------------------------------
    // 9. Verify Audit Logs
    // -------------------------------------------------------------------------
    console.log('\n[Test 8] Audit logs: verify audit trail for sales events')
    const salesAuditLogs = memoryAuditLogs.filter((l) => l.entity === 'sale')
    const actions = salesAuditLogs.map((l) => l.action)

    assert(actions.includes('sale_created'), 'Audit trail recorded sale_created')
    assert(actions.includes('sale_returned'), 'Audit trail recorded sale_returned')
    assert(actions.includes('sale_voided'), 'Audit trail recorded sale_voided')

    const createdAudit = salesAuditLogs.find((l) => l.action === 'sale_created' && l.entity_id === createdSale.id)
    assert(Boolean(createdAudit), 'Audit row found for specific sale created')
    assert((createdAudit?.detail as any)?.total === 450, 'Audit detail captured transaction total')
  } catch (err) {
    console.error('Test execution error:', err)
    failedTests++
  }

  console.log('\n======================================================')
  console.log(`  TEST RESULTS: ${passedTests} passed, ${failedTests} failed`)
  console.log('======================================================\n')

  if (failedTests > 0) {
    process.exit(1)
  }
}

runTests()

