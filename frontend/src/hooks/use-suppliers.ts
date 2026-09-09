import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { queryKeys } from '@/lib/query-keys'
import type {
  Supplier,
  SupplierListResponse,
  SupplierProductMapping,
  SupplierProductsResponse,
  SupplierPerformance,
} from '@/lib/types'
import type { CreateSupplierInput, UpdateSupplierInput } from '@/lib/schemas/suppliers'

export interface SupplierListParams {
  search?: string
  status?: 'active' | 'inactive' | 'archived' | 'all'
  limit?: number
  offset?: number
}

export function useSuppliers(params: SupplierListParams = {}) {
  const search = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') search.set(k, String(v))
  })
  const query = search.toString()

  return useQuery({
    queryKey: queryKeys.suppliers.list(params),
    queryFn: () => api.get<SupplierListResponse>(`/suppliers${query ? `?${query}` : ''}`),
  })
}

export function useSupplier(id?: string) {
  return useQuery({
    queryKey: queryKeys.suppliers.detail(id ?? ''),
    queryFn: () => api.get<{ supplier: Supplier }>(`/suppliers/${id}`),
    enabled: Boolean(id),
  })
}

export function useSupplierProducts(id?: string) {
  return useQuery({
    queryKey: queryKeys.suppliers.products(id ?? ''),
    queryFn: () => api.get<SupplierProductsResponse>(`/suppliers/${id}/products`),
    enabled: Boolean(id),
  })
}

export function useSupplierPerformance(id?: string) {
  return useQuery({
    queryKey: queryKeys.suppliers.performance(id ?? ''),
    queryFn: () => api.get<{ performance: SupplierPerformance }>(`/suppliers/${id}/performance`),
    enabled: Boolean(id),
  })
}

export function useCreateSupplier() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateSupplierInput) =>
      api.post<{ supplier: Supplier }>('/suppliers', input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.suppliers.all })
    },
  })
}

export function useUpdateSupplier() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...updates }: { id: string } & UpdateSupplierInput) =>
      api.patch<{ supplier: Supplier }>(`/suppliers/${id}`, updates),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.suppliers.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.suppliers.detail(variables.id) })
    },
  })
}

export function useDeleteSupplier() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete<{ message: string }>(`/suppliers/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.suppliers.all })
    },
  })
}

export interface MapProductPayload {
  supplier_id: string
  product_id: string
  unit_cost?: number | null
  lead_time_override?: number | null
  is_preferred?: boolean
}

export function useMapSupplierProduct() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ supplier_id, ...data }: MapProductPayload) =>
      api.post<{ mapping: SupplierProductMapping }>(`/suppliers/${supplier_id}/products`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.suppliers.products(variables.supplier_id),
      })
      queryClient.invalidateQueries({ queryKey: queryKeys.suppliers.all })
    },
  })
}

export function useUpdateSupplierProduct() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      supplier_id,
      product_id,
      ...updates
    }: {
      supplier_id: string
      product_id: string
      unit_cost?: number | null
      lead_time_override?: number | null
      is_preferred?: boolean
    }) =>
      api.patch<{ mapping: SupplierProductMapping }>(
        `/suppliers/${supplier_id}/products/${product_id}`,
        updates,
      ),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.suppliers.products(variables.supplier_id),
      })
    },
  })
}

export function useUnmapSupplierProduct() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ supplier_id, product_id }: { supplier_id: string; product_id: string }) =>
      api.delete<{ message: string }>(`/suppliers/${supplier_id}/products/${product_id}`),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.suppliers.products(variables.supplier_id),
      })
    },
  })
}
