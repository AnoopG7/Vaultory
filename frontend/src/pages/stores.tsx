import { useMemo, useState } from 'react'
import {
  Store as StoreIcon,
  Warehouse,
  Plus,
  Search,
  Users,
  Package,
  MapPin,
  Phone,
  Mail,
  Edit2,
  Eye,
  CheckCircle2,
  XCircle,
  Star,
  Building2,
  X,
  Loader2,
} from 'lucide-react'
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
  useStoresList,
  useStoreDetail,
  useCreateStore,
  useUpdateStore,
  useLocationsList,
  useUpdateLocation,
} from '@/hooks'
import type { Store, Location } from '@/lib/types'

const currency = (n: number | null | undefined) => (n != null ? `₹${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—')

export default function StoresPage() {
  const user = useAuthStore((s) => s.user)
  const isAdmin = user?.role === 'admin'

  // Active Tab: 'all' | 'stores' | 'warehouses'
  const [activeTab, setActiveTab] = useState<'all' | 'stores' | 'warehouses'>('all')

  // Search Filter States
  const [allSearch, setAllSearch] = useState('')
  const [storeSearch, setStoreSearch] = useState('')
  const [warehouseSearch, setWarehouseSearch] = useState('')

  // Modals state
  const [isAddStoreOpen, setIsAddStoreOpen] = useState(false)
  const [editingStore, setEditingStore] = useState<Store | null>(null)
  const [viewingStoreId, setViewingStoreId] = useState<string | null>(null)
  const [editingLocation, setEditingLocation] = useState<Location | null>(null)

  // API Queries & Mutations (fetch full collections; client-side instant search for smooth tab counts)
  const { data: storesData, isLoading: isLoadingStores } = useStoresList()
  const { data: locationsData, isLoading: isLoadingLocations } = useLocationsList()

  const { data: storeDetailData, isLoading: isLoadingDetail } = useStoreDetail(viewingStoreId ?? undefined)

  const createStoreMutation = useCreateStore()
  const updateStoreMutation = useUpdateStore()
  const updateLocationMutation = useUpdateLocation()

  const stores = useMemo(() => storesData?.stores ?? [], [storesData])
  const allLocations = useMemo(() => locationsData?.locations ?? [], [locationsData])
  const warehouses = useMemo(() => allLocations.filter((l) => l.type === 'warehouse'), [allLocations])

  // Filtered stores by storeSearch
  const filteredStores = useMemo(() => {
    if (!storeSearch.trim()) return stores
    const q = storeSearch.toLowerCase().trim()
    return stores.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.code.toLowerCase().includes(q) ||
        (s.city && s.city.toLowerCase().includes(q)) ||
        (s.address && s.address.toLowerCase().includes(q)),
    )
  }, [stores, storeSearch])

  // Filtered all locations by allSearch
  const filteredAllLocations = useMemo(() => {
    if (!allSearch.trim()) return allLocations
    const q = allSearch.toLowerCase().trim()
    return allLocations.filter(
      (l) =>
        l.name.toLowerCase().includes(q) ||
        l.code.toLowerCase().includes(q) ||
        (l.city && l.city.toLowerCase().includes(q)) ||
        (l.address && l.address.toLowerCase().includes(q)) ||
        (l.store_name && l.store_name.toLowerCase().includes(q)),
    )
  }, [allLocations, allSearch])

  // Filtered warehouses by warehouseSearch
  const filteredWarehouses = useMemo(() => {
    if (!warehouseSearch.trim()) return warehouses
    const q = warehouseSearch.toLowerCase().trim()
    return warehouses.filter(
      (w) =>
        w.name.toLowerCase().includes(q) ||
        w.code.toLowerCase().includes(q) ||
        (w.city && w.city.toLowerCase().includes(q)) ||
        (w.address && w.address.toLowerCase().includes(q)),
    )
  }, [warehouses, warehouseSearch])

  // KPI Calculations
  const metrics = useMemo(() => {
    const totalStores = stores.length
    const activeStores = stores.filter((s) => s.status === 'active').length
    const totalWarehouses = warehouses.length
    const defaultWarehouse = warehouses.find((l) => l.is_default)
    const totalStaff = stores.reduce((acc, s) => acc + (s.staff_count ?? 0), 0)
    const totalUnits = stores.reduce((acc, s) => acc + (s.total_inventory_units ?? 0), 0)

    return {
      totalStores,
      activeStores,
      totalWarehouses,
      defaultWarehouseName: defaultWarehouse?.name ?? 'None Designated',
      totalStaff,
      totalUnits,
    }
  }, [stores, warehouses])

  // New Store Form State
  const [newStoreForm, setNewStoreForm] = useState({
    name: '',
    code: '',
    city: '',
    state: 'MH',
    address: '',
    phone: '',
    email: '',
    status: 'active' as 'active' | 'archived',
  })

  // Edit Store Form State
  const [editStoreForm, setEditStoreForm] = useState({
    name: '',
    code: '',
    city: '',
    state: '',
    address: '',
    phone: '',
    email: '',
    status: 'active' as 'active' | 'archived',
  })

  // Edit Location Form State
  const [editLocationForm, setEditLocationForm] = useState({
    name: '',
    city: '',
    address: '',
    phone: '',
    email: '',
    isDefault: false,
    status: 'active' as 'active' | 'archived',
  })

  const handleOpenAddStore = () => {
    setNewStoreForm({
      name: '',
      code: '',
      city: 'Mumbai',
      state: 'MH',
      address: '',
      phone: '',
      email: '',
      status: 'active',
    })
    setIsAddStoreOpen(true)
  }

  const handleOpenEditStore = (store: Store) => {
    setEditingStore(store)
    setEditStoreForm({
      name: store.name,
      code: store.code,
      city: store.city ?? '',
      state: store.state ?? '',
      address: store.address ?? '',
      phone: store.phone ?? '',
      email: store.email ?? '',
      status: store.status as 'active' | 'archived',
    })
  }

  const handleOpenEditLocation = (loc: Location) => {
    setEditingLocation(loc)
    setEditLocationForm({
      name: loc.name,
      city: loc.city ?? '',
      address: loc.address ?? '',
      phone: loc.phone ?? '',
      email: loc.email ?? '',
      isDefault: loc.is_default,
      status: loc.status as 'active' | 'archived',
    })
  }

  const handleCreateStoreSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newStoreForm.name.trim() || !newStoreForm.code.trim()) return

    await createStoreMutation.mutateAsync({
      name: newStoreForm.name.trim(),
      code: newStoreForm.code.trim().toUpperCase(),
      city: newStoreForm.city.trim() || undefined,
      state: newStoreForm.state.trim() || undefined,
      address: newStoreForm.address.trim() || undefined,
      phone: newStoreForm.phone.trim() || undefined,
      email: newStoreForm.email.trim() ? newStoreForm.email.trim() : null,
      status: newStoreForm.status,
    })

    setIsAddStoreOpen(false)
  }

  const handleUpdateStoreSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingStore) return

    await updateStoreMutation.mutateAsync({
      id: editingStore.id,
      name: editStoreForm.name.trim(),
      code: editStoreForm.code.trim().toUpperCase(),
      city: editStoreForm.city.trim() || undefined,
      state: editStoreForm.state.trim() || undefined,
      address: editStoreForm.address.trim() || undefined,
      phone: editStoreForm.phone.trim() || undefined,
      email: editStoreForm.email.trim() ? editStoreForm.email.trim() : null,
      status: editStoreForm.status,
    })

    setEditingStore(null)
  }

  const handleToggleStoreStatus = async (store: Store) => {
    const nextStatus: 'active' | 'archived' = store.status === 'active' ? 'archived' : 'active'
    await updateStoreMutation.mutateAsync({
      id: store.id,
      status: nextStatus,
    })
  }

  const handleUpdateLocationSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingLocation) return

    await updateLocationMutation.mutateAsync({
      id: editingLocation.id,
      name: editLocationForm.name.trim(),
      city: editLocationForm.city.trim() || undefined,
      address: editLocationForm.address.trim() || undefined,
      phone: editLocationForm.phone.trim() || undefined,
      email: editLocationForm.email.trim() ? editLocationForm.email.trim() : null,
      isDefault: editLocationForm.isDefault,
      status: editLocationForm.status,
    })

    setEditingLocation(null)
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Page Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2 text-foreground">
            <StoreIcon className="size-6 text-primary" />
            Stores & Locations
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage retail branch stores, physical inventory locations, warehouse storage, and branch personnel.
          </p>
        </div>
        {isAdmin && (
          <Button onClick={handleOpenAddStore} className="gap-2 shrink-0">
            <Plus className="size-4" />
            Add Store
          </Button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Retail Stores */}
        <Card className="shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Retail Stores</CardTitle>
            <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <StoreIcon className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{metrics.totalStores} Stores</div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
              <span className="inline-block size-2 rounded-full bg-emerald-500" />
              {metrics.activeStores} active branches
            </p>
          </CardContent>
        </Card>

        {/* Card 2: Warehouses */}
        <Card className="shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Central Storage</CardTitle>
            <div className="size-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Warehouse className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {metrics.totalWarehouses} {metrics.totalWarehouses === 1 ? 'Warehouse' : 'Warehouses'}
            </div>
            <p className="text-xs text-muted-foreground mt-1 truncate" title={metrics.defaultWarehouseName}>
              Default: <span className="font-medium text-foreground">{metrics.defaultWarehouseName}</span>
            </p>
          </CardContent>
        </Card>

        {/* Card 3: Staff Coverage */}
        <Card className="shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Staff Coverage</CardTitle>
            <div className="size-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Users className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{metrics.totalStaff} Personnel</div>
            <p className="text-xs text-muted-foreground mt-1">Assigned across retail branches</p>
          </CardContent>
        </Card>

        {/* Card 4: Inventory Units */}
        <Card className="shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Retail Stock Units</CardTitle>
            <div className="size-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Package className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {metrics.totalUnits.toLocaleString('en-IN')} Units
            </div>
            <p className="text-xs text-muted-foreground mt-1">Combined on-hand stock across stores</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs Navigation */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as 'all' | 'stores' | 'warehouses')}
        className="w-full"
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-3">
          <TabsList className="bg-muted">
            <TabsTrigger value="all" className="flex items-center gap-2">
              <Building2 className="size-4" />
              All ({allLocations.length})
            </TabsTrigger>
            <TabsTrigger value="stores" className="flex items-center gap-2">
              <StoreIcon className="size-4" />
              Retail Stores ({stores.length})
            </TabsTrigger>
            <TabsTrigger value="warehouses" className="flex items-center gap-2">
              <Warehouse className="size-4" />
              Warehouse ({warehouses.length})
            </TabsTrigger>
          </TabsList>
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: ALL LOCATIONS & WAREHOUSES */}
        {/* ========================================================================= */}
        <TabsContent value="all" className="mt-4 flex flex-col gap-4">
          {/* Filters - Search Only (No Dropdowns) */}
          <Card className="shadow-xs">
            <CardContent className="p-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    placeholder="Search all locations by name, code, city, address..."
                    value={allSearch}
                    onChange={(e) => setAllSearch(e.target.value)}
                    className="pl-9 pr-8"
                  />
                  {allSearch && (
                    <button
                      type="button"
                      onClick={() => setAllSearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="size-4" />
                    </button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* All Locations Table */}
          <Card className="shadow-xs overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[130px]">Code</TableHead>
                  <TableHead className="w-[120px]">Type</TableHead>
                  <TableHead>Location Name & Address</TableHead>
                  <TableHead>Linked Store Master</TableHead>
                  <TableHead className="text-center">Role / Default</TableHead>
                  <TableHead className="text-center w-[100px]">Status</TableHead>
                  <TableHead className="text-right w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingLocations ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Loader2 className="size-6 animate-spin text-primary" />
                        <p className="text-sm">Loading all locations...</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredAllLocations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Building2 className="size-8 text-muted-foreground/50" />
                        <p className="text-sm font-medium">No locations found</p>
                        <p className="text-xs">Adjust your search criteria.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAllLocations.map((loc) => (
                    <TableRow key={loc.id} className="hover:bg-muted/40 transition-colors">
                      {/* Code */}
                      <TableCell>
                        <Badge variant="outline" className="font-mono text-xs font-semibold bg-muted/50">
                          {loc.code}
                        </Badge>
                      </TableCell>

                      {/* Type */}
                      <TableCell>
                        {loc.type === 'warehouse' ? (
                          <Badge className="bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30 gap-1 font-normal">
                            <Warehouse className="size-3" />
                            Warehouse
                          </Badge>
                        ) : (
                          <Badge className="bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30 gap-1 font-normal">
                            <StoreIcon className="size-3" />
                            Store
                          </Badge>
                        )}
                      </TableCell>

                      {/* Name & Address */}
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium text-foreground">{loc.name}</span>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                            <MapPin className="size-3 shrink-0" />
                            <span>{loc.address || loc.city || 'No address set'}</span>
                          </div>
                        </div>
                      </TableCell>

                      {/* Linked Store */}
                      <TableCell>
                        {loc.store_name ? (
                          <div className="flex items-center gap-1.5 text-sm text-foreground">
                            <StoreIcon className="size-3.5 text-muted-foreground" />
                            <span>{loc.store_name}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">— (Central Hub)</span>
                        )}
                      </TableCell>

                      {/* Role / Default */}
                      <TableCell className="text-center">
                        {loc.is_default ? (
                          <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30 gap-1 text-xs">
                            <Star className="size-3 fill-amber-500" />
                            Default PO Target
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>

                      {/* Status */}
                      <TableCell className="text-center">
                        {loc.status === 'active' ? (
                          <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30">
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-muted-foreground">
                            Inactive
                          </Badge>
                        )}
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="text-right">
                        {isAdmin && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenEditLocation(loc)}
                            title="Edit Physical Location"
                            className="h-8 px-2 text-muted-foreground hover:text-foreground"
                          >
                            <Edit2 className="size-4" />
                            <span className="sr-only">Edit</span>
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* ========================================================================= */}
        {/* TAB 1: RETAIL STORES */}
        {/* ========================================================================= */}
        <TabsContent value="stores" className="mt-4 flex flex-col gap-4">
          {/* Filters */}
          <Card className="shadow-xs">
            <CardContent className="p-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by store name, code, city, address..."
                    value={storeSearch}
                    onChange={(e) => setStoreSearch(e.target.value)}
                    className="pl-9 pr-8"
                  />
                  {storeSearch && (
                    <button
                      type="button"
                      onClick={() => setStoreSearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="size-4" />
                    </button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stores Table */}
          <Card className="shadow-xs overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[120px]">Code</TableHead>
                  <TableHead>Store & Location</TableHead>
                  <TableHead>Contact Info</TableHead>
                  <TableHead className="text-center">Staff</TableHead>
                  <TableHead className="text-right">Stock On-Hand</TableHead>
                  <TableHead className="text-center w-[100px]">Status</TableHead>
                  <TableHead className="text-right w-[160px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingStores ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Loader2 className="size-6 animate-spin text-primary" />
                        <p className="text-sm">Loading stores catalog...</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredStores.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <StoreIcon className="size-8 text-muted-foreground/50" />
                        <p className="text-sm font-medium">No retail stores found</p>
                        <p className="text-xs">Try adjusting your search criteria or add a new store.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredStores.map((store) => (
                    <TableRow key={store.id} className="hover:bg-muted/40 transition-colors">
                      {/* Code */}
                      <TableCell>
                        <Badge variant="outline" className="font-mono text-xs font-semibold bg-muted/50">
                          {store.code}
                        </Badge>
                      </TableCell>

                      {/* Store Name & Location */}
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium text-foreground">{store.name}</span>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                            <MapPin className="size-3 shrink-0" />
                            <span>
                              {store.address
                                ? store.address
                                : [store.city, store.state].filter(Boolean).join(', ') || 'No address set'}
                            </span>
                          </div>
                        </div>
                      </TableCell>

                      {/* Contact Info */}
                      <TableCell>
                        <div className="flex flex-col gap-0.5 text-xs">
                          {store.phone ? (
                            <div className="flex items-center gap-1.5 text-foreground">
                              <Phone className="size-3 text-muted-foreground shrink-0" />
                              <span>{store.phone}</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                          {store.email && (
                            <div className="flex items-center gap-1.5 text-muted-foreground">
                              <Mail className="size-3 shrink-0" />
                              <span className="truncate max-w-[170px]">{store.email}</span>
                            </div>
                          )}
                        </div>
                      </TableCell>

                      {/* Staff */}
                      <TableCell className="text-center">
                        <Badge
                          variant="secondary"
                          className="font-normal text-xs inline-flex items-center gap-1"
                        >
                          <Users className="size-3" />
                          {store.staff_count ?? 0}
                        </Badge>
                      </TableCell>

                      {/* Stock On Hand */}
                      <TableCell className="text-right">
                        <div className="flex flex-col items-end">
                          <span className="font-medium text-foreground">
                            {(store.total_inventory_units ?? 0).toLocaleString('en-IN')} units
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {store.inventory_item_count ?? 0} SKUs ({currency(store.total_inventory_value)})
                          </span>
                        </div>
                      </TableCell>

                      {/* Status Badge */}
                      <TableCell className="text-center">
                        {store.status === 'active' ? (
                          <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30">
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-muted-foreground">
                            Inactive
                          </Badge>
                        )}
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* View Details */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setViewingStoreId(store.id)}
                            title="View Store Details"
                            className="h-8 px-2 text-muted-foreground hover:text-foreground"
                          >
                            <Eye className="size-4" />
                            <span className="sr-only">View</span>
                          </Button>

                          {/* Edit Store (Admin Only) */}
                          {isAdmin && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenEditStore(store)}
                              title="Edit Store"
                              className="h-8 px-2 text-muted-foreground hover:text-foreground"
                            >
                              <Edit2 className="size-4" />
                              <span className="sr-only">Edit</span>
                            </Button>
                          )}

                          {/* Toggle Status (Admin Only) */}
                          {isAdmin && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleToggleStoreStatus(store)}
                              title={store.status === 'active' ? 'Deactivate Store' : 'Activate Store'}
                              className={`h-8 px-2 ${
                                store.status === 'active'
                                  ? 'text-muted-foreground hover:text-destructive hover:bg-destructive/10'
                                  : 'text-muted-foreground hover:text-emerald-600 hover:bg-emerald-500/10'
                              }`}
                            >
                              {store.status === 'active' ? (
                                <XCircle className="size-4" />
                              ) : (
                                <CheckCircle2 className="size-4" />
                              )}
                              <span className="sr-only">Toggle Status</span>
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* ========================================================================= */}
        {/* TAB 3: WAREHOUSE */}
        {/* ========================================================================= */}
        <TabsContent value="warehouses" className="mt-4 flex flex-col gap-4">
          {/* Filters - Search Only (No Dropdowns) */}
          <Card className="shadow-xs">
            <CardContent className="p-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    placeholder="Search warehouses by name, code, city, address..."
                    value={warehouseSearch}
                    onChange={(e) => setWarehouseSearch(e.target.value)}
                    className="pl-9 pr-8"
                  />
                  {warehouseSearch && (
                    <button
                      type="button"
                      onClick={() => setWarehouseSearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="size-4" />
                    </button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Warehouses Table */}
          <Card className="shadow-xs overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[130px]">Code</TableHead>
                  <TableHead>Warehouse Name & Address</TableHead>
                  <TableHead>Contact Info</TableHead>
                  <TableHead className="text-center">Role / Default</TableHead>
                  <TableHead className="text-center w-[100px]">Status</TableHead>
                  <TableHead className="text-right w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingLocations ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Loader2 className="size-6 animate-spin text-primary" />
                        <p className="text-sm">Loading warehouses...</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredWarehouses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Warehouse className="size-8 text-muted-foreground/50" />
                        <p className="text-sm font-medium">No warehouses found</p>
                        <p className="text-xs">Adjust your search criteria.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredWarehouses.map((wh) => (
                    <TableRow key={wh.id} className="hover:bg-muted/40 transition-colors">
                      {/* Code */}
                      <TableCell>
                        <Badge variant="outline" className="font-mono text-xs font-semibold bg-muted/50">
                          {wh.code}
                        </Badge>
                      </TableCell>

                      {/* Name & Address */}
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium text-foreground">{wh.name}</span>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                            <MapPin className="size-3 shrink-0" />
                            <span>{wh.address || wh.city || 'No address set'}</span>
                          </div>
                        </div>
                      </TableCell>

                      {/* Contact Info */}
                      <TableCell>
                        <div className="flex flex-col gap-0.5 text-xs text-muted-foreground">
                          {wh.phone && (
                            <div className="flex items-center gap-1.5">
                              <Phone className="size-3 shrink-0 text-muted-foreground" />
                              <span>{wh.phone}</span>
                            </div>
                          )}
                          {wh.email && (
                            <div className="flex items-center gap-1.5">
                              <Mail className="size-3 shrink-0 text-muted-foreground" />
                              <span>{wh.email}</span>
                            </div>
                          )}
                          {!wh.phone && !wh.email && <span>—</span>}
                        </div>
                      </TableCell>

                      {/* Role / Default */}
                      <TableCell className="text-center">
                        {wh.is_default ? (
                          <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30 gap-1 text-xs">
                            <Star className="size-3 fill-amber-500" />
                            Default PO Target
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>

                      {/* Status */}
                      <TableCell className="text-center">
                        {wh.status === 'active' ? (
                          <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30">
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-muted-foreground">
                            Inactive
                          </Badge>
                        )}
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="text-right">
                        {isAdmin && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenEditLocation(wh)}
                            title="Edit Physical Location"
                            className="h-8 px-2 text-muted-foreground hover:text-foreground"
                          >
                            <Edit2 className="size-4" />
                            <span className="sr-only">Edit</span>
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ========================================================================= */}
      {/* MODAL 1: ADD STORE (ADMIN ONLY) */}
      {/* ========================================================================= */}
      <Dialog open={isAddStoreOpen} onOpenChange={setIsAddStoreOpen}>
        <DialogContent className="sm:max-w-lg">
          <form onSubmit={handleCreateStoreSubmit}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <StoreIcon className="size-5 text-primary" />
                Add New Retail Store
              </DialogTitle>
              <DialogDescription>
                Create a new business retail store. A corresponding physical storage location will be automatically provisioned in the location master.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="store-name">Store Name *</Label>
                  <Input
                    id="store-name"
                    placeholder="e.g. Store D — Bandra"
                    value={newStoreForm.name}
                    onChange={(e) => setNewStoreForm({ ...newStoreForm, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="store-code">Short Code *</Label>
                  <Input
                    id="store-code"
                    placeholder="e.g. STORE-D"
                    className="font-mono uppercase"
                    value={newStoreForm.code}
                    onChange={(e) => setNewStoreForm({ ...newStoreForm, code: e.target.value.toUpperCase() })}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="store-city">City</Label>
                  <Input
                    id="store-city"
                    placeholder="e.g. Mumbai"
                    value={newStoreForm.city}
                    onChange={(e) => setNewStoreForm({ ...newStoreForm, city: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="store-state">State Code</Label>
                  <Input
                    id="store-state"
                    placeholder="e.g. MH"
                    value={newStoreForm.state}
                    onChange={(e) => setNewStoreForm({ ...newStoreForm, state: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="store-address">Street Address</Label>
                <Textarea
                  id="store-address"
                  placeholder="Complete physical address of the retail store..."
                  rows={2}
                  value={newStoreForm.address}
                  onChange={(e) => setNewStoreForm({ ...newStoreForm, address: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="store-phone">Phone Number</Label>
                  <Input
                    id="store-phone"
                    placeholder="e.g. +91 22 2600 0004"
                    value={newStoreForm.phone}
                    onChange={(e) => setNewStoreForm({ ...newStoreForm, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="store-email">Email Address</Label>
                  <Input
                    id="store-email"
                    type="email"
                    placeholder="e.g. stored@vaultory.app"
                    value={newStoreForm.email}
                    onChange={(e) => setNewStoreForm({ ...newStoreForm, email: e.target.value })}
                  />
                </div>
              </div>

              <div className="p-3 bg-muted/60 rounded-md border text-xs text-muted-foreground flex items-start gap-2">
                <Building2 className="size-4 text-primary shrink-0 mt-0.5" />
                <span>
                  Automatic synchronization: A physical location with code{' '}
                  <span className="font-mono font-medium text-foreground">{newStoreForm.code || 'STORE-CODE'}</span> will be mapped to this store for tracking on-hand inventory and stock movements.
                </span>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAddStoreOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createStoreMutation.isPending}>
                {createStoreMutation.isPending ? 'Creating...' : 'Create Store'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL 2: EDIT STORE (ADMIN ONLY) */}
      {/* ========================================================================= */}
      <Dialog open={Boolean(editingStore)} onOpenChange={(open) => !open && setEditingStore(null)}>
        <DialogContent className="sm:max-w-lg">
          <form onSubmit={handleUpdateStoreSubmit}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Edit2 className="size-5 text-primary" />
                Edit Store Details
              </DialogTitle>
              <DialogDescription>
                Update business parameters and contact details for {editingStore?.name}.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="edit-store-name">Store Name *</Label>
                  <Input
                    id="edit-store-name"
                    value={editStoreForm.name}
                    onChange={(e) => setEditStoreForm({ ...editStoreForm, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-store-code">Short Code *</Label>
                  <Input
                    id="edit-store-code"
                    className="font-mono uppercase"
                    value={editStoreForm.code}
                    onChange={(e) => setEditStoreForm({ ...editStoreForm, code: e.target.value.toUpperCase() })}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="edit-store-city">City</Label>
                  <Input
                    id="edit-store-city"
                    value={editStoreForm.city}
                    onChange={(e) => setEditStoreForm({ ...editStoreForm, city: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-store-state">State Code</Label>
                  <Input
                    id="edit-store-state"
                    value={editStoreForm.state}
                    onChange={(e) => setEditStoreForm({ ...editStoreForm, state: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-store-address">Street Address</Label>
                <Textarea
                  id="edit-store-address"
                  rows={2}
                  value={editStoreForm.address}
                  onChange={(e) => setEditStoreForm({ ...editStoreForm, address: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="edit-store-phone">Phone Number</Label>
                  <Input
                    id="edit-store-phone"
                    value={editStoreForm.phone}
                    onChange={(e) => setEditStoreForm({ ...editStoreForm, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-store-email">Email Address</Label>
                  <Input
                    id="edit-store-email"
                    type="email"
                    value={editStoreForm.email}
                    onChange={(e) => setEditStoreForm({ ...editStoreForm, email: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-store-status">Operational Status</Label>
                <Select
                  value={editStoreForm.status}
                  onValueChange={(val) => setEditStoreForm({ ...editStoreForm, status: val as 'active' | 'archived' })}
                >
                  <SelectTrigger id="edit-store-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active (Open for Transactions)</SelectItem>
                    <SelectItem value="archived">Archived (Transactions Paused)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditingStore(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateStoreMutation.isPending}>
                {updateStoreMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL 3: STORE DETAILS DIALOG */}
      {/* ========================================================================= */}
      <Dialog open={Boolean(viewingStoreId)} onOpenChange={(open) => !open && setViewingStoreId(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="font-mono bg-muted/60 text-xs">
                  {storeDetailData?.store.code}
                </Badge>
                <DialogTitle className="text-xl">
                  {storeDetailData?.store.name ?? 'Store Details'}
                </DialogTitle>
              </div>
              {storeDetailData?.store.status === 'active' ? (
                <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30">
                  Active Branch
                </Badge>
              ) : (
                <Badge variant="secondary">Inactive</Badge>
              )}
            </div>
            <DialogDescription>
              Complete operational record, linked inventory statistics, and assigned personnel roster.
            </DialogDescription>
          </DialogHeader>

          {isLoadingDetail ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="size-6 animate-spin text-primary" />
              <p className="text-sm">Loading store details...</p>
            </div>
          ) : storeDetailData ? (
            <div className="flex flex-col gap-5 py-3">
              {/* Top Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Card className="shadow-xs bg-muted/30">
                  <CardContent className="p-4 space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Location & Address
                    </p>
                    <p className="text-sm font-medium text-foreground">
                      {storeDetailData.store.address || 'No physical street address specified'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      City: {storeDetailData.store.city || '—'} | State: {storeDetailData.store.state || '—'}
                    </p>
                  </CardContent>
                </Card>

                <Card className="shadow-xs bg-muted/30">
                  <CardContent className="p-4 space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Contact Information
                    </p>
                    <p className="text-sm font-medium text-foreground flex items-center gap-2">
                      <Phone className="size-3.5 text-muted-foreground" />
                      {storeDetailData.store.phone || 'No phone registered'}
                    </p>
                    <p className="text-xs text-muted-foreground flex items-center gap-2">
                      <Mail className="size-3.5 text-muted-foreground" />
                      {storeDetailData.store.email || 'No email registered'}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Inventory Summary */}
              <Card className="shadow-xs">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Package className="size-4 text-primary" />
                    Inventory On-Hand Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="p-3 bg-muted/40 rounded-lg">
                      <div className="text-xs text-muted-foreground">Catalog SKUs</div>
                      <div className="text-xl font-bold text-foreground mt-0.5">
                        {storeDetailData.inventory?.item_count ?? 0}
                      </div>
                    </div>
                    <div className="p-3 bg-muted/40 rounded-lg">
                      <div className="text-xs text-muted-foreground">Total Stock Units</div>
                      <div className="text-xl font-bold text-foreground mt-0.5">
                        {(storeDetailData.inventory?.total_units ?? 0).toLocaleString('en-IN')}
                      </div>
                    </div>
                    <div className="p-3 bg-muted/40 rounded-lg">
                      <div className="text-xs text-muted-foreground">Inventory Valuation</div>
                      <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                        {currency(storeDetailData.inventory?.total_value)}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Assigned Staff */}
              <Card className="shadow-xs">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Users className="size-4 text-primary" />
                    Assigned Store Personnel ({storeDetailData.staff?.length ?? 0})
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Staff members mapped to this store for sales, inventory handling, and daily transactions.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  {(!storeDetailData.staff || storeDetailData.staff.length === 0) ? (
                    <div className="py-6 text-center text-xs text-muted-foreground">
                      No staff members currently assigned to this store.
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="text-xs">Name</TableHead>
                          <TableHead className="text-xs">Email</TableHead>
                          <TableHead className="text-xs">Role</TableHead>
                          <TableHead className="text-xs text-right">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {storeDetailData.staff.map((member) => (
                          <TableRow key={member.id} className="hover:bg-muted/30">
                            <TableCell className="font-medium text-xs text-foreground">
                              {member.full_name}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {member.email}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-[10px] capitalize">
                                {member.role.replace('_', ' ')}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Badge
                                variant={member.status === 'active' ? 'secondary' : 'outline'}
                                className="text-[10px]"
                              >
                                {member.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : null}

          <DialogFooter>
            <Button variant="outline" onClick={() => setViewingStoreId(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL 4: EDIT LOCATION (ADMIN ONLY) */}
      {/* ========================================================================= */}
      <Dialog open={Boolean(editingLocation)} onOpenChange={(open) => !open && setEditingLocation(null)}>
        <DialogContent className="sm:max-w-lg">
          <form onSubmit={handleUpdateLocationSubmit}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Building2 className="size-5 text-primary" />
                Edit Physical Location
              </DialogTitle>
              <DialogDescription>
                Configure physical storage attributes for {editingLocation?.name} ({editingLocation?.code}).
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="space-y-1.5">
                <Label htmlFor="loc-name">Location Name *</Label>
                <Input
                  id="loc-name"
                  value={editLocationForm.name}
                  onChange={(e) => setEditLocationForm({ ...editLocationForm, name: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="loc-city">City</Label>
                <Input
                  id="loc-city"
                  value={editLocationForm.city}
                  onChange={(e) => setEditLocationForm({ ...editLocationForm, city: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="loc-address">Physical Address</Label>
                <Textarea
                  id="loc-address"
                  rows={2}
                  value={editLocationForm.address}
                  onChange={(e) => setEditLocationForm({ ...editLocationForm, address: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="loc-phone">Phone</Label>
                  <Input
                    id="loc-phone"
                    value={editLocationForm.phone}
                    onChange={(e) => setEditLocationForm({ ...editLocationForm, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="loc-email">Email</Label>
                  <Input
                    id="loc-email"
                    type="email"
                    value={editLocationForm.email}
                    onChange={(e) => setEditLocationForm({ ...editLocationForm, email: e.target.value })}
                  />
                </div>
              </div>

              {/* If warehouse, show default toggle */}
              {editingLocation?.type === 'warehouse' && (
                <div className="flex items-center justify-between p-3 rounded-md bg-muted/50 border">
                  <div className="space-y-0.5">
                    <Label htmlFor="loc-default" className="text-sm font-medium">
                      Default Warehouse
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Destination for automated AI purchase orders and centralized stock replenishment.
                    </p>
                  </div>
                  <input
                    id="loc-default"
                    type="checkbox"
                    className="size-4 rounded accent-primary cursor-pointer"
                    checked={editLocationForm.isDefault}
                    onChange={(e) => setEditLocationForm({ ...editLocationForm, isDefault: e.target.checked })}
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="loc-status">Operational Status</Label>
                <Select
                  value={editLocationForm.status}
                  onValueChange={(val) => setEditLocationForm({ ...editLocationForm, status: val as 'active' | 'archived' })}
                >
                  <SelectTrigger id="loc-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active (Permit stock movements)</SelectItem>
                    <SelectItem value="archived">Archived (Freeze stock movements)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditingLocation(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateLocationMutation.isPending}>
                {updateLocationMutation.isPending ? 'Saving...' : 'Save Location'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
