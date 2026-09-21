import { useMemo, useState } from 'react'
import {
  ScrollText,
  Filter,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  History,
} from 'lucide-react'
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui'
import { useAuthStore } from '@/stores'
import { useAuditLogs } from '@/hooks'
import type { AuditLog } from '@/lib/types'

const PAGE_SIZE = 50

const AUDIT_ACTIONS = [
  'user_login', 'user_logout', 'user_created', 'user_updated',
  'user_deactivated', 'user_reactivated', 'password_reset',
  'product_created', 'product_updated', 'product_archived', 'product_restored',
  'stock_in', 'stock_out', 'stock_transfer', 'stock_adjustment',
  'sale_created', 'sale_voided', 'sale_returned',
  'po_created', 'po_updated', 'po_sent', 'po_received',
  'po_partially_received', 'po_closed', 'po_cancelled',
  'ai_recommendation_created', 'ai_recommendation_accepted', 'ai_recommendation_rejected',
  'alert_created', 'alert_read', 'alert_dismissed',
  'category_created', 'category_updated', 'category_archived',
  'unit_created', 'unit_updated',
  'store_created', 'store_updated',
  'location_created', 'location_updated',
  'supplier_created', 'supplier_updated', 'supplier_archived',
  'setting_updated',
]

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  store_staff: 'Store Staff',
  sales_personnel: 'Sales Personnel',
  senior_stakeholder: 'Senior Stakeholder',
}

function formatDetail(detail: Record<string, unknown> | null): string {
  if (!detail) return '—'
  try {
    const text = JSON.stringify(detail)
    return text.length > 120 ? `${text.slice(0, 120)}…` : text
  } catch {
    return '—'
  }
}

function actionBadge(action: string) {
  const map: Record<string, string> = {
    user_login: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
    user_logout: 'bg-muted text-muted-foreground',
    user_created: 'bg-purple-500/15 text-purple-700 dark:text-purple-300',
    user_updated: 'bg-purple-500/15 text-purple-700 dark:text-purple-300',
    user_deactivated: 'bg-destructive/15 text-destructive',
    user_reactivated: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
    password_reset: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
    product_created: 'bg-blue-500/15 text-blue-700 dark:text-blue-300',
    product_updated: 'bg-blue-500/15 text-blue-700 dark:text-blue-300',
    product_archived: 'bg-destructive/15 text-destructive',
    product_restored: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
    stock_in: 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300',
    stock_out: 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300',
    stock_transfer: 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300',
    stock_adjustment: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
    sale_created: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
    sale_voided: 'bg-destructive/15 text-destructive',
    sale_returned: 'bg-rose-500/15 text-rose-700 dark:text-rose-300',
    po_created: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300',
    po_updated: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300',
    po_sent: 'bg-blue-500/15 text-blue-700 dark:text-blue-300',
    po_received: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
    po_closed: 'bg-slate-500/15 text-slate-700 dark:text-slate-300',
    po_cancelled: 'bg-destructive/15 text-destructive',
    ai_recommendation_created: 'bg-fuchsia-500/15 text-fuchsia-700 dark:text-fuchsia-300',
    ai_auto_po_created: 'bg-fuchsia-500/15 text-fuchsia-700 dark:text-fuchsia-300',
    alert_created: 'bg-orange-500/15 text-orange-700 dark:text-orange-300',
    alert_read: 'bg-muted text-muted-foreground',
    alert_dismissed: 'bg-muted text-muted-foreground',
    setting_updated: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
    sensitive_data_accessed: 'bg-destructive/15 text-destructive',
  }

  return map[action] ?? 'bg-muted text-muted-foreground'
}

export default function AuditPage() {
  const user = useAuthStore((s) => s.user)
  const canView = user?.role === 'admin' || user?.role === 'sales_personnel'

  // Filters
  const [actionFilter, setActionFilter] = useState<string>('all')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [fromDate, setFromDate] = useState<string>('')
  const [toDate, setToDate] = useState<string>('')
  const [offset, setOffset] = useState(0)

  const { data, isLoading, isRefetching, refetch } = useAuditLogs({
    action: actionFilter !== 'all' ? actionFilter : undefined,
    actorRole: roleFilter !== 'all' ? roleFilter : undefined,
    from: fromDate ? new Date(fromDate).toISOString() : undefined,
    to: toDate ? new Date(toDate).toISOString() : undefined,
    limit: PAGE_SIZE,
    offset,
  })

  const logs = useMemo(() => data?.logs ?? [], [data])
  const total = data?.total ?? 0
  const hasNext = offset + PAGE_SIZE < total
  const hasPrev = offset > 0

  const resetPage = () => setOffset(0)

  const applyAction = (v: string) => {
    setActionFilter(v)
    resetPage()
  }

  if (!canView) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <ShieldCheck className="h-12 w-12 text-muted-foreground/40" />
        <h1 className="mt-4 text-xl font-semibold">Access restricted</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Only Admins and Sales Personnel can view the audit trail.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Audit Log Viewer
          </h1>
          <p className="text-sm text-muted-foreground">
            Immutable trail of user actions, sales, stock movements, and system events.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="gap-1.5"
            disabled={isRefetching}
          >
            <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Filters:</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Action:</span>
              <Select value={actionFilter} onValueChange={applyAction}>
                <SelectTrigger className="h-9 w-56">
                  <SelectValue placeholder="All Actions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  {AUDIT_ACTIONS.map((a) => (
                    <SelectItem key={a} value={a}>
                      {a.replace(/_/g, ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Role:</span>
              <Select value={roleFilter} onValueChange={(v) => { setRoleFilter(v); resetPage() }}>
                <SelectTrigger className="h-9 w-40">
                  <SelectValue placeholder="All Roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="store_staff">Store Staff</SelectItem>
                  <SelectItem value="sales_personnel">Sales Personnel</SelectItem>
                  <SelectItem value="senior_stakeholder">Senior Stakeholder</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">From:</span>
              <Input
                type="date"
                value={fromDate}
                onChange={(e) => { setFromDate(e.target.value); resetPage() }}
                className="h-9 w-36"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">To:</span>
              <Input
                type="date"
                value={toDate}
                onChange={(e) => { setToDate(e.target.value); resetPage() }}
                className="h-9 w-36"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Log Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <ScrollText className="size-5" />
              </div>
              <div>
                <CardTitle className="text-base">Audit Trail Records</CardTitle>
                <CardDescription className="text-xs">
                  {total} event{total === 1 ? '' : 's'} recorded · showing {offset + 1}–
                  {Math.min(offset + PAGE_SIZE, total)}
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2 py-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <History className="h-10 w-10 text-muted-foreground/50" />
              <h3 className="mt-3 text-base font-semibold">No audit records found</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                No events match the selected filters. The audit log is appended to as system activity occurs.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Actor</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log: AuditLog) => (
                  <TableRow key={log.id}>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                      {new Date(log.created_at).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge className={`h-5 px-1.5 text-[10px] font-medium ${actionBadge(log.action)}`}>
                        {log.action.replace(/_/g, ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium text-foreground">
                      {log.actor_email ?? 'System'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {log.actor_role ? (ROLE_LABELS[log.actor_role] ?? log.actor_role) : '—'}
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-xs text-foreground">{log.entity}</span>
                    </TableCell>
                    <TableCell className="max-w-[260px] truncate font-mono text-xs text-muted-foreground">
                      <span title={JSON.stringify(log.detail ?? {})}>
                        {formatDetail(log.detail)}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {!isLoading && total > 0 && (
            <div className="mt-4 flex items-center justify-between border-t pt-4">
              <p className="text-xs text-muted-foreground">
                Page {Math.floor(offset / PAGE_SIZE) + 1} of {Math.max(1, Math.ceil(total / PAGE_SIZE))}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1"
                  disabled={!hasPrev}
                  onClick={() => setOffset((o) => Math.max(0, o - PAGE_SIZE))}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1"
                  disabled={!hasNext}
                  onClick={() => setOffset((o) => o + PAGE_SIZE)}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}