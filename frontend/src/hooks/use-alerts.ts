import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { queryKeys } from '@/lib/query-keys'
import type { AlertListResponse, AlertPreferences, AlertType } from '@/lib/types'

export interface AlertsQueryParams {
  type?: AlertType
  isResolved?: boolean
  includeRead?: boolean
  productId?: string
  limit?: number
  offset?: number
}

export function useAlerts(params: AlertsQueryParams = {}) {
  const search = new URLSearchParams()
  if (params.type) search.set('type', params.type)
  if (params.isResolved !== undefined) search.set('isResolved', String(params.isResolved))
  if (params.includeRead !== undefined) search.set('includeRead', String(params.includeRead))
  if (params.productId) search.set('productId', params.productId)
  if (params.limit) search.set('limit', String(params.limit))
  if (params.offset !== undefined) search.set('offset', String(params.offset))

  const qs = search.toString()

  return useQuery({
    queryKey: queryKeys.alerts.list(params),
    queryFn: () => api.get<AlertListResponse>(`/alerts${qs ? `?${qs}` : ''}`),
  })
}

export function useUnreadAlertCount() {
  return useQuery({
    queryKey: queryKeys.alerts.unreadCount(),
    queryFn: () => api.get<{ unreadCount: number }>('/alerts/unread-count'),
    refetchInterval: 15000,
  })
}

export function useMarkAlertRead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (alertId: string) =>
      api.patch<{ success: boolean; message: string }>(`/alerts/${alertId}/read`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.alerts.all })
    },
  })
}

export function useMarkAllAlertsRead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () =>
      api.patch<{ success: boolean; markedCount: number }>('/alerts/read-all', {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.alerts.all })
    },
  })
}

export function useAlertPreferences() {
  return useQuery({
    queryKey: queryKeys.alerts.preferences(),
    queryFn: () => api.get<{ data: AlertPreferences }>('/alerts/preferences'),
  })
}

export function useUpdateAlertPreferences() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (updates: Partial<AlertPreferences>) =>
      api.patch<{ success: boolean; message: string; data: AlertPreferences }>(
        '/alerts/preferences',
        updates
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.alerts.all })
    },
  })
}
