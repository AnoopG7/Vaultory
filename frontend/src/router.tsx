import { createBrowserRouter } from 'react-router-dom'
import { AppLayout } from '@/components/layout'
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

/**
 * Routing structure (react-router v7 data router)
 */
export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { path: '/', element: <DashboardPage /> },
      { path: '/sales', element: <SalesPage /> },
      { path: '/suppliers', element: <SuppliersPage /> },
      { path: '/products', element: <ProductsPage /> },
      { path: '/inventory', element: <InventoryPage /> },
      { path: '/auto-order', element: <AutoOrderPage /> },
      { path: '/purchase-orders', element: <PurchaseOrdersPage /> },
      { path: '/stores', element: <StoresPage /> },
      { path: '/reports', element: <ReportsPage /> },
      { path: '/settings', element: <SettingsPage /> },
      { path: '/users', element: <UsersPage /> },
      { path: '/components', element: <ComponentsDemoPage /> },
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
