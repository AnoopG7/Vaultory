import { Sparkles } from 'lucide-react'
import { PagePlaceholder } from '@/components/layout'

export default function AutoOrderPage() {
  return (
    <PagePlaceholder
      icon={Sparkles}
      title="Auto-Ordering"
      description="AI-powered demand forecasts and reorder suggestions per store, generated via Groq with deterministic fallback. Requires manager consent before a PO is created."
    />
  )
}
