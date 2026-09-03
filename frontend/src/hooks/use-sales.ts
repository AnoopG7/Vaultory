import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { queryKeys } from '@/lib/query-keys'
import type {
  CreateSaleInput,
  Sale,
  SaleDetailResponse,
  SaleListResponse,
} from '@/lib/types'

export interface SaleListParams {
  store_id?: string
  from?: string
  to?: string
  status?: 'active' | 'voided'
  limit?: number
  offset?: number
}

export function useSalesList(params: SaleListParams = {}) {
  const search = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') search.set(k, String(v))
  })
  const query = search.toString()
  return useQuery({
    queryKey: queryKeys.sales.list(params),
    queryFn: () => api.get<SaleListResponse>(`/sales?${query}`),
  })
}

export function useSaleDetail(id?: string) {
  return useQuery({
    queryKey: queryKeys.sales.detail(id ?? ''),
    queryFn: () => api.get<SaleDetailResponse>(`/sales/${id}`),
    enabled: Boolean(id),
  })
}

export function useCreateSale() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateSaleInput) => api.post<{ sale: Sale }>('/sales', input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sales.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all })
    },
  })
}

export function useVoidSale() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      api.post<{ message: string }>(`/sales/${id}/void`, { reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sales.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all })
    },
  })
}
