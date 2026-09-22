import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { queryKeys } from '@/lib/query-keys'
import type {
  Store,
  StoreListResponse,
  StoreDetailResponse,
  Location,
  LocationListResponse,
} from '@/lib/types'
import type { CreateStoreInput, UpdateStoreInput } from '@/lib/schemas/stores'
import type { CreateLocationInput, UpdateLocationInput } from '@/lib/schemas/locations'
import { toast } from 'sonner'

export interface StoresListParams {
  search?: string
  status?: 'all' | 'active' | 'archived' | 'inactive'
}

export function useStoresList(params: StoresListParams = {}) {
  const searchParams = new URLSearchParams()
  if (params.search) searchParams.set('search', params.search)
  if (params.status && params.status !== 'all') searchParams.set('status', params.status)
  const query = searchParams.toString()

  return useQuery({
    queryKey: queryKeys.stores.list(params),
    queryFn: () => api.get<StoreListResponse>(`/stores${query ? `?${query}` : ''}`),
  })
}

export function useStoreDetail(id?: string) {
  return useQuery({
    queryKey: queryKeys.stores.detail(id ?? ''),
    queryFn: () => api.get<StoreDetailResponse>(`/stores/${id}`),
    enabled: Boolean(id),
  })
}

export function useCreateStore() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateStoreInput) =>
      api.post<{ store: Store; location: Location }>('/stores', input),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.stores.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.locations.all })
      queryClient.invalidateQueries({ queryKey: ['locations'] })
      toast.success(`Store "${data.store.name}" and physical location created successfully`)
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to create store')
    },
  })
}

export function useUpdateStore() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...input }: { id: string } & UpdateStoreInput) =>
      api.patch<{ store: Store }>(`/stores/${id}`, input),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.stores.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.locations.all })
      queryClient.invalidateQueries({ queryKey: ['locations'] })
      toast.success(`Store "${data.store.name}" updated successfully`)
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to update store')
    },
  })
}

export interface LocationsListParams {
  search?: string
  type?: 'all' | 'store' | 'warehouse'
  status?: 'all' | 'active' | 'archived' | 'inactive'
}

export function useLocationsList(params: LocationsListParams = {}) {
  const searchParams = new URLSearchParams()
  if (params.search) searchParams.set('search', params.search)
  if (params.type && params.type !== 'all') searchParams.set('type', params.type)
  if (params.status && params.status !== 'all') searchParams.set('status', params.status)
  const query = searchParams.toString()

  return useQuery({
    queryKey: queryKeys.locations.list(params),
    queryFn: () => api.get<LocationListResponse>(`/locations${query ? `?${query}` : ''}`),
  })
}

export function useCreateLocation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateLocationInput) =>
      api.post<{ location: Location }>('/locations', input),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.locations.all })
      queryClient.invalidateQueries({ queryKey: ['locations'] })
      toast.success(`Location "${data.location.name}" created successfully`)
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to create location')
    },
  })
}

export function useUpdateLocation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...input }: { id: string } & UpdateLocationInput) =>
      api.patch<{ location: Location }>(`/locations/${id}`, input),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.locations.all })
      queryClient.invalidateQueries({ queryKey: ['locations'] })
      toast.success(`Location "${data.location.name}" updated successfully`)
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to update location')
    },
  })
}
