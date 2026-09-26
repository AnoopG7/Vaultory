import { useEffect } from 'react'
import { useAuthStore } from '@/stores'

/**
 * Initializes the auth session on app mount and re-validates it against
 * /auth/me on every load. The cached user from localStorage may be stale
 * (e.g. a store reassignment by an admin), so we always refresh the profile
 * from the server so store scope, role, and name stay in sync.
 */
export function useSession() {
  const token = useAuthStore((s) => s.token)
  const user = useAuthStore((s) => s.user)
  const isLoading = useAuthStore((s) => s.isLoading)
  const fetchMe = useAuthStore((s) => s.fetchMe)

  useEffect(() => {
    if (token) {
      void fetchMe()
    }
    // Refresh the profile whenever the token appears or changes (mount / sign-in).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  return { user, isLoading }
}
