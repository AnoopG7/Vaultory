import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Boxes,
  Search,
  SlidersHorizontal,
  AlertTriangle,
  PackageX,
  CheckCircle2,
  RefreshCw,
  Store as StoreIcon,
  Warehouse,
  X,
  TrendingDown,
  Loader2,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui'
import {
  useInventory,
  useUpdateInventoryThresholds,
  useLocations,
} from '@/hooks'
import type { InventoryItem, StockStatus } from '@/lib/types'

export default function InventoryPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const searchTerm = searchParams.get('search') ?? ''

  // Filters state
  const [locationFilter, setLocationFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  // Threshold edit modal state
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null)
  const [safetyStockInput, setSafetyStockInput] = useState<string>('')
  const [reorderPointInput, setReorderPointInput] = useState<string>('')
  const [targetLevelInput, setTargetLevelInput] = useState<string>('')
  const [formError, setFormError] = useState<string | null>(null)

  // Data fetching
  const {
    data: inventoryData,
    isLoading,
    isRefetching,
    refetch,
  } = useInventory({
    search: searchTerm.trim() || undefined,
    locationId: locationFilter !== 'all' ? locationFilter : undefined,
    status: statusFilter !== 'all' ? (statusFilter as StockStatus) : undefined,
    limit: 100,
  })

  const { data: locationsData } = useLocations()
  const locations = useMemo(() => locationsData?.locations ?? [], [locationsData])

  const updateThresholdsMutation = useUpdateInventoryThresholds()

  const items = useMemo(() => inventoryData?.data ?? [], [inventoryData])

  // Summary counts
  const stats = useMemo(() => {
    const total = items.length
    let inStock = 0
    let lowStock = 0
    let outOfStock = 0
    let overStock = 0

    items.forEach((item) => {
      if (item.stock_status === 'out_of_stock') outOfStock++
      else if (item.stock_status === 'low') lowStock++
      else if (item.stock_status === 'over_stock') overStock++
      else inStock++
    })

    return { total, inStock, lowStock, outOfStock, overStock }
  }, [items])

  const handleOpenEdit = (item: InventoryItem) => {
    setEditingItem(item)
    setSafetyStockInput(String(item.safety_stock ?? 0))
    setReorderPointInput(String(item.reorder_point ?? 0))
    setTargetLevelInput(String(item.target_level ?? 0))
    setFormError(null)
  }

  const handleCloseEdit = () => {
    setEditingItem(null)
    setFormError(null)
  }

  const handleSaveThresholds = async () => {
    if (!editingItem) return

    const safetyStock = Number(safetyStockInput)
    const reorderPoint = Number(reorderPointInput)
    const targetLevel = targetLevelInput ? Number(targetLevelInput) : undefined

    if (isNaN(safetyStock) || safetyStock < 0) {
      setFormError('Safety stock must be a non-negative number.')
      return
    }

    if (isNaN(reorderPoint) || reorderPoint < 0) {
      setFormError('Reorder point must be a non-negative number.')
      return
    }

    if (reorderPoint < safetyStock) {
      setFormError('Reorder point cannot be lower than safety stock buffer.')
      return
    }

    if (targetLevel !== undefined && (isNaN(targetLevel) || targetLevel < reorderPoint)) {
      setFormError('Target level cannot be lower than reorder point.')
      return
    }

    setFormError(null)

    try {
      await updateThresholdsMutation.mutateAsync({
        productId: editingItem.product_id,
        locationId: editingItem.location_id,
        safetyStock,
        reorderPoint,
        targetLevel: targetLevel ?? Math.max(reorderPoint * 2, safetyStock + 20),
      })

      toast.success('Thresholds updated successfully', {
        description: `Configured safety stock (${safetyStock}) and reorder point (${reorderPoint}) for ${editingItem.product_name}.`,
      })
      handleCloseEdit()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update stock thresholds'
      setFormError(msg)
      toast.error('Failed to update thresholds', { description: msg })
    }
  }

  const handleSearchChange = (val: string) => {
    if (val) {
      setSearchParams({ search: val })
    } else {
      setSearchParams({})
    }
  }

  const handleClearFilters = () => {
    setLocationFilter('all')
    setStatusFilter('all')
    setSearchParams({})
  }

  const hasActiveFilters = searchTerm !== '' || locationFilter !== 'all' || statusFilter !== 'all'

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-semibold tracking-tight">Inventory & Stock Levels</h1>
            <Badge variant="outline" className="font-mono text-xs">
              {items.length} items
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Manage stock buffers, monitor low/out-of-stock items, and configure reorder points per location.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading || isRefetching}
            className="gap-2"
          >
            <RefreshCw className={`size-3.5 ${isRefetching ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Tracked Items */}
        <Card
          className="cursor-pointer transition-all hover:border-primary/50"
          onClick={() => setStatusFilter('all')}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Total Items
            </CardTitle>
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Boxes className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Active SKUs across all locations
            </p>
          </CardContent>
        </Card>

        {/* In Stock */}
        <Card
          className={`cursor-pointer transition-all hover:border-emerald-500/50 ${
            statusFilter === 'in_stock' ? 'border-emerald-500 bg-emerald-500/5' : ''
          }`}
          onClick={() => setStatusFilter(statusFilter === 'in_stock' ? 'all' : 'in_stock')}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
              In Stock
            </CardTitle>
            <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {stats.inStock}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Healthy buffer above reorder point
            </p>
          </CardContent>
        </Card>

        {/* Low Stock */}
        <Card
          className={`cursor-pointer transition-all hover:border-amber-500/50 ${
            statusFilter === 'low' ? 'border-amber-500 bg-amber-500/5' : ''
          }`}
          onClick={() => setStatusFilter(statusFilter === 'low' ? 'all' : 'low')}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-medium text-amber-600 dark:text-amber-400 uppercase tracking-wider">
              Low Stock
            </CardTitle>
            <div className="flex size-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {stats.lowStock}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              At or below reorder threshold
            </p>
          </CardContent>
        </Card>

        {/* Out of Stock */}
        <Card
          className={`cursor-pointer transition-all hover:border-destructive/50 ${
            statusFilter === 'out_of_stock' ? 'border-destructive bg-destructive/5' : ''
          }`}
          onClick={() => setStatusFilter(statusFilter === 'out_of_stock' ? 'all' : 'out_of_stock')}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-medium text-destructive uppercase tracking-wider">
              Out of Stock
            </CardTitle>
            <div className="flex size-8 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
              <PackageX className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {stats.outOfStock}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Zero quantity on hand (urgent)
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Controls */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search products by SKU or name..."
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-9 pr-9"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => handleSearchChange('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>

            {/* Location Filter */}
            <div className="w-full md:w-56">
              <Select value={locationFilter} onValueChange={setLocationFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Locations" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Locations</SelectItem>
                  {locations.map((loc) => (
                    <SelectItem key={loc.id} value={loc.id}>
                      {loc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status Filter */}
            <div className="w-full md:w-48">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="in_stock">In Stock</SelectItem>
                  <SelectItem value="low">Low Stock</SelectItem>
                  <SelectItem value="out_of_stock">Out of Stock</SelectItem>
                  <SelectItem value="over_stock">Over Stock</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Reset Filters */}
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearFilters}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Clear Filters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Inventory Table */}
      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[300px]">Product & SKU</TableHead>
                <TableHead>Location</TableHead>
                <TableHead className="text-right">On Hand</TableHead>
                <TableHead className="text-center">Stock Status</TableHead>
                <TableHead className="text-right">Safety Stock</TableHead>
                <TableHead className="text-right">Reorder Point</TableHead>
                <TableHead className="text-right">Target Level</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-48 text-center">
                    <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                      <Loader2 className="size-6 animate-spin" />
                      <p className="text-sm">Loading inventory levels...</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-48 text-center">
                    <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                      <Boxes className="size-8 stroke-[1.5]" />
                      <p className="font-medium text-foreground">No inventory items found</p>
                      <p className="text-xs max-w-sm">
                        {hasActiveFilters
                          ? 'No items matched your filter criteria. Try searching for a different SKU or clearing filters.'
                          : 'No inventory records exist currently.'}
                      </p>
                      {hasActiveFilters && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleClearFilters}
                          className="mt-2 text-xs"
                        >
                          Clear Filters
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                items.map((item) => {
                  const isOutOfStock = item.stock_status === 'out_of_stock'
                  const isLowStock = item.stock_status === 'low'
                  const isOverStock = item.stock_status === 'over_stock'

                  return (
                    <TableRow key={`${item.product_id}-${item.location_id}`}>
                      {/* Product Name & SKU */}
                      <TableCell>
                        <div className="space-y-0.5">
                          <div className="font-medium text-foreground line-clamp-1">
                            {item.product_name}
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <span className="font-mono text-[11px] font-semibold text-primary/80">
                              {item.sku_code}
                            </span>
                            <span>•</span>
                            <span>{item.category_name}</span>
                            {item.is_perishable && (
                              <Badge
                                variant="secondary"
                                className="h-4 px-1 text-[9px] bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800"
                              >
                                Perishable
                              </Badge>
                            )}
                          </div>
                        </div>
                      </TableCell>

                      {/* Location */}
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-xs">
                          {item.location_type === 'warehouse' ? (
                            <Warehouse className="size-3.5 text-muted-foreground shrink-0" />
                          ) : (
                            <StoreIcon className="size-3.5 text-muted-foreground shrink-0" />
                          )}
                          <span className="truncate">{item.location_name}</span>
                        </div>
                      </TableCell>

                      {/* On Hand Qty */}
                      <TableCell className="text-right">
                        <div className="font-semibold text-sm">
                          <span
                            className={
                              isOutOfStock
                                ? 'text-destructive'
                                : isLowStock
                                ? 'text-amber-600 dark:text-amber-400 font-bold'
                                : 'text-foreground'
                            }
                          >
                            {item.qty_on_hand}
                          </span>
                          <span className="text-xs text-muted-foreground ml-1">
                            {item.unit_name || 'units'}
                          </span>
                        </div>
                      </TableCell>

                      {/* Stock Status Badge */}
                      <TableCell className="text-center">
                        {isOutOfStock ? (
                          <Badge
                            variant="destructive"
                            className="inline-flex items-center gap-1 h-5 px-2 text-[11px] font-medium"
                          >
                            <PackageX className="size-3" />
                            <span>Out of Stock</span>
                          </Badge>
                        ) : isLowStock ? (
                          <Badge
                            variant="secondary"
                            className="inline-flex items-center gap-1 h-5 px-2 text-[11px] font-medium bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/20"
                          >
                            <AlertTriangle className="size-3" />
                            <span>Low Stock</span>
                          </Badge>
                        ) : isOverStock ? (
                          <Badge
                            variant="secondary"
                            className="inline-flex items-center gap-1 h-5 px-2 text-[11px] font-medium bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/20"
                          >
                            <TrendingDown className="size-3" />
                            <span>Over Stock</span>
                          </Badge>
                        ) : (
                          <Badge
                            variant="secondary"
                            className="inline-flex items-center gap-1 h-5 px-2 text-[11px] font-medium bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/20"
                          >
                            <CheckCircle2 className="size-3" />
                            <span>In Stock</span>
                          </Badge>
                        )}
                      </TableCell>

                      {/* Safety Stock */}
                      <TableCell className="text-right font-mono text-xs text-muted-foreground">
                        {item.safety_stock}
                      </TableCell>

                      {/* Reorder Point */}
                      <TableCell className="text-right font-mono text-xs font-medium text-foreground">
                        {item.reorder_point}
                      </TableCell>

                      {/* Target Level */}
                      <TableCell className="text-right font-mono text-xs text-muted-foreground">
                        {item.target_level}
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 px-2.5 text-xs gap-1.5"
                          onClick={() => handleOpenEdit(item)}
                        >
                          <SlidersHorizontal className="size-3" />
                          <span>Configure</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Threshold Configuration Dialog */}
      <Dialog open={Boolean(editingItem)} onOpenChange={(open) => !open && handleCloseEdit()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2 text-primary">
              <SlidersHorizontal className="size-5" />
              <DialogTitle>Configure Stock Thresholds</DialogTitle>
            </div>
            <DialogDescription>
              Set safety stock and reorder point parameters. Vaultory automatically triggers low and
              out-of-stock alerts based on these boundaries.
            </DialogDescription>
          </DialogHeader>

          {editingItem && (
            <div className="space-y-4 py-2">
              {/* Product overview card */}
              <div className="rounded-lg border bg-muted/40 p-3 space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono text-primary font-semibold">
                    {editingItem.sku_code}
                  </span>
                  <Badge variant="outline" className="text-[10px]">
                    {editingItem.location_name}
                  </Badge>
                </div>
                <div className="text-sm font-semibold text-foreground">
                  {editingItem.product_name}
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1">
                  <span>
                    Current Qty:{' '}
                    <strong className="text-foreground">{editingItem.qty_on_hand}</strong>{' '}
                    {editingItem.unit_name}
                  </span>
                  <span>•</span>
                  <span>
                    Status:{' '}
                    <span className="capitalize font-medium text-foreground">
                      {editingItem.stock_status.replace('_', ' ')}
                    </span>
                  </span>
                </div>
              </div>

              {/* Form inputs */}
              <div className="grid gap-4">
                {/* Safety Stock Buffer */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="safety-stock-input" className="text-xs font-semibold">
                      Safety Stock Buffer
                    </Label>
                    <span className="text-[10px] text-muted-foreground">Min critical reserve</span>
                  </div>
                  <Input
                    id="safety-stock-input"
                    type="number"
                    min="0"
                    step="1"
                    placeholder="e.g. 15"
                    value={safetyStockInput}
                    onChange={(e) => setSafetyStockInput(e.target.value)}
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Minimum emergency reserve required to protect against sudden stockouts.
                  </p>
                </div>

                {/* Reorder Point */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="reorder-point-input" className="text-xs font-semibold">
                      Reorder Point
                    </Label>
                    <span className="text-[10px] text-muted-foreground">Trigger alert</span>
                  </div>
                  <Input
                    id="reorder-point-input"
                    type="number"
                    min="0"
                    step="1"
                    placeholder="e.g. 30"
                    value={reorderPointInput}
                    onChange={(e) => setReorderPointInput(e.target.value)}
                  />
                  <p className="text-[11px] text-muted-foreground">
                    When stock drops to or below this quantity, a <strong>Low Stock Alert</strong> is
                    created. Must be &ge; Safety Stock.
                  </p>
                </div>

                {/* Target Level */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="target-level-input" className="text-xs font-semibold">
                      Target Level (Max Stock)
                    </Label>
                    <span className="text-[10px] text-muted-foreground">Replenishment ceiling</span>
                  </div>
                  <Input
                    id="target-level-input"
                    type="number"
                    min="0"
                    step="1"
                    placeholder="e.g. 100"
                    value={targetLevelInput}
                    onChange={(e) => setTargetLevelInput(e.target.value)}
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Upper replenishment bound used to determine order batches and overstock warning.
                  </p>
                </div>
              </div>

              {/* Validation error display */}
              {formError && (
                <div className="flex items-start gap-2 rounded-md bg-destructive/10 p-2.5 text-xs text-destructive">
                  <AlertTriangle className="size-4 shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              type="button"
              onClick={handleCloseEdit}
              disabled={updateThresholdsMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSaveThresholds}
              disabled={updateThresholdsMutation.isPending}
              className="gap-2"
            >
              {updateThresholdsMutation.isPending && (
                <Loader2 className="size-3.5 animate-spin" />
              )}
              <span>Save Changes</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
