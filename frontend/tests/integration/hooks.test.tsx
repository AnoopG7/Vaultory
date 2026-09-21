import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useCreateProduct, useDashboardSummary, useProducts } from '@/hooks'

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

describe('data hooks', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  it('loads products with only meaningful query parameters', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({ products: [], total: 0, limit: 10, offset: 0 }), { status: 200 }))
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

    const { result } = renderHook(() => useProducts({ search: 'tea', status: 'all', limit: 10, offset: 0 }), {
      wrapper: createWrapper(queryClient),
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(fetch).toHaveBeenCalledWith('/api/products?search=tea&status=all&limit=10&offset=0', expect.anything())
    expect(result.current.data?.total).toBe(0)
  })

  it('loads dashboard summary through its query hook', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({ total_products: 3 }), { status: 200 }))
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

    const { result } = renderHook(() => useDashboardSummary(), { wrapper: createWrapper(queryClient) })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(fetch).toHaveBeenCalledWith('/api/dashboard/summary', expect.anything())
    expect(result.current.data).toEqual({ total_products: 3 })
  })

  it('posts product mutations and invalidates product and inventory caches', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({ product: { id: 'p1' } }), { status: 201 }))
    const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useCreateProduct(), { wrapper: createWrapper(queryClient) })
    await result.current.mutateAsync({
      sku_code: 'TEA',
      name: 'Tea',
      categoryId: '00000000-0000-0000-0000-000000000001',
      unitId: '00000000-0000-0000-0000-000000000001',
      sale_price: 10,
      default_safety_stock: 0,
      default_reorder_point: 0,
      default_target_level: 0,
      is_perishable: false,
      status: 'active',
      cost_price: 5,
    })

    expect(fetch).toHaveBeenCalledWith('/api/products', expect.objectContaining({ method: 'POST' }))
    expect(invalidate).toHaveBeenCalledTimes(2)
  })
})
