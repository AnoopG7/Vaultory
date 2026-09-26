import { Link } from 'react-router-dom'
import type { ReactNode } from 'react'
import {
  TrendingUp,
  PackageX,
  AlertTriangle,
  ShoppingCart,
  Layers,
  RefreshCw,
  IndianRupee,
  Store as StoreIcon,
  Building2,
  Boxes,
  PackageCheck,
  Sparkles,
  Users,
  BarChart3,
  ArrowRight,
  ShieldCheck,
  ScanLine,
  Activity,
} from 'lucide-react'
import {
  Line,
  LineChart,
  Bar,
  BarChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
} from 'recharts'
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Skeleton,
} from '@/components/ui'
import { useAuthStore } from '@/stores'
import {
  useDashboardSummary,
  useRevenueTrend,
  useStoreComparison,
  useTopProducts,
  useLocations,
} from '@/hooks'
import type { UserRole } from '@/lib/types'

const currency = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n)

const axisTick = { fill: 'var(--muted-foreground)', fontSize: 11 }

interface TooltipProps {
  active?: boolean
  payload?: Array<{ dataKey?: string | number; name?: string | number; value?: number | string }>
  label?: string | number
  formatter?: (value: number | string) => ReactNode
  labelFormatter?: (label: string | number) => ReactNode
}

function ChartTooltip({ active, payload, label, formatter, labelFormatter }: TooltipProps) {
  if (!active || !payload || payload.length === 0) return null
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
      {label !== undefined && (
        <p className="mb-1 font-medium text-popover-foreground">
          {labelFormatter ? labelFormatter(label) : label}
        </p>
      )}
      <div className="space-y-0.5">
        {payload.map((p, i) => (
          <p key={i} className="text-muted-foreground">
            {p.name}:{' '}
            <span className="font-semibold text-popover-foreground">
              {formatter ? formatter(p.value ?? 0) : p.value}
            </span>
          </p>
        ))}
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user)
  const role: UserRole = user?.role ?? 'store_staff'

  const { data: locData } = useLocations()
  const assignedLocation = locData?.locations?.find(
    (l) => l.store_id === user?.storeId || l.store_id === user?.store_id,
  )

  const isExec = role === 'admin' || role === 'senior_stakeholder'
  const isStaff = role === 'store_staff'
  const isSales = role === 'sales_personnel'

  return (
    <div className="flex flex-col gap-6">
      {/* ── Top Role-Aware Header ────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b pb-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
            <RoleBadge role={role} />
            <LocationBadge
              locationName={assignedLocation?.name}
              locationCode={assignedLocation?.code}
              isExec={isExec}
            />
          </div>
          <p className="text-sm text-muted-foreground">
            {role === 'admin' &&
              'Global multi-store operations, inventory valuation, autonomous replenishment & system RBAC.'}
            {role === 'senior_stakeholder' &&
              'Executive revenue analytics, multi-store turnover comparison, and network inventory telemetry.'}
            {role === 'store_staff' &&
              'Local store inventory health, reorder thresholds, incoming purchase orders, and stock operations.'}
            {role === 'sales_personnel' &&
              'Counter point-of-sale overview, daily sales velocity, barcode checkout, and high-demand retail items.'}
          </p>
        </div>

        {/* Header Action Button */}
        <div className="flex items-center gap-2">
          {isSales && (
            <Button asChild className="gap-2">
              <Link to="/sales">
                <ScanLine className="size-4" />
                Launch POS Register
              </Link>
            </Button>
          )}
          {isStaff && (
            <Button asChild variant="outline" className="gap-2">
              <Link to="/inventory">
                <Boxes className="size-4" />
                Stock Operations
              </Link>
            </Button>
          )}
          {role === 'senior_stakeholder' && (
            <Button asChild variant="outline" className="gap-2">
              <Link to="/reports">
                <BarChart3 className="size-4" />
                View Reports
              </Link>
            </Button>
          )}
          {role === 'admin' && (
            <Button asChild variant="outline" className="gap-2">
              <Link to="/users">
                <Users className="size-4" />
                Manage Users
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* ── Quick Role Action Bar ────────────────────────────────────────── */}
      <RoleActionBar role={role} />

      {/* ── Role-Tailored KPI Cards ──────────────────────────────────────── */}
      <RoleKpiCards role={role} />

      {/* ── Visualizations / Role Views ──────────────────────────────────── */}
      {role === 'admin' && <AdminDashboardView />}
      {role === 'senior_stakeholder' && <SeniorStakeholderDashboardView />}
      {role === 'store_staff' && <StoreStaffDashboardView />}
      {role === 'sales_personnel' && <SalesPersonnelDashboardView />}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Role & Scope Badges
// ---------------------------------------------------------------------------

function RoleBadge({ role }: { role: UserRole }) {
  switch (role) {
    case 'admin':
      return (
        <Badge className="gap-1.5 bg-primary font-medium text-primary-foreground">
          <ShieldCheck className="size-3.5" />
          Administrator
        </Badge>
      )
    case 'senior_stakeholder':
      return (
        <Badge
          variant="outline"
          className="gap-1.5 border-purple-300 bg-purple-500/10 font-medium text-purple-700 dark:border-purple-800 dark:text-purple-300"
        >
          <BarChart3 className="size-3.5" />
          Senior Stakeholder
        </Badge>
      )
    case 'store_staff':
      return (
        <Badge
          variant="outline"
          className="gap-1.5 border-blue-300 bg-blue-500/10 font-medium text-blue-700 dark:border-blue-800 dark:text-blue-300"
        >
          <Boxes className="size-3.5" />
          Store Staff
        </Badge>
      )
    case 'sales_personnel':
      return (
        <Badge
          variant="outline"
          className="gap-1.5 border-emerald-300 bg-emerald-500/10 font-medium text-emerald-700 dark:border-emerald-800 dark:text-emerald-300"
        >
          <ShoppingCart className="size-3.5" />
          Sales Specialist
        </Badge>
      )
    default:
      return null
  }
}

function LocationBadge({
  locationName,
  locationCode,
  isExec,
}: {
  locationName?: string
  locationCode?: string
  isExec: boolean
}) {
  if (locationName) {
    return (
      <Badge variant="secondary" className="gap-1.5 font-normal">
        <StoreIcon className="size-3 text-muted-foreground" />
        {locationName} {locationCode ? `(${locationCode})` : ''}
      </Badge>
    )
  }

  if (isExec) {
    return (
      <Badge variant="secondary" className="gap-1.5 font-normal">
        <Building2 className="size-3 text-muted-foreground" />
        All Stores · Global Network
      </Badge>
    )
  }

  return (
    <Badge variant="secondary" className="gap-1.5 font-normal">
      <StoreIcon className="size-3 text-muted-foreground" />
      Assigned Store Location
    </Badge>
  )
}

// ---------------------------------------------------------------------------
// Quick Action Bar per Role
// ---------------------------------------------------------------------------

function RoleActionBar({ role }: { role: UserRole }) {
  if (role === 'admin') {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
        <QuickAction to="/inventory" label="Inventory Stock" icon={Boxes} sub="Adjust & monitor" />
        <QuickAction to="/auto-order" label="Auto-Ordering" icon={Sparkles} sub="AI replenishment" />
        <QuickAction to="/purchase-orders" label="Purchase Orders" icon={PackageCheck} sub="Vendor orders" />
        <QuickAction to="/stores" label="Store Network" icon={StoreIcon} sub="Manage outlets" />
        <QuickAction to="/users" label="User Directory" icon={Users} sub="RBAC & access" />
      </div>
    )
  }

  if (role === 'store_staff') {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <QuickAction to="/inventory" label="Stock Operations" icon={Boxes} sub="Record in / out" />
        <QuickAction to="/purchase-orders" label="Purchase Orders" icon={PackageCheck} sub="Receive goods" />
        <QuickAction to="/auto-order" label="Auto-Order Triggers" icon={Sparkles} sub="Review suggestions" />
        <QuickAction to="/sales" label="Store Sales" icon={ShoppingCart} sub="View transactions" />
      </div>
    )
  }

  if (role === 'sales_personnel') {
    return (
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <ScanLine className="size-5" />
            </div>
            <div>
              <p className="font-semibold text-sm sm:text-base">Point of Sale Counter Register</p>
              <p className="text-xs text-muted-foreground">
                Scan barcode, select products, apply discounts, and generate instantaneous customer tax invoices.
              </p>
            </div>
          </div>
          <Button asChild size="sm" className="gap-2 shrink-0">
            <Link to="/sales">
              <ShoppingCart className="size-4" />
              Open Register
            </Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (role === 'senior_stakeholder') {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <QuickAction to="/reports" label="Analytics & BI" icon={BarChart3} sub="Financial & sales reports" />
        <QuickAction to="/inventory" label="Enterprise Stock" icon={Boxes} sub="Global inventory levels" />
        <QuickAction to="/sales" label="Sales Register" icon={ShoppingCart} sub="Consolidated orders" />
      </div>
    )
  }

  return null
}

function QuickAction({
  to,
  label,
  icon: Icon,
  sub,
}: {
  to: string
  label: string
  icon: typeof Boxes
  sub: string
}) {
  return (
    <Link
      to={to}
      className="group flex flex-col gap-1 rounded-lg border bg-card p-3 transition-colors hover:border-primary/50 hover:bg-accent/50"
    >
      <div className="flex items-center justify-between">
        <Icon className="size-4 text-muted-foreground transition-colors group-hover:text-primary" />
        <ArrowRight className="size-3 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
      </div>
      <p className="text-sm font-medium leading-none">{label}</p>
      <p className="text-xs text-muted-foreground">{sub}</p>
    </Link>
  )
}

// ---------------------------------------------------------------------------
// Role-Tailored KPI Cards
// ---------------------------------------------------------------------------

function RoleKpiCards({ role }: { role: UserRole }) {
  const { data, isLoading } = useDashboardSummary()

  // Cards layout adapts to role capabilities and backend scoping
  const cards =
    role === 'admin' || role === 'senior_stakeholder'
      ? [
          {
            label: 'Total Stock Valuation',
            value: data ? currency(data.total_stock_value ?? 0) : '—',
            sub: `${data?.total_stock_units ?? 0} units across stores`,
            icon: IndianRupee,
          },
          {
            label: "Today\u2019s Enterprise Sales",
            value: data ? currency(data.today_sales_total) : '—',
            sub: `${data?.today_sales_count ?? 0} active transactions`,
            icon: ShoppingCart,
          },
          {
            label: 'Low Stock Alerts',
            value: data ? String(data.low_stock_count) : '—',
            sub: 'at or below reorder threshold',
            icon: AlertTriangle,
          },
          {
            label: 'Critical Stockouts',
            value: data ? String(data.out_of_stock_count) : '—',
            sub: 'zero inventory on hand',
            icon: PackageX,
          },
        ]
      : role === 'store_staff'
        ? [
            {
              label: 'Store Stock Units',
              value: data ? `${data.total_stock_units} units` : '—',
              sub: 'on hand in assigned location',
              icon: Boxes,
            },
            {
              label: "Today\u2019s Store Sales",
              value: data ? currency(data.today_sales_total) : '—',
              sub: `${data?.today_sales_count ?? 0} counter transactions`,
              icon: ShoppingCart,
            },
            {
              label: 'Local Low Stock Alerts',
              value: data ? String(data.low_stock_count) : '—',
              sub: 'requires PO or transfer',
              icon: AlertTriangle,
            },
            {
              label: 'Out of Stock Items',
              value: data ? String(data.out_of_stock_count) : '—',
              sub: 'critical store replenishment',
              icon: PackageX,
            },
          ]
        : [
            {
              label: "Today\u2019s Sales Volume",
              value: data ? currency(data.today_sales_total) : '—',
              sub: 'revenue registered today',
              icon: IndianRupee,
            },
            {
              label: 'Customer Invoices',
              value: data ? String(data.today_sales_count) : '—',
              sub: 'bills processed today',
              icon: ShoppingCart,
            },
            {
              label: 'Low Stock in Store',
              value: data ? String(data.low_stock_count) : '—',
              sub: 'items running low at counter',
              icon: AlertTriangle,
            },
            {
              label: 'Stocked Out Items',
              value: data ? String(data.out_of_stock_count) : '—',
              sub: 'unavailable for customer sale',
              icon: PackageX,
            },
          ]

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((c) => (
        <Card key={c.label}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {c.label}
            </CardTitle>
            <c.icon className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-28" />
            ) : (
              <>
                <div className="text-2xl font-bold">{c.value}</div>
                <p className="text-xs text-muted-foreground">{c.sub}</p>
              </>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Views for Specific Roles
// ---------------------------------------------------------------------------

function AdminDashboardView() {
  return (
    <div className="flex flex-col gap-6">
      <RevenueTrend />
      <div className="grid gap-6 lg:grid-cols-2 [&>*]:min-w-0">
        <StoreComparison />
        <TopProducts />
      </div>
    </div>
  )
}

function SeniorStakeholderDashboardView() {
  return (
    <div className="flex flex-col gap-6">
      <StoreComparison />
      <div className="grid gap-6 lg:grid-cols-2 [&>*]:min-w-0">
        <RevenueTrend />
        <TopProducts />
      </div>
    </div>
  )
}

function StoreStaffDashboardView() {
  const { data } = useDashboardSummary()

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-6 lg:grid-cols-3 [&>*]:min-w-0">
        <div className="lg:col-span-2">
          <RevenueTrend />
        </div>
        <div>
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Activity className="size-4 text-primary" /> Store Inventory Status
              </CardTitle>
              <CardDescription>Actionable inventory health overview</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border p-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Low Stock Warnings</span>
                  <span className="font-semibold text-amber-600 dark:text-amber-400">
                    {data?.low_stock_count ?? 0} items
                  </span>
                </div>
                <Button asChild variant="link" size="sm" className="h-auto p-0 text-xs mt-1">
                  <Link to="/inventory">View in inventory →</Link>
                </Button>
              </div>

              <div className="rounded-lg border p-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Critical Stockouts</span>
                  <span className="font-semibold text-destructive">
                    {data?.out_of_stock_count ?? 0} items
                  </span>
                </div>
                <Button asChild variant="link" size="sm" className="h-auto p-0 text-xs mt-1">
                  <Link to="/auto-order">Check auto-orders →</Link>
                </Button>
              </div>

              <div className="rounded-lg border p-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Total Physical Units</span>
                  <span className="font-semibold">{data?.total_stock_units ?? 0} units</span>
                </div>
                <Button asChild variant="link" size="sm" className="h-auto p-0 text-xs mt-1">
                  <Link to="/purchase-orders">Receive incoming POs →</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      <TopProducts />
    </div>
  )
}

function SalesPersonnelDashboardView() {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-6 lg:grid-cols-2 [&>*]:min-w-0">
        <TopProducts />
        <RevenueTrend />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Visual Components: Revenue Trend, Top Products, Store Comparison
// ---------------------------------------------------------------------------

function RevenueTrend() {
  const { data, isLoading } = useRevenueTrend(30)
  const series = data?.series ?? []

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="size-5 text-primary" /> Revenue Trend — Last 30 Days
        </CardTitle>
        <CardDescription>Daily active sales value in INR.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading && <Skeleton className="h-64 w-full" />}
        {!isLoading && series.length === 0 && (
          <div className="flex h-64 flex-col items-center justify-center text-center text-sm text-muted-foreground">
            <ShoppingCart className="mb-2 size-8 text-muted-foreground/40" />
            <p>No sales registered in the last 30 days.</p>
          </div>
        )}
        {!isLoading && series.length > 0 && (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={series} margin={{ top: 5, right: 10, bottom: 0, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                <XAxis dataKey="date" tick={axisTick} interval="preserveStartEnd" />
                <YAxis tick={axisTick} width={55} />
                <RechartsTooltip
                  content={
                    <ChartTooltip
                      formatter={(v) => currency(Number(v))}
                      labelFormatter={(l) => String(l)}
                    />
                  }
                />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="var(--primary)"
                  strokeWidth={2}
                  dot={false}
                  name="Revenue"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function TopProducts() {
  const { data, isLoading } = useTopProducts(10, 30)
  const top = data?.top ?? []

  const chartData = top.map((p) => ({
    name: p.product_name.length > 18 ? `${p.product_name.slice(0, 18)}…` : p.product_name,
    units: p.qty_sold,
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Layers className="size-5 text-primary" /> Fast-Moving Products — Rolling 30 Days
        </CardTitle>
        <CardDescription>Ranked by units sold at the checkout register.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading && <Skeleton className="h-64 w-full" />}
        {!isLoading && chartData.length === 0 && (
          <div className="flex h-64 flex-col items-center justify-center text-center text-sm text-muted-foreground">
            <Layers className="mb-2 size-8 text-muted-foreground/40" />
            <p>No product sales data recorded yet.</p>
          </div>
        )}
        {!isLoading && chartData.length > 0 && (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 5, right: 10, bottom: 40, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                <XAxis dataKey="name" tick={axisTick} angle={-35} textAnchor="end" />
                <YAxis tick={axisTick} width={35} />
                <RechartsTooltip
                  content={<ChartTooltip formatter={(v) => `${v} units`} labelFormatter={(l) => String(l)} />}
                />
                <Bar dataKey="units" fill="var(--primary)" name="Units sold" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function StoreComparison() {
  const { data, isLoading } = useStoreComparison()
  const stores = data?.stores ?? []

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="size-5 text-primary" /> Multi-Store Turnover Comparison
        </CardTitle>
        <CardDescription>Comparative total sales volume across retail locations.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading && <Skeleton className="h-64 w-full" />}
        {!isLoading && stores.length === 0 && (
          <div className="flex h-64 flex-col items-center justify-center text-center text-sm text-muted-foreground">
            <StoreIcon className="mb-2 size-8 text-muted-foreground/40" />
            <p>No store comparison data available.</p>
          </div>
        )}
        {!isLoading && stores.length > 0 && (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={stores.map((s) => ({ name: s.store_name, sales: s.sales_total }))}
                margin={{ top: 5, right: 10, bottom: 40, left: -10 }}
              >
                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                <XAxis dataKey="name" tick={axisTick} angle={-15} textAnchor="end" />
                <YAxis tick={axisTick} width={55} />
                <RechartsTooltip
                  content={<ChartTooltip formatter={(v) => currency(Number(v))} labelFormatter={(l) => String(l)} />}
                />
                <Legend
                  wrapperStyle={{ color: 'var(--muted-foreground)', fontSize: 12 }}
                  formatter={(value) => <span style={{ color: 'var(--muted-foreground)' }}>{value}</span>}
                />
                <Bar dataKey="sales" fill="var(--primary)" name="Sales value" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
