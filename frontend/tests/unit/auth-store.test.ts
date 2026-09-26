import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuthStore } from '@/stores/auth-store'

const user = {
  id: '00000000-0000-0000-0000-000000000001',
  email: 'admin@example.com',
  full_name: 'Admin User',
  fullName: 'Admin User',
  role: 'admin' as const,
  status: 'active' as const,
  storeId: null,
  gender: null,
  avatarUrl: null,
}

describe('auth store', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    })
  })

  it('persists a token and user after sign-in', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ user, token: 'signed-in-token', refresh_token: null, expires_at: null }), { status: 200 }),
    ))

    await useAuthStore.getState().signIn({ email: user.email, password: 'password' })

    expect(useAuthStore.getState()).toMatchObject({ user, token: 'signed-in-token', isAuthenticated: true, isLoading: false })
    expect(localStorage.getItem('vaultory_token')).toBe('signed-in-token')
    expect(localStorage.getItem('vaultory_user')).toBe(JSON.stringify(user))
  })

  it('clears local auth state even when sign-out request fails', async () => {
    localStorage.setItem('vaultory_token', 'old-token')
    localStorage.setItem('vaultory_user', JSON.stringify(user))
    useAuthStore.setState({ user, token: 'old-token', isAuthenticated: true })
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))

    await useAuthStore.getState().signOut()

    expect(useAuthStore.getState()).toMatchObject({ user: null, token: null, isAuthenticated: false, isLoading: false, error: null })
    expect(localStorage.getItem('vaultory_token')).toBeNull()
    expect(localStorage.getItem('vaultory_user')).toBeNull()
  })
})
