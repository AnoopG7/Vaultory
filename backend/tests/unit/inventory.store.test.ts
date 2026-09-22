import { beforeEach, describe, expect, it } from 'vitest'
import { resetFakeDb, getFakeDb } from '../helpers/fake-supabase'
import { computeStockStatus, queryInventory, getInventoryItem, updateThresholds } from '../../src/modules/inventory/inventory.store'
import { inventoryDb, LOC_A, LOC_B, P1, P2 } from '../helpers/fixtures/inventory'

describe('computeStockStatus (pure)', () => {
  it('maps qty <= 0 to out_of_stock', () => {
    expect(computeStockStatus(0, 30, 100)).toBe('out_of_stock')
    expect(computeStockStatus(-5, 30, 100)).toBe('out_of_stock')
  })

  it('maps qty <= reorderPoint to low', () => {
    expect(computeStockStatus(30, 30, 100)).toBe('low')
    expect(computeStockStatus(15, 30, 100)).toBe('low')
  })

  it('maps qty > targetLevel to over_stock when targetLevel > 0', () => {
    expect(computeStockStatus(150, 30, 100)).toBe('over_stock')
  })

  it('maps everything else to in_stock', () => {
    expect(computeStockStatus(45, 30, 100)).toBe('in_stock')
  })

  it('ignores over_stock when targetLevel is 0 (no target configured)', () => {
    expect(computeStockStatus(200, 30, 0)).toBe('in_stock')
  })
})

describe('queryInventory (fake supabase, admin)', () => {
  beforeEach(() => resetFakeDb(inventoryDb()))

  it('returns all rows with computed status and exact count', async () => {
    const { data, total } = await queryInventory({}, 'admin')
    expect(total).toBe(4)
    expect(data).toHaveLength(4)
    const usb = data.find((i) => i.product_id === P1 && i.location_id === LOC_A)
    expect(usb?.cost_price).toBe(120) // admin sees cost
  })

  it('hides cost_price from non-admin roles', async () => {
    const { data } = await queryInventory({}, 'store_staff', 'aaaaaaaa-0000-0000-0000-000000000001')
    expect(data.every((i) => i.cost_price === 0)).toBe(true)
  })

  it('filters by locationId', async () => {
    const { data, total } = await queryInventory({ locationId: LOC_B }, 'admin')
    expect(total).toBe(1)
    expect(data[0].location_id).toBe(LOC_B)
  })

  it('filters by stock status', async () => {
    const { data, total } = await queryInventory({ status: 'low' }, 'admin')
    expect(total).toBe(1)
    expect(data[0].product_id).toBe(P2)
  })

  it('filters by search across name and sku', async () => {
    const byName = await queryInventory({ search: 'Earbuds' }, 'admin')
    expect(byName.total).toBe(1)
    const bySku = await queryInventory({ search: 'PELEC-003' }, 'admin')
    expect(bySku.total).toBe(1)
  })

  it('applies pagination via offset/limit', async () => {
    const { data, total } = await queryInventory({ offset: 0, limit: 2 }, 'admin')
    expect(data).toHaveLength(2)
    expect(total).toBe(4)
  })
})

describe('getInventoryItem (fake supabase)', () => {
  beforeEach(() => resetFakeDb(inventoryDb()))

  it('returns a single item for product + location', async () => {
    const item = await getInventoryItem(P1, LOC_A, 'admin')
    expect(item?.product_id).toBe(P1)
    expect(item?.location_id).toBe(LOC_A)
    expect(item?.stock_status).toBe('in_stock')
  })

  it('returns null when the item does not exist', async () => {
    const item = await getInventoryItem(P1, '00000000-0000-0000-0000-0000000000ab')
    expect(item).toBeNull()
  })
})

describe('updateThresholds (fake supabase)', () => {
  beforeEach(() => resetFakeDb(inventoryDb()))

  it('rejects negative values', async () => {
    await expect(updateThresholds({ productId: P1, safetyStock: -1, reorderPoint: 10 })).rejects.toThrow()
  })

  it('rejects reorderPoint below safetyStock', async () => {
    await expect(updateThresholds({ productId: P1, safetyStock: 50, reorderPoint: 10 })).rejects.toThrow()
  })

  it('raises target_level to satisfy reorderPoint * 2 constraint', async () => {
    await expect(updateThresholds({ productId: P1, safetyStock: 10, reorderPoint: 20 })).resolves.toMatchObject({
      productId: P1,
      safetyStock: 10,
      reorderPoint: 20,
      targetLevel: 40, // max(0, 20*2, 20+10, 10)
    })
  })

  it('throws 404 for an unknown product', async () => {
    await expect(updateThresholds({ productId: '00000000-0000-0000-0000-0000000000f0', safetyStock: 1, reorderPoint: 5 })).rejects.toThrow('Product not found')
  })

  it('persists a location-specific rule when none exists', async () => {
    const res = await updateThresholds({ productId: P2, locationId: LOC_B, safetyStock: 5, reorderPoint: 10 })
    expect(res.locationId).toBe(LOC_B)
    const rules = getFakeDb().safety_stock_rules ?? []
    const rule = rules.find((r) => r.product_id === P2 && r.location_id === LOC_B)
    expect(rule).toBeDefined()
    expect(rule?.safety_stock).toBe(5)
    expect(rule?.reorder_point).toBe(10)
  })
})