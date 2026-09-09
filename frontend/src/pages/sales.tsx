import { useMemo, useState } from 'react'
import { ShoppingCart, Plus, Trash2, Eye, RotateCcw, Loader2 } from 'lucide-react'
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
  useCreateSale,
  useProducts,
  useSaleDetail,
  useSalesList,
  useStores,
  useVoidSale,
} from '@/hooks'
import type { CreateSaleInput, NewProduct } from '@/lib/types'

const currency = (n: number) => `₹${Number(n).toFixed(2)}`

export default function SalesPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Sales &amp; Orders</h1>
          <p className="text-sm text-muted-foreground">
            Record sales (stock auto-deducted) and review store-wise history.
          </p>
        </div>
      </div>

      <Tabs defaultValue="record">
        <TabsList>
          <TabsTrigger value="record">Record Sale</TabsTrigger>
          <TabsTrigger value="history">Sale History</TabsTrigger>
        </TabsList>
        <TabsContent value="record" className="pt-4">
          <RecordSaleForm />
        </TabsContent>
        <TabsContent value="history" className="pt-4">
          <SaleHistory />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Record Sale form
// ---------------------------------------------------------------------------

interface DraftLine {
  key: number
  product_id: string
  product_name: string
  qty: string
  unit_price: string
}

function RecordSaleForm() {
  const user = useAuthStore((s) => s.user)
  const { data: stores } = useStores()
  const { data: products } = useProducts()
  const createSale = useCreateSale()

  const [storeId, setStoreId] = useState('')
  const [discount, setDiscount] = useState('0')
  const [notes, setNotes] = useState('')
  const [lines, setLines] = useState<DraftLine[]>([])

  const productMap = useMemo(
    () => new Map((products?.products ?? []).map((p) => [p.id, p])),
    [products],
  )

  // Store staff are scoped to their own store.
  const canWrite = user?.role === 'admin' || user?.role === 'sales_personnel'
  const effectiveStoreId = user?.role === 'store_staff' ? user.store_id ?? storeId : storeId

  function addLine() {
    setLines((prev) => [
      ...prev,
      { key: Date.now(), product_id: '', product_name: '', qty: '1', unit_price: '' },
    ])
  }

  function updateLine(key: number, patch: Partial<DraftLine>) {
    setLines((prev) =>
      prev.map((l) => (l.key === key ? { ...l, ...patch } : l)),
    )
  }

  function removeLine(key: number) {
    setLines((prev) => prev.filter((l) => l.key !== key))
  }

  const derived = useMemo(() => {
    const checked = lines.map((line) => {
      const qty = Number(line.qty) || 0
      const price = line.unit_price === '' ? 0 : Number(line.unit_price) || 0
      const product = productMap.get(line.product_id)
      const effectivePrice = line.unit_price === '' && product ? Number(product.sale_price) : price
      const total = qty * effectivePrice
      return { ...line, qty, price: effectivePrice, total, product }
    })
    const subtotal = checked.reduce((sum, l) => sum + l.total, 0)
    const disc = Math.max(0, Number(discount) || 0)
    const grandTotal = Math.max(0, subtotal - disc)
    return { checked, subtotal, grandTotal }
  }, [lines, discount, productMap])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canWrite) {
      toast.error('You do not have permission to record sales')
      return
    }
    if (!effectiveStoreId) {
      toast.error('Please select a store')
      return
    }
    const valid = derived.checked.filter((l) => l.product_id && l.qty > 0)
    if (valid.length === 0) {
      toast.error('Add at least one line item with a quantity')
      return
    }

    const payload: CreateSaleInput = {
      store_id: effectiveStoreId,
      discount: derived.subtotal - derived.grandTotal,
      notes: notes || undefined,
      lines: valid.map((l) => ({
        product_id: l.product_id,
        qty: l.qty,
        unit_price: l.price,
      })),
    }

    createSale.mutate(payload, {
      onSuccess: () => {
        toast.success('Sale recorded — stock updated')
        setLines([])
        setDiscount('0')
        setNotes('')
      },
      onError: (err) => {
        toast.error(err?.message ?? 'Failed to record sale')
      },
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShoppingCart className="size-5" /> Record a Sale
        </CardTitle>
        <CardDescription>
          Choose a store, add line items, then save. Stock is deducted automatically.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          {/* Store selector */}
          {user?.role !== 'store_staff' && (
            <div className="grid max-w-md gap-2">
              <Label htmlFor="store">Store</Label>
              <Select value={storeId} onValueChange={setStoreId}>
                <SelectTrigger id="store">
                  <SelectValue placeholder="Select a store" />
                </SelectTrigger>
                <SelectContent>
                  {(stores?.stores ?? []).map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {user?.role === 'store_staff' && user.store_id && (
            <div className="grid max-w-md gap-2">
              <Label>Store</Label>
              <Input value={stores?.stores.find((s) => s.id === user.store_id)?.name ?? ''} disabled />
            </div>
          )}

          {/* Line items */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <Label>Line Items</Label>
              <Button type="button" variant="outline" size="sm" onClick={addLine}>
                <Plus className="size-4" /> Add item
              </Button>
            </div>

            {derived.checked.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No items yet. Add at least one product to the sale.
              </p>
            )}

            {derived.checked.length > 0 && (
              <div className="overflow-x-auto">
                <Table className="min-w-[40rem]">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-1/2">Product</TableHead>
                      <TableHead className="w-24">Qty</TableHead>
                      <TableHead className="w-28">Unit Price</TableHead>
                      <TableHead className="w-28 text-right">Line Total</TableHead>
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {derived.checked.map((line) => (
                      <TableRow key={line.key}>
                        <TableCell>
                          <Select
                            value={line.product_id || undefined}
                            onValueChange={(v) => {
                              const p = productMap.get(v)
                              updateLine(line.key, {
                                product_id: v,
                                product_name: p ? p.name : '',
                              })
                            }}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select product" />
                            </SelectTrigger>
                            <SelectContent>
                              {(products?.products ?? []).map((p: NewProduct) => (
                                <SelectItem key={p.id} value={p.id}>
                                  {p.name} · {p.sku_code}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="0"
                            step="any"
                            value={line.qty}
                            onChange={(e) => updateLine(line.key, { qty: e.target.value })}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="0"
                            step="any"
                            placeholder={
                              line.product ? String(line.product.sale_price) : '0.00'
                            }
                            value={line.unit_price}
                            onChange={(e) => updateLine(line.key, { unit_price: e.target.value })}
                          />
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {currency(line.total)}
                        </TableCell>
                        <TableCell>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label="Remove line"
                            onClick={() => removeLine(line.key)}
                          >
                            <Trash2 className="size-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          {/* Totals + discount */}
          <div className="grid max-w-md gap-2">
            <div className="grid gap-2">
              <Label htmlFor="discount">Discount (₹)</Label>
              <Input
                id="discount"
                type="number"
                min="0"
                step="any"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
              />
            </div>
            <div className="mt-2 flex flex-col gap-1 rounded-lg border p-4 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{currency(derived.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Discount</span>
                <span>-{currency(Math.min(Number(discount) || 0, derived.subtotal))}</span>
              </div>
              <div className="mt-1 flex justify-between border-t pt-2 text-base font-semibold">
                <span>Total</span>
                <span>{currency(derived.grandTotal)}</span>
              </div>
            </div>
          </div>

          <div className="grid max-w-md gap-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Opaque note about this sale…"
              rows={2}
            />
          </div>

          <div>
            <Button
              type="submit"
              disabled={!canWrite || createSale.isPending}
              className="w-full sm:w-auto"
            >
              {createSale.isPending && <Loader2 className="size-4 animate-spin" />}
              Save Sale
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Sale history
// ---------------------------------------------------------------------------

function SaleHistory() {
  const user = useAuthStore((s) => s.user)
  const { data, isLoading, isError } = useSalesList({ limit: 100 })
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const detail = useSaleDetail(selectedId ?? undefined)

  const isAdmin = user?.role === 'admin'

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sale History</CardTitle>
        <CardDescription>Recent sales transactions across stores.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading && <p className="text-sm text-muted-foreground">Loading sales…</p>}
        {isError && <p className="text-sm text-destructive">Failed to load sales.</p>}

        {data && data.sales.length === 0 && (
          <p className="text-sm text-muted-foreground">No sales recorded yet.</p>
        )}

        {data && data.sales.length > 0 && (
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
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.sales.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.sale_number}</TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {new Date(s.sale_datetime).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">{s.total_items}</TableCell>
                    <TableCell className="text-right">{s.total_qty}</TableCell>
                    <TableCell className="text-right font-medium">{currency(s.total)}</TableCell>
                    <TableCell>
                      <Badge variant={s.status === 'active' ? 'default' : 'secondary'}>
                        {s.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedId(s.id)}
                        >
                          <Eye className="size-4" /> View
                        </Button>
                        {isAdmin && s.status === 'active' && (
                          <VoidSaleButton saleId={s.id} />
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Detail dialog */}
        <Dialog open={Boolean(selectedId)} onOpenChange={(o) => !o && setSelectedId(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Sale {detail.data?.sale.sale_number}</DialogTitle>
              <DialogDescription>
                Recorded {detail.data ? new Date(detail.data.sale.sale_datetime).toLocaleString() : ''}
              </DialogDescription>
            </DialogHeader>
            {detail.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
            {detail.data && (
              <div className="flex flex-col gap-4">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead className="text-right">Qty</TableHead>
                        <TableHead className="text-right">Price</TableHead>
                        <TableHead className="text-right">Line Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {detail.data.lines.map((line) => (
                        <TableRow key={line.id}>
                          <TableCell>
                            {line.products?.name ?? line.product_id}
                            <span className="block text-xs text-muted-foreground">
                              {line.products?.sku_code}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">{line.qty}</TableCell>
                          <TableCell className="text-right">{currency(line.unit_price)}</TableCell>
                          <TableCell className="text-right font-medium">
                            {currency(line.line_total)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <div className="flex flex-col gap-1 border-t pt-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{currency(detail.data.sale.subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Discount</span>
                    <span>{currency(detail.data.sale.discount)}</span>
                  </div>
                  <div className="flex justify-between text-base font-semibold">
                    <span>Total</span>
                    <span>{currency(detail.data.sale.total)}</span>
                  </div>
                  {detail.data.sale.status === 'voided' && (
                    <div className="mt-2 rounded-md bg-muted p-2 text-xs text-muted-foreground">
                      Voided — {detail.data.sale.void_reason}
                    </div>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}

function VoidSaleButton({ saleId }: { saleId: string }) {
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
          toast.success('Sale voided and stock restored')
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
        className="text-destructive hover:text-destructive"
        onClick={() => setOpen(true)}
      >
        <RotateCcw className="size-4" /> Void
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Void this sale?</DialogTitle>
          <DialogDescription>
            This restores the sold stock to the store and marks the sale as voided.
            This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          <Label htmlFor="void-reason">Reason *</Label>
          <Textarea
            id="void-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Entered by mistake, customer returned at counter"
            rows={3}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={confirm} disabled={voidSale.isPending}>
            {voidSale.isPending && <Loader2 className="size-4 animate-spin" />}
            Void sale
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
