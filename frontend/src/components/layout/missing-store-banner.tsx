import { AlertTriangle } from 'lucide-react'
import { useAuthStore } from '@/stores'
import type { UserRole } from '@/lib'

const SCOPED_ROLES: UserRole[] = ['store_staff', 'sales_personnel']

/**
 * Warns store-scoped users (store_staff / sales_personnel) who have not been
 * assigned a store yet. Shown across the app so every store-level page
 * tells them to contact an administrator instead of confusingly appearing
 * empty or forbidden.
 */
export function MissingStoreBanner() {
  const user = useAuthStore((s) => s.user)
  const hasStore = Boolean(user?.storeId || user?.store_id)
  if (!user || !SCOPED_ROLES.includes(user.role) || hasStore) {
    return null
  }

  return (
    <div className="mb-4 flex items-start gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-amber-800 dark:text-amber-300">
      <AlertTriangle className="mt-0.5 size-4 shrink-0" />
      <div className="text-xs leading-relaxed">
        <span className="font-semibold">Store not assigned.</span> Contact an administrator to be linked to a store
        before using store-level features like inventory, POS, purchase orders, and AI auto-ordering.
      </div>
    </div>
  )
}