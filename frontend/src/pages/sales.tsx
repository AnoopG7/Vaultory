import { ShoppingCart } from 'lucide-react'
import { PagePlaceholder } from '@/components/layout'

export default function SalesPage() {
  return (
    <PagePlaceholder
      icon={ShoppingCart}
      title="Sales & Orders"
      description="Create and manage sales orders, view order history, and track revenue."
    />
  )
}
