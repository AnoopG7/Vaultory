import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { queryKeys } from '@/lib/query-keys'
import type { InventoryItem, InventoryListResponse, StockStatus } from '@/lib/types'

export interface InventoryQueryParams {
  search?: string
  locationId?: string
  categoryId?: string
  status?: StockStatus
  limit?: number
  offset?: number
}

export interface UpdateThresholdsInput {
  productId: string
  locationId?: string | null
  safetyStock: number
  reorderPoint: number
  targetLevel?: number
}

export function useInventory(params: InventoryQueryParams = {}) {
  const search = new URLSearchParams()
  if (params.search) search.set('search', params.search)
  if (params.locationId) search.set('locationId', params.locationId)
  if (params.categoryId) search.set('categoryId', params.categoryId)
  if (params.status) search.set('status', params.status)
  if (params.limit) search.set('limit', String(params.limit))
  if (params.offset !== undefined) search.set('offset', String(params.offset))

  const qs = search.toString()

  return useQuery({
    queryKey: queryKeys.inventory.list(params),
    queryFn: () => api.get<InventoryListResponse>(`/inventory${qs ? `?${qs}` : ''}`),
  })
}

export function useInventoryItem(productId?: string, locationId?: string) {
  return useQuery({
    queryKey: queryKeys.inventory.detail(productId ?? '', locationId),
    queryFn: () =>
      api.get<{ data: InventoryItem }>(`/inventory/${productId}/${locationId ?? 'global'}`),
    enabled: Boolean(productId),
  })
}

export function useUpdateInventoryThresholds() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: UpdateThresholdsInput) =>
      api.patch<{ success: boolean; message: string; data: unknown }>(
        `/inventory/${input.productId}/thresholds`,
        {
          locationId: input.locationId,
          safetyStock: input.safetyStock,
          reorderPoint: input.reorderPoint,
          targetLevel: input.targetLevel,
        }
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.alerts.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all })
    },
  })
}
