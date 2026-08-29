import { LayoutDashboard } from 'lucide-react'
import { PagePlaceholder } from '@/components/layout'

export default function DashboardPage() {
  return (
    <PagePlaceholder
      icon={LayoutDashboard}
      title="Dashboard"
      description="Revenue, orders, low-stock, and auto-ordering KPIs across all three stores. This page will be wired to the backend in Sprint 2."
    />
  )
}
