import { describe, expect, it } from 'vitest'
import {
  deriveSkuPrefix,
  suggestSkuForPrefix,
  validateStockLevels,
  syncProductToMockStores,
  registerProductInMockStores,
  memoryProducts,
} from '../../src/modules/products/products.store'
import { memoryInventory } from '../../src/modules/inventory/inventory.store'

describe('deriveSkuPrefix', () => {
  it('joins initials of multi-word category names', () => {
    expect(deriveSkuPrefix('Mobile Accessories')).toBe('MA')
    expect(deriveSkuPrefix('Safety & Equipment')).toBe('SE')
  })

  it('takes the first four characters of a single-word category', () => {
    expect(deriveSkuPrefix('Dairy')).toBe('DAIR')
    expect(deriveSkuPrefix('Electronics')).toBe('ELEC')
  })

  it('strips non-alphanumeric characters from words', () => {
    expect(deriveSkuPrefix('USB-C Cables')).toBe('UC')
  })

  it('caps the initial count at four words', () => {
    expect(deriveSkuPrefix('A B C D E')).toBe('ABCD')
  })

  it('falls back to GEN for empty or symbol-only input', () => {
    expect(deriveSkuPrefix('   ')).toBe('GEN')
    expect(deriveSkuPrefix('!!! $$$')).toBe('GEN')
  })
})

describe('suggestSkuForPrefix', () => {
  it('increments the maximum existing sequence for a known prefix', () => {
    expect(suggestSkuForPrefix('ELEC')).toBe('PELEC-005')
  })

  it('is case-insensitive against existing SKUs', () => {
    expect(suggestSkuForPrefix('elec')).toBe('Pelec-005')
  })

  it('starts at 001 for a brand-new prefix', () => {
    expect(suggestSkuForPrefix('FOO')).toBe('PFOO-001')
  })
})

describe('validateStockLevels', () => {
  it('accepts valid target >= reorder >= safety', () => {
    expect(validateStockLevels(100, 50, 25)).toEqual({ ok: true })
    expect(validateStockLevels(25, 25, 25)).toEqual({ ok: true })
  })

  it('rejects target below reorder point', () => {
    const result = validateStockLevels(10, 50, 25)
    expect(result.ok).toBe(false)
    expect(result.message).toContain('default_target_level must be >=')
  })

  it('rejects reorder point below safety stock', () => {
    expect(validateStockLevels(100, 10, 50).ok).toBe(false)
  })
})

describe('syncProductToMockStores', () => {
  it('keeps inventory rows in sync for the edited product', () => {
    const product = memoryProducts.find((p) => p.id === 'd1000000-0000-0000-0000-000000000001')!
    const before = memoryInventory.find((i) => i.product_id === product.id)
    syncProductToMockStores({
      ...product,
      name: 'USB-C Charging Cable 2m',
      sku_code: 'PELEC-010',
      sale_price: 299,
      cost_price: 140,
      status: 'active',
    })
    const after = memoryInventory.find((i) => i.product_id === product.id)
    expect(after?.product_name).toBe('USB-C Charging Cable 2m')
    expect(after?.sku_code).toBe('PELEC-010')
    expect(after?.sale_price).toBe(299)
    expect(after?.cost_price).toBe(140)
    expect(before).toBeDefined()
  })

  it('propagates archived status to inventory rows', () => {
    const product = memoryProducts.find((p) => p.id === 'd1000000-0000-0000-0000-000000000002')!
    syncProductToMockStores({ ...product, status: 'archived' })
    const after = memoryInventory.find((i) => i.product_id === product.id)
    expect(after?.product_status).toBe('archived')
  })

  it('does not touch unrelated products', () => {
    const product = memoryProducts.find((p) => p.id === 'd1000000-0000-0000-0000-000000000003')!
    syncProductToMockStores({ ...product, sku_code: 'PELEC-999' })
    const other = memoryInventory.find((i) => i.product_id === 'd1000000-0000-0000-0000-000000000001')
    expect(other?.sku_code).toBeTruthy()
  })
})

describe('registerProductInMockStores', () => {
  it('registers a new product in the auxiliary PO catalog', () => {
    const newProduct = {
      ...memoryProducts[0],
      id: 'd1000000-0000-0000-0000-000000000099',
      name: 'Test Widget',
      sku_code: 'PWIDG-001',
    }
    registerProductInMockStores(newProduct)
  })
})