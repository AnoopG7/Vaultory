import { useEffect } from 'react'
import { useAuthStore } from '@/stores'

/**
 * Initializes the auth session on app mount.
 *
 * If a stored token exists, it validates it against /auth/me and hydrates the
 * current user into the store. Call once from the app root.
 */
export function useSession() {
  const token = useAuthStore((s) => s.token)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const user = useAuthStore((s) => s.user)
  const isLoading = useAuthStore((s) => s.isLoading)
  const fetchMe = useAuthStore((s) => s.fetchMe)

  useEffect(() => {
    if (token && !user && !isLoading) {
      void fetchMe()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, user, isLoading])

  return { user, isAuthenticated, isLoading }
}
