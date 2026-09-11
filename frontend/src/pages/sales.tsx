import { useMemo, useState } from 'react'
import {
  ShoppingCart,
  Plus,
  Trash2,
  Eye,
  RotateCcw,
  Loader2,
  Printer,
  History,
  ShieldAlert,
  Search,
  CheckCircle2,
  AlertTriangle,
  Receipt,
  Undo2,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
} from '@/components/ui'
import { useAuthStore } from '@/stores'
import {
  useAuditLogs,
  useCreateSale,
  useCreateSaleReturn,
  useInventory,
  useLocations,
  useProducts,
  useSaleDetail,
  useSaleReturnsList,
  useSalesList,
  useStores,
  useVoidSale,
} from '@/hooks'
import type {
  CreateSaleInput,
  NewProduct,
  Sale,
  SaleReturn,
} from '@/lib/types'

const currency = (n: number | string) => `₹${Number(n || 0).toFixed(2)}`

export default function SalesPage() {
  const [activeTab, setActiveTab] = useState('pos')
  const user = useAuthStore((s) => s.user)
  const isAdmin = user?.role === 'admin'
  const canWrite = user?.role === 'admin' || user?.role === 'sales_personnel'

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Sales &amp; POS Module</h1>
          <p className="text-sm text-muted-foreground">
            Fast POS terminal, real-time stock deduction, voiding, customer returns, and immutable audit logs.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={canWrite ? 'default' : 'secondary'} className="capitalize">
            Role: {user?.role ? user.role.replace('_', ' ') : 'Guest'}
          </Badge>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 md:inline-flex md:w-auto md:grid-cols-none">
          <TabsTrigger value="pos" className="gap-2">
            <ShoppingCart className="size-4" /> Point of Sale (POS)
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <History className="size-4" /> Sale History
          </TabsTrigger>
          <TabsTrigger value="returns" className="gap-2">
            <Undo2 className="size-4" /> Returns &amp; Refunds
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="audit" className="gap-2">
              <ShieldAlert className="size-4" /> Sales Audit Trail
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="pos" className="pt-4">
          <PointOfSaleTerminal onSaleComplete={() => {}} />
        </TabsContent>

        <TabsContent value="history" className="pt-4">
          <SaleHistory />
        </TabsContent>

        <TabsContent value="returns" className="pt-4">
          <ReturnsLedger />
        </TabsContent>

        {isAdmin && (
          <TabsContent value="audit" className="pt-4">
            <SalesAuditTrail />
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}

// ---------------------------------------------------------------------------
// 1. POINT OF SALE (POS) TERMINAL
// ---------------------------------------------------------------------------

interface CartLine {
  key: string
  product_id: string
  sku_code: string
  product_name: string
  qty: number
  unit_price: number
  line_total: number
}

function PointOfSaleTerminal({ onSaleComplete }: { onSaleComplete?: (sale: Sale) => void }) {
  const user = useAuthStore((s) => s.user)
  const { data: storesData } = useStores()
  const { data: locationsData } = useLocations()
  const { data: productsData } = useProducts()
  const createSale = useCreateSale()

  const defaultStoreId = user?.store_id ?? storesData?.stores?.[0]?.id ?? ''
  const [storeId, setStoreId] = useState(defaultStoreId)
  const effectiveStoreId = user?.role === 'store_staff' && user?.store_id ? user.store_id : (storeId || defaultStoreId)

  // Map store to its location
  const storeLocation = useMemo(() => {
    const locs = locationsData?.locations ?? []
    return locs.find((l) => (l as { store_id?: string | null }).store_id === effectiveStoreId && l.type === 'store') ?? locs.find((l) => l.type === 'store')
  }, [locationsData, effectiveStoreId])

  // Real-time inventory for selected store location
  const { data: inventoryData } = useInventory({
    locationId: storeLocation?.id,
    limit: 200,
  })

  const stockMap = useMemo(() => {
    const map = new Map<string, number>()
    for (const item of inventoryData?.data ?? []) {
      map.set(item.product_id, item.qty_on_hand)
    }
    return map
  }, [inventoryData])

  const [cart, setCart] = useState<CartLine[]>([])
  const [searchFilter, setSearchFilter] = useState('')
  const [discountAmount, setDiscountAmount] = useState('0')
  const [paymentMethod, setPaymentMethod] = useState('Cash')
  const [notes, setNotes] = useState('')

  // Receipt modal state
  const [completedSale, setCompletedSale] = useState<Sale | null>(null)
  const [completedLines, setCompletedLines] = useState<CartLine[]>([])

  const canWrite = user?.role === 'admin' || user?.role === 'sales_personnel'

// Products available
  const availableProducts = useMemo(() => {
    const list = productsData?.products ?? []
    if (!searchFilter.trim()) return list
    const q = searchFilter.toLowerCase()
    return list.filter(
      (p) => p.name.toLowerCase().includes(q) || p.sku_code.toLowerCase().includes(q),
    )
  }, [productsData, searchFilter])

  function addToCart(product: NewProduct) {
    const onHand = stockMap.get(product.id) ?? 0
    if (onHand <= 0) {
      toast.warning(`${product.name} is currently out of stock at this store.`)
    }

    setCart((prev) => {
      const existing = prev.find((item) => item.product_id === product.id)
      if (existing) {
        return prev.map((item) =>
          item.product_id === product.id
            ? {
                ...item,
                qty: item.qty + 1,
                line_total: Number(((item.qty + 1) * item.unit_price).toFixed(2)),
              }
            : item,
        )
      }
      const price = Number(product.sale_price || 0)
      return [
        ...prev,
        {
          key: `line-${Date.now()}-${product.id}`,
          product_id: product.id,
          sku_code: product.sku_code,
          product_name: product.name,
          qty: 1,
          unit_price: price,
          line_total: price,
        },
      ]
    })
  }

  function updateQuantity(key: string, newQty: number) {
    if (newQty <= 0) {
      removeFromCart(key)
      return
    }
    setCart((prev) =>
      prev.map((item) =>
        item.key === key
          ? {
              ...item,
              qty: newQty,
              line_total: Number((newQty * item.unit_price).toFixed(2)),
            }
          : item,
      ),
    )
  }

  function updateUnitPrice(key: string, newPrice: number) {
    setCart((prev) =>
      prev.map((item) =>
        item.key === key
          ? {
              ...item,
              unit_price: Math.max(0, newPrice),
              line_total: Number((item.qty * Math.max(0, newPrice)).toFixed(2)),
            }
          : item,
      ),
    )
  }

function removeFromCart(key: string) {
    setCart((prev) => prev.filter((item) => item.key !== key))
  }

  function clearCart() {
    setCart([])
    setDiscountAmount('0')
    setNotes('')
  }

  const subtotal = useMemo(
    () => cart.reduce((sum, item) => sum + item.line_total, 0),
    [cart],
  )
  const discount = Math.min(Math.max(0, Number(discountAmount) || 0), subtotal)
  const grandTotal = Math.max(0, subtotal - discount)

  // Validate stock sufficiency for all cart lines
  const hasInsufficientStock = useMemo(() => {
    return cart.some((item) => {
      const onHand = stockMap.get(item.product_id) ?? 0
      return item.qty > onHand
    })
  }, [cart, stockMap])

  async function handleCheckout() {
    if (!canWrite) {
      toast.error('You do not have permission to record sales')
      return
    }
    if (!effectiveStoreId) {
      toast.error('Please select a store location')
      return
    }
if (cart.length === 0) {
      toast.error('Cart is empty. Add at least one product.')
      return
    }
    if (hasInsufficientStock) {
      toast.error('Cannot proceed: Some items exceed on-hand store inventory.')
      return
    }

    const payload: CreateSaleInput = {
      storeId: effectiveStoreId,
      discount,
      notes: `${notes ? `${notes} · ` : ''}Paid via ${paymentMethod}`,
      lines: cart.map((item) => ({
        productId: item.product_id,
        qty: item.qty,
        unitPrice: item.unit_price,
      })),
    }

    createSale.mutate(payload, {
      onSuccess: (res) => {
        toast.success(`Sale ${res.sale.sale_number} completed & stock deducted!`)
        setCompletedSale(res.sale)
        setCompletedLines([...cart])
        onSaleComplete?.(res.sale)
        clearCart()
      },
      onError: (err) => {
        toast.error(err?.message ?? 'Failed to complete sale')
      },
    })
  }

  return (
    <div className="grid gap-6 lg:grid-cols-12">
      {/* Left Column: Product Selection & Catalog */}
      <div className="flex flex-col gap-4 lg:col-span-7">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-lg">Product Catalog</CardTitle>
                <CardDescription>Click any product to add to the active ticket.</CardDescription>
              </div>

              {/* Store selector */}
              <div className="w-full sm:w-64">
                {user?.role === 'store_staff' && user.store_id ? (
                  <Input
                    value={storesData?.stores.find((s) => s.id === user.store_id)?.name ?? 'Assigned Store'}
                    disabled
                    className="h-9 text-xs font-medium"
                  />
                ) : (
                  <Select value={effectiveStoreId} onValueChange={setStoreId}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Select store" />
                    </SelectTrigger>
                    <SelectContent>
                      {(storesData?.stores ?? []).map((s) => (
                        <SelectItem key={s.id} value={s.id} className="text-xs">
                          {s.name} ({s.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>

            {/* Product search filter */}
            <div className="relative mt-2">
              <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input
                placeholder="Search products by SKU or name..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="pl-9 text-sm"
              />
            </div>
          </CardHeader>

          <CardContent className="pt-0">
            <div className="grid max-h-[34rem] grid-cols-1 gap-2.5 overflow-y-auto pr-1 sm:grid-cols-2">
              {availableProducts.map((p) => {
                const onHand = stockMap.get(p.id) ?? 0
                const isOutOfStock = onHand <= 0
                const isLowStock = onHand > 0 && onHand <= 10

                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => addToCart(p)}
                    className="flex flex-col items-start justify-between rounded-lg border bg-card p-3 text-left transition hover:border-primary hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <div className="w-full">
                      <div className="flex items-start justify-between gap-1">
                        <span className="font-medium text-sm leading-tight text-foreground line-clamp-1">
                          {p.name}
                        </span>
                        <span className="font-semibold text-sm text-primary">
                          {currency(p.sale_price)}
                        </span>
                      </div>
                      <span className="block text-xs text-muted-foreground font-mono mt-0.5">
                        {p.sku_code}
                      </span>
                    </div>

                    <div className="mt-3 flex w-full items-center justify-between pt-1 text-xs">
                      <Badge
                        variant={isOutOfStock ? 'destructive' : isLowStock ? 'secondary' : 'outline'}
                        className="text-[11px] px-1.5 py-0"
                      >
                        {isOutOfStock ? 'Out of stock' : `${onHand} in stock`}
                      </Badge>
                      <span className="flex items-center gap-1 text-xs font-medium text-primary">
                        <Plus className="size-3" /> Add
                      </span>
                    </div>
                  </button>
                )
              })}
              {availableProducts.length === 0 && (
                <div className="col-span-full py-8 text-center text-sm text-muted-foreground">
                  No products matched your search.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Right Column: Active Cart & Checkout */}
      <div className="flex flex-col gap-4 lg:col-span-5">
        <Card className="flex h-full flex-col justify-between">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Receipt className="size-5 text-primary" /> Active Ticket
              </CardTitle>
              {cart.length > 0 && (
                <Button variant="ghost" size="sm" onClick={clearCart} className="h-8 text-xs text-muted-foreground hover:text-destructive">
                  <Trash2 className="size-3.5 mr-1" /> Clear
                </Button>
              )}
            </div>
            <CardDescription>
              {cart.length} line item{cart.length === 1 ? '' : 's'} in order.
            </CardDescription>
          </CardHeader>

          <CardContent className="flex-1 flex flex-col gap-4">
            {/* Cart items list */}
            <div className="max-h-72 flex-1 overflow-y-auto divide-y rounded-md border">
              {cart.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center text-sm text-muted-foreground">
                  <ShoppingCart className="size-8 stroke-1 text-muted-foreground/50 mb-2" />
                  Cart is empty. Click a product on the left to add it.
                </div>
              ) : (
                cart.map((item) => {
                  const onHand = stockMap.get(item.product_id) ?? 0
                  const isExceeded = item.qty > onHand

return (
                    <div key={item.key} className="p-3 flex flex-col gap-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm font-medium leading-tight">{item.product_name}</p>
                          <span className="text-xs font-mono text-muted-foreground">{item.sku_code}</span>
                        </div>
                        <p className="text-sm font-semibold">{currency(item.line_total)}</p>
                      </div>

                      {isExceeded && (
                        <div className="flex items-center gap-1 text-xs text-destructive font-medium">
                          <AlertTriangle className="size-3.5" />
                          Exceeds store on-hand stock ({onHand} available)
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-1">
                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="size-7 text-xs"
                            onClick={() => updateQuantity(item.key, item.qty - 1)}
                          >
                            -
                          </Button>
                          <span className="w-8 text-center text-sm font-medium">{item.qty}</span>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="size-7 text-xs"
                            onClick={() => updateQuantity(item.key, item.qty + 1)}
                          >
                            +
                          </Button>
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <span>@ ₹</span>
                            <Input
                              type="number"
                              min="0"
                              step="any"
                              value={item.unit_price}
                              onChange={(e) => updateUnitPrice(item.key, Number(e.target.value) || 0)}
                              className="h-7 w-20 text-right text-xs"
                            />
                          </div>

                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-7 text-muted-foreground hover:text-destructive"
                            onClick={() => removeFromCart(item.key)}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            {/* Checkout Calculation & Controls */}
            <div className="flex flex-col gap-3 rounded-lg border bg-muted/30 p-3.5 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span className="font-medium text-foreground">{currency(subtotal)}</span>
              </div>

              <div className="flex items-center justify-between gap-4">
                <Label htmlFor="pos-discount" className="text-xs text-muted-foreground whitespace-nowrap">
                  Discount (₹)
                </Label>
                <Input
                  id="pos-discount"
                  type="number"
                  min="0"
                  step="any"
                  value={discountAmount}
                  onChange={(e) => setDiscountAmount(e.target.value)}
                  className="h-8 w-28 text-right text-xs"
                />
              </div>

              <div className="flex items-center justify-between gap-4">
                <Label htmlFor="pos-payment" className="text-xs text-muted-foreground whitespace-nowrap">
                  Payment Method
                </Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger id="pos-payment" className="h-8 w-32 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Cash">Cash</SelectItem>
                    <SelectItem value="Card">Card</SelectItem>
                    <SelectItem value="UPI">UPI</SelectItem>
                    <SelectItem value="Store Credit">Store Credit</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between gap-4">
                <Label htmlFor="pos-notes" className="text-xs text-muted-foreground whitespace-nowrap">
                  Note
                </Label>
                <Input
                  id="pos-notes"
                  placeholder="Reference, customer..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>

              <div className="flex justify-between border-t pt-2.5 text-base font-bold text-foreground">
                <span>Grand Total</span>
                <span className="text-primary text-lg">{currency(grandTotal)}</span>
              </div>
            </div>

            <Button
              type="button"
              size="lg"
              disabled={!canWrite || cart.length === 0 || hasInsufficientStock || createSale.isPending}
              onClick={handleCheckout}
              className="w-full font-semibold"
            >
              {createSale.isPending ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" /> Recording Sale &amp; Mutating Stock...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 size-4" /> Charge {currency(grandTotal)} (Complete POS)
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Printable Receipt Modal */}
      {completedSale && (
        <Dialog open={Boolean(completedSale)} onOpenChange={(open) => !open && setCompletedSale(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CheckCircle2 className="size-5 text-green-500" /> Sale Receipt
              </DialogTitle>
              <DialogDescription>
                Transaction #{completedSale.sale_number} recorded successfully.
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-3 rounded-lg border p-4 font-mono text-xs">
              <div className="text-center border-b pb-2">
                <p className="font-bold text-sm tracking-wider">VAULTORY STORE</p>
                <p className="text-muted-foreground">{new Date(completedSale.sale_datetime).toLocaleString()}</p>
                <p className="text-muted-foreground font-sans">Cashier: {user?.fullName ?? user?.email}</p>
              </div>

              <div className="flex flex-col gap-1 divide-y">
                {completedLines.map((line, idx) => (
                  <div key={idx} className="flex justify-between pt-1">
                    <div>
                      <span>{line.product_name}</span>
                      <span className="block text-muted-foreground">{line.qty} x {currency(line.unit_price)}</span>
                    </div>
                    <span className="font-medium">{currency(line.line_total)}</span>
                  </div>
                ))}
              </div>

              <div className="border-t pt-2 flex flex-col gap-1 text-right">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{currency(completedSale.subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Discount</span>
                  <span>-{currency(completedSale.discount)}</span>
                </div>
                <div className="flex justify-between font-bold text-sm text-foreground pt-1 border-t">
                  <span>TOTAL PAID</span>
                  <span>{currency(completedSale.total)}</span>
                </div>
                {completedSale.notes && (
                  <p className="text-xs text-muted-foreground text-left italic pt-1">{completedSale.notes}</p>
                )}
              </div>
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button
                variant="outline"
                onClick={() => window.print()}
                className="gap-1.5"
              >
                <Printer className="size-4" /> Print Receipt
              </Button>
              <Button onClick={() => setCompletedSale(null)}>
                New Sale
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// 2. SALE HISTORY & VOID
// ---------------------------------------------------------------------------

function SaleHistory() {
  const user = useAuthStore((s) => s.user)
  const isAdmin = user?.role === 'admin'
  const canWrite = user?.role === 'admin' || user?.role === 'sales_personnel'

  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'voided'>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null)
  const [returnTargetSaleId, setReturnTargetSaleId] = useState<string | null>(null)

  const { data, isLoading, isError } = useSalesList({
    status: statusFilter === 'all' ? undefined : statusFilter,
    limit: 100,
  })

  const filteredSales = useMemo(() => {
    const list = data?.sales ?? []
    if (!searchTerm.trim()) return list
    const q = searchTerm.toLowerCase()
    return list.filter(
      (s) => s.sale_number.toLowerCase().includes(q) || (s.notes && s.notes.toLowerCase().includes(q)),
    )
  }, [data, searchTerm])

  const detail = useSaleDetail(selectedSaleId ?? undefined)

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>Sales History &amp; Orders</CardTitle>
            <CardDescription>Review transactions, inspect itemized receipts, and process returns or voids.</CardDescription>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-48 sm:w-60">
              <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input
                placeholder="Search sale #..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 h-9 text-xs"
              />
            </div>

            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as 'all' | 'active' | 'voided')}>
              <SelectTrigger className="h-9 w-32 text-xs">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="voided">Voided</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {isLoading && <p className="text-sm text-muted-foreground py-8 text-center">Loading sales records…</p>}
        {isError && <p className="text-sm text-destructive py-8 text-center">Failed to load sales history.</p>}

        {!isLoading && filteredSales.length === 0 && (
          <p className="text-sm text-muted-foreground py-10 text-center">No sales transactions found.</p>
        )}

        {!isLoading && filteredSales.length > 0 && (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sale #</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Items</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSales.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-mono font-medium">{s.sale_number}</TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground text-xs">
                      {new Date(s.sale_datetime).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">{s.total_items}</TableCell>
                    <TableCell className="text-right">{s.total_qty}</TableCell>
                    <TableCell className="text-right font-medium text-foreground">{currency(s.total)}</TableCell>
                    <TableCell>
                      <Badge variant={s.status === 'active' ? 'default' : 'destructive'} className="text-xs">
                        {s.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedSaleId(s.id)}
                          className="h-8 text-xs"
                        >
                          <Eye className="size-3.5 mr-1" /> View
                        </Button>

                        {canWrite && s.status === 'active' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setReturnTargetSaleId(s.id)}
                            className="h-8 text-xs text-amber-600 hover:text-amber-700"
                          >
                            <Undo2 className="size-3.5 mr-1" /> Return
                          </Button>
                        )}

                        {isAdmin && s.status === 'active' && (
                          <VoidSaleButton saleId={s.id} saleNumber={s.sale_number} />
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Sale Detail Dialog */}
        <Dialog open={Boolean(selectedSaleId)} onOpenChange={(o) => !o && setSelectedSaleId(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Sale {detail.data?.sale.sale_number}</DialogTitle>
              <DialogDescription>
                Recorded {detail.data ? new Date(detail.data.sale.sale_datetime).toLocaleString() : ''}
              </DialogDescription>
            </DialogHeader>

            {detail.isLoading && <p className="text-sm text-muted-foreground py-4 text-center">Loading details…</p>}

            {detail.data && (
              <div className="flex flex-col gap-4">
                <div className="overflow-x-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead className="text-right">Qty</TableHead>
                        <TableHead className="text-right">Unit Price</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {detail.data.lines.map((line) => (
                        <TableRow key={line.id}>
                          <TableCell>
                            <span className="font-medium text-xs block">{line.products?.name ?? line.product_id}</span>
                            <span className="text-[11px] font-mono text-muted-foreground">{line.products?.sku_code}</span>
                          </TableCell>
                          <TableCell className="text-right text-xs">{line.qty}</TableCell>
                          <TableCell className="text-right text-xs">{currency(line.unit_price)}</TableCell>
                          <TableCell className="text-right text-xs font-semibold">{currency(line.line_total)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="flex flex-col gap-1.5 rounded-lg border bg-muted/30 p-3 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{currency(detail.data.sale.subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Discount</span>
                    <span>-{currency(detail.data.sale.discount)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-sm text-foreground pt-1 border-t">
                    <span>Grand Total</span>
                    <span>{currency(detail.data.sale.total)}</span>
                  </div>

                  {detail.data.sale.status === 'voided' && (
                    <div className="mt-2 rounded bg-destructive/10 p-2 text-destructive font-medium">
                      Voided · Reason: {detail.data.sale.void_reason}
                    </div>
                  )}

                  {detail.data.sale.notes && (
                    <p className="mt-1 text-muted-foreground italic">{detail.data.sale.notes}</p>
                  )}
                </div>

                {/* Returns associated with this sale */}
                {detail.data.returns && detail.data.returns.length > 0 && (
                  <div className="flex flex-col gap-2 border-t pt-3">
                    <h4 className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                      <Undo2 className="size-3.5 text-amber-600" /> Return Records ({detail.data.returns.length})
                    </h4>
                    <div className="space-y-1.5">
                      {detail.data.returns.map((ret: SaleReturn) => (
                        <div key={ret.id} className="flex items-center justify-between rounded border p-2 text-xs">
                          <div>
                            <span className="font-medium text-foreground">{ret.reason}</span>
                            <span className="block text-[11px] text-muted-foreground">
                              {new Date(ret.return_datetime).toLocaleString()}
                            </span>
                          </div>
                          <span className="font-semibold text-amber-600">Refunded {currency(ret.refund_amount)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Process Return Dialog */}
        {returnTargetSaleId && (
          <ProcessReturnDialog
            saleId={returnTargetSaleId}
            open={Boolean(returnTargetSaleId)}
            onOpenChange={(open) => !open && setReturnTargetSaleId(null)}
          />
        )}
      </CardContent>
    </Card>
  )
}

function VoidSaleButton({ saleId, saleNumber }: { saleId: string; saleNumber: string }) {
  const voidSale = useVoidSale()
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')

  function confirm() {
    if (!reason.trim()) {
      toast.error('A reason is required to void a sale')
      return
    }
    voidSale.mutate(
      { id: saleId, reason: reason.trim() },
      {
        onSuccess: () => {
          toast.success(`Sale ${saleNumber} voided and stock restored to inventory`)
          setOpen(false)
          setReason('')
        },
        onError: (err) => toast.error(err?.message ?? 'Failed to void sale'),
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        variant="ghost"
        size="sm"
        className="h-8 text-xs text-destructive hover:text-destructive"
        onClick={() => setOpen(true)}
      >
        <RotateCcw className="size-3.5 mr-1" /> Void
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Void Sale {saleNumber}?</DialogTitle>
          <DialogDescription>
            This restores all sold stock items to store inventory, marks the transaction as voided, and creates an audit trail entry. This cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          <Label htmlFor="void-reason">Reason *</Label>
          <Textarea
            id="void-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Cashier mistake, customer aborted before payment..."
            rows={3}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={confirm} disabled={voidSale.isPending}>
            {voidSale.isPending && <Loader2 className="size-4 animate-spin mr-1.5" />}
            Confirm Void
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// 3. RETURNS & REFUNDS LEDGER
// ---------------------------------------------------------------------------

function ReturnsLedger() {
  const { data, isLoading, isError } = useSaleReturnsList({ limit: 100 })
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null)

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Undo2 className="size-5 text-amber-600" /> Returns &amp; Refunds Ledger
            </CardTitle>
            <CardDescription>
              Structured item returns against original sales tickets. Returned quantities are automatically restored to stock.
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedSaleId('new')}
            className="gap-1.5 text-xs"
          >
            <Plus className="size-4" /> Process Return
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {isLoading && <p className="text-sm text-muted-foreground py-8 text-center">Loading returns ledger…</p>}
        {isError && <p className="text-sm text-destructive py-8 text-center">Failed to load returns.</p>}

        {!isLoading && (!data || data.returns.length === 0) && (
          <p className="text-sm text-muted-foreground py-10 text-center">
            No sale returns recorded yet. Returns can be initiated from any active sale.
          </p>
        )}

        {!isLoading && data && data.returns.length > 0 && (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Return ID</TableHead>
                  <TableHead>Original Sale</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead className="text-right">Refund Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.returns.map((ret: SaleReturn) => (
                  <TableRow key={ret.id}>
                    <TableCell className="font-mono text-xs font-medium">{ret.id.substring(0, 16)}...</TableCell>
                    <TableCell className="font-mono text-xs text-primary">{ret.sale_id.substring(0, 16)}...</TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(ret.return_datetime).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-xs max-w-xs truncate">{ret.reason}</TableCell>
                    <TableCell className="text-right font-semibold text-amber-600">
                      {currency(ret.refund_amount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {selectedSaleId && (
          <SelectSaleForReturnDialog
            open={Boolean(selectedSaleId)}
            onOpenChange={(open) => !open && setSelectedSaleId(null)}
          />
        )}
      </CardContent>
    </Card>
  )
}

function SelectSaleForReturnDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { data: salesData } = useSalesList({ status: 'active', limit: 50 })
  const [chosenId, setChosenId] = useState('')
  const [processOpen, setProcessOpen] = useState(false)

  const activeSales = salesData?.sales ?? []

  return (
    <>
      <Dialog open={open && !processOpen} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Select Sale to Return</DialogTitle>
            <DialogDescription>
              Choose an active sale transaction to return items from.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3 py-2">
            <Label htmlFor="sale-picker">Active Sale</Label>
            <Select value={chosenId} onValueChange={setChosenId}>
              <SelectTrigger id="sale-picker">
                <SelectValue placeholder="Select sale number" />
              </SelectTrigger>
              <SelectContent>
                {activeSales.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.sale_number} · {currency(s.total)} ({new Date(s.sale_datetime).toLocaleDateString()})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              disabled={!chosenId}
              onClick={() => {
                setProcessOpen(true)
              }}
            >
              Next: Select Items
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {processOpen && chosenId && (
        <ProcessReturnDialog
          saleId={chosenId}
          open={processOpen}
          onOpenChange={(op) => {
            setProcessOpen(op)
            if (!op) onOpenChange(false)
          }}
        />
      )}
    </>
  )
}

function ProcessReturnDialog({
  saleId,
  open,
  onOpenChange,
}: {
  saleId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { data: detailData, isLoading } = useSaleDetail(saleId)
  const createReturn = useCreateSaleReturn()

  const [returnQtys, setReturnQtys] = useState<Record<string, number>>({})
  const [reason, setReason] = useState('Defective item / Damaged')
  const [notes, setNotes] = useState('')

  const lines = useMemo(() => detailData?.lines ?? [], [detailData?.lines])
  const previousReturns = useMemo(() => detailData?.returns ?? [], [detailData?.returns])

  // Compute remaining returnable qty per line
  const returnableMap = useMemo(() => {
    const map = new Map<string, number>()
    for (const line of lines) {
      const prevQty = previousReturns.reduce((acc: number, curr: SaleReturn & { lines?: { sale_line_id: string; qty_returned: number }[] }) => {
        const matchingLine = curr.lines?.find((rl: { sale_line_id: string; qty_returned: number }) => rl.sale_line_id === line.id)
        return acc + (matchingLine ? matchingLine.qty_returned : 0)
      }, 0)
      map.set(line.id, Math.max(0, line.qty - prevQty))
    }
    return map
  }, [lines, previousReturns])

  function handleQtyChange(saleLineId: string, val: number) {
    const max = returnableMap.get(saleLineId) ?? 0
    const clamped = Math.min(Math.max(0, val), max)
    setReturnQtys((prev) => ({ ...prev, [saleLineId]: clamped }))
  }

  // Calculate refund sum
  const refundTotal = useMemo(() => {
    let total = 0
    for (const line of lines) {
      const q = returnQtys[line.id] ?? 0
      total += q * line.unit_price
    }
    return Number(total.toFixed(2))
  }, [lines, returnQtys])

  const hasSelectedReturn = Object.values(returnQtys).some((q) => q > 0)

  function submitReturn() {
    if (!reason.trim()) {
      toast.error('Please enter a return reason')
      return
    }
    if (!hasSelectedReturn) {
      toast.error('Select at least one item quantity to return')
      return
    }

    const payloadLines = lines
      .filter((l) => (returnQtys[l.id] ?? 0) > 0)
      .map((l) => ({
        saleLineId: l.id,
        productId: l.product_id,
        qtyReturned: returnQtys[l.id],
      }))

    createReturn.mutate(
      {
        saleId,
        payload: {
          reason,
          notes: notes || undefined,
          lines: payloadLines,
        },
      },
      {
        onSuccess: () => {
          toast.success(`Return processed — stock restored & ${currency(refundTotal)} refunded!`)
          onOpenChange(false)
        },
        onError: (err) => {
          toast.error(err?.message ?? 'Failed to process return')
        },
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Undo2 className="size-5 text-amber-600" /> Return Items for {detailData?.sale.sale_number}
          </DialogTitle>
          <DialogDescription>
            Specify return quantities. Returned items will be re-credited to inventory.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Loading sale lines…</p>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-right">Remaining</TableHead>
                    <TableHead className="text-right w-24">Return Qty</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lines.map((line) => {
                    const maxReturn = returnableMap.get(line.id) ?? 0
                    const current = returnQtys[line.id] ?? 0

                    return (
                      <TableRow key={line.id}>
                        <TableCell>
                          <span className="font-medium text-xs block">{line.products?.name ?? line.product_id}</span>
                          <span className="text-[11px] font-mono text-muted-foreground">{line.products?.sku_code}</span>
                        </TableCell>
                        <TableCell className="text-right text-xs">{currency(line.unit_price)}</TableCell>
                        <TableCell className="text-right text-xs font-semibold">{maxReturn}</TableCell>
                        <TableCell className="text-right">
                          <Input
                            type="number"
                            min="0"
                            max={maxReturn}
                            value={current}
                            onChange={(e) => handleQtyChange(line.id, Number(e.target.value) || 0)}
                            className="h-7 w-20 text-right text-xs"
                            disabled={maxReturn <= 0}
                          />
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>

            <div className="grid gap-3 text-xs">
              <div className="grid gap-1.5">
                <Label htmlFor="return-reason">Reason *</Label>
                <Select value={reason} onValueChange={setReason}>
                  <SelectTrigger id="return-reason" className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Defective item / Damaged">Defective item / Damaged</SelectItem>
                    <SelectItem value="Wrong item delivered">Wrong item delivered</SelectItem>
                    <SelectItem value="Customer changed mind">Customer changed mind</SelectItem>
                    <SelectItem value="Exchange request">Exchange request</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="return-notes">Additional Notes</Label>
                <Input
                  id="return-notes"
                  placeholder="Optional detail..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>

              <div className="flex items-center justify-between border-t pt-2 text-sm font-bold">
                <span>Calculated Refund</span>
                <span className="text-base text-amber-600">{currency(refundTotal)}</span>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                onClick={submitReturn}
                disabled={!hasSelectedReturn || createReturn.isPending}
                className="gap-1.5 bg-amber-600 hover:bg-amber-700 text-white"
              >
                {createReturn.isPending && <Loader2 className="size-4 animate-spin" />}
                Confirm Return &amp; Refund
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// 4. SALES AUDIT TRAIL
// ---------------------------------------------------------------------------

function SalesAuditTrail() {
  const [actionFilter, setActionFilter] = useState<string>('all')
  const { data, isLoading, isError } = useAuditLogs({
    entity: 'sale',
    limit: 100,
  })

  const logs = useMemo(() => {
    const all = data?.logs ?? []
    if (actionFilter === 'all') return all
    return all.filter((l) => l.action === actionFilter)
  }, [data, actionFilter])

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ShieldAlert className="size-5 text-primary" /> Sales Audit Trail (Immutable)
            </CardTitle>
            <CardDescription>
              Complete ledger of sales creation, voids, and item return transactions.
            </CardDescription>
          </div>

          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="h-9 w-44 text-xs">
              <SelectValue placeholder="Filter Action" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sales Actions</SelectItem>
              <SelectItem value="sale_created">Sale Created</SelectItem>
              <SelectItem value="sale_returned">Sale Returned</SelectItem>
              <SelectItem value="sale_voided">Sale Voided</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent>
        {isLoading && <p className="py-8 text-center text-sm text-muted-foreground">Loading audit log records…</p>}
        {isError && <p className="py-8 text-center text-sm text-destructive">Failed to load audit trail.</p>}

        {!isLoading && logs.length === 0 && (
          <p className="py-10 text-center text-sm text-muted-foreground">
            No sales audit logs recorded yet.
          </p>
        )}

        {!isLoading && logs.length > 0 && (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Actor</TableHead>
                  <TableHead>Sale / Entity ID</TableHead>
                  <TableHead>Details Summary</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => {
                  const isCreated = log.action === 'sale_created'
                  const isVoided = log.action === 'sale_voided'
                  const isReturned = log.action === 'sale_returned'

                  const detailObj = log.detail as Record<string, unknown> | null

                  return (
                    <TableRow key={log.id}>
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground font-mono">
                        {new Date(log.created_at).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={isCreated ? 'default' : isVoided ? 'destructive' : 'secondary'}
                          className={`text-[11px] ${isReturned ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300' : ''}`}
                        >
                          {log.action.replace('_', ' ').toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">
                        <span className="font-medium text-foreground block">{log.actor_email ?? 'System'}</span>
                        <span className="text-[11px] text-muted-foreground capitalize">
                          {log.actor_role ? log.actor_role.replace('_', ' ') : 'admin'}
                        </span>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {String(detailObj?.sale_number ?? log.entity_id ?? 'N/A')}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-sm truncate">
                        {isCreated && `Total: ₹${detailObj?.total} · ${detailObj?.items_count} item(s)`}
                        {isVoided && `Void reason: "${detailObj?.void_reason}"`}
                        {isReturned && `Refund: ₹${detailObj?.refund_amount} · Reason: "${detailObj?.reason}"`}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
