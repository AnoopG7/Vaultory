import { useState, useMemo } from 'react'
import {
  Calendar,
  TrendingUp,
  BarChart3,
  Store as StoreIcon,
  Download,
  Printer,
  ShoppingBag,
  Layers,
  IndianRupee,
  Award,
  Filter,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import {
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui'
import { useAuthStore } from '@/stores'
import {
  useDailySalesReport,
  useQuarterlySalesReport,
  useYearlySalesReport,
  useStorePerformanceReport,
  useStores,
} from '@/hooks'
import { downloadCsv, triggerPrint } from '@/lib/export'

const currency = (n: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(n)

export default function ReportsPage() {
  const user = useAuthStore((s) => s.user)
  const isStoreScoped =
    (user?.role === 'store_staff' || user?.role === 'sales_personnel') &&
    Boolean(user?.store_id)
  const userStoreId = user?.store_id ?? undefined

  const { data: storesData } = useStores()
  const storeList = storesData?.stores ?? []

  // Active tab state
  const [activeTab, setActiveTab] = useState<string>('daily')

  // Filters: Daily
  const [dailyDate, setDailyDate] = useState<string>(
    new Date().toISOString().split('T')[0],
  )
  const [dailyStore, setDailyStore] = useState<string>(
    isStoreScoped && userStoreId ? userStoreId : 'all',
  )

  // Filters: Quarterly
  const currentYear = new Date().getFullYear()
  const currentQNum = Math.floor(new Date().getMonth() / 3) + 1
  const [quarterStr, setQuarterStr] = useState<string>(
    `${currentYear}-Q${currentQNum}`,
  )
  const [quarterStore, setQuarterStore] = useState<string>(
    isStoreScoped && userStoreId ? userStoreId : 'all',
  )

  // Filters: Yearly
  const [yearNum, setYearNum] = useState<number>(currentYear)
  const [yearStore, setYearStore] = useState<string>(
    isStoreScoped && userStoreId ? userStoreId : 'all',
  )

  // Filters: Store Performance
  const [perfFrom, setPerfFrom] = useState<string>('')
  const [perfTo, setPerfTo] = useState<string>('')

  // Report Queries
  const effectiveDailyStore =
    isStoreScoped && userStoreId
      ? userStoreId
      : dailyStore === 'all'
        ? undefined
        : dailyStore
  const dailyQuery = useDailySalesReport({
    storeId: effectiveDailyStore,
    date: dailyDate,
  })

  const effectiveQuarterStore =
    isStoreScoped && userStoreId
      ? userStoreId
      : quarterStore === 'all'
        ? undefined
        : quarterStore
  const quarterlyQuery = useQuarterlySalesReport({
    storeId: effectiveQuarterStore,
    quarter: quarterStr,
  })

  const effectiveYearStore =
    isStoreScoped && userStoreId
      ? userStoreId
      : yearStore === 'all'
        ? undefined
        : yearStore
  const yearlyQuery = useYearlySalesReport({
    storeId: effectiveYearStore,
    year: yearNum,
  })

  const perfQuery = useStorePerformanceReport({
    from: perfFrom || undefined,
    to: perfTo || undefined,
  })

  // Export handlers
  const handleExportCsv = () => {
    if (activeTab === 'daily') {
      const report = dailyQuery.data
      if (!report) return
      const headers = [
        'Store Name',
        'Store ID',
        'Product Name',
        'SKU',
        'Units Sold',
        'Sales Value (INR)',
        'Date',
      ]
      const rows = (report.items ?? []).map((item) => [
        item.store_name,
        item.store_id,
        item.product_name,
        item.sku_code,
        item.units_sold,
        item.sales_value.toFixed(2),
        item.sale_date,
      ])
      const summaryLines = [
        `Summary: Total Units,${report.summary?.total_units_sold ?? report.total_units ?? 0}`,
        `Summary: Total Sales Value,${report.summary?.total_sales_value ?? report.total_value ?? 0}`,
        `Summary: Transactions Count,${report.summary?.transactions_count ?? 0}`,
      ]
      downloadCsv(`daily-sales-${report.date}`, headers, rows, summaryLines)
    } else if (activeTab === 'quarterly') {
      const report = quarterlyQuery.data
      if (!report) return
      const headers = ['Month', 'Month Name', 'Units Sold', 'Sales Value (INR)', 'Orders Count']
      const rows = (report.monthly_breakdown ?? []).map((m) => [
        m.month,
        m.label,
        m.units_sold,
        m.sales_value.toFixed(2),
        m.orders_count,
      ])
      const summaryLines = [
        `Quarter,${report.quarter}`,
        `Date Range,${report.date_range?.from} to ${report.date_range?.to}`,
        `Summary: Total Units,${report.summary?.total_units_sold ?? report.total_units ?? 0}`,
        `Summary: Total Sales Value,${report.summary?.total_sales_value ?? report.total_value ?? 0}`,
        `Summary: Orders Count,${report.summary?.orders_count ?? 0}`,
      ]
      downloadCsv(`quarterly-sales-${report.quarter}`, headers, rows, summaryLines)
    } else if (activeTab === 'yearly') {
      const report = yearlyQuery.data
      if (!report) return
      const headers = ['Month', 'Month Name', 'Units Sold', 'Sales Value (INR)', 'Orders Count']
      const rows = (report.monthly_breakdown ?? []).map((m) => [
        m.month,
        m.label,
        m.units_sold,
        m.sales_value.toFixed(2),
        m.orders_count,
      ])
      const summaryLines = [
        `Year,${report.year}`,
        `Summary: Total Units,${report.summary?.total_units_sold ?? report.total_units ?? 0}`,
        `Summary: Total Sales Value,${report.summary?.total_sales_value ?? report.total_value ?? 0}`,
        `Summary: Orders Count,${report.summary?.orders_count ?? 0}`,
        `Summary: Average Monthly Sales,${report.summary?.average_monthly_sales ?? 0}`,
      ]
      downloadCsv(`yearly-sales-${report.year}`, headers, rows, summaryLines)
    } else if (activeTab === 'store-performance') {
      const report = perfQuery.data
      if (!report) return
      const headers = [
        'Store Name',
        'Store Code',
        'City',
        'Store ID',
        'Revenue (INR)',
        'Units Sold',
        'Orders Count',
        'Average Order Value (INR)',
      ]
      const rows = (report.stores ?? []).map((s) => [
        s.store_name,
        s.store_code,
        s.city,
        s.store_id,
        s.total_sales_value.toFixed(2),
        s.total_units_sold,
        s.total_orders,
        s.average_order_value.toFixed(2),
      ])
      const summaryLines = [
        `Summary: Total Revenue,${report.summary?.total_revenue ?? 0}`,
        `Summary: Total Orders,${report.summary?.total_orders ?? 0}`,
        `Summary: Total Units Sold,${report.summary?.total_units_sold ?? 0}`,
        `Comparison: Best Performing Store,${report.comparison?.best_performing_store ?? 'N/A'}`,
        `Comparison: Average Store Revenue,${report.comparison?.average_store_revenue ?? 0}`,
      ]
      downloadCsv('store-performance-report', headers, rows, summaryLines)
    }
  }

  // Quarterly chart data formatting
  const quarterlyChartData = useMemo(() => {
    if (!quarterlyQuery.data?.monthly_breakdown) return []
    return quarterlyQuery.data.monthly_breakdown.map((m) => ({
      name: m.label,
      sales: m.sales_value,
      units: m.units_sold,
      orders: m.orders_count,
    }))
  }, [quarterlyQuery.data])

  // Yearly chart data formatting
  const yearlyChartData = useMemo(() => {
    if (!yearlyQuery.data?.monthly_breakdown) return []
    return yearlyQuery.data.monthly_breakdown.map((m) => ({
      name: m.label,
      sales: m.sales_value,
      units: m.units_sold,
      orders: m.orders_count,
    }))
  }, [yearlyQuery.data])

  // Store performance chart data
  const perfChartData = useMemo(() => {
    if (!perfQuery.data?.stores) return []
    return perfQuery.data.stores.map((s) => ({
      name: s.store_name.replace('Store ', '').split('—')[0].trim(),
      fullName: s.store_name,
      revenue: s.total_sales_value,
      units: s.total_units_sold,
      orders: s.total_orders,
    }))
  }, [perfQuery.data])

  return (
    <div className="space-y-6">
      {/* Header & Global Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Reports & Analytics
          </h1>
          <p className="text-sm text-muted-foreground">
            Daily, quarterly, and yearly sales performance and cross-store metrics.
          </p>
        </div>
        <div className="flex items-center gap-2 print:hidden">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            className="gap-1.5"
            title="Download CSV report"
          >
            <Download className="h-4 w-4" />
            <span>Export CSV</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={triggerPrint}
            className="gap-1.5"
            title="Print or Save as PDF"
          >
            <Printer className="h-4 w-4" />
            <span>Print / PDF</span>
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="w-full space-y-6"
      >
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 print:hidden">
          <TabsTrigger value="daily" className="gap-2">
            <Calendar className="h-4 w-4" />
            <span>Daily Sales</span>
          </TabsTrigger>
          <TabsTrigger value="quarterly" className="gap-2">
            <TrendingUp className="h-4 w-4" />
            <span>Quarterly Sales</span>
          </TabsTrigger>
          <TabsTrigger value="yearly" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            <span>Yearly Sales</span>
          </TabsTrigger>
          <TabsTrigger value="store-performance" className="gap-2">
            <StoreIcon className="h-4 w-4" />
            <span>Store Performance</span>
          </TabsTrigger>
        </TabsList>

        {/* ------------------------------------------------------------------ */}
        {/* 1. DAILY SALES TAB */}
        {/* ------------------------------------------------------------------ */}
        <TabsContent value="daily" className="space-y-6">
          {/* Filters Bar */}
          <Card className="print:hidden">
            <CardContent className="pt-6">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Filters:</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Date:</span>
                  <Input
                    type="date"
                    value={dailyDate}
                    onChange={(e) => setDailyDate(e.target.value)}
                    className="h-9 w-40"
                  />
                </div>
                {!isStoreScoped && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Store:</span>
                    <Select value={dailyStore} onValueChange={setDailyStore}>
                      <SelectTrigger className="h-9 w-52">
                        <SelectValue placeholder="All Stores" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Stores</SelectItem>
                        {storeList.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {isStoreScoped && (
                  <span className="rounded-md bg-muted px-2.5 py-1 text-xs text-muted-foreground">
                    Store: {storeList.find((s) => s.id === userStoreId)?.name ?? 'Assigned Store'}
                  </span>
                )}
              </div>
            </CardContent>
          </Card>

          {/* KPI Summary Cards */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Daily Revenue
                </CardTitle>
                <IndianRupee className="h-4 w-4 text-emerald-500" />
              </CardHeader>
              <CardContent>
                {dailyQuery.isLoading ? (
                  <Skeleton className="h-8 w-28" />
                ) : (
                  <div className="text-2xl font-bold text-foreground">
                    {currency(dailyQuery.data?.summary?.total_sales_value ?? 0)}
                  </div>
                )}
                <p className="mt-1 text-xs text-muted-foreground">
                  Sales recorded on {dailyDate}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Units Sold
                </CardTitle>
                <Layers className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                {dailyQuery.isLoading ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <div className="text-2xl font-bold text-foreground">
                    {dailyQuery.data?.summary?.total_units_sold ?? 0}
                  </div>
                )}
                <p className="mt-1 text-xs text-muted-foreground">
                  Individual product quantities
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Transactions / Orders
                </CardTitle>
                <ShoppingBag className="h-4 w-4 text-violet-500" />
              </CardHeader>
              <CardContent>
                {dailyQuery.isLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <div className="text-2xl font-bold text-foreground">
                    {dailyQuery.data?.summary?.transactions_count ?? 0}
                  </div>
                )}
                <p className="mt-1 text-xs text-muted-foreground">
                  Completed customer checkouts
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Daily Product Breakdown Table */}
          <Card>
            <CardHeader>
              <CardTitle>Daily Sales Breakdown</CardTitle>
              <CardDescription>
                Detailed itemized sales performance for {dailyDate}.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {dailyQuery.isLoading ? (
                <div className="space-y-2 py-4">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : (dailyQuery.data?.items ?? []).length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <ShoppingBag className="h-10 w-10 text-muted-foreground/50" />
                  <h3 className="mt-3 text-base font-semibold">No sales recorded</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    No active sales transactions match the selected date and store.
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>SKU</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>Store</TableHead>
                      <TableHead className="text-right">Units Sold</TableHead>
                      <TableHead className="text-right">Total Revenue</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(dailyQuery.data?.items ?? []).map((item, idx) => (
                      <TableRow key={`${item.store_id}-${item.product_id}-${idx}`}>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {item.sku_code}
                        </TableCell>
                        <TableCell className="font-medium text-foreground">
                          {item.product_name}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {item.store_name}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {item.units_sold}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-emerald-600 dark:text-emerald-400">
                          {currency(item.sales_value)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ------------------------------------------------------------------ */}
        {/* 2. QUARTERLY SALES TAB */}
        {/* ------------------------------------------------------------------ */}
        <TabsContent value="quarterly" className="space-y-6">
          {/* Filters Bar */}
          <Card className="print:hidden">
            <CardContent className="pt-6">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Filters:</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Quarter:</span>
                  <Select value={quarterStr} onValueChange={setQuarterStr}>
                    <SelectTrigger className="h-9 w-36">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={`${currentYear}-Q1`}>{currentYear}-Q1 (Jan-Mar)</SelectItem>
                      <SelectItem value={`${currentYear}-Q2`}>{currentYear}-Q2 (Apr-Jun)</SelectItem>
                      <SelectItem value={`${currentYear}-Q3`}>{currentYear}-Q3 (Jul-Sep)</SelectItem>
                      <SelectItem value={`${currentYear}-Q4`}>{currentYear}-Q4 (Oct-Dec)</SelectItem>
                      <SelectItem value={`${currentYear - 1}-Q4`}>{currentYear - 1}-Q4</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {!isStoreScoped && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Store:</span>
                    <Select value={quarterStore} onValueChange={setQuarterStore}>
                      <SelectTrigger className="h-9 w-52">
                        <SelectValue placeholder="All Stores" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Stores</SelectItem>
                        {storeList.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* KPI Summary Cards */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Quarterly Revenue
                </CardTitle>
                <IndianRupee className="h-4 w-4 text-emerald-500" />
              </CardHeader>
              <CardContent>
                {quarterlyQuery.isLoading ? (
                  <Skeleton className="h-8 w-28" />
                ) : (
                  <div className="text-2xl font-bold text-foreground">
                    {currency(quarterlyQuery.data?.summary?.total_sales_value ?? 0)}
                  </div>
                )}
                <p className="mt-1 text-xs text-muted-foreground">
                  Quarter {quarterStr} total
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Units Sold
                </CardTitle>
                <Layers className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                {quarterlyQuery.isLoading ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <div className="text-2xl font-bold text-foreground">
                    {quarterlyQuery.data?.summary?.total_units_sold ?? 0}
                  </div>
                )}
                <p className="mt-1 text-xs text-muted-foreground">
                  Across 3 months
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Orders Count
                </CardTitle>
                <ShoppingBag className="h-4 w-4 text-violet-500" />
              </CardHeader>
              <CardContent>
                {quarterlyQuery.isLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <div className="text-2xl font-bold text-foreground">
                    {quarterlyQuery.data?.summary?.orders_count ?? 0}
                  </div>
                )}
                <p className="mt-1 text-xs text-muted-foreground">
                  Total transactions
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Quarterly Trend Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Monthly Breakdown for {quarterStr}</CardTitle>
              <CardDescription>
                Comparison of revenue and orders across the 3 quarter months.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {quarterlyQuery.isLoading ? (
                <Skeleton className="h-64 w-full" />
              ) : (
                <div className="h-72 w-full pt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={quarterlyChartData} margin={{ top: 10, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis dataKey="name" />
                      <YAxis yAxisId="left" orientation="left" stroke="#10b981" />
                      <YAxis yAxisId="right" orientation="right" stroke="#6366f1" />
                      <RechartsTooltip
                        formatter={(val: unknown) => (typeof val === 'number' ? currency(val) : String(val))}
                      />
                      <Legend />
                      <Bar yAxisId="left" dataKey="sales" name="Revenue (₹)" fill="#10b981" radius={[4, 4, 0, 0]} />
                      <Bar yAxisId="right" dataKey="units" name="Units Sold" fill="#6366f1" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Top Products in Quarter */}
          <Card>
            <CardHeader>
              <CardTitle>Product Sales Performance ({quarterStr})</CardTitle>
              <CardDescription>
                Top selling products by sales revenue for this quarter.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {quarterlyQuery.isLoading ? (
                <div className="space-y-2 py-4">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : (quarterlyQuery.data?.product_breakdown ?? []).length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  No product sales recorded in {quarterStr}.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>SKU</TableHead>
                      <TableHead>Product Name</TableHead>
                      <TableHead className="text-right">Units Sold</TableHead>
                      <TableHead className="text-right">Total Revenue</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(quarterlyQuery.data?.product_breakdown ?? []).map((p) => (
                      <TableRow key={p.product_id}>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {p.sku_code}
                        </TableCell>
                        <TableCell className="font-medium text-foreground">
                          {p.product_name}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {p.units_sold}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-emerald-600 dark:text-emerald-400">
                          {currency(p.sales_value)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ------------------------------------------------------------------ */}
        {/* 3. YEARLY SALES TAB */}
        {/* ------------------------------------------------------------------ */}
        <TabsContent value="yearly" className="space-y-6">
          {/* Filters Bar */}
          <Card className="print:hidden">
            <CardContent className="pt-6">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Filters:</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Year:</span>
                  <Select
                    value={String(yearNum)}
                    onValueChange={(v) => setYearNum(parseInt(v, 10))}
                  >
                    <SelectTrigger className="h-9 w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2026">2026</SelectItem>
                      <SelectItem value="2025">2025</SelectItem>
                      <SelectItem value="2024">2024</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {!isStoreScoped && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Store:</span>
                    <Select value={yearStore} onValueChange={setYearStore}>
                      <SelectTrigger className="h-9 w-52">
                        <SelectValue placeholder="All Stores" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Stores</SelectItem>
                        {storeList.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* KPI Summary Cards */}
          <div className="grid gap-4 sm:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Annual Revenue
                </CardTitle>
                <IndianRupee className="h-4 w-4 text-emerald-500" />
              </CardHeader>
              <CardContent>
                {yearlyQuery.isLoading ? (
                  <Skeleton className="h-8 w-28" />
                ) : (
                  <div className="text-2xl font-bold text-foreground">
                    {currency(yearlyQuery.data?.summary?.total_sales_value ?? 0)}
                  </div>
                )}
                <p className="mt-1 text-xs text-muted-foreground">Year {yearNum}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Annual Units Sold
                </CardTitle>
                <Layers className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                {yearlyQuery.isLoading ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <div className="text-2xl font-bold text-foreground">
                    {yearlyQuery.data?.summary?.total_units_sold ?? 0}
                  </div>
                )}
                <p className="mt-1 text-xs text-muted-foreground">Total volume</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Orders Count
                </CardTitle>
                <ShoppingBag className="h-4 w-4 text-violet-500" />
              </CardHeader>
              <CardContent>
                {yearlyQuery.isLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <div className="text-2xl font-bold text-foreground">
                    {yearlyQuery.data?.summary?.orders_count ?? 0}
                  </div>
                )}
                <p className="mt-1 text-xs text-muted-foreground">All transactions</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Avg Monthly Revenue
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-amber-500" />
              </CardHeader>
              <CardContent>
                {yearlyQuery.isLoading ? (
                  <Skeleton className="h-8 w-24" />
                ) : (
                  <div className="text-2xl font-bold text-foreground">
                    {currency(yearlyQuery.data?.summary?.average_monthly_sales ?? 0)}
                  </div>
                )}
                <p className="mt-1 text-xs text-muted-foreground">12-month average</p>
              </CardContent>
            </Card>
          </div>

          {/* 12-Month Trend Line Chart */}
          <Card>
            <CardHeader>
              <CardTitle>12-Month Sales Trend ({yearNum})</CardTitle>
              <CardDescription>
                Monthly revenue and units trajectory across the entire year.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {yearlyQuery.isLoading ? (
                <Skeleton className="h-64 w-full" />
              ) : (
                <div className="h-72 w-full pt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={yearlyChartData} margin={{ top: 10, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis dataKey="name" />
                      <YAxis yAxisId="left" stroke="#10b981" />
                      <YAxis yAxisId="right" orientation="right" stroke="#3b82f6" />
                      <RechartsTooltip
                        formatter={(val: unknown) => (typeof val === 'number' ? currency(val) : String(val))}
                      />
                      <Legend />
                      <Line
                        yAxisId="left"
                        type="monotone"
                        dataKey="sales"
                        name="Revenue (₹)"
                        stroke="#10b981"
                        strokeWidth={2.5}
                        dot={{ r: 4 }}
                      />
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="units"
                        name="Units Sold"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        dot={{ r: 3 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Monthly Breakdown Table */}
          <Card>
            <CardHeader>
              <CardTitle>Monthly Breakdown Table</CardTitle>
              <CardDescription>
                Detailed monthly performance for year {yearNum}.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Month</TableHead>
                    <TableHead>Month Name</TableHead>
                    <TableHead className="text-right">Orders</TableHead>
                    <TableHead className="text-right">Units Sold</TableHead>
                    <TableHead className="text-right">Sales Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(yearlyQuery.data?.monthly_breakdown ?? []).map((m) => (
                    <TableRow key={m.month}>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {m.month}
                      </TableCell>
                      <TableCell className="font-medium">{m.label}</TableCell>
                      <TableCell className="text-right">{m.orders_count}</TableCell>
                      <TableCell className="text-right">{m.units_sold}</TableCell>
                      <TableCell className="text-right font-semibold text-emerald-600 dark:text-emerald-400">
                        {currency(m.sales_value)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ------------------------------------------------------------------ */}
        {/* 4. STORE PERFORMANCE TAB */}
        {/* ------------------------------------------------------------------ */}
        <TabsContent value="store-performance" className="space-y-6">
          {/* Filters Bar */}
          <Card className="print:hidden">
            <CardContent className="pt-6">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Date Range:</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">From:</span>
                  <Input
                    type="date"
                    value={perfFrom}
                    onChange={(e) => setPerfFrom(e.target.value)}
                    className="h-9 w-36"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">To:</span>
                  <Input
                    type="date"
                    value={perfTo}
                    onChange={(e) => setPerfTo(e.target.value)}
                    className="h-9 w-36"
                  />
                </div>
                {(perfFrom || perfTo) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setPerfFrom('')
                      setPerfTo('')
                    }}
                    className="h-9 text-xs"
                  >
                    Clear Filter
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* KPI Summary Cards */}
          <div className="grid gap-4 sm:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Network Revenue
                </CardTitle>
                <IndianRupee className="h-4 w-4 text-emerald-500" />
              </CardHeader>
              <CardContent>
                {perfQuery.isLoading ? (
                  <Skeleton className="h-8 w-28" />
                ) : (
                  <div className="text-2xl font-bold text-foreground">
                    {currency(perfQuery.data?.summary?.total_revenue ?? 0)}
                  </div>
                )}
                <p className="mt-1 text-xs text-muted-foreground">
                  Combined all stores
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Orders
                </CardTitle>
                <ShoppingBag className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                {perfQuery.isLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <div className="text-2xl font-bold text-foreground">
                    {perfQuery.data?.summary?.total_orders ?? 0}
                  </div>
                )}
                <p className="mt-1 text-xs text-muted-foreground">Transactions</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Units Sold
                </CardTitle>
                <Layers className="h-4 w-4 text-violet-500" />
              </CardHeader>
              <CardContent>
                {perfQuery.isLoading ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <div className="text-2xl font-bold text-foreground">
                    {perfQuery.data?.summary?.total_units_sold ?? 0}
                  </div>
                )}
                <p className="mt-1 text-xs text-muted-foreground">Product items</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Top Performing Store
                </CardTitle>
                <Award className="h-4 w-4 text-amber-500" />
              </CardHeader>
              <CardContent>
                {perfQuery.isLoading ? (
                  <Skeleton className="h-8 w-32" />
                ) : (
                  <div className="truncate text-lg font-bold text-foreground" title={perfQuery.data?.comparison?.best_performing_store ?? 'None'}>
                    {perfQuery.data?.comparison?.best_performing_store ?? 'N/A'}
                  </div>
                )}
                <p className="mt-1 text-xs text-muted-foreground">By total sales value</p>
              </CardContent>
            </Card>
          </div>

          {/* Cross-Store Comparison Bar Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Cross-Store Revenue Comparison</CardTitle>
              <CardDescription>
                Side-by-side comparison of revenue and volume across store locations.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {perfQuery.isLoading ? (
                <Skeleton className="h-64 w-full" />
              ) : (
                <div className="h-72 w-full pt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={perfChartData} margin={{ top: 10, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis dataKey="name" />
                      <YAxis yAxisId="left" stroke="#10b981" />
                      <YAxis yAxisId="right" orientation="right" stroke="#3b82f6" />
                      <RechartsTooltip
                        formatter={(val: unknown) => (typeof val === 'number' ? currency(val) : String(val))}
                      />
                      <Legend />
                      <Bar yAxisId="left" dataKey="revenue" name="Revenue (₹)" fill="#10b981" radius={[4, 4, 0, 0]} />
                      <Bar yAxisId="right" dataKey="units" name="Units Sold" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Store Leaderboard Table */}
          <Card>
            <CardHeader>
              <CardTitle>Store Performance Leaderboard</CardTitle>
              <CardDescription>
                Sorted by revenue with Average Order Value (AOV) metrics.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {perfQuery.isLoading ? (
                <div className="space-y-2 py-4">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Store</TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead>City</TableHead>
                      <TableHead className="text-right">Orders</TableHead>
                      <TableHead className="text-right">Units</TableHead>
                      <TableHead className="text-right">Avg Order Value</TableHead>
                      <TableHead className="text-right">Total Revenue</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(perfQuery.data?.stores ?? []).map((store, index) => (
                      <TableRow key={store.store_id}>
                        <TableCell className="font-medium text-foreground">
                          <div className="flex items-center gap-2">
                            {index === 0 && (
                              <Award className="h-4 w-4 text-amber-500 shrink-0" />
                            )}
                            <span>{store.store_name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {store.store_code}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {store.city}
                        </TableCell>
                        <TableCell className="text-right">{store.total_orders}</TableCell>
                        <TableCell className="text-right">{store.total_units_sold}</TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {currency(store.average_order_value)}
                        </TableCell>
                        <TableCell className="text-right font-bold text-emerald-600 dark:text-emerald-400">
                          {currency(store.total_sales_value)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
