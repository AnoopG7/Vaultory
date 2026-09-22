import { describe, expect, it, vi } from 'vitest'
import { downloadCsv, triggerPrint } from '@/lib/export'
import { alertsQuerySchema, resolveAlertSchema, upsertAlertPreferencesSchema } from '@/lib/schemas/alerts'
import { resetPasswordSchema, signInSchema, signUpSchema, verifyOtpSchema } from '@/lib/schemas/auth'
import { adjustSchema, stockInSchema, stockOutSchema, transferSchema } from '@/lib/schemas/inventory'
import { createSaleSchema, voidSaleSchema } from '@/lib/schemas/sales'
import { createStoreSchema } from '@/lib/schemas/stores'
import { createSupplierSchema, mapSupplierProductsSchema } from '@/lib/schemas/suppliers'

const UUID = '00000000-0000-0000-0000-000000000001'

describe('frontend schemas and browser utilities', () => {
  it('validates authentication flows and password confirmation', () => {
    expect(signInSchema.safeParse({ email: 'admin@example.com', password: 'secret' }).success).toBe(true)
    expect(signUpSchema.safeParse({ email: 'bad', password: 'short', fullName: '' }).success).toBe(false)
    expect(verifyOtpSchema.safeParse({ email: 'admin@example.com', token: '123456' }).success).toBe(true)
    expect(resetPasswordSchema.safeParse({ token: 'reset', password: 'password123', confirmPassword: 'different' }).success).toBe(false)
  })

  it('validates stock movements and rejects unsafe quantities', () => {
    expect(stockInSchema.safeParse({ productId: UUID, locationId: UUID, qty: 4 }).success).toBe(true)
    expect(stockOutSchema.safeParse({ productId: UUID, locationId: UUID, qty: 1, reason: 'sale' }).success).toBe(true)
    expect(stockOutSchema.safeParse({ productId: UUID, locationId: UUID, qty: 1, reason: '' }).success).toBe(false)
    expect(transferSchema.safeParse({ productId: UUID, sourceLocationId: UUID, destinationLocationId: UUID, qty: 2 }).success).toBe(true)
    expect(adjustSchema.safeParse({ productId: UUID, locationId: UUID, newQty: -1 }).success).toBe(false)
  })

  it('validates sales and applies default discount', () => {
    const sale = createSaleSchema.parse({
      storeId: UUID,
      lines: [{ productId: UUID, qty: 2, unitPrice: 10 }],
    })

    expect(sale.discount).toBe(0)
    expect(voidSaleSchema.safeParse({ reason: 'Customer request' }).success).toBe(true)
    expect(createSaleSchema.safeParse({ storeId: UUID, lines: [] }).success).toBe(false)
  })

  it('validates alerts, stores, suppliers, and normalizes defaults', () => {
    expect(alertsQuerySchema.parse({}).limit).toBe(50)
    expect(resolveAlertSchema.safeParse({ isResolved: false }).success).toBe(false)
    expect(upsertAlertPreferencesSchema.parse({}).notifyLowStock).toBe(true)
    expect(createStoreSchema.parse({ name: ' Main ', code: 'main' }).code).toBe('MAIN')
    expect(createSupplierSchema.parse({ name: 'Supplier' }).lead_time_days).toBe(7)
    expect(mapSupplierProductsSchema.safeParse({ productIds: [UUID] }).success).toBe(true)
  })

  it('exports escaped CSV content and triggers print', () => {
    const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test')
    const revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined)
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)
    const print = vi.spyOn(window, 'print').mockImplementation(() => undefined)

    downloadCsv('report', ['Name', 'Note'], [['Tea', 'contains,comma']], ['Total,1'])
    triggerPrint()

    expect(createObjectURL).toHaveBeenCalledOnce()
    expect(click).toHaveBeenCalledOnce()
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:test')
    expect(print).toHaveBeenCalledOnce()
  })
})
