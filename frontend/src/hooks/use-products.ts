import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { queryKeys } from '@/lib/query-keys'
import type {
  Category,
  CategoryListResponse,
  Unit,
  UnitListResponse,
} from '@/lib/types'
import type { EntityStatus } from '@/lib'
import type { CreateCategoryInput, UpdateCategoryInput } from '@/lib/schemas/categories'
import type { CreateUnitInput, UpdateUnitInput } from '@/lib/schemas/units'
import type { CreateProductInput, UpdateProductInput } from '@/lib/schemas/products'

export interface ProductListParams {
  search?: string
  categoryId?: string
  status?: 'active' | 'archived' | 'all'
  limit?: number
  offset?: number
}

/** Product row as returned by GET /api/products (cost_price MASKED for non-admin). */
export interface ProductRow {
  id: string
  sku_code: string
  name: string
  description: string | null
  category_id: string
  category_name: string | null
  unit_id: string
  unit_name: string | null
  cost_price: number | '••••'
  sale_price: number
  default_safety_stock: number
  default_reorder_point: number
  default_target_level: number
  status: EntityStatus
  updated_at: string
}

export interface ProductListResult {
  products: ProductRow[]
  total: number
  limit: number
  offset: number
}

function toQueryString(params: Record<string, unknown>): string {
  const search = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') search.set(k, String(v))
  })
  return search.toString()
}

// ── Products ────────────────────────────────────────────────────────────────

export function useProducts(params: ProductListParams = {}) {
  const query = toQueryString(params as Record<string, unknown>)
  return useQuery({
    queryKey: queryKeys.products.list(params),
    queryFn: () => api.get<ProductListResult>(`/products${query ? `?${query}` : ''}`),
  })
}

export function useProduct(id?: string) {
  return useQuery({
    queryKey: queryKeys.products.detail(id ?? ''),
    queryFn: () => api.get<{ product: ProductRow }>(`/products/${id}`),
    enabled: Boolean(id),
  })
}

/** Create payload — the API additionally requires cost_price (masked elsewhere). */
export type CreateProductPayload = CreateProductInput & { cost_price: number }

export function useCreateProduct() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateProductPayload) => api.post<{ product: ProductRow }>('/products', input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all })
    },
  })
}

export function useUpdateProduct() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...updates }: { id: string } & UpdateProductInput) =>
      api.patch<{ product: ProductRow }>(`/products/${id}`, updates),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.products.detail(variables.id) })
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all })
    },
  })
}

export function useArchiveProduct() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.patch<{ message: string }>(`/products/${id}/archive`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all })
    },
  })
}

// ── Categories ──────────────────────────────────────────────────────────────

export interface CategoryListParams {
  status?: 'active' | 'archived' | 'all'
}

export function useCategories(params: CategoryListParams = {}) {
  const query = toQueryString(params as Record<string, unknown>)
  return useQuery({
    queryKey: queryKeys.categories.list(params),
    queryFn: () => api.get<CategoryListResponse>(`/categories${query ? `?${query}` : ''}`),
  })
}

export function useCreateCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateCategoryInput) => api.post<{ category: Category }>('/categories', input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.categories.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all })
    },
  })
}

export function useUpdateCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...updates }: { id: string } & UpdateCategoryInput) =>
      api.patch<{ category: Category }>(`/categories/${id}`, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.categories.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all })
    },
  })
}

// ── Units ───────────────────────────────────────────────────────────────────

export interface UnitListParams {
  status?: 'active' | 'archived' | 'all'
}

export function useUnits(params: UnitListParams = {}) {
  const query = toQueryString(params as Record<string, unknown>)
  return useQuery({
    queryKey: queryKeys.units.list(params),
    queryFn: () => api.get<UnitListResponse>(`/units${query ? `?${query}` : ''}`),
  })
}

export function useCreateUnit() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateUnitInput) => api.post<{ unit: Unit }>('/units', input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.units.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all })
    },
  })
}

export function useUpdateUnit() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...updates }: { id: string } & UpdateUnitInput & { status?: EntityStatus }) =>
      api.patch<{ unit: Unit }>(`/units/${id}`, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.units.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all })
    },
  })
}