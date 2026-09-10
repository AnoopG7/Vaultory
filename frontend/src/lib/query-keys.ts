/**
 * Centralized TanStack Query key factory for cache invalidation.
 */
export const queryKeys = {
  dashboard: {
    all: ['dashboard'] as const,
    summary: () => [...queryKeys.dashboard.all, 'summary'] as const,
    revenueTrend: (days: number) => [...queryKeys.dashboard.all, 'revenue', days] as const,
    topProducts: (limit: number, days: number) =>
      [...queryKeys.dashboard.all, 'top', limit, days] as const,
    storeComparison: () => [...queryKeys.dashboard.all, 'stores'] as const,
  },
  sales: {
    all: ['sales'] as const,
    list: (params: unknown) => [...queryKeys.sales.all, 'list', params] as const,
    detail: (id: string) => [...queryKeys.sales.all, 'detail', id] as const,
    returns: (params?: unknown) => [...queryKeys.sales.all, 'returns', params] as const,
  },
  audit: {
    all: ['audit'] as const,
    list: (params?: unknown) => [...queryKeys.audit.all, 'list', params] as const,
  },
  stores: {
    all: ['stores'] as const,
    list: () => [...queryKeys.stores.all, 'list'] as const,
  },
  products: {
    all: ['products'] as const,
    list: (search?: string) => [...queryKeys.products.all, 'list', search ?? ''] as const,
  },
  suppliers: {
    all: ['suppliers'] as const,
    list: (params?: unknown) => [...queryKeys.suppliers.all, 'list', params] as const,
    detail: (id: string) => [...queryKeys.suppliers.all, 'detail', id] as const,
    products: (id: string) => [...queryKeys.suppliers.all, 'products', id] as const,
    performance: (id: string) => [...queryKeys.suppliers.all, 'performance', id] as const,
  },
  purchaseOrders: {
    all: ['purchaseOrders'] as const,
    list: (params?: unknown) => [...queryKeys.purchaseOrders.all, 'list', params] as const,
    detail: (id: string) => [...queryKeys.purchaseOrders.all, 'detail', id] as const,
    receipts: (id: string) => [...queryKeys.purchaseOrders.all, 'receipts', id] as const,
  },
  users: {
    all: ['users'] as const,
    lists: () => [...queryKeys.users.all, 'list'] as const,
    list: (params?: unknown) => [...queryKeys.users.lists(), params] as const,
    details: () => [...queryKeys.users.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.users.details(), id] as const,
  },
  inventory: {
    all: ['inventory'] as const,
    list: (params?: unknown) => [...queryKeys.inventory.all, 'list', params] as const,
    detail: (productId: string, locationId?: string) =>
      [...queryKeys.inventory.all, 'detail', productId, locationId ?? 'global'] as const,
  },
  alerts: {
    all: ['alerts'] as const,
    list: (params?: unknown) => [...queryKeys.alerts.all, 'list', params] as const,
    unreadCount: () => [...queryKeys.alerts.all, 'unread-count'] as const,
    preferences: () => [...queryKeys.alerts.all, 'preferences'] as const,
  },
  reports: {
    all: ['reports'] as const,
    daily: (params?: unknown) => [...queryKeys.reports.all, 'daily', params] as const,
    quarterly: (params?: unknown) => [...queryKeys.reports.all, 'quarterly', params] as const,
    yearly: (params?: unknown) => [...queryKeys.reports.all, 'yearly', params] as const,
    storePerformance: (params?: unknown) => [...queryKeys.reports.all, 'storePerformance', params] as const,
  },
}


