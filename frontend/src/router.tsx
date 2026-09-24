import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppLayout } from '@/components/layout'
import { RequireRoles } from '@/components/auth'
import ComponentsDemoPage from '@/pages/components-demo'
import DashboardPage from '@/pages/dashboard'
import SalesPage from '@/pages/sales'
import SuppliersPage from '@/pages/suppliers'
import ProductsPage from '@/pages/products'
import InventoryPage from '@/pages/inventory'
import AutoOrderPage from '@/pages/auto-order'
import PurchaseOrdersPage from '@/pages/purchase-orders'
import StoresPage from '@/pages/stores'
import ReportsPage from '@/pages/reports'
import SettingsPage from '@/pages/settings'
import UsersPage from '@/pages/users'
import NotFoundPage from '@/pages/not-found'
import AccessDeniedPage from '@/pages/access-denied'
import LoginPage from '@/pages/login'
import ForgotPasswordPage from '@/pages/forgot-password'
import ResetPasswordPage from '@/pages/reset-password'

import HomePage from '@/pages/landing'

/**
 * Routing structure (react-router v7 data router)
 * - Default root `/` serves HomePage (landing/public overview)
 * - `/landing` redirects to `/`
 * - `/dashboard` and internal operational routes protected by AppLayout + RequireRoles
 */
export const router = createBrowserRouter([
  {
    path: '/',
    element: <HomePage />,
  },
  {
    path: '/landing',
    element: <Navigate to="/" replace />,
  },
  {
    element: <AppLayout />,
    children: [
      { path: '/dashboard', element: <DashboardPage /> },
      { path: '/sales', element: <SalesPage /> },
      {
        path: '/inventory',
        element: (
          <RequireRoles roles={['admin', 'store_staff', 'senior_stakeholder']}>
            <InventoryPage />
          </RequireRoles>
        ),
      },
      {
        path: '/auto-order',
        element: (
          <RequireRoles roles={['admin', 'store_staff']}>
            <AutoOrderPage />
          </RequireRoles>
        ),
      },
      {
        path: '/purchase-orders',
        element: (
          <RequireRoles roles={['admin', 'store_staff']}>
            <PurchaseOrdersPage />
          </RequireRoles>
        ),
      },
      {
        path: '/suppliers',
        element: (
          <RequireRoles roles={['admin']}>
            <SuppliersPage />
          </RequireRoles>
        ),
      },
      {
        path: '/products',
        element: (
          <RequireRoles roles={['admin']}>
            <ProductsPage />
          </RequireRoles>
        ),
      },
      {
        path: '/stores',
        element: (
          <RequireRoles roles={['admin']}>
            <StoresPage />
          </RequireRoles>
        ),
      },
      {
        path: '/reports',
        element: (
          <RequireRoles roles={['admin', 'senior_stakeholder']}>
            <ReportsPage />
          </RequireRoles>
        ),
      },
      {
        path: '/settings',
        element: (
          <RequireRoles roles={['admin']}>
            <SettingsPage />
          </RequireRoles>
        ),
      },
      {
        path: '/users',
        element: (
          <RequireRoles roles={['admin']}>
            <UsersPage />
          </RequireRoles>
        ),
      },
      {
        path: '/components',
        element: (
          <RequireRoles roles={['admin']}>
            <ComponentsDemoPage />
          </RequireRoles>
        ),
      },
    ],
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
