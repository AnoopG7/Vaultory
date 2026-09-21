import { describe, expect, it } from 'vitest'
import { createProductSchema } from '@/lib/schemas/products'
import { createPurchaseOrderSchema, receivePurchaseOrderSchema } from '@/lib/schemas/purchase-orders'

const UUID = '00000000-0000-0000-0000-000000000001'

 describe('frontend validation schemas', () => {
  it('normalizes product short codes and accepts valid product input', () => {
    const result = createProductSchema.parse({
      sku_code: '  milk-01 ',
      name: 'Milk',
      categoryId: UUID,
      unitId: UUID,
      sale_price: '42.50',
    })

    expect(result.sku_code).toBe('MILK-01')
    expect(result.sale_price).toBe(42.5)
    expect(result.is_perishable).toBe(false)
  })

  it('rejects invalid product identifiers and negative prices', () => {
    const result = createProductSchema.safeParse({
      sku_code: 'X',
      name: 'Product',
      categoryId: 'not-a-uuid',
      unitId: UUID,
      sale_price: -1,
    })

    expect(result.success).toBe(false)
  })

  it('requires at least one purchase-order line', () => {
    const result = createPurchaseOrderSchema.safeParse({
      supplierId: UUID,
      destinationId: UUID,
      lines: [],
    })

    expect(result.success).toBe(false)
  })

  it('accepts a positive goods-in line and rejects zero quantity', () => {
    const valid = receivePurchaseOrderSchema.safeParse({
      lines: [{ poLineId: UUID, productId: UUID, qtyReceived: '2.5' }],
    })
    const invalid = receivePurchaseOrderSchema.safeParse({
      lines: [{ poLineId: UUID, productId: UUID, qtyReceived: 0 }],
    })

    expect(valid.success).toBe(true)
    expect(invalid.success).toBe(false)
  })
})
