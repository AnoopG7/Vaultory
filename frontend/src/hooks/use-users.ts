import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { queryKeys } from '@/lib/query-keys'
import type { UserProfile, UserListResponse, Role, Gender } from '@/lib/types'

export interface UserListParams {
  search?: string
  role?: string
  status?: 'active' | 'archived' | 'all'
  store_id?: string
  limit?: number
  offset?: number
}

export interface CreateUserInput {
  email: string
  password: string
  fullName: string
  role: Role
  storeId?: string | null
  phone?: string | null
  address?: string | null
  gender?: Gender | null
}

export interface UpdateUserInput {
  fullName?: string
  role?: Role
  storeId?: string | null
  phone?: string | null
  address?: string | null
  gender?: Gender | null
}

export interface DeactivateUserInput {
  status: 'active' | 'archived'
}

export function useUsers(params: UserListParams = {}) {
  const search = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') search.set(k, String(v))
  })
  const query = search.toString()

  return useQuery({
    queryKey: queryKeys.users.list(params),
    queryFn: () => api.get<UserListResponse>(`/users${query ? `?${query}` : ''}`),
  })
}

export function useUser(id?: string) {
  return useQuery({
    queryKey: queryKeys.users.detail(id ?? ''),
    queryFn: () => api.get<{ user: UserProfile }>(`/users/${id}`),
    enabled: Boolean(id),
  })
}

export function useCreateUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateUserInput) =>
      api.post<{ user: UserProfile; message: string }>('/users', input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.users.all })
    },
  })
}

export function useUpdateUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateUserInput }) =>
      api.patch<{ user: UserProfile; message: string }>(`/users/${id}`, data),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.users.all })
      void queryClient.invalidateQueries({ queryKey: queryKeys.users.detail(variables.id) })
    },
  })
}

export function useDeactivateUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'active' | 'archived' }) =>
      api.patch<{ user: UserProfile; message: string }>(`/users/${id}/deactivate`, { status }),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.users.all })
      void queryClient.invalidateQueries({ queryKey: queryKeys.users.detail(variables.id) })
    },
  })
}
