import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { queryKeys } from '@/lib/query-keys'
import type {
  DashboardSummaryResponse,
  RevenueTrendResponse,
  StoreComparisonResponse,
  TopProductsResponse,
} from '@/lib/types'

export function useDashboardSummary() {
  return useQuery({
    queryKey: queryKeys.dashboard.summary(),
    queryFn: () => api.get<DashboardSummaryResponse>('/dashboard/summary'),
  })
}

export function useRevenueTrend(days = 30) {
  return useQuery({
    queryKey: queryKeys.dashboard.revenueTrend(days),
    queryFn: () => api.get<RevenueTrendResponse>(`/dashboard/revenue-trend?days=${days}`),
  })
}

export function useTopProducts(limit = 10, days = 30) {
  return useQuery({
    queryKey: queryKeys.dashboard.topProducts(limit, days),
    queryFn: () => api.get<TopProductsResponse>(`/dashboard/top-products?limit=${limit}&days=${days}`),
  })
}

export function useStoreComparison() {
  return useQuery({
    queryKey: queryKeys.dashboard.storeComparison(),
    queryFn: () => api.get<StoreComparisonResponse>('/dashboard/store-comparison'),
  })
}
