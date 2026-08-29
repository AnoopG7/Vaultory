import type { LucideIcon } from 'lucide-react'

interface Props {
  title: string
  description: string
  icon: LucideIcon
}

export function PagePlaceholder({ title, description, icon: Icon }: Props) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed p-16 text-center">
      <div className="flex size-14 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="size-7" />
      </div>
      <div>
        <h1 className="text-xl font-semibold">{title}</h1>
        <p className="mt-1 max-w-md text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  )
}
