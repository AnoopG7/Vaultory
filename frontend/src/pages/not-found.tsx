import { Link } from 'react-router-dom'
import { FileQuestion } from 'lucide-react'
import { Button } from '@/components/ui'

export default function NotFoundPage() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 p-4 text-center">
      <div className="flex size-16 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <FileQuestion className="size-8" />
      </div>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">404 · Page not found</h1>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
      </div>
      <Button asChild>
        <Link to="/">Back to dashboard</Link>
      </Button>
    </div>
  )
}
