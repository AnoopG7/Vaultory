import { Link } from 'react-router-dom'
import { ShieldX } from 'lucide-react'
import { Button } from '@/components/ui'

export default function AccessDeniedPage() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 p-4 text-center">
      <div className="flex size-16 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
        <ShieldX className="size-8" />
      </div>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">403 · Access denied</h1>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          You don't have permission to view this page. Contact an administrator if you believe this is
          a mistake.
        </p>
      </div>
      <Button asChild>
        <Link to="/">Back to dashboard</Link>
      </Button>
    </div>
  )
}
