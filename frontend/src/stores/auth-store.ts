import { create } from 'zustand'
import { api, ApiError } from '@/lib'
import type { SignInInput, SignUpInput } from '@/lib/schemas'
import type { User } from '@/lib/types'

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  signIn: (input: SignInInput) => Promise<void>
  signUp: (input: SignUpInput) => Promise<void>
  fetchMe: () => Promise<void>
  forgotPassword: (email: string) => Promise<void>
  resetPassword: (token: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  clearError: () => void
}

const TOKEN_KEY = 'vaultory_token'

function readStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: readStoredToken(),
  isAuthenticated: Boolean(readStoredToken()),
  isLoading: false,
  error: null,

  signIn: async (input) => {
    set({ isLoading: true, error: null })
    try {
      const res = await api.post<{ user: User; token: string; refresh_token: string | null; expires_at: number | null }>(
        '/auth/signin',
        input,
      )
      localStorage.setItem(TOKEN_KEY, res.token)
      set({ user: res.user, token: res.token, isAuthenticated: true, isLoading: false })
    } catch (e) {
      set({ isLoading: false, error: e instanceof ApiError ? e.message : 'Sign in failed' })
      throw e
    }
  },

  signUp: async (input) => {
    set({ isLoading: true, error: null })
    try {
      await api.post<{ message: string }>('/auth/signup', input)
      set({ isLoading: false })
    } catch (e) {
      set({ isLoading: false, error: e instanceof ApiError ? e.message : 'Sign up failed' })
      throw e
    }
  },

  fetchMe: async () => {
    const token = get().token
    if (!token) return
    set({ isLoading: true, error: null })
    try {
      const res = await api.get<{ user: User }>('/auth/me')
      set({ user: res.user, isAuthenticated: true, isLoading: false })
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        localStorage.removeItem(TOKEN_KEY)
        set({ user: null, token: null, isAuthenticated: false, isLoading: false, error: null })
      } else {
        set({ isLoading: false, error: e instanceof ApiError ? e.message : 'Failed to load session' })
      }
    }
  },

  forgotPassword: async (email) => {
    set({ isLoading: true, error: null })
    try {
      await api.post<{ message: string }>('/auth/forgot-password', { email })
      set({ isLoading: false })
    } catch (e) {
      set({ isLoading: false, error: e instanceof ApiError ? e.message : 'Failed to send reset link' })
      throw e
    }
  },

  resetPassword: async (token, password) => {
    set({ isLoading: true, error: null })
    try {
      await api.post<{ message: string }>('/auth/reset-password', { token, password })
      set({ isLoading: false })
    } catch (e) {
      set({ isLoading: false, error: e instanceof ApiError ? e.message : 'Failed to reset password' })
      throw e
    }
  },

  signOut: async () => {
    set({ isLoading: true, error: null })
    try {
      await api.post<{ message: string }>('/auth/signout')
    } catch {
      // Ignore network errors on signout; always clear locally.
    } finally {
      localStorage.removeItem(TOKEN_KEY)
      set({ user: null, token: null, isAuthenticated: false, isLoading: false, error: null })
    }
  },

  clearError: () => set({ error: null }),
}))
