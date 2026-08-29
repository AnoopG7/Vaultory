import { Boxes } from 'lucide-react'
import { PagePlaceholder } from '@/components/layout'

export default function InventoryPage() {
  return (
    <PagePlaceholder
      icon={Boxes}
      title="Inventory"
      description="Per-store stock levels, reorder points, and low-stock alerts for all three stores."
    />
  )
}
