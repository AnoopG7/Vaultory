import { Settings } from 'lucide-react'
import { PagePlaceholder } from '@/components/layout'

export default function SettingsPage() {
  return (
    <PagePlaceholder
      icon={Settings}
      title="Settings"
      description="User management, roles, store configuration, and AI/auto-ordering preferences."
    />
  )
}
