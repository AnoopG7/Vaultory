import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { resetFakeDb, setRpcHandler } from '../helpers/fake-supabase'
import { salesDb, ADVISED_SALE_NUMBER } from '../helpers/fixtures/sales'
import { LOC_A, P1, P2, P3 } from '../helpers/fixtures/inventory'

// Run the store with SUPABASE_URL marked as mock so `isMockSupabase` is true
// and every function takes its pure in-memory branch. Each vitest test file
// gets its own module graph (pool: forks), so flipping the env var here cannot
// leak into the db-path sales tests.
let S: typeof import('../../src/modules/sales/sales.store') & { memoryInventory: typeof import('../../src/modules/inventory/inventory.store').memoryInventory }
let memoryInventory: typeof import('../../src/modules/inventory/inventory.store').memoryInventory
let stockBase: typeof import('../../src/modules/inventory/inventory.store').memoryInventory
let salesBase: typeof import('../../src/modules/sales/sales.store').memorySales
let saleLinesBase: typeof import('../../src/modules/sales/sales.store').memorySaleLines
let saleReturnsBase: typeof import('../../src/modules/sales/sales.store').memorySaleReturns
let saleReturnLinesBase: typeof import('../../src/modules/sales/sales.store').memorySaleReturnLines

const M_STORE = 'e1000000-0000-0000-0000-000000000001'
const M_STORE_2 = 'e1000000-0000-0000-0000-000000000002'
const M_SALE_1 = 's1000000-0000-0000-0000-000000000001'
const ACTOR = { id: '00000000-0000-0000-0000-000000000001', email: 'admin@vaultory.com', role: 'admin' as const }

function qtyOnHand(productId: string): number {
  const item = memoryInventory.find((i) => i.product_id === productId && i.location_id === LOC_A)
  return item ? item.qty_on_hand : -1
}

beforeAll(async () => {
  process.env.SUPABASE_URL = 'https://mock.supabase.co'
  vi.resetModules()
  const salesStore = await import('../../src/modules/sales/sales.store')
  const inventoryStore = await import('../../src/modules/inventory/inventory.store')
  S = { ...salesStore, memoryInventory: inventoryStore.memoryInventory }
  memoryInventory = inventoryStore.memoryInventory
  stockBase = structuredClone(memoryInventory)
  salesBase = structuredClone(salesStore.memorySales)
  saleLinesBase = structuredClone(salesStore.memorySaleLines)
  saleReturnsBase = structuredClone(salesStore.memorySaleReturns)
  saleReturnLinesBase = structuredClone(salesStore.memorySaleReturnLines)
})

beforeEach(() => {
  resetFakeDb(salesDb())
  setRpcHandler('generate_sale_number', () => ADVISED_SALE_NUMBER)
  setRpcHandler('fn_mutate_stock', () => null)
  memoryInventory.splice(0, memoryInventory.length, ...structuredClone(stockBase))
  S.memorySales.splice(0, S.memorySales.length, ...structuredClone(salesBase))
  S.memorySaleLines.splice(0, S.memorySaleLines.length, ...structuredClone(saleLinesBase))
  S.memorySaleReturns.splice(0, S.memorySaleReturns.length, ...structuredClone(saleReturnsBase))
  S.memorySaleReturnLines.splice(0, S.memorySaleReturnLines.length, ...structuredClone(saleReturnLinesBase))
})

describe('createSaleTransaction (memory path)', () => {
  it('computes totals, discount, and status for a full sale', async () => {
    const sale = await S.createSaleTransaction(
      { storeId: M_STORE, saleDatetime: '2026-08-25T10:00:00+00:00', discount: 200, notes: 'pos', lines: [{ productId: P1, qty: 2 }, { productId: P2, qty: 1 }] },
      ACTOR,
    )

    expect(sale.sale_number).toMatch(/^SALE-2026-\d{4}$/)
    expect(sale.subtotal).toBe(1997)
    expect(sale.discount).toBe(200)
    expect(sale.total).toBe(1797)
    expect(sale.total_qty).toBe(3)
    expect(sale.total_items).toBe(2)
    expect(sale.status).toBe('active')
    expect(sale.notes).toBe('pos')
    expect(sale.created_by).toBe(ACTOR.id)
    expect(sale.sale_number.slice(0, 10)).toBe('SALE-2026-') // memory counter + local sequence

    expect(qtyOnHand(P1)).toBe(43)
    expect(qtyOnHand(P2)).toBe(7)
    expect(S.memorySales[0].id).toBe(sale.id)
    expect(S.memorySaleLines.filter((l) => l.sale_id === sale.id)).toHaveLength(2)
  })

  it('clamps a discount that exceeds the subtotal', async () => {
    const sale = await S.createSaleTransaction(
      { storeId: M_STORE, discount: 5000, lines: [{ productId: P1, qty: 2 }] },
      ACTOR,
    )
    expect(sale.subtotal).toBe(498)
    expect(sale.discount).toBe(498)
    expect(sale.total).toBe(0)
  })

  it('throws INSUFFICIENT_STOCK for an out-of-stock product', async () => {
    const err = await S.createSaleTransaction(
      { storeId: M_STORE, lines: [{ productId: P3, qty: 1 }] },
      ACTOR,
    ).catch((e) => e)
    expect(err.code).toBe('INSUFFICIENT_STOCK')
  })

  it('throws NO_STORE_LOCATION for a store without a mapped location', async () => {
    const err = await S.createSaleTransaction(
      { storeId: 'e1000000-0000-0000-0000-000000000099', lines: [{ productId: P1, qty: 1 }] },
      ACTOR,
    ).catch((e) => e)
    expect(err.code).toBe('NO_STORE_LOCATION')
  })
})

describe('querySales (memory path)', () => {
  it('searches sale numbers and notes case-insensitively', async () => {
    const byNumber = await S.querySales({ search: 'sale-2026-0001' })
    expect(byNumber.total).toBe(1)
    expect(byNumber.sales[0].id).toBe(M_SALE_1)

    const byNote = await S.querySales({ search: 'PROMO DISCOUNT' })
    expect(byNote.total).toBe(1)
    expect(byNote.sales[0].sale_number).toBe('SALE-2026-0002')

    const none = await S.querySales({ search: 'zzz' })
    expect(none.total).toBe(0)
  })

  it('combines status and date filters with pagination', async () => {
    const res = await S.querySales({ status: 'active', from: '2026-09-01T00:00:00Z', offset: 1, limit: 5 })
    expect(res.total).toBe(2)
    expect(res.sales).toHaveLength(1)
    expect(res.sales[0].sale_number).toBe('SALE-2026-0002') // memory path preserves array order
  })
})

describe('getSaleDetail / void / return (memory path)', () => {
  it('returns sale detail with lines for a created sale', async () => {
    const sale = await S.createSaleTransaction({ storeId: M_STORE, lines: [{ productId: P1, qty: 2 }] }, ACTOR)
    const detail = await S.getSaleDetail(sale.id)
    expect(detail.sale.total).toBe(498)
    expect(detail.lines).toHaveLength(1)
    expect(detail.lines[0]).toMatchObject({ line_total: 498, products: { sku_code: 'PELEC-001', name: 'USB-C Charging Cable 1m' } })
  })

  it('voids a sale from memory and restores stock', async () => {
    const sale = await S.createSaleTransaction({ storeId: M_STORE, lines: [{ productId: P1, qty: 2 }] }, ACTOR)
    const res = await S.voidSaleTransaction(sale.id, { reason: 'mistake' }, ACTOR)
    expect(res.message).toBe('Sale voided and stock restored')
    expect(qtyOnHand(P1)).toBe(45)

    const detail = await S.getSaleDetail(sale.id)
    expect(detail.sale.status).toBe('voided')
    expect(detail.sale.void_reason).toBe('mistake')

    const again = await S.voidSaleTransaction(sale.id, { reason: 'again' }, ACTOR).catch((e) => e)
    expect(again.code).toBe('ALREADY_VOIDED')
  })

  it('processes a return from memory and exposes it via querySaleReturns', async () => {
    const sale = await S.createSaleTransaction(
      { storeId: M_STORE, lines: [{ productId: P1, qty: 2 }, { productId: P2, qty: 1 }] },
      ACTOR,
    )
    const line = (await S.getSaleDetail(sale.id)).lines[0]

    const result = await S.processSaleReturnTransaction(
      sale.id,
      { reason: 'damaged', lines: [{ saleLineId: line.id, productId: P1, qtyReturned: 1 }] },
      ACTOR,
    )
    expect(result.return.refund_amount).toBe(249)
    expect(qtyOnHand(P1)).toBe(44) // 45 - 2 + 1

    const listing = await S.querySaleReturns({ sale_id: sale.id })
    expect(listing.total).toBe(1)
    expect(listing.returns[0].refund_amount).toBe(249)
  })

  it('rejects returning more than sold on a seeded sale', async () => {
    const seededLine = S.memorySaleLines.find((l) => l.sale_id === M_SALE_1)
    const err = await S.processSaleReturnTransaction(
      M_SALE_1,
      { reason: 'x', lines: [{ saleLineId: seededLine?.id ?? '', productId: seededLine?.product_id ?? '', qtyReturned: 99 }] },
      ACTOR,
    ).catch((e) => e)
    expect(err.code).toBe('RETURN_EXCEEDS_SOLD')
  })
})

describe('getStoreLocationId (memory path)', () => {
  it('falls back to the static store→location map', async () => {
    await expect(S.getStoreLocationId(M_STORE)).resolves.toBe(LOC_A)
    await expect(S.getStoreLocationId(M_STORE_2)).resolves.toBe('a1000000-0000-0000-0000-000000000002')
  })

  it('throws NO_STORE_LOCATION for unmapped stores', async () => {
    const err = await S.getStoreLocationId('e1000000-0000-0000-0000-000000000099').catch((e) => e)
    expect(err.code).toBe('NO_STORE_LOCATION')
  })
})