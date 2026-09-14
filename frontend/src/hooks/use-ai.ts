import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { queryKeys } from '@/lib/query-keys'
import type {
  AutoOrderTriggerInput,
  ForecastTriggerInput,
  ModifyAiRecommendationInput,
  RejectRecommendationInput,
} from '@/lib/schemas/ai'
import type {
  AiRecommendation,
  AutoOrderTriggerResponse,
  ForecastTriggerResponse,
  RecommendationActionResponse,
  RecommendationListResponse,
  WarehouseRecommendation,
} from '@/lib/types'

export interface RecommendationListParams {
  type?: string
  status?: string
  productId?: string
  locationId?: string
  limit?: number
  offset?: number
}

export function useRecommendations(params: RecommendationListParams = {}) {
  const search = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') search.set(k, String(v))
  })
  const query = search.toString()

  return useQuery({
    queryKey: queryKeys.ai.recommendations(params),
    queryFn: () => api.get<RecommendationListResponse>(`/ai/recommendations${query ? `?${query}` : ''}`),
  })
}

export function useRecommendation(id?: string) {
  return useQuery({
    queryKey: queryKeys.ai.recommendation(id ?? ''),
    queryFn: () => api.get<{ recommendation: AiRecommendation }>(`/ai/recommendations/${id}`),
    enabled: Boolean(id),
  })
}

export function useWarehouseRecommendations() {
  return useQuery({
    queryKey: queryKeys.ai.warehouse(),
    queryFn: () => api.get<{ recommendations: WarehouseRecommendation[] }>('/ai/warehouse-recommendations'),
  })
}

export function useActOnRecommendation(action: 'accept' | 'modify') {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, acceptedValue }: { id: string; acceptedValue?: number }) =>
      api.post<RecommendationActionResponse>(
        `/ai/recommendations/${id}/${action}`,
        (action === 'modify'
          ? { acceptedValue }
          : { acceptedValue: acceptedValue }) as ModifyAiRecommendationInput,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.ai.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.alerts.all })
    },
  })
}

export function useRejectRecommendation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, rejectionReason }: { id: string; rejectionReason?: string }) =>
      api.post<{ recommendation: AiRecommendation; message: string }>(
        `/ai/recommendations/${id}/reject`,
        { rejectionReason } satisfies RejectRecommendationInput,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.ai.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.alerts.all })
    },
  })
}

export function useForecastTrigger() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: ForecastTriggerInput) =>
      api.post<ForecastTriggerResponse>('/ai/forecast', input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.ai.all })
    },
  })
}

export function useAutoOrderTrigger() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: AutoOrderTriggerInput) =>
      api.post<AutoOrderTriggerResponse>('/ai/auto-order', input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.ai.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.purchaseOrders.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.alerts.all })
    },
  })
}