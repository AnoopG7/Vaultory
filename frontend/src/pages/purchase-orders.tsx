import { useState, useMemo } from 'react'
import {
  PackageCheck,
  Plus,
  Sparkles,
  Truck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  Search,
  Eye,
  Send,
  ArrowDownToLine,
  RefreshCw,
  FileText,
  Building2,
  Store,
  ShieldAlert,
  Check,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  usePurchaseOrders,
  useCreatePurchaseOrder,
  useUpdatePoStatus,
  useReceivePurchaseOrder,
  useAutoTriggerReorder,
  type AutoTriggerResponse,
} from '@/hooks/use-purchase-orders'
import { useSuppliers } from '@/hooks/use-suppliers'
import { useLocations, useProducts } from '@/hooks/use-reference'
import type {
  PurchaseOrderWithRelations,
  EnrichedPoLine,
} from '@/lib/schemas/purchase-orders'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

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
import { Progress } from '@/components/ui/progress'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'

export default function PurchaseOrdersPage() {
  // Query Filters
  const [selectedTab, setSelectedTab] = useState<string>('all')
  const [selectedLocation, setSelectedLocation] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Modals state
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [autoTriggerDialogOpen, setAutoTriggerDialogOpen] = useState(false)
  const [receiveDialogOpen, setReceiveDialogOpen] = useState(false)
  const [detailDialogOpen, setDetailDialogOpen] = useState(false)
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)

  // Selected PO for detail / receive / cancel
  const [selectedPo, setSelectedPo] = useState<PurchaseOrderWithRelations | null>(null)
  const [cancelReason, setCancelReason] = useState('')

  // Goods-in form state
  const [receiveLines, setReceiveLines] = useState<Array<{
    poLineId: string
    productId: string
    qtyReceived: number
    earliestExpiryDate: string
    maxQty: number
    productName: string
    isPerishable: boolean
  }>>([])
  const [receiveNotes, setReceiveNotes] = useState('')

  // Auto-Trigger scan state
  const [autoTriggerLocation, setAutoTriggerLocation] = useState<string>('all')
  const [autoScanResult, setAutoScanResult] = useState<AutoTriggerResponse | null>(null)

  // Fetch POs
  const { data: poData, isLoading, refetch } = usePurchaseOrders({
    status: selectedTab === 'all' ? undefined : selectedTab,
    destinationId: selectedLocation === 'all' ? undefined : selectedLocation,
    search: searchQuery || undefined,
  })

  // Reference data
  const { data: suppliersData } = useSuppliers({ status: 'active', limit: 100 })
  const { data: locationsData } = useLocations()
  const { data: productsData } = useProducts()

  // Mutations
  const createPoMutation = useCreatePurchaseOrder()
  const updateStatusMutation = useUpdatePoStatus()
  const receivePoMutation = useReceivePurchaseOrder()
  const autoTriggerMutation = useAutoTriggerReorder()

  const purchaseOrders = useMemo(() => poData?.purchase_orders ?? [], [poData])
  const summary = poData?.summary

  // ---------------------------------------------------------------------------
  // Create PO Form State
  // ---------------------------------------------------------------------------
  const [newSupplierId, setNewSupplierId] = useState('')
  const [newDestinationId, setNewDestinationId] = useState('')
  const [newExpectedDate, setNewExpectedDate] = useState('')
  const [newNotes, setNewNotes] = useState('')
  const [allowDuplicate, setAllowDuplicate] = useState(false)
  const [newLines, setNewLines] = useState<Array<{
    productId: string
    qtyOrdered: number
    unitCost: number
  }>>([{ productId: '', qtyOrdered: 10, unitCost: 100 }])

  const selectedSupplierObj = useMemo(() => {
    return suppliersData?.suppliers.find((s) => s.id === newSupplierId)
  }, [suppliersData, newSupplierId])

  // Auto calculate expected date when supplier changes
  const handleSupplierChange = (supId: string) => {
    setNewSupplierId(supId)
    const sup = suppliersData?.suppliers.find((s) => s.id === supId)
    const leadTime = sup?.lead_time_days ?? 5
    const d = new Date()
    d.setDate(d.getDate() + leadTime)
    setNewExpectedDate(d.toISOString().split('T')[0])
  }

  const handleAddLine = () => {
    setNewLines((prev) => [...prev, { productId: '', qtyOrdered: 10, unitCost: 100 }])
  }

  const handleRemoveLine = (index: number) => {
    setNewLines((prev) => prev.filter((_, idx) => idx !== index))
  }

  const handleLineProductChange = (index: number, prodId: string) => {
    const prod = productsData?.products.find((p) => p.id === prodId)
    const cost = prod?.sale_price ? Math.round(prod.sale_price * 0.6) : 100
    setNewLines((prev) => {
      const copy = [...prev]
      copy[index] = { ...copy[index], productId: prodId, unitCost: cost }
      return copy
    })
  }

  const handleLineChange = (index: number, field: 'qtyOrdered' | 'unitCost', value: number) => {
    setNewLines((prev) => {
      const copy = [...prev]
      copy[index] = { ...copy[index], [field]: value }
      return copy
    })
  }

  const calculatedTotal = useMemo(() => {
    return newLines.reduce((acc, l) => acc + (l.qtyOrdered || 0) * (l.unitCost || 0), 0)
  }, [newLines])

  // Check if open PO already exists for this supplier & destination
  const existingDuplicateOpenPo = useMemo(() => {
    if (!newSupplierId || !newDestinationId) return null
    return purchaseOrders.find((p) => {
      if (p.supplier_id !== newSupplierId || p.destination_id !== newDestinationId) return false
      return ['draft', 'sent', 'partially_received'].includes(p.status)
    })
  }, [purchaseOrders, newSupplierId, newDestinationId])

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newSupplierId) {
      toast.error('Please select a supplier')
      return
    }
    if (!newDestinationId) {
      toast.error('Please select a destination location')
      return
    }
    const validLines = newLines.filter((l) => l.productId && l.qtyOrdered > 0)
    if (validLines.length === 0) {
      toast.error('Please add at least one valid product line')
      return
    }

    try {
      await createPoMutation.mutateAsync({
        supplierId: newSupplierId,
        destinationId: newDestinationId,
        lines: validLines,
        source: 'manual',
        expectedDate: newExpectedDate || undefined,
        notes: newNotes || undefined,
        allowDuplicate,
      })
      toast.success('Purchase order created successfully')

      setCreateDialogOpen(false)
      // Reset form
      setNewSupplierId('')
      setNewDestinationId('')
      setNewNotes('')
      setAllowDuplicate(false)
      setNewLines([{ productId: '', qtyOrdered: 10, unitCost: 100 }])
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to create purchase order')
    }
  }

  // ---------------------------------------------------------------------------
  // Lifecycle Actions
  // ---------------------------------------------------------------------------
  const handleMarkSent = async (po: PurchaseOrderWithRelations) => {
    try {
      await updateStatusMutation.mutateAsync({
        id: po.id,
        status: 'sent',
      })
      toast.success(`Purchase order ${po.po_number} marked as SENT`)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to update status')
    }
  }

  const handleClosePo = async (po: PurchaseOrderWithRelations) => {
    try {
      await updateStatusMutation.mutateAsync({
        id: po.id,
        status: 'closed',
      })
      toast.success(`Purchase order ${po.po_number} CLOSED and finalized`)
      if (detailDialogOpen && selectedPo?.id === po.id) {
        setSelectedPo((prev) => (prev ? { ...prev, status: 'closed' } : null))
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to close purchase order')
    }
  }

  const handleOpenCancelDialog = (po: PurchaseOrderWithRelations) => {
    setSelectedPo(po)
    setCancelReason('')
    setCancelDialogOpen(true)
  }

  const handleCancelSubmit = async () => {
    if (!selectedPo) return
    if (!cancelReason.trim()) {
      toast.error('Please provide a reason for cancellation')
      return
    }

    try {
      await updateStatusMutation.mutateAsync({
        id: selectedPo.id,
        status: 'cancelled',
        cancelReason,
      })
      toast.success(`Purchase order ${selectedPo.po_number} cancelled`)
      setCancelDialogOpen(false)
      if (detailDialogOpen) {
        setSelectedPo((prev) => (prev ? { ...prev, status: 'cancelled' } : null))
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to cancel purchase order')
    }
  }

  // ---------------------------------------------------------------------------
  // Goods-In (Receive)
  // ---------------------------------------------------------------------------
  const handleOpenReceive = (po: PurchaseOrderWithRelations) => {
    setSelectedPo(po)
    setReceiveNotes('')
    const lines = (po.lines ?? []).map((l) => {
      const remaining = Math.max(0, l.qty_ordered - l.qty_received)
      return {
        poLineId: l.id,
        productId: l.product_id,
        qtyReceived: remaining,
        earliestExpiryDate: '',
        maxQty: remaining,
        productName: l.product_name || 'Product',
        isPerishable: Boolean(l.is_perishable),
      }
    })
    setReceiveLines(lines)
    setReceiveDialogOpen(true)
  }

  const handleReceiveLineQtyChange = (poLineId: string, val: number) => {
    setReceiveLines((prev) =>
      prev.map((l) => (l.poLineId === poLineId ? { ...l, qtyReceived: val } : l)),
    )
  }

  const handleReceiveExpiryChange = (poLineId: string, val: string) => {
    setReceiveLines((prev) =>
      prev.map((l) => (l.poLineId === poLineId ? { ...l, earliestExpiryDate: val } : l)),
    )
  }

  const handleReceiveAll = () => {
    setReceiveLines((prev) => prev.map((l) => ({ ...l, qtyReceived: l.maxQty })))
  }

  const handleReceiveSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedPo) return

    const linesToSubmit = receiveLines.filter((l) => l.qtyReceived > 0)
    if (linesToSubmit.length === 0) {
      toast.error('Please enter a received quantity greater than 0 for at least one line')
      return
    }

    // Check perishable dates
    for (const l of linesToSubmit) {
      if (l.isPerishable && !l.earliestExpiryDate) {
        toast.error(`Perishable product ${l.productName} requires an earliest expiry date`)
        return
      }
    }

    try {
      const res = await receivePoMutation.mutateAsync({
        id: selectedPo.id,
        notes: receiveNotes || undefined,
        lines: linesToSubmit.map((l) => ({
          poLineId: l.poLineId,
          productId: l.productId,
          qtyReceived: l.qtyReceived,
          earliestExpiryDate: l.earliestExpiryDate || undefined,
        })),
      })

      toast.success(res.message || 'Goods-in processed successfully! Stock added to inventory.')
      setReceiveDialogOpen(false)
      if (detailDialogOpen && selectedPo.id === res.purchase_order.id) {
        setSelectedPo(res.purchase_order)
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to process goods-in receipt')
    }
  }

  // ---------------------------------------------------------------------------
  // Auto-Trigger Reorder
  // ---------------------------------------------------------------------------
  const handleOpenAutoTrigger = async () => {
    setAutoTriggerDialogOpen(true)
    setAutoScanResult(null)
    // Run dry-run scan
    try {
      const res = await autoTriggerMutation.mutateAsync({
        destinationId: autoTriggerLocation === 'all' ? undefined : autoTriggerLocation,
        dryRun: true,
      })
      setAutoScanResult(res)
    } catch {
      toast.error('Failed to scan reorder levels')
    }
  }

  const handleRunAutoTriggerConfirm = async () => {
    try {
      const res = await autoTriggerMutation.mutateAsync({
        destinationId: autoTriggerLocation === 'all' ? undefined : autoTriggerLocation,
        dryRun: false,
      })
      toast.success(res.message || 'Auto-orders generated successfully')
      setAutoTriggerDialogOpen(false)
      refetch()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to generate auto-orders')
    }
  }

  // ---------------------------------------------------------------------------
  // Status Helpers
  // ---------------------------------------------------------------------------
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <Badge variant="secondary" className="bg-zinc-800 text-zinc-300">Draft</Badge>
      case 'sent':
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Sent / In Transit</Badge>
      case 'partially_received':
      case 'partial':
        return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">Partially Received</Badge>
      case 'received':
        return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Received</Badge>
      case 'closed':
        return <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">Closed</Badge>
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <PackageCheck className="h-7 w-7 text-emerald-400" />
            Purchase Order Management
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Manual and automatic procurement, lifecycle progression, goods-in stock receipts, and duplicate order prevention.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            className="border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10 gap-2"
            onClick={handleOpenAutoTrigger}
          >
            <Sparkles className="h-4 w-4" />
            Auto-Trigger Reorder
          </Button>

          <Button
            className="bg-emerald-600 hover:bg-emerald-500 text-white gap-2 font-medium shadow-lg shadow-emerald-950/40"
            onClick={() => setCreateDialogOpen(true)}
          >
            <Plus className="h-4 w-4" />
            New Purchase Order
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <Card className="bg-zinc-900/60 border-zinc-800 backdrop-blur-sm">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-medium text-zinc-400">Total POs</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-white">{summary?.total_pos ?? purchaseOrders.length}</div>
            <p className="text-[11px] text-zinc-500 mt-0.5">All created records</p>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/60 border-zinc-800 backdrop-blur-sm">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-medium text-zinc-400 flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-zinc-400" /> Drafts
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-zinc-200">
              {summary?.draft ?? purchaseOrders.filter((p) => p.status === 'draft').length}
            </div>
            <p className="text-[11px] text-zinc-500 mt-0.5">Awaiting dispatch</p>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/60 border-zinc-800 backdrop-blur-sm">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-medium text-blue-400 flex items-center gap-1.5">
              <Truck className="h-3.5 w-3.5" /> In Transit
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-blue-400">
              {summary?.sent ?? purchaseOrders.filter((p) => p.status === 'sent').length}
            </div>
            <p className="text-[11px] text-blue-500/70 mt-0.5">Dispatched to vendor</p>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/60 border-zinc-800 backdrop-blur-sm">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-medium text-amber-400 flex items-center gap-1.5">
              <ArrowDownToLine className="h-3.5 w-3.5" /> Partial Goods-In
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-amber-400">
              {summary?.partially_received ?? purchaseOrders.filter((p) => p.status === 'partially_received').length}
            </div>
            <p className="text-[11px] text-amber-500/70 mt-0.5">Actively receiving</p>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/60 border-zinc-800 backdrop-blur-sm">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-medium text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5" /> Received / Closed
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-emerald-400">
              {(summary?.received ?? 0) + (summary?.closed ?? 0) ||
                purchaseOrders.filter((p) => ['received', 'closed'].includes(p.status)).length}
            </div>
            <p className="text-[11px] text-emerald-500/70 mt-0.5">Stock replenished</p>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/60 border-zinc-800 backdrop-blur-sm">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-medium text-zinc-400">Total Spend</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-white">
              ₹{(summary?.total_spend ?? purchaseOrders.reduce((a, b) => a + (b.status !== 'cancelled' ? b.total_cost : 0), 0)).toLocaleString('en-IN')}
            </div>
            <p className="text-[11px] text-zinc-500 mt-0.5">Active order commitments</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col gap-4 rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-4 backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full sm:w-auto">
          <TabsList className="bg-zinc-900/90 border border-zinc-800">
            <TabsTrigger value="all">All ({purchaseOrders.length})</TabsTrigger>
            <TabsTrigger value="draft">Draft</TabsTrigger>
            <TabsTrigger value="sent">Sent</TabsTrigger>
            <TabsTrigger value="partially_received">Partial</TabsTrigger>
            <TabsTrigger value="received">Received</TabsTrigger>
            <TabsTrigger value="closed">Closed</TabsTrigger>
            <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-3">
          {/* Location filter */}
          <select
            value={selectedLocation}
            onChange={(e) => setSelectedLocation(e.target.value)}
            className="h-9 rounded-md border border-zinc-800 bg-zinc-900 px-3 py-1 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="all">All Locations</option>
            {locationsData?.locations.map((loc) => (
              <option key={loc.id} value={loc.id}>
                {loc.name} ({loc.type})
              </option>
            ))}
          </select>

          {/* Search box */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-500" />
            <Input
              placeholder="Search PO #, supplier..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 bg-zinc-900 border-zinc-800 pl-8 text-xs text-zinc-200 placeholder:text-zinc-500"
            />
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="h-9 border-zinc-800 text-zinc-400 hover:text-white"
            title="Refresh list"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Main PO Directory Table */}
      <Card className="border-zinc-800 bg-zinc-950/70 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-zinc-900/60 border-b border-zinc-800">
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[140px] text-xs font-semibold text-zinc-300">PO Number</TableHead>
                <TableHead className="text-xs font-semibold text-zinc-300">Supplier</TableHead>
                <TableHead className="text-xs font-semibold text-zinc-300">Destination</TableHead>
                <TableHead className="text-xs font-semibold text-zinc-300">Order & Expected</TableHead>
                <TableHead className="text-xs font-semibold text-zinc-300">Status</TableHead>
                <TableHead className="w-[180px] text-xs font-semibold text-zinc-300">Fulfillment</TableHead>
                <TableHead className="text-right text-xs font-semibold text-zinc-300">Total Value</TableHead>
                <TableHead className="text-right text-xs font-semibold text-zinc-300 pr-6">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-32 text-center text-zinc-500">
                    <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-zinc-400" />
                    Loading purchase orders...
                  </TableCell>
                </TableRow>
              ) : purchaseOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-36 text-center text-zinc-500">
                    <PackageCheck className="h-8 w-8 mx-auto mb-2 text-zinc-600" />
                    No purchase orders found matching your filters.
                  </TableCell>
                </TableRow>
              ) : (
                purchaseOrders.map((po) => {
                  const percent = po.total_qty_ordered > 0
                    ? Math.min(100, Math.round((po.total_qty_received / po.total_qty_ordered) * 100))
                    : 0

                  return (
                    <TableRow key={po.id} className="border-b border-zinc-800/60 hover:bg-zinc-900/30 transition-colors">
                      <TableCell className="font-mono text-xs font-semibold text-white">
                        <div className="flex flex-col">
                          <span>{po.po_number}</span>
                          <span className="text-[10px] text-zinc-500 flex items-center gap-1 mt-0.5">
                            {po.source === 'ai_auto' ? (
                              <span className="text-purple-400 flex items-center gap-0.5">
                                <Sparkles className="h-2.5 w-2.5" /> Auto-Trigger
                              </span>
                            ) : (
                              <span>Manual PO</span>
                            )}
                          </span>
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="text-xs font-medium text-zinc-200">{po.supplier?.name || 'Supplier'}</div>
                        <div className="text-[10px] text-zinc-500">{po.supplier?.code}</div>
                      </TableCell>

                      <TableCell>
                        <div className="text-xs text-zinc-300 flex items-center gap-1.5">
                          {po.destination?.type === 'warehouse' ? (
                            <Building2 className="h-3.5 w-3.5 text-amber-400" />
                          ) : (
                            <Store className="h-3.5 w-3.5 text-blue-400" />
                          )}
                          {po.destination?.name || 'Location'}
                        </div>
                      </TableCell>

                      <TableCell className="text-xs text-zinc-400">
                        <div>Ordered: <span className="text-zinc-200">{po.order_date}</span></div>
                        <div className="text-[11px] text-zinc-500">
                          Due: <span className="text-zinc-400">{po.expected_date ?? 'N/A'}</span>
                        </div>
                      </TableCell>

                      <TableCell>
                        {renderStatusBadge(po.status)}
                      </TableCell>

                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex justify-between text-[11px] text-zinc-400">
                            <span>{po.total_qty_received} / {po.total_qty_ordered} units</span>
                            <span className="font-medium text-zinc-300">{percent}%</span>
                          </div>
                          <Progress
                            value={percent}
                            className={`h-1.5 ${
                              percent === 100
                                ? '[&>div]:bg-emerald-500'
                                : percent > 0
                                ? '[&>div]:bg-amber-500'
                                : '[&>div]:bg-zinc-700'
                            }`}
                          />
                        </div>
                      </TableCell>

                      <TableCell className="text-right font-mono text-xs font-semibold text-white">
                        ₹{Number(po.total_cost).toLocaleString('en-IN')}
                      </TableCell>

                      <TableCell className="text-right pr-6">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2 text-zinc-400 hover:text-white"
                            onClick={() => {
                              setSelectedPo(po)
                              setDetailDialogOpen(true)
                            }}
                            title="View Details"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>

                          {po.status === 'draft' && (
                            <Button
                              size="sm"
                              className="h-8 bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 border border-blue-500/30 text-xs px-2.5 gap-1"
                              onClick={() => handleMarkSent(po)}
                              title="Mark PO as Sent to Supplier"
                            >
                              <Send className="h-3 w-3" />
                              Send
                            </Button>
                          )}

                          {(po.status === 'sent' || po.status === 'partially_received') && (
                            <Button
                              size="sm"
                              className="h-8 bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 border border-emerald-500/30 text-xs px-2.5 gap-1 font-medium"
                              onClick={() => handleOpenReceive(po)}
                              title="Receive Goods-In"
                            >
                              <ArrowDownToLine className="h-3 w-3" />
                              Receive
                            </Button>
                          )}

                          {po.status === 'received' && (
                            <Button
                              size="sm"
                              className="h-8 bg-purple-600/20 text-purple-400 hover:bg-purple-600/30 border border-purple-500/30 text-xs px-2.5 gap-1 font-medium"
                              onClick={() => handleClosePo(po)}
                              title="Close PO"
                            >
                              <Check className="h-3 w-3" />
                              Close
                            </Button>
                          )}

                          {!['closed', 'cancelled'].includes(po.status) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 px-2 text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10"
                              onClick={() => handleOpenCancelDialog(po)}
                              title="Cancel PO"
                            >
                              <XCircle className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* ======================================================================= */}
      {/* 1. CREATE PURCHASE ORDER DIALOG (MANUAL) */}
      {/* ======================================================================= */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-2xl bg-zinc-950 border-zinc-800 text-white max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2 text-white">
              <Plus className="h-5 w-5 text-emerald-400" />
              Create Purchase Order
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-400">
              Create a manual PO. Expected delivery dates automatically compute from supplier lead times.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateSubmit} className="space-y-4 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Supplier selection */}
              <div className="space-y-1.5">
                <Label className="text-xs text-zinc-300">Supplier *</Label>
                <select
                  value={newSupplierId}
                  onChange={(e) => handleSupplierChange(e.target.value)}
                  required
                  className="w-full h-9 rounded-md border border-zinc-800 bg-zinc-900 px-3 py-1 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="">Select a supplier...</option>
                  {suppliersData?.suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.code}) — {s.lead_time_days}d lead time
                    </option>
                  ))}
                </select>
                {selectedSupplierObj && (
                  <p className="text-[11px] text-emerald-400/90 flex items-center gap-1">
                    <Clock className="h-3 w-3" /> Default lead time: {selectedSupplierObj.lead_time_days} days
                  </p>
                )}
              </div>

              {/* Destination selection */}
              <div className="space-y-1.5">
                <Label className="text-xs text-zinc-300">Destination Location *</Label>
                <select
                  value={newDestinationId}
                  onChange={(e) => setNewDestinationId(e.target.value)}
                  required
                  className="w-full h-9 rounded-md border border-zinc-800 bg-zinc-900 px-3 py-1 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="">Select destination location...</option>
                  {locationsData?.locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name} ({loc.type})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Expected Date & Notes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-zinc-300">Expected Delivery Date</Label>
                <Input
                  type="date"
                  value={newExpectedDate}
                  onChange={(e) => setNewExpectedDate(e.target.value)}
                  className="h-9 bg-zinc-900 border-zinc-800 text-xs text-zinc-200"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-zinc-300">Order Notes / References</Label>
                <Input
                  placeholder="e.g. Weekly replenishment docket #882"
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  className="h-9 bg-zinc-900 border-zinc-800 text-xs text-zinc-200"
                />
              </div>
            </div>

            {/* Duplicate Open PO Alert Warning */}
            {existingDuplicateOpenPo && (
              <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs space-y-2">
                <div className="flex items-center gap-2 text-amber-400 font-semibold">
                  <AlertTriangle className="h-4 w-4" />
                  Potential Duplicate Purchase Order Detected
                </div>
                <p className="text-zinc-300">
                  An open purchase order (<strong>{existingDuplicateOpenPo.po_number}</strong>, status:{' '}
                  <strong>{existingDuplicateOpenPo.status}</strong>) already exists for this supplier and location.
                </p>
                <div className="flex items-center space-x-2 pt-1">
                  <Checkbox
                    id="allowDup"
                    checked={allowDuplicate}
                    onCheckedChange={(c) => setAllowDuplicate(Boolean(c))}
                  />
                  <Label htmlFor="allowDup" className="text-xs text-zinc-300 cursor-pointer">
                    Confirm placing an intentional concurrent order (allow duplicate)
                  </Label>
                </div>
              </div>
            )}

            {/* Line Items Section */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                <Label className="text-xs font-semibold text-zinc-300">Order Line Items</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddLine}
                  className="h-7 text-xs border-zinc-800 text-emerald-400 hover:bg-emerald-500/10 gap-1"
                >
                  <Plus className="h-3 w-3" /> Add Product
                </Button>
              </div>

              <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                {newLines.map((line, idx) => {
                  const lineTotal = (line.qtyOrdered || 0) * (line.unitCost || 0)
                  return (
                    <div key={idx} className="flex items-center gap-2.5 rounded-md border border-zinc-800/80 bg-zinc-900/60 p-2 text-xs">
                      {/* Product select */}
                      <div className="flex-1">
                        <select
                          value={line.productId}
                          onChange={(e) => handleLineProductChange(idx, e.target.value)}
                          required
                          className="w-full h-8 rounded border border-zinc-800 bg-zinc-950 px-2 text-xs text-zinc-200"
                        >
                          <option value="">Select product...</option>
                          {productsData?.products.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} ({p.sku_code})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Quantity */}
                      <div className="w-24">
                        <Input
                          type="number"
                          min="1"
                          placeholder="Qty"
                          value={line.qtyOrdered}
                          onChange={(e) => handleLineChange(idx, 'qtyOrdered', Number(e.target.value))}
                          className="h-8 bg-zinc-950 border-zinc-800 text-xs text-zinc-200"
                        />
                      </div>

                      {/* Unit Cost */}
                      <div className="w-28">
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="Unit cost"
                          value={line.unitCost}
                          onChange={(e) => handleLineChange(idx, 'unitCost', Number(e.target.value))}
                          className="h-8 bg-zinc-950 border-zinc-800 text-xs text-zinc-200"
                        />
                      </div>

                      {/* Line subtotal */}
                      <div className="w-24 text-right font-mono text-zinc-300 font-medium">
                        ₹{lineTotal.toLocaleString('en-IN')}
                      </div>

                      {/* Delete row */}
                      {newLines.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveLine(idx)}
                          className="h-8 w-8 p-0 text-zinc-500 hover:text-rose-400"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Total summary */}
              <div className="flex justify-between items-center bg-zinc-900/80 p-3 rounded-lg border border-zinc-800/80 text-xs font-semibold">
                <span className="text-zinc-400">Estimated Order Total:</span>
                <span className="text-emerald-400 font-mono text-sm">₹{calculatedTotal.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <DialogFooter className="pt-3 border-t border-zinc-800">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateDialogOpen(false)}
                className="border-zinc-800 text-zinc-300"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createPoMutation.isPending}
                className="bg-emerald-600 hover:bg-emerald-500 text-white gap-1.5"
              >
                {createPoMutation.isPending && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                Create Purchase Order
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ======================================================================= */}
      {/* 2. AUTO-TRIGGER REORDER DIALOG */}
      {/* ======================================================================= */}
      <Dialog open={autoTriggerDialogOpen} onOpenChange={setAutoTriggerDialogOpen}>
        <DialogContent className="max-w-2xl bg-zinc-950 border-zinc-800 text-white max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2 text-white">
              <Sparkles className="h-5 w-5 text-purple-400" />
              Automatic PO Triggering Evaluation
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-400">
              Evaluates inventory levels against reorder points (`qty_on_hand &le; reorder_point`) and skips duplicate items with open orders.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-3">
              <Label className="text-xs text-zinc-300 whitespace-nowrap">Target Location:</Label>
              <select
                value={autoTriggerLocation}
                onChange={async (e) => {
                  setAutoTriggerLocation(e.target.value)
                  const res = await autoTriggerMutation.mutateAsync({
                    destinationId: e.target.value === 'all' ? undefined : e.target.value,
                    dryRun: true,
                  })
                  setAutoScanResult(res)
                }}
                className="h-8 rounded border border-zinc-800 bg-zinc-900 px-3 text-xs text-zinc-200"
              >
                <option value="all">All Locations (Stores & Warehouse)</option>
                {locationsData?.locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name}
                  </option>
                ))}
              </select>
            </div>

            {autoTriggerMutation.isPending && (
              <div className="py-8 text-center text-xs text-zinc-400">
                <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-purple-400" />
                Scanning inventory reorder points...
              </div>
            )}

            {autoScanResult && (
              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 bg-zinc-900/60 rounded border border-zinc-800">
                    <div className="text-zinc-500">Scanned Stock Items</div>
                    <div className="text-lg font-bold text-white mt-1">{autoScanResult.scanned_items_count}</div>
                  </div>
                  <div className="p-3 bg-purple-950/30 rounded border border-purple-800/40">
                    <div className="text-purple-300">POs to Create</div>
                    <div className="text-lg font-bold text-purple-400 mt-1">{autoScanResult.potential_pos_count}</div>
                  </div>
                  <div className="p-3 bg-amber-950/30 rounded border border-amber-800/40">
                    <div className="text-amber-300">Duplicates Prevented</div>
                    <div className="text-lg font-bold text-amber-400 mt-1">{autoScanResult.skipped_duplicates?.length ?? 0}</div>
                  </div>
                </div>

                {/* Duplicates skipped section */}
                {autoScanResult.skipped_duplicates?.length > 0 && (
                  <div className="space-y-1.5 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
                    <div className="font-semibold text-amber-400 flex items-center gap-1.5">
                      <ShieldAlert className="h-4 w-4" /> Duplicate Protection Active
                    </div>
                    <div className="space-y-1 text-[11px] text-zinc-300 max-h-32 overflow-y-auto">
                      {autoScanResult.skipped_duplicates.map((dup, idx) => (
                        <div key={idx} className="flex justify-between py-1 border-b border-zinc-800/50">
                          <span>{dup.product_name} ({dup.location_name})</span>
                          <span className="text-amber-400 font-mono">Covered by {dup.open_po_number} ({dup.open_status})</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <DialogFooter className="pt-3 border-t border-zinc-800">
              <Button
                type="button"
                variant="outline"
                onClick={() => setAutoTriggerDialogOpen(false)}
                className="border-zinc-800 text-zinc-300"
              >
                Close
              </Button>
              <Button
                onClick={handleRunAutoTriggerConfirm}
                disabled={autoTriggerMutation.isPending || !autoScanResult || autoScanResult.potential_pos_count === 0}
                className="bg-purple-600 hover:bg-purple-500 text-white gap-1.5 font-medium"
              >
                {autoTriggerMutation.isPending && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                Generate {autoScanResult?.potential_pos_count ?? ''} Purchase Orders
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* ======================================================================= */}
      {/* 3. GOODS-IN RECEIPT DIALOG */}
      {/* ======================================================================= */}
      <Dialog open={receiveDialogOpen} onOpenChange={setReceiveDialogOpen}>
        <DialogContent className="max-w-2xl bg-zinc-950 border-zinc-800 text-white max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2 text-white">
              <ArrowDownToLine className="h-5 w-5 text-emerald-400" />
              Goods-In Receiving — {selectedPo?.po_number}
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-400">
              Record physical stock arrival. Quantities received will be added directly to inventory at{' '}
              <span className="text-zinc-200 font-medium">{selectedPo?.destination?.name}</span>.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleReceiveSubmit} className="space-y-4 pt-2">
            <div className="flex justify-between items-center text-xs">
              <div className="text-zinc-400">
                Supplier: <span className="text-white font-medium">{selectedPo?.supplier?.name}</span>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleReceiveAll}
                className="h-7 text-xs border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10"
              >
                Receive All Remaining
              </Button>
            </div>

            {/* Line items for goods-in */}
            <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
              {receiveLines.map((line, idx) => (
                <div key={idx} className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-3 space-y-2 text-xs">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-medium text-white">{line.productName}</div>
                      <div className="text-[11px] text-zinc-400">Remaining to receive: {line.maxQty} units</div>
                    </div>
                    <div className="w-32">
                      <Input
                        type="number"
                        min="0"
                        max={line.maxQty}
                        value={line.qtyReceived}
                        onChange={(e) => handleReceiveLineQtyChange(line.poLineId, Number(e.target.value))}
                        className="h-8 bg-zinc-950 border-zinc-800 text-xs text-right font-mono"
                      />
                    </div>
                  </div>

                  {line.isPerishable && (
                    <div className="flex items-center gap-2 pt-1 border-t border-zinc-800/60">
                      <Label className="text-[11px] text-amber-400 whitespace-nowrap">Earliest Expiry Date *</Label>
                      <Input
                        type="date"
                        required
                        value={line.earliestExpiryDate}
                        onChange={(e) => handleReceiveExpiryChange(line.poLineId, e.target.value)}
                        className="h-7 bg-zinc-950 border-zinc-800 text-xs"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Receiving Notes */}
            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-300">Goods-In Notes / Delivery Docket #</Label>
              <Textarea
                placeholder="Inspected condition, delivery driver signature, box counts..."
                value={receiveNotes}
                onChange={(e) => setReceiveNotes(e.target.value)}
                className="h-16 bg-zinc-900 border-zinc-800 text-xs text-zinc-200 resize-none"
              />
            </div>

            <DialogFooter className="pt-3 border-t border-zinc-800">
              <Button
                type="button"
                variant="outline"
                onClick={() => setReceiveDialogOpen(false)}
                className="border-zinc-800 text-zinc-300"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={receivePoMutation.isPending}
                className="bg-emerald-600 hover:bg-emerald-500 text-white gap-1.5 font-medium"
              >
                {receivePoMutation.isPending && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                Confirm Stock Receipt
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ======================================================================= */}
      {/* 4. PO DETAILS MODAL */}
      {/* ======================================================================= */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-3xl bg-zinc-950 border-zinc-800 text-white max-h-[90vh] overflow-y-auto">
          {selectedPo && (
            <>
              <DialogHeader className="border-b border-zinc-800 pb-3">
                <div className="flex items-center justify-between">
                  <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
                    <FileText className="h-5 w-5 text-emerald-400" />
                    {selectedPo.po_number}
                  </DialogTitle>
                  {renderStatusBadge(selectedPo.status)}
                </div>
                <DialogDescription className="text-xs text-zinc-400">
                  Created on {selectedPo.order_date} &bull; Expected delivery: {selectedPo.expected_date ?? 'N/A'}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 pt-2">
                {/* Meta details */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-2.5 rounded bg-zinc-900/60 border border-zinc-800">
                    <div className="text-zinc-500">Supplier</div>
                    <div className="font-semibold text-zinc-200 mt-0.5">{selectedPo.supplier?.name}</div>
                    <div className="text-[10px] text-zinc-500">{selectedPo.supplier?.code}</div>
                  </div>
                  <div className="p-2.5 rounded bg-zinc-900/60 border border-zinc-800">
                    <div className="text-zinc-500">Destination</div>
                    <div className="font-semibold text-zinc-200 mt-0.5">{selectedPo.destination?.name}</div>
                    <div className="text-[10px] text-zinc-500">{selectedPo.destination?.city}</div>
                  </div>
                  <div className="p-2.5 rounded bg-zinc-900/60 border border-zinc-800">
                    <div className="text-zinc-500">Total Items</div>
                    <div className="font-semibold text-zinc-200 mt-0.5">{selectedPo.total_items} line(s)</div>
                    <div className="text-[10px] text-zinc-500">{selectedPo.total_qty_ordered} units ordered</div>
                  </div>
                  <div className="p-2.5 rounded bg-zinc-900/60 border border-zinc-800">
                    <div className="text-zinc-500">Total Cost</div>
                    <div className="font-semibold text-emerald-400 font-mono mt-0.5">
                      ₹{Number(selectedPo.total_cost).toLocaleString('en-IN')}
                    </div>
                  </div>
                </div>

                {/* Progress */}
                <div className="p-3 bg-zinc-900/40 rounded-lg border border-zinc-800 space-y-1.5">
                  <div className="flex justify-between text-xs text-zinc-300 font-medium">
                    <span>Fulfillment Progress</span>
                    <span>{selectedPo.total_qty_received} / {selectedPo.total_qty_ordered} units received</span>
                  </div>
                  <Progress
                    value={
                      selectedPo.total_qty_ordered > 0
                        ? (selectedPo.total_qty_received / selectedPo.total_qty_ordered) * 100
                        : 0
                    }
                    className="h-2"
                  />
                </div>

                {/* Lines Table */}
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-zinc-300">Line Items</div>
                  <div className="rounded-lg border border-zinc-800 overflow-hidden">
                    <Table>
                      <TableHeader className="bg-zinc-900 text-xs">
                        <TableRow>
                          <TableHead className="text-zinc-400">Product</TableHead>
                          <TableHead className="text-right text-zinc-400">Ordered</TableHead>
                          <TableHead className="text-right text-zinc-400">Received</TableHead>
                          <TableHead className="text-right text-zinc-400">Unit Cost</TableHead>
                          <TableHead className="text-right text-zinc-400">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody className="text-xs">
                        {selectedPo.lines?.map((line: EnrichedPoLine) => (
                          <TableRow key={line.id} className="border-b border-zinc-800/60">
                            <TableCell>
                              <div className="font-medium text-zinc-200">{line.product_name}</div>
                              <div className="text-[10px] text-zinc-500">{line.sku_code}</div>
                            </TableCell>
                            <TableCell className="text-right font-mono">{line.qty_ordered}</TableCell>
                            <TableCell className="text-right font-mono text-emerald-400">{line.qty_received}</TableCell>
                            <TableCell className="text-right font-mono text-zinc-400">₹{line.unit_cost}</TableCell>
                            <TableCell className="text-right font-mono font-semibold text-white">₹{line.line_total}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {/* Delivery Receipts Log */}
                {selectedPo.receipts && selectedPo.receipts.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-zinc-800">
                    <div className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                      <Truck className="h-3.5 w-3.5 text-emerald-400" /> Goods-In Receipts History
                    </div>
                    <div className="space-y-1.5">
                      {selectedPo.receipts.map((rcv) => (
                        <div key={rcv.id} className="p-2.5 bg-zinc-900/60 rounded border border-zinc-800 text-xs">
                          <div className="flex justify-between text-[11px] text-zinc-400">
                            <span>Received on {new Date(rcv.received_at).toLocaleString()}</span>
                            {rcv.notes && <span className="italic">"{rcv.notes}"</span>}
                          </div>
                          <div className="mt-1 flex flex-wrap gap-2">
                            {rcv.lines?.map((rl, rIdx) => (
                              <Badge key={rIdx} variant="outline" className="bg-zinc-950 text-[10px]">
                                +{rl.qty_received} units {rl.product_name}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <DialogFooter className="pt-3 border-t border-zinc-800 flex justify-between sm:justify-between">
                <div>
                  {!['closed', 'cancelled'].includes(selectedPo.status) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 text-xs"
                      onClick={() => handleOpenCancelDialog(selectedPo)}
                    >
                      Cancel PO
                    </Button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setDetailDialogOpen(false)}
                    className="border-zinc-800 text-zinc-300"
                  >
                    Close
                  </Button>

                  {selectedPo.status === 'draft' && (
                    <Button
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-500 text-white gap-1"
                      onClick={() => handleMarkSent(selectedPo)}
                    >
                      <Send className="h-3.5 w-3.5" />
                      Mark as Sent
                    </Button>
                  )}

                  {(selectedPo.status === 'sent' || selectedPo.status === 'partially_received') && (
                    <Button
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-500 text-white gap-1"
                      onClick={() => {
                        setDetailDialogOpen(false)
                        handleOpenReceive(selectedPo)
                      }}
                    >
                      <ArrowDownToLine className="h-3.5 w-3.5" />
                      Receive Goods
                    </Button>
                  )}

                  {selectedPo.status === 'received' && (
                    <Button
                      size="sm"
                      className="bg-purple-600 hover:bg-purple-500 text-white gap-1"
                      onClick={() => handleClosePo(selectedPo)}
                    >
                      <Check className="h-3.5 w-3.5" />
                      Close & Finalize
                    </Button>
                  )}
                </div>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ======================================================================= */}
      {/* 5. CANCEL PO DIALOG */}
      {/* ======================================================================= */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent className="max-w-md bg-zinc-950 border-zinc-800 text-white">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-rose-400 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Cancel Purchase Order {selectedPo?.po_number}
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-400">
              Are you sure you want to cancel this purchase order? Please provide a mandatory reason.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 pt-2">
            <Textarea
              placeholder="Reason for cancellation (e.g., supplier out of stock, order superseded)..."
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className="h-20 bg-zinc-900 border-zinc-800 text-xs text-zinc-200 resize-none"
            />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setCancelDialogOpen(false)}
              className="border-zinc-800 text-zinc-300"
            >
              Keep Order
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancelSubmit}
              disabled={updateStatusMutation.isPending || !cancelReason.trim()}
              className="gap-1"
            >
              {updateStatusMutation.isPending && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
              Confirm Cancellation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
