import {
  TrendingUp,
  PackageX,
  AlertTriangle,
  ShoppingCart,
  Layers,
  RefreshCw,
  IndianRupee,
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Skeleton } from '@/components/ui'
import { useAuthStore } from '@/stores'
import {
  useDashboardSummary,
  useRevenueTrend,
  useStoreComparison,
  useTopProducts,
} from '@/hooks'

const currency = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n)

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user)
  const role = user?.role

  // Admin / senior see full inventory + sales health; sales personnel see sales KPIs.
  const isExec = role === 'admin' || role === 'senior_stakeholder'
  const isSales = role === 'sales_personnel' || isExec

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          {isExec
            ? 'Executive inventory & sales health across all stores.'
            : role === 'sales_personnel'
              ? 'Your store sales performance at a glance.'
              : 'Your store inventory & sales overview.'}
        </p>
      </div>

      {isExec && <KpiCards />}
      {isSales && <RevenueTrend />}
      <div className="grid gap-6 lg:grid-cols-2">
        {isSales && <TopProducts />}
        {isExec && <StoreComparison />}
        {!isSales && <StoreStaffOverview />}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// KPI cards (Admin / Senior)
// ---------------------------------------------------------------------------

function KpiCards() {
  const { data, isLoading } = useDashboardSummary()

  const cards = [
    {
      label: 'Total Stock Value',
      value: data ? currency(data.total_stock_value ?? 0) : '—',
      sub: `${data?.total_stock_units ?? 0} units on hand`,
      icon: IndianRupee,
    },
    {
      label: 'Today’s Sales',
      value: data ? currency(data.today_sales_total) : '—',
      sub: `${data?.today_sales_count ?? 0} transactions`,
      icon: ShoppingCart,
    },
    {
      label: 'Low Stock',
      value: data ? String(data.low_stock_count) : '—',
      sub: 'at or below reorder point',
      icon: AlertTriangle,
    },
    {
      label: 'Out of Stock',
      value: data ? String(data.out_of_stock_count) : '—',
      sub: 'needs attention',
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
              <Skeleton className="h-8 w-24" />
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
// Revenue trend (line chart)
// ---------------------------------------------------------------------------

function RevenueTrend() {
  const { data, isLoading } = useRevenueTrend(30)
  const series = data?.series ?? []

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="size-5" /> Revenue — last 30 days
        </CardTitle>
        <CardDescription>Daily sales value (active sales).</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading && <Skeleton className="h-64 w-full" />}
        {!isLoading && series.length === 0 && (
          <p className="text-sm text-muted-foreground">No sales in the last 30 days.</p>
        )}
        {!isLoading && series.length > 0 && (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={series} margin={{ top: 5, right: 10, bottom: 0, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 11 }} width={55} />
                <RechartsTooltip
                  formatter={(v) => currency(Number(v))}
                  labelFormatter={(l) => String(l)}
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

// ---------------------------------------------------------------------------
// Top products (bar chart)
// ---------------------------------------------------------------------------

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
          <Layers className="size-5" /> Top products — last 30 days
        </CardTitle>
        <CardDescription>By units sold.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading && <Skeleton className="h-64 w-full" />}
        {!isLoading && chartData.length === 0 && (
          <p className="text-sm text-muted-foreground">No sales data yet.</p>
        )}
        {!isLoading && chartData.length > 0 && (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 5, right: 10, bottom: 40, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-35} textAnchor="end" interval={0} />
                <YAxis tick={{ fontSize: 11 }} width={35} />
                <RechartsTooltip formatter={(v) => `${v} units`} />
                <Bar dataKey="units" fill="var(--primary)" name="Units sold" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Store comparison (grouped bar)
// ---------------------------------------------------------------------------

function StoreComparison() {
  const { data, isLoading } = useStoreComparison()
  const stores = data?.stores ?? []

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="size-5" /> Store comparison
        </CardTitle>
        <CardDescription>Total sales value per store.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading && <Skeleton className="h-64 w-full" />}
        {!isLoading && stores.length === 0 && (
          <p className="text-sm text-muted-foreground">No store data available.</p>
        )}
        {!isLoading && stores.length > 0 && (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={stores.map((s) => ({ name: s.store_name, sales: s.sales_total }))}
                margin={{ top: 5, right: 10, bottom: 40, left: -10 }}
              >
                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-15} textAnchor="end" />
                <YAxis tick={{ fontSize: 11 }} width={55} />
                <RechartsTooltip formatter={(v) => currency(Number(v))} />
                <Legend />
                <Bar dataKey="sales" fill="var(--primary)" name="Sales value" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Store staff overview (own-store stats)
// ---------------------------------------------------------------------------

function StoreStaffOverview() {
  const user = useAuthStore((s) => s.user)
  const { data, isLoading } = useDashboardSummary()

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShoppingCart className="size-5" /> Store overview
        </CardTitle>
        <CardDescription>
          {user?.name ?? 'User'} — scoped to your store.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {isLoading && <Skeleton className="h-24 w-full" />}
        {data && (
          <div className="grid gap-3 sm:grid-cols-3">
            <Stat label="Low stock" value={String(data.low_stock_count)} />
            <Stat label="Out of stock" value={String(data.out_of_stock_count)} />
            <Stat label="Today's sales" value={currency(data.today_sales_total)} />
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-xl font-semibold">{value}</p>
    </div>
  )
}
