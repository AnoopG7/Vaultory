export interface LocalCategory {
  id: string
  name: string
  parent_id: string | null
  sort_order: number
  status: 'active' | 'archived'
  created_at: string
  updated_at: string
}

/** Seed categories matching seed.sql v1.5 (deterministic UUID prefixes). */
export const memoryCategories: LocalCategory[] = [
  // Top-level
  { id: 'c1000000-0000-0000-0000-000000000001', name: 'Electronics',   parent_id: null, sort_order: 1, status: 'active', created_at: '2026-08-29T10:00:00.000Z', updated_at: '2026-08-29T10:00:00.000Z' },
  { id: 'c1000000-0000-0000-0000-000000000002', name: 'Grocery',       parent_id: null, sort_order: 2, status: 'active', created_at: '2026-08-29T10:00:00.000Z', updated_at: '2026-08-29T10:00:00.000Z' },
  { id: 'c1000000-0000-0000-0000-000000000003', name: 'Beverages',     parent_id: null, sort_order: 3, status: 'active', created_at: '2026-08-29T10:00:00.000Z', updated_at: '2026-08-29T10:00:00.000Z' },
  { id: 'c1000000-0000-0000-0000-000000000004', name: 'Personal Care', parent_id: null, sort_order: 4, status: 'active', created_at: '2026-08-29T10:00:00.000Z', updated_at: '2026-08-29T10:00:00.000Z' },
  { id: 'c1000000-0000-0000-0000-000000000005', name: 'Household',     parent_id: null, sort_order: 5, status: 'active', created_at: '2026-08-29T10:00:00.000Z', updated_at: '2026-08-29T10:00:00.000Z' },
  { id: 'c1000000-0000-0000-0000-000000000006', name: 'Clothing',      parent_id: null, sort_order: 6, status: 'active', created_at: '2026-08-29T10:00:00.000Z', updated_at: '2026-08-29T10:00:00.000Z' },
  { id: 'c1000000-0000-0000-0000-000000000007', name: 'Stationery',    parent_id: null, sort_order: 7, status: 'active', created_at: '2026-08-29T10:00:00.000Z', updated_at: '2026-08-29T10:00:00.000Z' },
  // Sub-categories
  { id: 'c2000000-0000-0000-0000-000000000001', name: 'Mobile Accessories', parent_id: 'c1000000-0000-0000-0000-000000000001', sort_order: 1, status: 'active', created_at: '2026-08-29T10:00:00.000Z', updated_at: '2026-08-29T10:00:00.000Z' },
  { id: 'c2000000-0000-0000-0000-000000000002', name: 'Audio',              parent_id: 'c1000000-0000-0000-0000-000000000001', sort_order: 2, status: 'active', created_at: '2026-08-29T10:00:00.000Z', updated_at: '2026-08-29T10:00:00.000Z' },
  { id: 'c2000000-0000-0000-0000-000000000003', name: 'Snacks',             parent_id: 'c1000000-0000-0000-0000-000000000002', sort_order: 1, status: 'active', created_at: '2026-08-29T10:00:00.000Z', updated_at: '2026-08-29T10:00:00.000Z' },
  { id: 'c2000000-0000-0000-0000-000000000004', name: 'Dairy',              parent_id: 'c1000000-0000-0000-0000-000000000002', sort_order: 2, status: 'active', created_at: '2026-08-29T10:00:00.000Z', updated_at: '2026-08-29T10:00:00.000Z' },
  { id: 'c2000000-0000-0000-0000-000000000005', name: 'Soft Drinks',        parent_id: 'c1000000-0000-0000-0000-000000000003', sort_order: 1, status: 'active', created_at: '2026-08-29T10:00:00.000Z', updated_at: '2026-08-29T10:00:00.000Z' },
  { id: 'c2000000-0000-0000-0000-000000000006', name: 'Juices',             parent_id: 'c1000000-0000-0000-0000-000000000003', sort_order: 2, status: 'active', created_at: '2026-08-29T10:00:00.000Z', updated_at: '2026-08-29T10:00:00.000Z' },
  { id: 'c2000000-0000-0000-0000-000000000007', name: 'Tea & Coffee',       parent_id: 'c1000000-0000-0000-0000-000000000003', sort_order: 3, status: 'active', created_at: '2026-08-29T10:00:00.000Z', updated_at: '2026-08-29T10:00:00.000Z' },
]

/** Find a category's top-level ancestor (used for SKU prefix derivation). */
export function findTopLevelCategory(categoryId: string): LocalCategory | null {
  let current = memoryCategories.find((c) => c.id === categoryId) ?? null
  const seen = new Set<string>()
  while (current && current.parent_id && !seen.has(current.id)) {
    seen.add(current.id)
    current = memoryCategories.find((c) => c.id === current!.parent_id) ?? null
  }
  return current
}