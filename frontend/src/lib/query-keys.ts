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
  },
  stores: {
    all: ['stores'] as const,
    list: () => [...queryKeys.stores.all, 'list'] as const,
  },
  products: {
    all: ['products'] as const,
    list: (search?: string) => [...queryKeys.products.all, 'list', search ?? ''] as const,
  },
}
