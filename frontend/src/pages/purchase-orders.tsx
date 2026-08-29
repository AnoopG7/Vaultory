import { PackageCheck } from 'lucide-react'
import { PagePlaceholder } from '@/components/layout'

export default function PurchaseOrdersPage() {
  return (
    <PagePlaceholder
      icon={PackageCheck}
      title="Purchase Orders"
      description="Submit, track, and receive purchase orders, including AI-generated ones awaiting consent."
    />
  )
}
