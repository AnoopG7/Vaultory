import { useMemo, useState } from 'react'
import {
  Sparkles,
  RefreshCw,
  Check,
  Pencil,
  XCircle,
  Search,
  Building2,
  Store,
  BrainCircuit,
  ShieldCheck,
  Lightbulb,
  FileText,
  AlertTriangle,
  Wand2,
  FlaskConical,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  useAutoOrderTrigger,
  useForecastTrigger,
  useActOnRecommendation,
  useRecommendations,
  useRejectRecommendation,
  useWarehouseRecommendations,
} from '@/hooks/use-ai'
import { useLocations } from '@/hooks/use-reference'
import { useProducts } from '@/hooks/use-products'
import type { AiRecommendation } from '@/lib/types'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'

type RecType = 'all' | 'reorder_quantity' | 'demand_forecast' | 'warehouse_stock_level' | 'safety_stock_suggest'
type RecStatus = 'all' | 'pending' | 'accepted' | 'modified' | 'rejected'

const typeLabels: Record<string, string> = {
  reorder_quantity: 'Reorder Quantity',
  demand_forecast: 'Demand Forecast',
  warehouse_stock_level: 'Warehouse Stock Level',
  safety_stock_suggest: 'Safety Stock',
}

function renderStatusBadge(status: string) {
  switch (status) {
    case 'pending':
      return (
        <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30">
          Pending
        </Badge>
      )
    case 'accepted':
      return <Badge variant="default">Accepted</Badge>
    case 'modified':
      return (
        <Badge variant="secondary" className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30">
          Modified
        </Badge>
      )
    case 'rejected':
      return <Badge variant="destructive">Rejected</Badge>
    default:
      return <Badge variant="outline">{status}</Badge>
  }
}

export default function AutoOrderPage() {
  const [tab, setTab] = useState('recommendations')

  // ---- Recommendations list filters ----
  const [recType, setRecType] = useState<RecType>('all')
  const [recStatus, setRecStatus] = useState<RecStatus>('pending')

  const { data: recData, isLoading: recsLoading, refetch: refetchRecs } = useRecommendations({
    type: recType === 'all' ? undefined : recType,
    status: recStatus === 'all' ? undefined : recStatus,
    limit: 100,
  })
  const recommendations: AiRecommendation[] = useMemo(() => recData?.recommendations ?? [], [recData])
  const summary = recData?.summary
  const stats = useMemo(
    () => ({
      pending: summary?.pending ?? recommendations.filter((r) => r.status === 'pending').length,
      accepted: summary?.accepted ?? recommendations.filter((r) => r.status === 'accepted').length,
      modified: summary?.modified ?? recommendations.filter((r) => r.status === 'modified').length,
      rejected: summary?.rejected ?? recommendations.filter((r) => r.status === 'rejected').length,
    }),
    [summary, recommendations],
  )

  // ---- Action dialogs ----
  const [accepting, setAccepting] = useState<AiRecommendation | null>(null)
  const [acceptResultDialog, setAcceptResultDialog] = useState<{
    recommendation: AiRecommendation
    purchase_order?: { id: string; po_number: string } | null
    message: string
  } | null>(null)
  const [modifying, setModifying] = useState<AiRecommendation | null>(null)
  const [modifyValue, setModifyValue] = useState('')
  const [rejecting, setRejecting] = useState<AiRecommendation | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  const acceptMutation = useActOnRecommendation('accept')
  const modifyMutation = useActOnRecommendation('modify')
  const rejectMutation = useRejectRecommendation()

  // ---- Replenishment scan ----
  const [scanLocation, setScanLocation] = useState('all')
  const autoOrderMutation = useAutoOrderTrigger()

  // ---- Forecast dialog ----
  const [forecastOpen, setForecastOpen] = useState(false)
  const [forecastProduct, setForecastProduct] = useState('')
  const [forecastHorizon, setForecastHorizon] = useState(30)
  const forecastMutation = useForecastTrigger()

  // ---- Warehouse tab ----
  const { data: warehouseData, isLoading: warehouseLoading, refetch: refetchWarehouse } = useWarehouseRecommendations()

  const { data: locationsData } = useLocations()
  const { data: productsData } = useProducts()

  const pendingRecs = stats.pending

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------
  const handleAccept = async (rec: AiRecommendation) => {
    try {
      const res = await acceptMutation.mutateAsync({ id: rec.id, acceptedValue: Number(rec.recommended_value) })
      setAccepting(null)
      setAcceptResultDialog({
        recommendation: res.recommendation,
        purchase_order: res.purchase_order,
        message: res.message,
      })
      if (res.purchase_order) {
        toast.success(`Purchase order ${res.purchase_order.po_number} created`)
      } else {
        toast.success('Recommendation accepted')
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to accept recommendation')
    }
  }

  const handleModifySubmit = async () => {
    if (!modifying) return
    const value = Number(modifyValue)
    if (!Number.isFinite(value) || value < 0) {
      toast.error('Please enter a valid quantity')
      return
    }
    try {
      const res = await modifyMutation.mutateAsync({ id: modifying.id, acceptedValue: value })
      setModifying(null)
      setAcceptResultDialog({
        recommendation: res.recommendation,
        purchase_order: res.purchase_order,
        message: res.message,
      })
      toast.success(res.message)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to modify recommendation')
    }
  }

  const handleRejectSubmit = async () => {
    if (!rejecting) return
    if (!rejectReason.trim()) {
      toast.error('Please provide a rejection reason')
      return
    }
    try {
      const res = await rejectMutation.mutateAsync({ id: rejecting.id, rejectionReason: rejectReason.trim() })
      toast.success(res.message)
      setRejecting(null)
      setRejectReason('')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to reject recommendation')
    }
  }

  // ---------------------------------------------------------------------------
  // Replenishment scan
  // ---------------------------------------------------------------------------
  const scanResult = autoOrderMutation.isPending
    ? null
    : (autoOrderMutation.data ?? null)

  const runScan = async () => {
    try {
      await autoOrderMutation.mutateAsync({
        destinationId: scanLocation === 'all' ? undefined : scanLocation,
        dryRun: true,
      })
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to scan reorder levels')
    }
  }

  const confirmGenerate = async () => {
    try {
      const res = await autoOrderMutation.mutateAsync({
        destinationId: scanLocation === 'all' ? undefined : scanLocation,
        dryRun: false,
      })
      toast.success(
        `${res.recommendations_created ?? 0} recommendations created${res.po_created ? `, ${res.po_created} auto-approve PO(s)` : ''}`,
      )
      await refetchRecs()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to generate recommendations')
    }
  }

  const handleForecastSubmit = async () => {
    if (!forecastProduct) {
      toast.error('Please select a product')
      return
    }
    try {
      await forecastMutation.mutateAsync({
        productId: forecastProduct,
        horizonDays: forecastHorizon,
        locationId: undefined,
      })
      toast.success('Forecast generated')
      await refetchRecs()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to generate forecast')
    }
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <Sparkles className="h-7 w-7 text-purple-600 dark:text-purple-400" />
            AI Auto-Ordering
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Groq-powered demand forecasting with deterministic fallback, reorder suggestions, and manager-approved purchase orders.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            className="border-purple-500/40 text-purple-700 dark:text-purple-400 hover:bg-purple-500/10 gap-2"
            onClick={() => setForecastOpen(true)}
          >
            <BrainCircuit className="h-4 w-4" />
            Run Forecast
          </Button>
          <Button
            className="bg-purple-600 hover:bg-purple-700 text-white gap-2 font-medium shadow-xs"
            onClick={() => setTab('scan')}
          >
            <Wand2 className="h-4 w-4" />
            Scan Reorder Levels
          </Button>
        </div>
      </div>

      {/* Info banner */}
      <div className="rounded-xl border border-purple-500/30 bg-purple-500/5 p-4 flex items-start gap-3">
        <ShieldCheck className="h-5 w-5 text-purple-600 dark:text-purple-400 mt-0.5 shrink-0" />
        <div className="text-xs text-muted-foreground space-y-1">
          <p className="font-semibold text-foreground">Human-in-the-loop control</p>
          <p>
            The AI never creates a purchase order without explicit manager consent. Every suggestion is recorded in{' '}
            <span className="font-mono text-purple-700 dark:text-purple-400">ai_recommendations</span> and generates a
            purchase order only when accepted or modified, unless the safety rule explicitly sets{' '}
            <span className="font-mono">auto_approve</span>.
          </p>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card className="shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between p-4 pb-2 space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Pending</CardTitle>
            <div className="flex size-7 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Lightbulb className="size-4" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold">{pendingRecs}</div>
            <p className="text-[11px] text-muted-foreground mt-0.5">Awaiting approval</p>
          </CardContent>
        </Card>

        <Card className="shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between p-4 pb-2 space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Accepted</CardTitle>
            <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Check className="size-4" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold">{stats.accepted}</div>
            <p className="text-[11px] text-muted-foreground mt-0.5">Escalated to PO / rules</p>
          </CardContent>
        </Card>

        <Card className="shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between p-4 pb-2 space-y-0">
            <CardTitle className="text-xs font-medium text-amber-600 dark:text-amber-400 uppercase tracking-wider">Modified</CardTitle>
            <div className="flex size-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Pencil className="size-4" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {stats.modified}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">Value adjusted by manager</p>
          </CardContent>
        </Card>

        <Card className="shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between p-4 pb-2 space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Rejected</CardTitle>
            <div className="flex size-7 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <XCircle className="size-4" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold">{stats.rejected}</div>
            <p className="text-[11px] text-muted-foreground mt-0.5">With reasoning logged</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
          <TabsTrigger value="scan">Replenishment Scan</TabsTrigger>
          <TabsTrigger value="warehouse">Warehouse Levels</TabsTrigger>
        </TabsList>

        {/* =================================================================== */}
        {/* 1. RECOMMENDATIONS */}
        {/* =================================================================== */}
        <div className="pt-4">
          {tab === 'recommendations' && (
            <Card className="shadow-xs overflow-hidden">
              <div className="p-4 border-b flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <Tabs value={recStatus} onValueChange={(v) => setRecStatus(v as RecStatus)} className="w-full sm:w-auto">
                  <TabsList className="w-full sm:w-auto flex flex-wrap h-auto">
                    <TabsTrigger value="pending">Pending</TabsTrigger>
                    <TabsTrigger value="accepted">Accepted</TabsTrigger>
                    <TabsTrigger value="modified">Modified</TabsTrigger>
                    <TabsTrigger value="rejected">Rejected</TabsTrigger>
                    <TabsTrigger value="all">All</TabsTrigger>
                  </TabsList>
                </Tabs>

                <div className="flex items-center gap-3">
                  <Select
                    value={recType}
                    onValueChange={(v) => setRecType(v as RecType)}
                  >
                    <SelectTrigger className="h-9 w-52 text-xs">
                      <SelectValue placeholder="All types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      {Object.entries(typeLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => refetchRecs()}
                    className="h-9 px-2.5 text-muted-foreground hover:text-foreground"
                    title="Refresh list"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs font-semibold">Product</TableHead>
                      <TableHead className="text-xs font-semibold">Type</TableHead>
                      <TableHead className="text-xs font-semibold">Current / Suggested</TableHead>
                      <TableHead className="text-xs font-semibold">Confidence</TableHead>
                      <TableHead className="text-xs font-semibold">Reasoning</TableHead>
                      <TableHead className="text-xs font-semibold">Status</TableHead>
                      <TableHead className="text-xs font-semibold">Created</TableHead>
                      <TableHead className="text-right text-xs font-semibold pr-6">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recsLoading ? (
                      <TableRow>
                        <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                          <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-primary" />
                          Loading recommendations...
                        </TableCell>
                      </TableRow>
                    ) : recommendations.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="h-36 text-center text-muted-foreground">
                          <Sparkles className="h-8 w-8 mx-auto mb-2 text-muted-foreground/60" />
                          No recommendations found. Run a scan or forecast to generate suggestions.
                        </TableCell>
                      </TableRow>
                    ) : (
                      recommendations.map((rec) => (
                        <TableRow key={rec.id}>
                          <TableCell>
                            <div className="text-xs font-medium text-foreground">{rec.product_name ?? rec.product_id}</div>
                            <div className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                              {rec.location_name ? (
                                <>
                                  {rec.location_name}
                                  <span className="text-muted-foreground/50">•</span>
                                </>
                              ) : null}
                              <span className="font-mono">{rec.product_id.slice(0, 8)}</span>
                            </div>
                            {rec.model_used && (
                              <div className="text-[10px] text-purple-600 dark:text-purple-400 mt-0.5 flex items-center gap-1">
                                <BrainCircuit className="h-2.5 w-2.5" /> {rec.model_used}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-[10px]">
                              {typeLabels[rec.type] ?? rec.type}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="text-xs text-foreground">
                              <span className="font-mono font-semibold">{rec.recommended_value}</span>
                              {rec.current_value !== null && (
                                <span className="text-muted-foreground"> / {rec.current_value}</span>
                              )}
                            </div>
                            {rec.accepted_value !== null && rec.accepted_value !== undefined && (
                              <div className="text-[10px] text-amber-600 dark:text-amber-400">
                                Accepted: {rec.accepted_value}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            {rec.confidence !== null && rec.confidence !== undefined ? (
                              <span className="text-xs text-muted-foreground">
                                {Math.round(rec.confidence * 100)}%
                              </span>
                            ) : (
                              <span className="text-[10px] text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="max-w-[280px]">
                            <p className="text-[11px] text-muted-foreground line-clamp-3" title={rec.reasoning}>
                              {rec.reasoning}
                            </p>
                          </TableCell>
                          <TableCell>{renderStatusBadge(rec.status)}</TableCell>
                          <TableCell className="text-[11px] text-muted-foreground whitespace-nowrap">
                            {rec.created_at ? new Date(rec.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—'}
                          </TableCell>
                          <TableCell className="text-right pr-6">
                            <div className="flex items-center justify-end gap-1.5">
                              {rec.status === 'pending' && (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 px-2 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
                                    onClick={() => {
                                      setAccepting(rec)
                                      setAcceptResultDialog(null)
                                    }}
                                    title="Accept recommendation"
                                  >
                                    <Check className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 px-2 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
                                    onClick={() => {
                                      setModifying(rec)
                                      setModifyValue(String(rec.recommended_value))
                                    }}
                                    title="Modify value then accept"
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 px-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                    onClick={() => {
                                      setRejecting(rec)
                                      setRejectReason('')
                                    }}
                                    title="Reject recommendation"
                                  >
                                    <XCircle className="h-3.5 w-3.5" />
                                  </Button>
                                </>
                              )}
                              {rec.resulting_po_id && (
                                <span className="text-[10px] text-muted-foreground font-mono" title="Linked purchase order">
                                  <FileText className="h-3 w-3 inline mr-0.5" />
                                  PO {rec.resulting_po_id.slice(0, 8)}
                                </span>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </Card>
          )}

          {/* ================================================================= */}
          {/* 2. REPLENISHMENT SCAN */}
          {/* ================================================================= */}
          {tab === 'scan' && (
            <Card className="shadow-xs overflow-hidden">
              <div className="p-4 border-b flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <Label className="text-xs whitespace-nowrap">Target Location:</Label>
                  <Select value={scanLocation} onValueChange={setScanLocation}>
                    <SelectTrigger className="h-9 w-56 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Locations</SelectItem>
                      {locationsData?.locations.map((loc) => (
                        <SelectItem key={loc.id} value={loc.id}>
                          {loc.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={runScan}
                    disabled={autoOrderMutation.isPending}
                    className="h-9 gap-1.5 text-xs"
                  >
                    {autoOrderMutation.isPending ? (
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Search className="h-3.5 w-3.5" />
                    )}
                    Dry-Run Scan
                  </Button>
                </div>
              </div>

              <div className="p-4">
                <div className="text-xs text-muted-foreground mb-3 flex items-center gap-1.5">
                  <FlaskConical className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
                  Scans <span className="font-mono">qty_on_hand &le; reorder_point</span>, skips items with open POs, and
                  forecasts demand per product (Groq + SMA fallback). Nothing is created until you confirm below.
                </div>

                {autoOrderMutation.isPending && (
                  <div className="py-10 text-center text-xs text-muted-foreground">
                    <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-purple-600 dark:text-purple-400" />
                    Scanning inventory and forecasting demand...
                  </div>
                )}

                {scanResult && scanResult.dry_run && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-3">
                      <div className="p-3 bg-muted/50 rounded-lg border">
                        <div className="text-muted-foreground text-xs">Scanned Items</div>
                        <div className="text-lg font-bold text-foreground mt-1">{scanResult.scanned_items_count}</div>
                      </div>
                      <div className="p-3 bg-purple-500/10 rounded-lg border border-purple-500/30">
                        <div className="text-purple-700 dark:text-purple-300 text-xs">Replenishment Candidates</div>
                        <div className="text-lg font-bold text-purple-700 dark:text-purple-400 mt-1">
                          {scanResult.potential_recommendations_count}
                        </div>
                      </div>
                      <div className="p-3 bg-amber-500/10 rounded-lg border border-amber-500/30">
                        <div className="text-amber-700 dark:text-amber-300 text-xs">Duplicates Skipped</div>
                        <div className="text-lg font-bold text-amber-700 dark:text-amber-400 mt-1">
                          {scanResult.skipped_duplicates?.length ?? 0}
                        </div>
                      </div>
                    </div>

                    {scanResult.unmapped_products && scanResult.unmapped_products.length > 0 && (
                      <div className="space-y-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs">
                        <div className="font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                          <AlertTriangle className="h-4 w-4" /> Products below reorder point with no mapped supplier
                        </div>
                        <div className="text-[11px] text-foreground/90 max-h-28 overflow-y-auto space-y-1">
                          {scanResult.unmapped_products.map((u, idx) => (
                            <div key={idx} className="flex justify-between py-1 border-b border-amber-500/20">
                              <span>{u.product_name} ({u.location_name ?? u.location_id})</span>
                              <span className="text-amber-700 dark:text-amber-400 font-mono">
                                on hand {u.qty_on_hand} / reorder {u.reorder_point}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {(scanResult.skipped_duplicates?.length ?? 0) > 0 && (
                      <div className="space-y-1.5 rounded-lg border border-blue-500/30 bg-blue-500/10 p-3 text-xs">
                        <div className="font-semibold text-blue-700 dark:text-blue-400">Open PO coverage skipped</div>
                        <div className="text-[11px] text-foreground/90 max-h-28 overflow-y-auto space-y-1">
                          {scanResult.skipped_duplicates!.map((dup, idx) => (
                            <div key={idx} className="flex justify-between py-1 border-b border-blue-500/20">
                              <span>{dup.product_name} ({dup.location_name})</span>
                              <span className="font-mono">covered by {dup.open_po_number}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="overflow-x-auto rounded-lg border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs font-semibold">Product</TableHead>
                            <TableHead className="text-xs font-semibold">Location</TableHead>
                            <TableHead className="text-xs font-semibold">On Hand / Reorder</TableHead>
                            <TableHead className="text-xs font-semibold">Forecast</TableHead>
                            <TableHead className="text-xs font-semibold">Recommended Qty</TableHead>
                            <TableHead className="text-xs font-semibold">Mode</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(scanResult.candidates ?? []).length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={6} className="h-20 text-center text-xs text-muted-foreground">
                                No items below reorder point for this selection. Inventory is healthy.
                              </TableCell>
                            </TableRow>
                          ) : (
                            (scanResult.candidates ?? []).map((c, idx) => (
                              <TableRow key={idx}>
                                <TableCell>
                                  <div className="text-xs font-medium text-foreground">{c.product_name}</div>
                                  <div className="text-[10px] text-muted-foreground font-mono">{c.sku_code}</div>
                                </TableCell>
                                <TableCell className="text-xs text-foreground flex items-center gap-1.5">
                                  {c.location_name?.toLowerCase().includes('warehouse') ? (
                                    <Building2 className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                                  ) : (
                                    <Store className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                                  )}
                                  <span>{c.location_name}</span>
                                </TableCell>
                                <TableCell className="text-xs text-muted-foreground">
                                  {c.qty_on_hand} / {c.reorder_point}
                                </TableCell>
                                <TableCell className="text-xs text-purple-700 dark:text-purple-400 font-mono">
                                  {c.forecast_prediction ?? '—'}
                                </TableCell>
                                <TableCell>
                                  <span className="text-xs font-mono font-semibold text-foreground">
                                    {c.recommended_value}
                                  </span>
                                  {c.auto_approve && (
                                    <Badge variant="secondary" className="ml-1.5 text-[9px]">
                                      auto-approve
                                    </Badge>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline" className="text-[10px]">
                                    {c.model_used}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>

                    <DialogFooter className="pt-3 border-t">
                      <Button
                        onClick={confirmGenerate}
                        disabled={autoOrderMutation.isPending || (scanResult.candidates?.length ?? 0) === 0}
                        className="bg-purple-600 hover:bg-purple-700 text-white gap-1.5 font-medium"
                      >
                        {autoOrderMutation.isPending && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                        Generate {scanResult.candidates?.length ?? 0} Recommendations
                      </Button>
                    </DialogFooter>
                  </div>
                )}

                {!autoOrderMutation.isPending && !scanResult && (
                  <div className="py-10 text-center text-xs text-muted-foreground">
                    <Wand2 className="h-8 w-8 mx-auto mb-2 text-muted-foreground/60" />
                    Click <strong>Dry-Run Scan</strong> to preview candidates before creating anything.
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* ================================================================= */}
          {/* 3. WAREHOUSE LEVELS */}
          {/* ================================================================= */}
          {tab === 'warehouse' && (
            <Card className="shadow-xs overflow-hidden">
              <div className="p-4 border-b flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    Warehouse Stock-Level Recommendations
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Suggested central-warehouse holdings based on forecast demand and safety buffer (SRS §8.2).
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => refetchWarehouse()} className="h-8 px-2.5 text-muted-foreground hover:text-foreground">
                  <RefreshCw className="h-3.5 w-3.5" />
                </Button>
              </div>

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs font-semibold">Product</TableHead>
                      <TableHead className="text-xs font-semibold">Warehouse</TableHead>
                      <TableHead className="text-xs font-semibold">Current Stock</TableHead>
                      <TableHead className="text-xs font-semibold">Recommended Level</TableHead>
                      <TableHead className="text-xs font-semibold">Confidence</TableHead>
                      <TableHead className="text-xs font-semibold">Model</TableHead>
                      <TableHead className="text-xs font-semibold">Reasoning</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {warehouseLoading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                          <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-primary" />
                          Computing warehouse recommendations...
                        </TableCell>
                      </TableRow>
                    ) : (warehouseData?.recommendations?.length ?? 0) === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="h-36 text-center text-muted-foreground">
                          <Building2 className="h-8 w-8 mx-auto mb-2 text-muted-foreground/60" />
                          No warehouse recommendations available.
                        </TableCell>
                      </TableRow>
                    ) : (
                      warehouseData?.recommendations.map((rec, idx) => (
                        <TableRow key={`${rec.product_id}-${idx}`}>
                          <TableCell>
                            <div className="text-xs font-medium text-foreground">{rec.product_name}</div>
                            <div className="text-[10px] text-muted-foreground font-mono">{rec.sku_code}</div>
                          </TableCell>
                          <TableCell className="text-xs text-foreground">{rec.location_name}</TableCell>
                          <TableCell className="text-xs font-mono text-muted-foreground">{rec.current_stock}</TableCell>
                          <TableCell>
                            <span className="text-xs font-mono font-semibold text-foreground">
                              {rec.recommended_stock_level}
                            </span>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {rec.confidence !== null && rec.confidence !== undefined
                              ? `${Math.round(rec.confidence * 100)}%`
                              : '—'}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-[10px]">
                              {rec.model_used ?? 'deterministic-sma'}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-[280px]">
                            <p className="text-[11px] text-muted-foreground line-clamp-2" title={rec.reasoning}>
                              {rec.reasoning}
                            </p>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </Card>
          )}
        </div>
      </Tabs>

      {/* ===================================================================== */}
      {/* ACCEPT CONFIRMATION */}
      {/* ===================================================================== */}
      <Dialog open={accepting !== null} onOpenChange={(open) => !open && setAccepting(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Check className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              Accept Recommendation
            </DialogTitle>
            <DialogDescription className="text-xs">
              Confirm you want to order the suggested quantity. For reorder recommendations this creates a draft
              purchase order; warehouse recommendations apply the value to safety stock rules.
            </DialogDescription>
          </DialogHeader>

          {accepting && (
            <div className="space-y-3 text-xs rounded-lg border bg-muted/40 p-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Product</span>
                <span className="font-medium text-foreground">{accepting.product_name ?? accepting.product_id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Suggested qty</span>
                <span className="font-mono font-semibold text-foreground">{accepting.recommended_value}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Type</span>
                <span className="font-medium text-foreground">{typeLabels[accepting.type] ?? accepting.type}</span>
              </div>
              <p className="text-[11px] text-muted-foreground border-t pt-2">{accepting.reasoning}</p>
            </div>
          )}

          <DialogFooter className="pt-3 border-t">
            <Button variant="outline" onClick={() => setAccepting(null)}>Cancel</Button>
            <Button
              disabled={acceptMutation.isPending}
              onClick={() => accepting && handleAccept(accepting)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
            >
              {acceptMutation.isPending && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
              Accept & {accepting?.type === 'reorder_quantity' ? 'Create PO' : 'Apply'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===================================================================== */}
      {/* MODIFY + ACCEPT */}
      {/* ===================================================================== */}
      <Dialog open={modifying !== null} onOpenChange={(open) => !open && setModifying(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Pencil className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              Modify Value & Accept
            </DialogTitle>
            <DialogDescription className="text-xs">
              Override the AI suggestion with your own quantity, then accept. The change is recorded in
              <span className="font-mono"> accepted_value</span> for audit.
            </DialogDescription>
          </DialogHeader>

          {modifying && (
            <div className="space-y-3 text-xs">
              <div className="flex justify-between rounded-lg border bg-muted/40 p-3">
                <span className="text-muted-foreground">Product</span>
                <span className="font-medium text-foreground">{modifying.product_name ?? modifying.product_id}</span>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Quantity *</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={modifyValue}
                  onChange={(e) => setModifyValue(e.target.value)}
                  className="h-9 text-xs font-mono"
                />
              </div>
            </div>
          )}

          <DialogFooter className="pt-3 border-t">
            <Button variant="outline" onClick={() => setModifying(null)}>Cancel</Button>
            <Button
              disabled={modifyMutation.isPending}
              onClick={handleModifySubmit}
              className="bg-amber-600 hover:bg-amber-700 text-white gap-1.5"
            >
              {modifyMutation.isPending && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
              Modify & Accept
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===================================================================== */}
      {/* REJECT */}
      {/* ===================================================================== */}
      <Dialog open={rejecting !== null} onOpenChange={(open) => !open && setRejecting(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <XCircle className="h-5 w-5 text-destructive" />
              Reject Recommendation
            </DialogTitle>
            <DialogDescription className="text-xs">
              Rejecting marks the suggestion as rejected and prevents accidental acceptance. A reason is required for the
              audit trail.
            </DialogDescription>
          </DialogHeader>

          {rejecting && (
            <div className="space-y-3 text-xs">
              <div className="flex justify-between rounded-lg border bg-muted/40 p-3">
                <span className="text-muted-foreground">Product</span>
                <span className="font-medium text-foreground">{rejecting.product_name ?? rejecting.product_id}</span>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Rejection Reason *</Label>
                <Textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="e.g. Stock levels already sufficient, over-order risk"
                  className="min-h-20 text-xs"
                />
              </div>
            </div>
          )}

          <DialogFooter className="pt-3 border-t">
            <Button variant="outline" onClick={() => setRejecting(null)}>Cancel</Button>
            <Button
              disabled={rejectMutation.isPending || !rejectReason.trim()}
              onClick={handleRejectSubmit}
              className="bg-destructive text-white gap-1.5"
            >
              {rejectMutation.isPending && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===================================================================== */}
      {/* ACCEPT RESULT */}
      {/* ===================================================================== */}
      <Dialog
        open={acceptResultDialog !== null}
        onOpenChange={(open) => !open && setAcceptResultDialog(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              Action Complete
            </DialogTitle>
          </DialogHeader>
          {acceptResultDialog && (
            <div className="text-xs space-y-3">
              <p className="text-foreground">{acceptResultDialog.message}</p>
              {acceptResultDialog.purchase_order && (
                <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 space-y-1">
                  <div className="text-emerald-700 dark:text-emerald-400 font-semibold">Purchase Order Created</div>
                  <div className="flex justify-between text-foreground">
                    <span>PO Number</span>
                    <span className="font-mono font-semibold">{acceptResultDialog.purchase_order.po_number}</span>
                  </div>
                </div>
              )}
              {acceptResultDialog.recommendation.status === 'accepted' && (
                <p className="text-muted-foreground">
                  Recommendation record updated to <strong>accepted</strong>. Find it in the Purchase Order tab to
                  dispatch.
                </p>
              )}
            </div>
          )}
          <DialogFooter className="pt-3 border-t">
            <Button onClick={() => setAcceptResultDialog(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===================================================================== */}
      {/* FORECAST */}
      {/* ===================================================================== */}
      <Dialog open={forecastOpen} onOpenChange={setForecastOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <BrainCircuit className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              Run Demand Forecast
            </DialogTitle>
            <DialogDescription className="text-xs">
              Generates a demand forecast via Groq (with a deterministic moving-average fallback) and records it as a
              <span className="font-mono"> demand_forecast</span> recommendation for auditability.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Product *</Label>
              <select
                value={forecastProduct}
                onChange={(e) => setForecastProduct(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="">Select a product...</option>
                {productsData?.products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.sku_code})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Forecast Horizon (days)</Label>
              <Input
                type="number"
                min="1"
                max="365"
                value={forecastHorizon}
                onChange={(e) => setForecastHorizon(Number(e.target.value))}
                className="h-9 text-xs font-mono"
              />
              <p className="text-[10px] text-muted-foreground">
                Defaults to 30 days. The reorder scan uses the supplier lead-time window.
              </p>
            </div>

            {forecastMutation.data && (
              <div className="rounded-lg border bg-muted/40 p-3 text-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Predicted demand</span>
                  <span className="font-mono font-bold text-purple-700 dark:text-purple-400">
                    {forecastMutation.data.forecast.predicted_demand} units
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Model</span>
                  <Badge variant="outline" className="text-[10px]">
                    {forecastMutation.data.forecast.model_used ?? 'N/A'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Confidence</span>
                  <span className="font-mono">
                    {forecastMutation.data.forecast.confidence !== null && forecastMutation.data.forecast.confidence !== undefined
                      ? `${Math.round(forecastMutation.data.forecast.confidence * 100)}%`
                      : '—'}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground border-t pt-2">{forecastMutation.data.forecast.reasoning}</p>
              </div>
            )}

            <DialogFooter className="pt-3 border-t">
              <Button variant="outline" onClick={() => setForecastOpen(false)}>Close</Button>
              <Button
                disabled={forecastMutation.isPending || !forecastProduct}
                onClick={handleForecastSubmit}
                className="bg-purple-600 hover:bg-purple-700 text-white gap-1.5"
              >
                {forecastMutation.isPending && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                Generate Forecast
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}