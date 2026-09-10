import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { queryKeys } from '@/lib/query-keys'
import type {
  DailyReportResponse,
  QuarterlyReportResponse,
  StorePerformanceResponse,
  YearlyReportResponse,
} from '@/lib/types'

export interface DailyReportParams {
  storeId?: string
  productId?: string
  date?: string
}

export interface QuarterlyReportParams {
  storeId?: string
  productId?: string
  quarter?: string
}

export interface YearlyReportParams {
  storeId?: string
  productId?: string
  year?: number
}

export interface StorePerformanceParams {
  storeId?: string
  from?: string
  to?: string
}

export function useDailySalesReport(params: DailyReportParams = {}) {
  const search = new URLSearchParams()
  if (params.storeId) search.set('storeId', params.storeId)
  if (params.productId) search.set('productId', params.productId)
  if (params.date) search.set('date', params.date)
  const qs = search.toString()

  return useQuery({
    queryKey: queryKeys.reports.daily(params),
    queryFn: () => api.get<DailyReportResponse>(`/reports/sales/daily${qs ? `?${qs}` : ''}`),
  })
}

export function useQuarterlySalesReport(params: QuarterlyReportParams = {}) {
  const search = new URLSearchParams()
  if (params.storeId) search.set('storeId', params.storeId)
  if (params.productId) search.set('productId', params.productId)
  if (params.quarter) search.set('quarter', params.quarter)
  const qs = search.toString()

  return useQuery({
    queryKey: queryKeys.reports.quarterly(params),
    queryFn: () => api.get<QuarterlyReportResponse>(`/reports/sales/quarterly${qs ? `?${qs}` : ''}`),
  })
}

export function useYearlySalesReport(params: YearlyReportParams = {}) {
  const search = new URLSearchParams()
  if (params.storeId) search.set('storeId', params.storeId)
  if (params.productId) search.set('productId', params.productId)
  if (params.year) search.set('year', String(params.year))
  const qs = search.toString()

  return useQuery({
    queryKey: queryKeys.reports.yearly(params),
    queryFn: () => api.get<YearlyReportResponse>(`/reports/sales/yearly${qs ? `?${qs}` : ''}`),
  })
}

export function useStorePerformanceReport(params: StorePerformanceParams = {}) {
  const search = new URLSearchParams()
  if (params.storeId) search.set('storeId', params.storeId)
  if (params.from) search.set('from', params.from)
  if (params.to) search.set('to', params.to)
  const qs = search.toString()

  return useQuery({
    queryKey: queryKeys.reports.storePerformance(params),
    queryFn: () => api.get<StorePerformanceResponse>(`/reports/store-performance${qs ? `?${qs}` : ''}`),
  })
}
