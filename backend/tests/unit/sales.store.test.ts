import { beforeEach, describe, expect, it } from 'vitest'
import { resetFakeDb, getFakeDb, setRpcHandler } from '../helpers/fake-supabase'
import {
  createSaleTransaction,
  querySales,
  getSaleDetail,
  voidSaleTransaction,
  processSaleReturnTransaction,
  querySaleReturns,
  getStoreLocationId,
  mutateMemoryStock,
  memorySales,
  memorySaleLines,
} from '../../src/modules/sales/sales.store'
import { memoryInventory } from '../../src/modules/inventory/inventory.store'
import {
  salesDb,
  SALE_1_ID,
  SALE_2_ID,
  SALE_LINE_1_ID,
  SALE_LINE_2_ID,
  ADVISED_SALE_NUMBER,
} from '../helpers/fixtures/sales'
import { ADMIN, LOC_A, P1, P2, P3, STORE_A } from '../helpers/fixtures/inventory'

const ACTOR = { id: ADMIN, email: 'admin@vaultory.com', role: 'admin' as const }

const stockBase = structuredClone(memoryInventory)

function qtyOnHand(productId: string): number {
  const item = memoryInventory.find((i) => i.product_id === productId && i.location_id === LOC_A)
  return item ? item.qty_on_hand : -1
}

function dbRow(table: string, predicate: (row: Record<string, unknown>) => boolean): Record<string, unknown> | undefined {
  return getFakeDb()[table]?.find(predicate)
}

beforeEach(() => {
  resetFakeDb(salesDb())
  setRpcHandler('generate_sale_number', () => ADVISED_SALE_NUMBER)
  setRpcHandler('fn_mutate_stock', () => null)
  memoryInventory.splice(0, memoryInventory.length, ...structuredClone(stockBase))
})

describe('createSaleTransaction (fake supabase, db path)', () => {
  it('creates the sale, computes totals, persists lines, and deducts stock', async () => {
    const sale = await createSaleTransaction(
      { storeId: STORE_A, discount: 200, notes: 'counter sale', lines: [{ productId: P1, qty: 2 }, { productId: P2, qty: 1 }] },
      ACTOR,
      { ip: '10.0.0.1', userAgent: 'vitest' },
    )

    expect(sale.id).toBeTruthy()
    expect(sale.sale_number).toBe(ADVISED_SALE_NUMBER)
    expect(sale.store_id).toBe(STORE_A)
    expect(sale.notes).toBe('counter sale')

    const dbSale = dbRow('sales', (r) => r.id === sale.id)
    expect(dbSale).toBeDefined()
    expect(dbSale?.discount).toBe(200)
    expect(dbSale?.created_by).toBe(ADMIN)

    const dbLines = getFakeDb().sale_lines.filter((l) => l.sale_id === sale.id)
    expect(dbLines).toHaveLength(2)
    expect(dbLines).toMatchObject([
      { product_id: P1, qty: 2, unit_price: 249 },
      { product_id: P2, qty: 1, unit_price: 1499 },
    ])

    expect(qtyOnHand(P1)).toBe(43)
    expect(qtyOnHand(P2)).toBe(7)

    const memLines = memorySaleLines.filter((l) => l.sale_id === sale.id)
    expect(memLines).toHaveLength(2)
    expect(memLines).toMatchObject([
      { qty: 2, line_total: 498, unit_price: 249, products: { sku_code: 'PELEC-001', name: 'USB-C Charging Cable 1m' } },
      { qty: 1, line_total: 1499, unit_price: 1499, products: { sku_code: 'PELEC-002', name: 'Wireless Earbuds Pro' } },
    ])
  })

  it('clamps the discount at the computed subtotal', async () => {
    const sale = await createSaleTransaction(
      { storeId: STORE_A, discount: 9999, lines: [{ productId: P1, qty: 2 }] },
      ACTOR,
    )
    const dbSale = dbRow('sales', (r) => r.id === sale.id)
    expect(dbSale?.discount).toBe(498)
    const memLine = memorySaleLines.find((l) => l.sale_id === sale.id)
    expect(memLine?.line_total).toBe(498)
  })

  it('throws INSUFFICIENT_STOCK when a line exceeds available on-hand', async () => {
    const err = await createSaleTransaction(
      { storeId: STORE_A, lines: [{ productId: P3, qty: 1 }] },
      ACTOR,
    ).catch((e) => e)
    expect(err.code).toBe('INSUFFICIENT_STOCK')
    expect(err.message).toContain('Phone Screen Protector (PELEC-003)')
    expect(getFakeDb().sales).toHaveLength(2) // nothing persisted
  })

  it('throws INSUFFICIENT_STOCK when no inventory row exists for the location', async () => {
    const db = getFakeDb()
    db.inventory = db.inventory.filter((r) => r.product_id !== P1 || r.location_id !== LOC_A)
    const err = await createSaleTransaction(
      { storeId: STORE_A, lines: [{ productId: P1, qty: 999 }] },
      ACTOR,
    ).catch((e) => e)
    expect(err.code).toBe('INSUFFICIENT_STOCK')
  })
})

describe('querySales (db path)', () => {
  it('lists seeded sales newest-first with an exact total', async () => {
    const { sales, total } = await querySales({})
    expect(total).toBe(2)
    expect(sales[0]).toMatchObject({ sale_number: 'SALE-2026-0100', total: 1997, status: 'active' })
    expect(sales[1]).toMatchObject({ sale_number: 'SALE-2026-0099', status: 'voided' })
  })

  it('filters by store, status, and date range', async () => {
    const byStore = await querySales({ store_id: STORE_A })
    expect(byStore.total).toBe(2)

    const voided = await querySales({ status: 'voided' })
    expect(voided.total).toBe(1)
    expect(voided.sales[0].sale_number).toBe('SALE-2026-0099')

    const since = await querySales({ from: '2026-08-20T00:00:00Z' })
    expect(since.total).toBe(1)
    expect(since.sales[0].sale_number).toBe('SALE-2026-0100')

    const until = await querySales({ to: '2026-08-19T23:59:59Z' })
    expect(until.total).toBe(1)
    expect(until.sales[0].sale_number).toBe('SALE-2026-0099')

    const empty = await querySales({ from: '2026-09-01T00:00:00Z' })
    expect(empty.total).toBe(0)
    expect(empty.sales).toHaveLength(0)
  })

  it('paginates with offset and limit while keeping the exact total', async () => {
    const page = await querySales({ offset: 1, limit: 1 })
    expect(page.sales).toHaveLength(1)
    expect(page.sales[0].sale_number).toBe('SALE-2026-0099')
    expect(page.total).toBe(2)
  })
})

describe('getSaleDetail (db path)', () => {
  it('returns the sale with enriched line items', async () => {
    const detail = await getSaleDetail(SALE_1_ID)
    expect(detail.sale).toMatchObject({ sale_number: 'SALE-2026-0100', store_id: STORE_A })
    expect(detail.lines).toHaveLength(2)
    expect(detail.lines[0]).toMatchObject({
      product_id: P1,
      qty: 2,
      unit_price: 249,
      line_total: 498,
      products: { sku_code: 'PELEC-001', name: 'USB-C Charging Cable 1m' },
    })
    expect(detail.lines[1]).toMatchObject({
      product_id: P2,
      qty: 1,
      unit_price: 1499,
      line_total: 1499,
      products: { sku_code: 'PELEC-002', name: 'Wireless Earbuds Pro' },
    })
    expect(detail.returns).toHaveLength(0)
  })

  it('throws NOT_FOUND for an unknown id', async () => {
    const err = await getSaleDetail('d1000000-0000-0000-0000-00000000dead').catch((e) => e)
    expect(err.code).toBe('NOT_FOUND')
  })
})

describe('voidSaleTransaction (db path)', () => {
  it('voids an active sale, restores stock, and marks the db row', async () => {
    const res = await voidSaleTransaction(SALE_1_ID, { reason: 'customer dispute' }, ACTOR)
    expect(res.message).toBe('Sale voided and stock restored')

    const dbSale = dbRow('sales', (r) => r.id === SALE_1_ID)
    expect(dbSale).toMatchObject({ status: 'voided', void_reason: 'customer dispute', voided_by: ADMIN })
    expect(dbSale?.voided_at).toBeTruthy()

    expect(qtyOnHand(P1)).toBe(47) // restored +2
    expect(qtyOnHand(P2)).toBe(9) // restored +1
    expect(memorySales.find((s) => s.id === SALE_1_ID)?.status).toBe('voided')
  })

  it('rejects voiding an already voided sale', async () => {
    const err = await voidSaleTransaction(SALE_2_ID, { reason: 'again' }, ACTOR).catch((e) => e)
    expect(err.code).toBe('ALREADY_VOIDED')
  })

  it('only restores the returnable remainder after a partial return', async () => {
    await processSaleReturnTransaction(
      SALE_1_ID,
      { reason: 'damaged', lines: [{ saleLineId: SALE_LINE_1_ID, productId: P1, qtyReturned: 1 }] },
      ACTOR,
    )
    await voidSaleTransaction(SALE_1_ID, { reason: 'dispute' }, ACTOR)
    expect(qtyOnHand(P1)).toBe(47) // +1 returned earlier, +1 restored on void (2 - 1 already returned)
  })
})

describe('processSaleReturnTransaction (db path)', () => {
  it('processes a partial return, restores stock, and persists the records', async () => {
    const result = await processSaleReturnTransaction(
      SALE_1_ID,
      { reason: 'damaged', notes: 'dent in box', lines: [{ saleLineId: SALE_LINE_1_ID, productId: P1, qtyReturned: 1 }] },
      ACTOR,
      { ip: '10.0.0.2' },
    )

    expect(result.return).toMatchObject({ sale_id: SALE_1_ID, store_id: STORE_A, reason: 'damaged', notes: 'dent in box', refund_amount: 249 })
    expect(result.return.id).toBeTruthy()
    expect(result.lines[0]).toMatchObject({ sale_line_id: SALE_LINE_1_ID, qty_returned: 1, unit_price: 249, line_refund: 249 })

    expect(qtyOnHand(P1)).toBe(46)

    const dbReturns = getFakeDb().sale_returns.filter((r) => r.sale_id === SALE_1_ID)
    expect(dbReturns).toHaveLength(1)
    expect(dbReturns[0].refund_amount).toBe(249)
    const dbLines = getFakeDb().sale_return_lines.filter((rl) => rl.return_id === dbReturns[0].id)
    expect(dbLines).toHaveLength(1)
    expect(dbLines[0]).toMatchObject({ sale_line_id: SALE_LINE_1_ID, product_id: P1, qty_returned: 1 })
  })

  it('rejects returning more than the remaining returnable quantity', async () => {
    await processSaleReturnTransaction(
      SALE_1_ID,
      { reason: 'damaged', lines: [{ saleLineId: SALE_LINE_1_ID, productId: P1, qtyReturned: 1 }] },
      ACTOR,
    )
    const err = await processSaleReturnTransaction(
      SALE_1_ID,
      { reason: 'damaged', lines: [{ saleLineId: SALE_LINE_1_ID, productId: P1, qtyReturned: 2 }] },
      ACTOR,
    ).catch((e) => e)
    expect(err.code).toBe('RETURN_EXCEEDS_SOLD')
    expect(err.message).toContain('Only 1 remaining returnable')
  })

  it('rejects a line that does not belong to the sale', async () => {
    const err = await processSaleReturnTransaction(
      SALE_1_ID,
      { reason: 'x', lines: [{ saleLineId: 'sl100000-0000-0000-0000-000000009999', productId: P3, qtyReturned: 1 }] },
      ACTOR,
    ).catch((e) => e)
    expect(err.code).toBe('LINE_NOT_FOUND')
  })

  it('rejects a product mismatch on the line', async () => {
    const err = await processSaleReturnTransaction(
      SALE_1_ID,
      { reason: 'x', lines: [{ saleLineId: SALE_LINE_1_ID, productId: P2, qtyReturned: 1 }] },
      ACTOR,
    ).catch((e) => e)
    expect(err.code).toBe('PRODUCT_MISMATCH')
  })

  it('rejects returns on a voided sale', async () => {
    await voidSaleTransaction(SALE_1_ID, { reason: 'void' }, ACTOR)
    const err = await processSaleReturnTransaction(
      SALE_1_ID,
      { reason: 'x', lines: [{ saleLineId: SALE_LINE_1_ID, productId: P1, qtyReturned: 1 }] },
      ACTOR,
    ).catch((e) => e)
    expect(err.code).toBe('SALE_IS_VOIDED')
  })
})

describe('querySaleReturns (db path)', () => {
  it('lists persisted returns with exact totals and filters', async () => {
    await processSaleReturnTransaction(
      SALE_1_ID,
      { reason: 'damaged', lines: [{ saleLineId: SALE_LINE_1_ID, productId: P1, qtyReturned: 1 }] },
      ACTOR,
    )

    const all = await querySaleReturns({})
    expect(all.total).toBe(1)
    expect(all.returns[0]).toMatchObject({ sale_id: SALE_1_ID, store_id: STORE_A, refund_amount: 249, reason: 'damaged' })

    const bySale = await querySaleReturns({ sale_id: SALE_1_ID })
    expect(bySale.total).toBe(1)
    const other = await querySaleReturns({ sale_id: SALE_2_ID })
    expect(other.total).toBe(0)

    const byStore = await querySaleReturns({ store_id: STORE_A })
    expect(byStore.total).toBe(1)
  })
})

describe('getStoreLocationId (db path)', () => {
  it('resolves the store location from the locations table', async () => {
    await expect(getStoreLocationId(STORE_A)).resolves.toBe(LOC_A)
  })

  it('throws NO_STORE_LOCATION for an unknown store', async () => {
    const err = await getStoreLocationId('aaaaaaaa-0000-0000-0000-000000000009').catch((e) => e)
    expect(err.code).toBe('NO_STORE_LOCATION')
  })
})

describe('mutateMemoryStock', () => {
  it('adds stock and recomputes the status', () => {
    mutateMemoryStock(P1, LOC_A, 5)
    expect(qtyOnHand(P1)).toBe(50)
  })

  it('clamps the quantity at zero on large negative deltas', () => {
    mutateMemoryStock(P3, LOC_A, -50)
    expect(qtyOnHand(P3)).toBe(0)
  })
})