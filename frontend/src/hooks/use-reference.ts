import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { queryKeys } from '@/lib/query-keys'
import type { NewProduct, NewStore } from '@/lib/types'

export function useStores() {
  return useQuery({
    queryKey: queryKeys.stores.list(),
    queryFn: () => api.get<{ stores: NewStore[] }>('/stores'),
  })
}

export function useLocations() {
  return useQuery({
    queryKey: ['locations'] as const,
    queryFn: () =>
      api.get<{
        locations: Array<{
          id: string
          type: 'store' | 'warehouse'
          name: string
          code: string
          city: string
          is_default: boolean
        }>
      }>('/locations'),
  })
}

export function useProducts(search?: string) {
  return useQuery({
    queryKey: queryKeys.products.list(search),
    queryFn: () =>
      api.get<{ products: NewProduct[] }>(
        `/products${search ? `?search=${encodeURIComponent(search)}` : ''}`,
      ),
  })
}

