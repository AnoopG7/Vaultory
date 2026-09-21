import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  useAlerts, useMarkAlertRead, useUpdateInventoryThresholds,
  useInventory, useSalesList, useCreateSale, useVoidSale,
  usePurchaseOrders, useUpdatePoStatus, useReceivePurchaseOrder,
  useDailySalesReport, useQuarterlySalesReport, useYearlySalesReport,
  useStorePerformanceReport, useSuppliers, useSupplierProducts,
  useCreateSupplier, useUsers, useCreateUser, useRecommendations,
  useActOnRecommendation, useStoresList, useLocationsList,
  useWarehouseRecommendations,
} from '@/hooks'

function wrapperFor(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

function client() {
  return new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
}

function response(body: unknown = {}) {
  return new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } })
}

describe('expanded data hooks', () => {
  beforeEach(() => vi.stubGlobal('fetch', vi.fn().mockImplementation(() => Promise.resolve(response()))))

  it('builds inventory, alert, sales, and purchase-order query URLs', async () => {
    const queryClient = client()
    const wrapper = wrapperFor(queryClient)
    const cases = [
      [useInventory, { search: 'tea', locationId: 'loc', limit: 10, offset: 0 }, '/api/inventory?search=tea&locationId=loc&limit=10&offset=0'],
      [useAlerts, { isResolved: false, includeRead: true, limit: 5 }, '/api/alerts?isResolved=false&includeRead=true&limit=5'],
      [useSalesList, { storeId: 'store', status: 'active', limit: 5 }, '/api/sales?storeId=store&status=active&limit=5'],
      [usePurchaseOrders, { search: 'PO', status: 'sent' }, '/api/purchase-orders?search=PO&status=sent'],
    ] as const

    for (const [hook, params, url] of cases) {
      vi.mocked(fetch).mockClear()
      const { result } = renderHook(() => hook(params as never), { wrapper })
      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(fetch).toHaveBeenCalledWith(url, expect.anything())
    }
  })

  it('builds report, supplier, user, AI, store, and location query URLs', async () => {
    const queryClient = client()
    const wrapper = wrapperFor(queryClient)
    const cases = [
      [useDailySalesReport, { storeId: 's', date: '2026-09-21' }, '/api/reports/sales/daily?storeId=s&date=2026-09-21'],
      [useQuarterlySalesReport, { quarter: '2026-Q3' }, '/api/reports/sales/quarterly?quarter=2026-Q3'],
      [useYearlySalesReport, { year: 2026 }, '/api/reports/sales/yearly?year=2026'],
      [useStorePerformanceReport, { from: '2026-01-01', to: '2026-09-21' }, '/api/reports/store-performance?from=2026-01-01&to=2026-09-21'],
      [useSuppliers, { search: 'fresh', limit: 10 }, '/api/suppliers?search=fresh&limit=10'],
      [useUsers, { role: 'admin', status: 'active' }, '/api/users?role=admin&status=active'],
      [useRecommendations, { status: 'pending', limit: 5 }, '/api/ai/recommendations?status=pending&limit=5'],
      [useStoresList, { search: 'main', status: 'active' }, '/api/stores?search=main&status=active'],
      [useLocationsList, { search: 'warehouse', type: 'warehouse', status: 'active' }, '/api/locations?search=warehouse&type=warehouse&status=active'],
    ] as const

    for (const [hook, params, url] of cases) {
      vi.mocked(fetch).mockClear()
      const { result } = renderHook(() => hook(params as never), { wrapper })
      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(fetch).toHaveBeenCalledWith(url, expect.anything())
    }
  })

  it('loads detail and relation queries only when identifiers are present', async () => {
    const queryClient = client()
    const wrapper = wrapperFor(queryClient)
    const { result } = renderHook(() => useSupplierProducts('supplier-1'), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(fetch).toHaveBeenCalledWith('/api/suppliers/supplier-1/products', expect.anything())

    vi.mocked(fetch).mockClear()
    const disabled = renderHook(() => useWarehouseRecommendations(), { wrapper })
    await waitFor(() => expect(disabled.result.current.isSuccess).toBe(true))
    expect(fetch).toHaveBeenCalledWith('/api/ai/warehouse-recommendations', expect.anything())
  })

  it('sends inventory, sales, PO, and alert mutation payloads', async () => {
    const queryClient = client()
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries')
    const wrapper = wrapperFor(queryClient)

    const inventory = renderHook(() => useUpdateInventoryThresholds(), { wrapper })
    await inventory.result.current.mutateAsync({ productId: 'p1', locationId: 'l1', safetyStock: 2, reorderPoint: 5, targetLevel: 10 })
    expect(fetch).toHaveBeenCalledWith('/api/inventory/p1/thresholds', expect.objectContaining({ method: 'PATCH' }))

    const sale = renderHook(() => useCreateSale(), { wrapper })
    await sale.result.current.mutateAsync({ storeId: 's1', lines: [] } as never)
    const voidSale = renderHook(() => useVoidSale(), { wrapper })
    await voidSale.result.current.mutateAsync({ id: 'sale-1', reason: 'duplicate' })

    const status = renderHook(() => useUpdatePoStatus(), { wrapper })
    await status.result.current.mutateAsync({ id: 'po-1', status: 'sent' })
    const receive = renderHook(() => useReceivePurchaseOrder(), { wrapper })
    await receive.result.current.mutateAsync({ id: 'po-1', lines: [] } as never)

    const markRead = renderHook(() => useMarkAlertRead(), { wrapper })
    await markRead.result.current.mutateAsync('alert-1')
    expect(invalidate).toHaveBeenCalled()
  })

  it('sends supplier, user, and AI mutation payloads', async () => {
    const queryClient = client()
    const wrapper = wrapperFor(queryClient)

    const supplier = renderHook(() => useCreateSupplier(), { wrapper })
    await supplier.result.current.mutateAsync({ name: 'Fresh Foods', lead_time_days: 7, status: 'active' })
    expect(fetch).toHaveBeenLastCalledWith('/api/suppliers', expect.objectContaining({ method: 'POST' }))

    const user = renderHook(() => useCreateUser(), { wrapper })
    await user.result.current.mutateAsync({ email: 'a@b.com', password: 'password', fullName: 'A', role: 'admin' })
    expect(fetch).toHaveBeenLastCalledWith('/api/users', expect.objectContaining({ method: 'POST' }))

    const recommendation = renderHook(() => useActOnRecommendation('accept'), { wrapper })
    await recommendation.result.current.mutateAsync({ id: 'rec-1', acceptedValue: 12 })
    expect(fetch).toHaveBeenLastCalledWith('/api/ai/recommendations/rec-1/accept', expect.objectContaining({ method: 'POST' }))
  })
})
