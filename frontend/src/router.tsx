import { createBrowserRouter } from 'react-router-dom'
import { AppLayout } from '@/components/layout'
import ComponentsDemoPage from '@/pages/components-demo'
import NotFoundPage from '@/pages/not-found'
import AccessDeniedPage from '@/pages/access-denied'
import LoginPage from '@/pages/login'
import ForgotPasswordPage from '@/pages/forgot-password'
import ResetPasswordPage from '@/pages/reset-password'

/**
 * Routing structure (react-router v7 data router)
 *
 * Public (no login required, but wrapped in the app shell for navigation):
 *   /                  -> component showcase (homepage) with navbar + taskbar
 *   /login             -> sign-in
 *   /forgot-password   -> password reset request
 *   /reset-password    -> set a new password
 *   /403               -> access denied
 *
 * The login-protected app pages (dashboard, inventory, sales, etc.) are
 * temporarily removed — "showcase first". Re-added via <AppLayout> inside
 * <RequireAuth> once the auth flow is fully wired.
 */
export const router = createBrowserRouter([
  {
    path: '/',
    element: (
      <AppLayout>
        <ComponentsDemoPage />
      </AppLayout>
    ),
  },
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/forgot-password',
    element: <ForgotPasswordPage />,
  },
  {
    path: '/reset-password',
    element: <ResetPasswordPage />,
  },
  {
    path: '/403',
    element: <AccessDeniedPage />,
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
])

export default router
