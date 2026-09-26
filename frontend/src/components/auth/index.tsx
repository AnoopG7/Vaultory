import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/stores'
import type { UserRole } from '@/lib'

/**
 * Route guard — redirects unauthenticated users to /login, preserving the
 * intended destination so we can return after sign-in.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const location = useLocation()

  if (!isAuthenticated) {
    const from = location.pathname + location.search
    return <Navigate to="/login" replace state={{ from }} />
  }

  return <>{children}</>
}

/**
 * Route guard — restricts a route to a set of roles. Must be nested inside
 * RequireAuth. Unauthorized users are sent to an access-denied view (/403).
 */
export function RequireRoles({
  roles,
  children,
}: {
  roles: UserRole[]
  children: ReactNode
}) {
  const user = useAuthStore((s) => s.user)
  const token = useAuthStore((s) => s.token)
  const location = useLocation()

  // Token exists but profile is still hydrating; do not redirect to /403 prematurely
  if (token && !user) {
    return (
      <div className="flex h-[50vh] w-full items-center justify-center">
        <div className="size-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  // Not authenticated -> redirect to login preserving destination
  if (!user) {
    const from = location.pathname + location.search
    return <Navigate to="/login" replace state={{ from }} />
  }

  // Authenticated but does not have the required role
  if (!roles.includes(user.role)) {
    return <Navigate to="/403" replace />
  }

  return <>{children}</>
}
