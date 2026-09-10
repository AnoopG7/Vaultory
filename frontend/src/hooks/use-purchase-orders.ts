import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { queryKeys } from '@/lib/query-keys'
import type {
  CreatePurchaseOrderInput,
  PurchaseOrderSummary,
  PurchaseOrderWithRelations,
  ReceivePurchaseOrderInput,
  UpdatePoStatusInput,
} from '@/lib/schemas/purchase-orders'

export interface PurchaseOrderListParams {
  search?: string
  status?: string
  supplierId?: string
  destinationId?: string
  source?: string
  limit?: number
  offset?: number
}

export interface PurchaseOrderListResponse {
  purchase_orders: PurchaseOrderWithRelations[]
  total: number
  limit: number
  offset: number
  summary?: PurchaseOrderSummary
}

export interface AutoTriggerResponse {
  message: string
  scanned_items_count: number
  created_pos: PurchaseOrderWithRelations[]
  total_pos_created: number
  skipped_duplicates: Array<{
    product_id: string
    product_name: string
    location_id: string
    location_name: string
    open_po_number: string
    open_status: string
    qty_on_hand: number
    reorder_point: number
  }>
  unmapped_products: Array<{
    product_id: string
    product_name: string
    location_id: string
    qty_on_hand: number
    reorder_point: number
  }>
}

export function usePurchaseOrders(params: PurchaseOrderListParams = {}) {
  const search = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') search.set(k, String(v))
  })
  const query = search.toString()

  return useQuery({
    queryKey: queryKeys.purchaseOrders.list(params),
    queryFn: () => api.get<PurchaseOrderListResponse>(`/purchase-orders${query ? `?${query}` : ''}`),
  })
}

export function usePurchaseOrder(id?: string) {
  return useQuery({
    queryKey: queryKeys.purchaseOrders.detail(id ?? ''),
    queryFn: () => api.get<{ purchase_order: PurchaseOrderWithRelations }>(`/purchase-orders/${id}`),
    enabled: Boolean(id),
  })
}

export function usePoReceipts(id?: string) {
  return useQuery({
    queryKey: queryKeys.purchaseOrders.receipts(id ?? ''),
    queryFn: () => api.get<{ receipts: unknown[] }>(`/purchase-orders/${id}/receipts`),
    enabled: Boolean(id),
  })
}

export function useCreatePurchaseOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreatePurchaseOrderInput) =>
      api.post<{ purchase_order: PurchaseOrderWithRelations; message: string }>('/purchase-orders', input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.purchaseOrders.all })
    },
  })
}

export function useAutoTriggerReorder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { destinationId?: string; dryRun?: boolean }) =>
      api.post<AutoTriggerResponse>('/purchase-orders/auto-trigger', input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.purchaseOrders.all })
    },
  })
}

export function useUpdatePoStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...updates }: { id: string } & UpdatePoStatusInput) =>
      api.patch<{ purchase_order: PurchaseOrderWithRelations; message: string }>(
        `/purchase-orders/${id}/status`,
        updates,
      ),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.purchaseOrders.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.purchaseOrders.detail(variables.id) })
    },
  })
}

export function useReceivePurchaseOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...input }: { id: string } & ReceivePurchaseOrderInput) =>
      api.post<{
        receipt: unknown
        purchase_order: PurchaseOrderWithRelations
        message: string
      }>(`/purchase-orders/${id}/receive`, input),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.purchaseOrders.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.purchaseOrders.detail(variables.id) })
      queryClient.invalidateQueries({ queryKey: queryKeys.purchaseOrders.receipts(variables.id) })
    },
  })
}
