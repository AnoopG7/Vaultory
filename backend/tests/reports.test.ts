import { createSaleTransaction } from '../src/modules/sales/sales.store.js'
import {
  getDailySalesReport,
  getQuarterlySalesReport,
  getYearlySalesReport,
  getStorePerformanceReport,
} from '../src/modules/reports/reports.store.js'

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
  console.log('  VAULTORY REPORTS MODULE TEST SUITE')
  console.log('======================================================\n')

  const actor = {
    id: '00000000-0000-0000-0000-000000000001',
    email: 'admin@vaultory.internal',
    role: 'admin' as const,
  }
  const storeA = 'e1000000-0000-0000-0000-000000000001'
  const storeB = 'e1000000-0000-0000-0000-000000000002'
  const prod1 = 'd1000000-0000-0000-0000-000000000001' // USB Cable (Store A)
  const prod4 = 'd1000000-0000-0000-0000-000000000004' // Store B product

  try {
    // -------------------------------------------------------------------------
    // 1. Seed sales data for testing reports
    // -------------------------------------------------------------------------
    console.log('[Setup] Seeding test sales transactions for Store A and Store B...')
    const saleA = await createSaleTransaction(
      {
        store_id: storeA,
        discount: 0,
        notes: 'Test sale for Store A report',
        lines: [{ product_id: prod1, qty: 2, unit_price: 249 }],
      },
      actor,
    )
    assert(!!saleA.id, 'Created seed sale for Store A')

    const saleB = await createSaleTransaction(
      {
        store_id: storeB,
        discount: 10,
        notes: 'Test sale for Store B report',
        lines: [{ product_id: prod4, qty: 3, unit_price: 349 }],
      },
      actor,
    )
    assert(!!saleB.id, 'Created seed sale for Store B')

    // -------------------------------------------------------------------------
    // 2. Daily Sales Report Store Test
    // -------------------------------------------------------------------------
    console.log('\n[Test 1] Daily Sales Report verification')
    const todayStr = new Date().toISOString().split('T')[0]
    const dailyAll = await getDailySalesReport({ date: todayStr })
    assert(dailyAll.date === todayStr, `Daily report date matches today: ${todayStr}`)
    assert(dailyAll.summary.total_units_sold >= 5, `Total units sold is at least 5 (got ${dailyAll.summary.total_units_sold})`)
    assert(dailyAll.summary.transactions_count >= 2, `Transaction count is at least 2 (got ${dailyAll.summary.transactions_count})`)

    const dailyStoreA = await getDailySalesReport({ storeId: storeA, date: todayStr })
    assert(dailyStoreA.items.every((i) => i.store_id === storeA), 'Filtered daily report contains only Store A items')
    assert(dailyStoreA.summary.total_units_sold >= 2, `Store A daily report has at least 2 units`)

    // -------------------------------------------------------------------------
    // 3. Quarterly Sales Report Store Test
    // -------------------------------------------------------------------------
    console.log('\n[Test 2] Quarterly Sales Report verification')
    const currentYear = new Date().getFullYear()
    const currentQuarter = Math.floor(new Date().getMonth() / 3) + 1
    const quarterStr = `${currentYear}-Q${currentQuarter}`

    const quarterly = await getQuarterlySalesReport({ quarter: quarterStr })
    assert(quarterly.quarter === quarterStr, `Quarterly report matches ${quarterStr}`)
    assert(quarterly.monthly_breakdown.length === 3, 'Quarterly report contains 3 monthly breakdowns')
    assert(quarterly.summary.total_units_sold >= 5, 'Quarterly report reflects units sold')
    assert(quarterly.product_breakdown.length > 0, 'Quarterly report contains product breakdown items')

    // -------------------------------------------------------------------------
    // 4. Yearly Sales Report Store Test
    // -------------------------------------------------------------------------
    console.log('\n[Test 3] Yearly Sales Report verification')
    const yearly = await getYearlySalesReport({ year: currentYear })
    assert(yearly.year === currentYear, `Yearly report matches year ${currentYear}`)
    assert(yearly.monthly_breakdown.length === 12, 'Yearly report contains 12 monthly periods')
    assert(yearly.summary.total_units_sold >= 5, 'Yearly report contains total units sold')
    assert(yearly.summary.average_monthly_sales >= 0, 'Yearly report calculates average monthly sales')

    // -------------------------------------------------------------------------
    // 5. Store Performance Report Store Test
    // -------------------------------------------------------------------------
    console.log('\n[Test 4] Store Performance Report verification')
    const storePerf = await getStorePerformanceReport({})
    assert(storePerf.stores.length >= 3, `Store performance includes configured stores (got ${storePerf.stores.length})`)
    assert(storePerf.summary.total_revenue > 0, `Total revenue > 0 (got ₹${storePerf.summary.total_revenue})`)
    assert(storePerf.summary.total_orders >= 2, `Total orders >= 2 (got ${storePerf.summary.total_orders})`)
    assert(!!storePerf.comparison.best_performing_store, `Identified best performing store: ${storePerf.comparison.best_performing_store}`)

    const perfA = storePerf.stores.find((s) => s.store_id === storeA)
    assert(!!perfA && perfA.total_units_sold >= 2, `Store A tracked correctly with >= 2 units sold`)
    assert(!!perfA && perfA.average_order_value > 0, `Store A has positive AOV: ₹${perfA?.average_order_value}`)

    // -------------------------------------------------------------------------
    // 5. CSV formatting verification
    // -------------------------------------------------------------------------
    console.log('\n[Test 5] CSV formatting verification')
    const { dailyToCsv, quarterlyToCsv, yearlyToCsv, storePerformanceToCsv } = await import(
      '../src/modules/reports/reports.routes.js'
    )

    const dailyCsv = dailyToCsv(dailyAll)
    assert(dailyCsv.includes('Store Name,Store ID,Product Name'), 'Daily CSV includes header line')
    assert(dailyCsv.includes('Summary: Total Units'), 'Daily CSV includes summary lines')

    const quarterlyCsv = quarterlyToCsv(quarterly)
    assert(quarterlyCsv.includes('--- Monthly Breakdown ---'), 'Quarterly CSV includes monthly section')
    assert(quarterlyCsv.includes('--- Product Breakdown ---'), 'Quarterly CSV includes product section')

    const yearlyCsv = yearlyToCsv(yearly)
    assert(yearlyCsv.includes(`Year,${currentYear}`), 'Yearly CSV includes year header')
    assert(yearlyCsv.includes('Summary: Average Monthly Sales'), 'Yearly CSV includes average monthly sales')

    const storePerfCsv = storePerformanceToCsv(storePerf)
    assert(storePerfCsv.includes('Store Name,Store Code,City'), 'Store Performance CSV includes header line')
    assert(storePerfCsv.includes('Comparison: Best Performing Store'), 'Store Performance CSV includes best performing store')
  } catch (err) {
    console.error('Test execution error:', err)
    failedTests++
  }

  console.log('\n======================================================')
  console.log(`  SUMMARY: ${passedTests} passed, ${failedTests} failed`)
  console.log('======================================================\n')

  if (failedTests > 0) {
    process.exit(1)
  }
}

runTests()
