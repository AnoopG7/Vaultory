import { useMemo, useState } from 'react'
import {
  Truck,
  Plus,
  Search,
  Clock,
  CheckCircle2,
  Layers,
  Phone,
  Mail,
  MapPin,
  TrendingUp,
  X,
  Trash2,
  Edit2,
  Loader2,
  ShieldCheck,
  Star,
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
  Progress,
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
  Textarea,
} from '@/components/ui'
import { useAuthStore } from '@/stores'
import {
  useSuppliers,
  useSupplierProducts,
  useSupplierPerformance,
  useCreateSupplier,
  useUpdateSupplier,
  useDeleteSupplier,
  useMapSupplierProduct,
  useUpdateSupplierProduct,
  useUnmapSupplierProduct,
  useProducts,
} from '@/hooks'
import type { Supplier, SupplierProductMapping } from '@/lib/types'

const currency = (n: number | null | undefined) => (n != null ? `₹${Number(n).toFixed(2)}` : '—')

export default function SuppliersPage() {
  const user = useAuthStore((s) => s.user)
  const isAdmin = user?.role === 'admin'

  // State
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'archived'>('all')

  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null)
  const [mappingSupplier, setMappingSupplier] = useState<Supplier | null>(null)
  const [performanceSupplier, setPerformanceSupplier] = useState<Supplier | null>(null)

  // Queries & Mutations
  const { data: suppliersData, isLoading } = useSuppliers({
    search: searchTerm,
    status: statusFilter,
  })

  const suppliers = useMemo(() => suppliersData?.suppliers ?? [], [suppliersData])

  // KPI Calculations
  const metrics = useMemo(() => {
    const total = suppliers.length
    const active = suppliers.filter((s) => s.status === 'active').length
    const avgLead =
      total > 0
        ? (suppliers.reduce((acc, s) => acc + (s.lead_time_days || 7), 0) / total).toFixed(1)
        : '0'

    const totalPos = suppliers.reduce((acc, s) => acc + (s.total_pos || 0), 0)
    const onTime = suppliers.reduce((acc, s) => acc + (s.on_time_deliveries || 0), 0)
    const onTimeRate = totalPos > 0 ? ((onTime / totalPos) * 100).toFixed(1) : '95.0'

    return { total, active, avgLead, onTimeRate }
  }, [suppliers])

  return (
    <div className="flex flex-col gap-6">
      {/* Page Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Truck className="size-6 text-primary" />
            Supplier Management
          </h1>
          <p className="text-sm text-muted-foreground">
            Maintain supplier master records, manage product mappings, lead times, and track delivery performance.
          </p>
        </div>
        {isAdmin && (
          <Button onClick={() => setIsAddOpen(true)} className="gap-2 shrink-0">
            <Plus className="size-4" />
            Add Supplier
          </Button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Total Suppliers</CardTitle>
            <Truck className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.total}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {metrics.active} active partners
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Average Lead Time</CardTitle>
            <Clock className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.avgLead} Days</div>
            <p className="text-xs text-muted-foreground mt-1">Across all active suppliers</p>
          </CardContent>
        </Card>

        <Card className="shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">On-Time Fulfillment</CardTitle>
            <CheckCircle2 className="size-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {metrics.onTimeRate}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">Historical delivery compliance</p>
          </CardContent>
        </Card>

        <Card className="shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Procurement Status</CardTitle>
            <ShieldCheck className="size-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">Ready</div>
            <p className="text-xs text-muted-foreground mt-1">M:N mappings synced for PO generation</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <Card className="shadow-xs">
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search by supplier name, code, contact or city..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-8"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground whitespace-nowrap">Filter Status:</Label>
              <Select
                value={statusFilter}
                onValueChange={(val) => setStatusFilter(val as typeof statusFilter)}
              >
                <SelectTrigger className="w-[130px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Suppliers Table */}
      <Card className="shadow-xs">
        <CardHeader>
          <CardTitle>Supplier Directory</CardTitle>
          <CardDescription>
            Master records and lead times used in automated purchase order replenishment.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
              <Loader2 className="size-8 animate-spin text-primary" />
              <p>Loading suppliers...</p>
            </div>
          ) : suppliers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
              <Truck className="size-12 stroke-1" />
              <div className="text-center">
                <p className="font-medium text-foreground">No suppliers found</p>
                <p className="text-xs text-muted-foreground">
                  {searchTerm ? 'Try adjusting your search criteria' : 'Get started by creating your first supplier'}
                </p>
              </div>
              {isAdmin && !searchTerm && (
                <Button onClick={() => setIsAddOpen(true)} size="sm" className="mt-2 gap-2">
                  <Plus className="size-4" />
                  Add Supplier
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Base Lead Time</TableHead>
                    <TableHead>On-Time Delivery</TableHead>
                    <TableHead>Total POs</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {suppliers.map((supplier) => {
                    const onTimePct =
                      supplier.total_pos > 0
                        ? Math.round((supplier.on_time_deliveries / supplier.total_pos) * 100)
                        : 100

                    return (
                      <TableRow key={supplier.id} className="hover:bg-muted/40 transition-colors">
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium text-foreground">{supplier.name}</span>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              {supplier.code && (
                                <span className="font-mono bg-muted px-1.5 py-0.5 rounded text-[11px]">
                                  {supplier.code}
                                </span>
                              )}
                              {supplier.city && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="size-3" />
                                  {supplier.city}
                                </span>
                              )}
                            </div>
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="flex flex-col text-xs text-muted-foreground">
                            {supplier.contact_person && (
                              <span className="font-medium text-foreground">{supplier.contact_person}</span>
                            )}
                            {supplier.phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="size-3" /> {supplier.phone}
                              </span>
                            )}
                            {supplier.email && (
                              <span className="flex items-center gap-1">
                                <Mail className="size-3" /> {supplier.email}
                              </span>
                            )}
                          </div>
                        </TableCell>

                        <TableCell>
                          <Badge variant="outline" className="gap-1.5 font-normal">
                            <Clock className="size-3 text-muted-foreground" />
                            {supplier.lead_time_days} days
                          </Badge>
                        </TableCell>

                        <TableCell>
                          <div className="flex flex-col gap-1 w-28">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-medium">{onTimePct}%</span>
                              <span className="text-[10px] text-muted-foreground">
                                {supplier.on_time_deliveries}/{supplier.total_pos}
                              </span>
                            </div>
                            <Progress
                              value={onTimePct}
                              className={`h-1.5 ${
                                onTimePct >= 90
                                  ? '[&>div]:bg-emerald-500'
                                  : onTimePct >= 75
                                    ? '[&>div]:bg-amber-500'
                                    : '[&>div]:bg-rose-500'
                              }`}
                            />
                          </div>
                        </TableCell>

                        <TableCell>
                          <span className="font-mono text-xs">{supplier.total_pos}</span>
                        </TableCell>

                        <TableCell>
                          <Badge
                            variant={supplier.status === 'active' ? 'default' : 'outline'}
                            className={
                              supplier.status === 'active'
                                ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/20'
                                : ''
                            }
                          >
                            {supplier.status}
                          </Badge>
                        </TableCell>

                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              title="Product Mappings"
                              onClick={() => setMappingSupplier(supplier)}
                              className="size-8 p-0"
                            >
                              <Layers className="size-4 text-muted-foreground hover:text-foreground" />
                            </Button>

                            <Button
                              variant="ghost"
                              size="sm"
                              title="Performance Analytics"
                              onClick={() => setPerformanceSupplier(supplier)}
                              className="size-8 p-0"
                            >
                              <TrendingUp className="size-4 text-muted-foreground hover:text-foreground" />
                            </Button>

                            {isAdmin && (
                              <Button
                                variant="ghost"
                                size="sm"
                                title="Edit Supplier"
                                onClick={() => setEditingSupplier(supplier)}
                                className="size-8 p-0"
                              >
                                <Edit2 className="size-4 text-muted-foreground hover:text-foreground" />
                              </Button>
                            )}
                          </div>
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

      {/* Dialogs */}
      <SupplierFormDialog
        open={isAddOpen}
        onOpenChange={setIsAddOpen}
        title="Add New Supplier"
        description="Register a new vendor master record with default lead times."
      />

      {editingSupplier && (
        <SupplierFormDialog
          open={Boolean(editingSupplier)}
          onOpenChange={(open) => !open && setEditingSupplier(null)}
          initialData={editingSupplier}
          title={`Edit ${editingSupplier.name}`}
          description="Update contact, payment terms, and lead time information."
        />
      )}

      {mappingSupplier && (
        <SupplierProductMappingDialog
          supplier={mappingSupplier}
          open={Boolean(mappingSupplier)}
          onOpenChange={(open) => !open && setMappingSupplier(null)}
        />
      )}

      {performanceSupplier && (
        <SupplierPerformanceDialog
          supplier={performanceSupplier}
          open={Boolean(performanceSupplier)}
          onOpenChange={(open) => !open && setPerformanceSupplier(null)}
        />
      )}
    </div>
  )
}

// -----------------------------------------------------------------------------
// Component: Create / Edit Supplier Dialog
// -----------------------------------------------------------------------------
interface SupplierFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialData?: Supplier
  title: string
  description: string
}

function SupplierFormDialog({
  open,
  onOpenChange,
  initialData,
  title,
  description,
}: SupplierFormDialogProps) {
  const isEdit = Boolean(initialData)
  const createMutation = useCreateSupplier()
  const updateMutation = useUpdateSupplier()
  const deleteMutation = useDeleteSupplier()

  const [name, setName] = useState(initialData?.name || '')
  const [code, setCode] = useState(initialData?.code || '')
  const [contactPerson, setContactPerson] = useState(initialData?.contact_person || '')
  const [phone, setPhone] = useState(initialData?.phone || '')
  const [email, setEmail] = useState(initialData?.email || '')
  const [address, setAddress] = useState(initialData?.address || '')
  const [city, setCity] = useState(initialData?.city || '')
  const [leadTimeDays, setLeadTimeDays] = useState(String(initialData?.lead_time_days || 7))
  const [paymentTerms, setPaymentTerms] = useState(initialData?.payment_terms || 'Net 30')
  const [creditLimit, setCreditLimit] = useState(initialData?.credit_limit ? String(initialData.credit_limit) : '')
  const [status, setStatus] = useState<'active' | 'archived'>(initialData?.status || 'active')
  const [notes, setNotes] = useState(initialData?.notes || '')

  const isPending = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim()) {
      toast.error('Supplier name is required')
      return
    }

    const leadDays = parseInt(leadTimeDays, 10)
    if (isNaN(leadDays) || leadDays <= 0) {
      toast.error('Lead time must be at least 1 day')
      return
    }

    try {
      if (isEdit && initialData) {
        await updateMutation.mutateAsync({
          id: initialData.id,
          name: name.trim(),
          code: code.trim() || undefined,
          contact_person: contactPerson.trim() || undefined,
          phone: phone.trim() || undefined,
          email: email.trim() || undefined,
          address: address.trim() || undefined,
          city: city.trim() || undefined,
          lead_time_days: leadDays,
          payment_terms: paymentTerms.trim() || undefined,
          credit_limit: creditLimit ? parseFloat(creditLimit) : null,
          status,
          notes: notes.trim() || undefined,
        })
        toast.success('Supplier updated successfully')
      } else {
        await createMutation.mutateAsync({
          name: name.trim(),
          code: code.trim() || undefined,
          contact_person: contactPerson.trim() || undefined,
          phone: phone.trim() || undefined,
          email: email.trim() || undefined,
          address: address.trim() || undefined,
          city: city.trim() || undefined,
          lead_time_days: leadDays,
          payment_terms: paymentTerms.trim() || undefined,
          credit_limit: creditLimit ? parseFloat(creditLimit) : null,
          status,
          notes: notes.trim() || undefined,
        })
        toast.success('Supplier created successfully')
      }
      onOpenChange(false)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save supplier'
      toast.error(msg)
    }
  }

  const handleArchive = async () => {
    if (!initialData) return
    if (!confirm(`Are you sure you want to archive ${initialData.name}?`)) return

    try {
      await deleteMutation.mutateAsync(initialData.id)
      toast.success('Supplier archived')
      onOpenChange(false)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to archive supplier'
      toast.error(msg)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">
                Company Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                placeholder="e.g. Apex Tech Distributors"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="code">Supplier Code</Label>
              <Input
                id="code"
                placeholder="e.g. SUP-APEX (auto if blank)"
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="contact">Contact Person</Label>
              <Input
                id="contact"
                placeholder="Key account manager"
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                placeholder="+91 98000 00000"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="orders@supplier.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="leadTime">
                Default Lead Time (Days) <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="leadTime"
                  type="number"
                  min="1"
                  max="180"
                  value={leadTimeDays}
                  onChange={(e) => setLeadTimeDays(e.target.value)}
                  required
                />
                <Clock className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="city">City / Region</Label>
              <Input
                id="city"
                placeholder="e.g. Mumbai"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="status">Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="paymentTerms">Payment Terms</Label>
              <Input
                id="paymentTerms"
                placeholder="e.g. Net 30, Advance"
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="creditLimit">Credit Limit (₹)</Label>
              <Input
                id="creditLimit"
                type="number"
                min="0"
                step="1000"
                placeholder="e.g. 500000"
                value={creditLimit}
                onChange={(e) => setCreditLimit(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="address">Physical Address</Label>
            <Input
              id="address"
              placeholder="Warehouse / facility address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes">Procurement Notes</Label>
            <Textarea
              id="notes"
              placeholder="Special instructions, delivery dock details, minimum order notes..."
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <DialogFooter className="flex items-center justify-between sm:justify-between pt-4 border-t">
            {isEdit && (
              <Button
                type="button"
                variant="outline"
                onClick={handleArchive}
                disabled={isPending}
                className="text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="size-4 mr-1" />
                Archive
              </Button>
            )}
            <div className="flex gap-2 ml-auto">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="size-4 animate-spin mr-2" />}
                {isEdit ? 'Save Changes' : 'Create Supplier'}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// -----------------------------------------------------------------------------
// Component: Product Mapping Dialog (M:N with preferred flag and lead times)
// -----------------------------------------------------------------------------
interface SupplierProductMappingDialogProps {
  supplier: Supplier
  open: boolean
  onOpenChange: (open: boolean) => void
}

function SupplierProductMappingDialog({
  supplier,
  open,
  onOpenChange,
}: SupplierProductMappingDialogProps) {
  const { data: productsData, isLoading } = useSupplierProducts(supplier.id)
  const { data: catalogData } = useProducts()
  const mapMutation = useMapSupplierProduct()
  const updateMutation = useUpdateSupplierProduct()
  const unmapMutation = useUnmapSupplierProduct()

  const mappedProducts = useMemo(() => productsData?.products ?? [], [productsData])
  const catalogProducts = useMemo(() => catalogData?.products ?? [], [catalogData])

  // Add mapping form state
  const [selectedProductId, setSelectedProductId] = useState('')
  const [unitCost, setUnitCost] = useState('')
  const [leadTimeOverride, setLeadTimeOverride] = useState('')
  const [isPreferred, setIsPreferred] = useState(false)

  // Filter catalog to unmapped products
  const unmappedCatalog = useMemo(() => {
    const mappedIds = new Set(mappedProducts.map((m) => m.product_id))
    return catalogProducts.filter((p) => !mappedIds.has(p.id))
  }, [catalogProducts, mappedProducts])

  const handleAddMapping = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedProductId) {
      toast.error('Please select a product to map')
      return
    }

    try {
      await mapMutation.mutateAsync({
        supplier_id: supplier.id,
        product_id: selectedProductId,
        unit_cost: unitCost ? parseFloat(unitCost) : null,
        lead_time_override: leadTimeOverride ? parseInt(leadTimeOverride, 10) : null,
        is_preferred: isPreferred,
      })
      toast.success('Product mapped successfully')
      setSelectedProductId('')
      setUnitCost('')
      setLeadTimeOverride('')
      setIsPreferred(false)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to map product'
      toast.error(msg)
    }
  }

  const handleTogglePreferred = async (mapping: SupplierProductMapping) => {
    try {
      await updateMutation.mutateAsync({
        supplier_id: supplier.id,
        product_id: mapping.product_id,
        is_preferred: !mapping.is_preferred,
      })
      toast.success(
        !mapping.is_preferred
          ? 'Set as preferred supplier for this product'
          : 'Removed preferred status',
      )
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update preferred status'
      toast.error(msg)
    }
  }

  const handleUnmap = async (productId: string) => {
    if (!confirm('Are you sure you want to remove this product mapping?')) return

    try {
      await unmapMutation.mutateAsync({
        supplier_id: supplier.id,
        product_id: productId,
      })
      toast.success('Product unmapped')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to unmap product'
      toast.error(msg)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layers className="size-5 text-primary" />
            Product Catalog Mappings — {supplier.name}
          </DialogTitle>
          <DialogDescription>
            Map products to this supplier with negotiated unit costs and custom lead-time overrides.
            Mark as <strong>Preferred</strong> to enable deterministic auto-ordering.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* Map New Product Section */}
          <Card className="bg-muted/40 border-dashed">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Plus className="size-4 text-primary" />
                Map New Product
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddMapping} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                <div className="sm:col-span-4 space-y-1">
                  <Label className="text-xs">Product</Label>
                  <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                    <SelectTrigger className="text-xs">
                      <SelectValue placeholder="Select product..." />
                    </SelectTrigger>
                    <SelectContent>
                      {unmappedCatalog.map((p) => (
                        <SelectItem key={p.id} value={p.id} className="text-xs">
                          {p.name} ({p.sku_code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="sm:col-span-3 space-y-1">
                  <Label className="text-xs">Unit Cost (₹)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="e.g. 120.00"
                    className="text-xs"
                    value={unitCost}
                    onChange={(e) => setUnitCost(e.target.value)}
                  />
                </div>

                <div className="sm:col-span-3 space-y-1">
                  <Label className="text-xs">Lead Time Override</Label>
                  <Input
                    type="number"
                    min="1"
                    placeholder={`Def: ${supplier.lead_time_days}d`}
                    className="text-xs"
                    value={leadTimeOverride}
                    onChange={(e) => setLeadTimeOverride(e.target.value)}
                  />
                </div>

                <div className="sm:col-span-2">
                  <Button type="submit" size="sm" className="w-full text-xs gap-1" disabled={mapMutation.isPending}>
                    {mapMutation.isPending ? <Loader2 className="size-3 animate-spin" /> : <Plus className="size-3" />}
                    Add
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Currently Mapped Products List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">
                Mapped Products ({mappedProducts.length})
              </h3>
              <span className="text-xs text-muted-foreground">
                Base supplier lead time: <strong>{supplier.lead_time_days} days</strong>
              </span>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground gap-2">
                <Loader2 className="size-5 animate-spin text-primary" />
                <span className="text-sm">Loading mappings...</span>
              </div>
            ) : mappedProducts.length === 0 ? (
              <div className="text-center py-8 border rounded-lg border-dashed text-muted-foreground text-sm">
                No products mapped yet. Use the form above to add products.
              </div>
            ) : (
              <div className="border rounded-md overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead>Product</TableHead>
                      <TableHead>Unit Cost</TableHead>
                      <TableHead>Effective Lead Time</TableHead>
                      <TableHead>Preferred</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mappedProducts.map((item) => (
                      <TableRow key={item.product_id}>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium text-xs text-foreground">
                              {item.product_name || 'Product ' + item.product_id.slice(0, 6)}
                            </span>
                            <span className="font-mono text-[11px] text-muted-foreground">
                              {item.sku_code || 'SKU-N/A'} {item.category ? `• ${item.category}` : ''}
                            </span>
                          </div>
                        </TableCell>

                        <TableCell className="text-xs font-mono">
                          {currency(item.unit_cost)}
                        </TableCell>

                        <TableCell>
                          {item.lead_time_override ? (
                            <Badge variant="secondary" className="gap-1 text-[11px] font-mono">
                              <Clock className="size-3 text-primary" />
                              {item.lead_time_override} days (override)
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              {supplier.lead_time_days} days (default)
                            </span>
                          )}
                        </TableCell>

                        <TableCell>
                          <button
                            type="button"
                            onClick={() => handleTogglePreferred(item)}
                            className="flex items-center gap-1 text-xs cursor-pointer hover:opacity-80 transition-opacity"
                          >
                            <Star
                              className={`size-4 ${
                                item.is_preferred
                                  ? 'fill-amber-400 text-amber-500'
                                  : 'text-muted-foreground'
                              }`}
                            />
                            <span className={item.is_preferred ? 'font-semibold text-amber-600 dark:text-amber-400' : 'text-muted-foreground'}>
                              {item.is_preferred ? 'Preferred' : 'Secondary'}
                            </span>
                          </button>
                        </TableCell>

                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleUnmap(item.product_id)}
                            className="size-7 p-0 text-muted-foreground hover:text-destructive"
                            title="Remove mapping"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// -----------------------------------------------------------------------------
// Component: Supplier Performance Analytics Dialog
// -----------------------------------------------------------------------------
interface SupplierPerformanceDialogProps {
  supplier: Supplier
  open: boolean
  onOpenChange: (open: boolean) => void
}

function SupplierPerformanceDialog({
  supplier,
  open,
  onOpenChange,
}: SupplierPerformanceDialogProps) {
  const { data, isLoading } = useSupplierPerformance(supplier.id)
  const perf = data?.performance

  const ratingColor = (rating?: string) => {
    switch (rating) {
      case 'excellent':
        return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/20'
      case 'good':
        return 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/20'
      case 'fair':
        return 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/20'
      case 'poor':
        return 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/20'
      default:
        return 'bg-muted text-muted-foreground'
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="size-5 text-primary" />
            Performance Tracking — {supplier.name}
          </DialogTitle>
          <DialogDescription>
            Historical fulfillment accuracy, delivery lead-time deviations, and supplier scorecard.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
            <Loader2 className="size-6 animate-spin text-primary" />
            <p className="text-sm">Calculating performance metrics...</p>
          </div>
        ) : perf ? (
          <div className="space-y-5 py-2">
            {/* Scorecard Overview */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="border rounded-lg p-3 bg-muted/20">
                <span className="text-[11px] text-muted-foreground uppercase font-medium">Rating</span>
                <div className="mt-1">
                  <Badge className={`${ratingColor(perf.rating)} uppercase text-[11px] font-semibold`}>
                    {perf.rating}
                  </Badge>
                </div>
              </div>

              <div className="border rounded-lg p-3 bg-muted/20">
                <span className="text-[11px] text-muted-foreground uppercase font-medium">On-Time Rate</span>
                <div className="text-xl font-bold mt-1 text-emerald-600 dark:text-emerald-400">
                  {perf.on_time_percentage}%
                </div>
              </div>

              <div className="border rounded-lg p-3 bg-muted/20">
                <span className="text-[11px] text-muted-foreground uppercase font-medium">Avg Lead Time</span>
                <div className="text-xl font-bold mt-1">
                  {perf.avg_lead_time_days ? `${perf.avg_lead_time_days}d` : `${perf.effective_lead_time_days}d`}
                </div>
              </div>

              <div className="border rounded-lg p-3 bg-muted/20">
                <span className="text-[11px] text-muted-foreground uppercase font-medium">Total Orders</span>
                <div className="text-xl font-bold mt-1">{perf.total_pos}</div>
              </div>
            </div>

            {/* Lead Time Comparison Bar */}
            <Card className="bg-muted/30">
              <CardContent className="pt-4 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Promised Base Lead Time</span>
                  <span className="font-semibold">{supplier.lead_time_days} Days</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Effective Historical Average</span>
                  <span className="font-semibold">
                    {perf.effective_lead_time_days ?? supplier.lead_time_days} Days
                  </span>
                </div>
                <Progress
                  value={Math.min(
                    100,
                    (supplier.lead_time_days / (perf.effective_lead_time_days || supplier.lead_time_days || 1)) * 100,
                  )}
                  className="h-2"
                />
                <p className="text-[11px] text-muted-foreground mt-1">
                  {(perf.effective_lead_time_days ?? supplier.lead_time_days) <= supplier.lead_time_days
                    ? '✓ Supplier delivers on or ahead of contracted lead times.'
                    : '⚠️ Deliveries average slightly longer than base lead time. Procurement system accounts for this buffer.'}
                </p>
              </CardContent>
            </Card>

            {/* Recent Deliveries Log */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Recent Purchase Order Deliveries
              </h4>
              {perf.recent_deliveries && perf.recent_deliveries.length > 0 ? (
                <div className="border rounded-md overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30 text-xs">
                        <TableHead>PO Number</TableHead>
                        <TableHead>Order Date</TableHead>
                        <TableHead>Promised Date</TableHead>
                        <TableHead>Received</TableHead>
                        <TableHead className="text-right">Result</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {perf.recent_deliveries.map((d: { po_id: string; po_number: string; order_date: string; expected_date: string; received_date: string | null; is_on_time: boolean }) => (
                        <TableRow key={d.po_id} className="text-xs">
                          <TableCell className="font-mono font-medium">{d.po_number}</TableCell>
                          <TableCell>{new Date(d.order_date).toLocaleDateString()}</TableCell>
                          <TableCell>{new Date(d.expected_date).toLocaleDateString()}</TableCell>
                          <TableCell>
                            {d.received_date ? new Date(d.received_date).toLocaleDateString() : 'Pending'}
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge
                              variant={d.is_on_time ? 'default' : 'destructive'}
                              className={`text-[10px] ${
                                d.is_on_time
                                  ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/20'
                                  : ''
                              }`}
                            >
                              {d.is_on_time ? 'On-Time' : 'Delayed'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground text-center py-4 border rounded border-dashed">
                  No historical delivery logs recorded yet.
                </p>
              )}
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground py-8 text-center">No performance data available.</p>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
