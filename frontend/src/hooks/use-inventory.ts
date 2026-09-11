import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { queryKeys } from '@/lib/query-keys'
import type {
  InventoryItem,
  InventoryListResponse,
  MovementType,
  StockMovementListResponse,
  StockStatus,
  TransferResponse,
} from '@/lib/types'

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

// ── Stock operations (stock-in / stock-out / transfer / adjust) ─────────────

export interface StockInInput {
  productId: string
  locationId: string
  qty: number
  poId?: string | null
  poLineId?: string | null
  reason?: string
  notes?: string
  earliestExpiryDate?: string
}

export interface StockOutInput {
  productId: string
  locationId: string
  qty: number
  reason: string
  notes?: string
}

export interface StockTransferInput {
  productId: string
  sourceLocationId: string
  destinationLocationId: string
  qty: number
  notes?: string
}

export interface StockAdjustInput {
  productId: string
  locationId: string
  newQty: number
  reason?: string
  notes?: string
}

export interface StockMutationResponse {
  movement_id: string
  product_id: string
  location_id: string
  qty_before: number
  qty_after: number
  message: string
}

function invalidateAfterStockMutation(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all })
  queryClient.invalidateQueries({ queryKey: queryKeys.inventory.movements() })
  queryClient.invalidateQueries({ queryKey: queryKeys.alerts.all })
  queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all })
}

export function useStockIn() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: StockInInput) => api.post<StockMutationResponse>('/inventory/stock-in', input),
    onSuccess: () => invalidateAfterStockMutation(queryClient),
  })
}

export function useStockOut() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: StockOutInput) => api.post<StockMutationResponse>('/inventory/stock-out', input),
    onSuccess: () => invalidateAfterStockMutation(queryClient),
  })
}

export function useStockTransfer() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: StockTransferInput) => api.post<TransferResponse>('/inventory/transfer', input),
    onSuccess: () => invalidateAfterStockMutation(queryClient),
  })
}

export function useStockAdjust() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: StockAdjustInput) => api.post<StockMutationResponse>('/inventory/adjust', input),
    onSuccess: () => invalidateAfterStockMutation(queryClient),
  })
}

export interface InventoryMovementsParams {
  productId?: string
  locationId?: string
  type?: MovementType
  limit?: number
  offset?: number
}

export function useInventoryMovements(params: InventoryMovementsParams) {
  const query = new URLSearchParams()
  if (params.productId) query.set('productId', params.productId)
  if (params.locationId) query.set('locationId', params.locationId)
  if (params.type) query.set('type', params.type)
  if (params.limit) query.set('limit', String(params.limit))
  if (params.offset !== undefined) query.set('offset', String(params.offset))

  return useQuery({
    queryKey: queryKeys.inventory.movements(params),
    queryFn: () => api.get<StockMovementListResponse>(`/inventory/movements${query.toString() ? `?${query.toString()}` : ''}`),
  })
}
