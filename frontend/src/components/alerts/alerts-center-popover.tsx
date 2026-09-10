import * as React from 'react'
import {
  Bell,
  Check,
  CheckCheck,
  AlertTriangle,
  AlertCircle,
  PackageX,
  Sliders,
  ExternalLink,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import {
  Button,
  Badge,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui'
import { useAlerts, useUnreadAlertCount, useMarkAlertRead, useMarkAllAlertsRead } from '@/hooks'
import type { Alert } from '@/lib/types'

export function AlertsCenterPopover() {
  const navigate = useNavigate()
  const { data: unreadData } = useUnreadAlertCount()
  const unreadCount = unreadData?.unreadCount ?? 0

  const [filter, setFilter] = React.useState<'all' | 'unread' | 'low_stock' | 'out_of_stock'>('all')

  const { data: alertsData, isLoading } = useAlerts({
    includeRead: true,
    limit: 50,
  })

  const markReadMutation = useMarkAlertRead()
  const markAllReadMutation = useMarkAllAlertsRead()

  const allAlerts = React.useMemo(() => alertsData?.alerts ?? [], [alertsData?.alerts])

  const filteredAlerts = React.useMemo(() => {
    return allAlerts.filter((a) => {
      if (filter === 'unread') return !a.is_read
      if (filter === 'low_stock') return a.type === 'low_stock'
      if (filter === 'out_of_stock') return a.type === 'out_of_stock'
      return true
    })
  }, [allAlerts, filter])

  const handleAlertClick = (alert: Alert) => {
    if (!alert.is_read) {
      markReadMutation.mutate(alert.id)
    }
    if (alert.sku_code || alert.product_name) {
      const searchParam = alert.sku_code || alert.product_name || ''
      navigate(`/inventory?search=${encodeURIComponent(searchParam)}`)
    } else {
      navigate('/inventory')
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative size-9 text-muted-foreground hover:text-foreground"
          aria-label={`Alerts center (${unreadCount} unread)`}
        >
          <Bell className="size-4.5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex size-4.5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground ring-2 ring-background animate-in zoom-in">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-96 max-w-[calc(100vw-2rem)] p-0 shadow-xl border"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-3 bg-muted/30">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm">Alerts Center</span>
            {unreadCount > 0 && (
              <Badge variant="destructive" className="h-5 px-1.5 text-[10px]">
                {unreadCount} unread
              </Badge>
            )}
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1 px-2"
              onClick={() => markAllReadMutation.mutate()}
              disabled={markAllReadMutation.isPending}
            >
              <CheckCheck className="size-3.5" />
              <span>Mark all read</span>
            </Button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1 border-b px-3 py-2 bg-background/50 overflow-x-auto text-xs">
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`rounded-md px-2 py-1 font-medium transition-colors ${
              filter === 'all'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            All ({allAlerts.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter('unread')}
            className={`rounded-md px-2 py-1 font-medium transition-colors ${
              filter === 'unread'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            Unread ({allAlerts.filter((a) => !a.is_read).length})
          </button>
          <button
            type="button"
            onClick={() => setFilter('low_stock')}
            className={`rounded-md px-2 py-1 font-medium transition-colors ${
              filter === 'low_stock'
                ? 'bg-amber-500 text-white dark:bg-amber-600'
                : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            Low Stock
          </button>
          <button
            type="button"
            onClick={() => setFilter('out_of_stock')}
            className={`rounded-md px-2 py-1 font-medium transition-colors ${
              filter === 'out_of_stock'
                ? 'bg-destructive text-destructive-foreground'
                : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            Out of Stock
          </button>
        </div>

        {/* Alert List */}
        <div className="max-h-[380px] overflow-y-auto divide-y divide-border/60">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
              <div className="size-5 animate-spin rounded-full border-2 border-primary border-t-transparent mb-2" />
              <p className="text-xs">Loading alerts...</p>
            </div>
          ) : filteredAlerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
              <div className="flex size-10 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mb-2">
                <Check className="size-5" />
              </div>
              <p className="text-sm font-medium text-foreground">No alerts found</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {filter === 'unread'
                  ? 'All inventory notifications have been read.'
                  : 'Inventory levels are currently normal.'}
              </p>
            </div>
          ) : (
            filteredAlerts.map((alert) => (
              <div
                key={alert.id}
                onClick={() => handleAlertClick(alert)}
                className={`group relative flex items-start gap-3 p-3.5 transition-colors cursor-pointer hover:bg-muted/50 ${
                  !alert.is_read ? 'bg-primary/[0.03]' : ''
                }`}
              >
                {/* Unread indicator */}
                {!alert.is_read && (
                  <span className="absolute left-1.5 top-4 size-1.5 rounded-full bg-primary" />
                )}

                {/* Severity Icon */}
                <div className="mt-0.5 shrink-0">
                  {alert.type === 'out_of_stock' ? (
                    <div className="flex size-7 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
                      <PackageX className="size-4" />
                    </div>
                  ) : alert.type === 'low_stock' ? (
                    <div className="flex size-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                      <AlertTriangle className="size-4" />
                    </div>
                  ) : (
                    <div className="flex size-7 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600">
                      <AlertCircle className="size-4" />
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 space-y-1 text-left">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-semibold truncate text-foreground">
                      {alert.title}
                    </span>
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {formatTime(alert.created_at)}
                    </span>
                  </div>

                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                    {alert.message}
                  </p>

                  <div className="flex items-center gap-1.5 pt-0.5">
                    {alert.type === 'out_of_stock' ? (
                      <Badge variant="destructive" className="h-4 px-1 text-[9px] font-medium">
                        Out of Stock
                      </Badge>
                    ) : alert.type === 'low_stock' ? (
                      <Badge
                        variant="secondary"
                        className="h-4 px-1 text-[9px] font-medium bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/20"
                      >
                        Low Stock
                      </Badge>
                    ) : null}

                    {alert.sku_code && (
                      <span className="font-mono text-[10px] text-muted-foreground">
                        {alert.sku_code}
                      </span>
                    )}
                  </div>
                </div>

                {/* Single mark as read button */}
                {!alert.is_read && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 text-muted-foreground hover:text-foreground"
                    onClick={(e) => {
                      e.stopPropagation()
                      markReadMutation.mutate(alert.id)
                    }}
                    title="Mark as read"
                  >
                    <Check className="size-3" />
                  </Button>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <DropdownMenuSeparator className="m-0" />
        <div className="flex items-center justify-between px-4 py-2.5 bg-muted/20 text-xs">
          <Button
            variant="link"
            size="sm"
            className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground gap-1"
            onClick={() => navigate('/settings')}
          >
            <Sliders className="size-3" />
            <span>Alert Preferences</span>
          </Button>

          <Button
            variant="link"
            size="sm"
            className="h-auto p-0 text-xs text-primary font-medium gap-1"
            onClick={() => navigate('/inventory')}
          >
            <span>Open Inventory</span>
            <ExternalLink className="size-3" />
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function formatTime(isoString: string): string {
  try {
    const d = new Date(isoString)
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours}h ago`
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  } catch {
    return ''
  }
}
