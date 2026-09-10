import { useMemo, useState } from 'react'
import {
  Package,
  Plus,
  Search,
  X,
  Edit2,
  Archive,
  Tag,
  Ruler,
  Loader2,
  Layers,
  ChevronRight,
  Sparkles,
  RotateCcw,
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
} from '@/components/ui'
import { useAuthStore } from '@/stores'
import {
  useProducts,
  useCategories,
  useUnits,
  useCreateProduct,
  useUpdateProduct,
  useArchiveProduct,
  useCreateCategory,
  useUpdateCategory,
  useCreateUnit,
  useUpdateUnit,
  type ProductRow,
} from '@/hooks'
import type { Category, Unit } from '@/lib/types'

const currency = (n: number | string | null | undefined) =>
  n == null || n === '••••' ? (n === '••••' ? '••••' : '—') : `₹${Number(n).toFixed(2)}`

/** Derive the `[P]<category>-<seq>` SKU prefix from a (top-level) category name. Mirrors backend. */
function deriveSkuPrefix(categoryName: string): string {
  const clean = categoryName
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.replace(/[^A-Za-z0-9]/g, ''))
    .filter(Boolean)
  if (clean.length === 0) return 'GEN'
  if (clean.length === 1) return clean[0].slice(0, 4).toUpperCase() || 'GEN'
  return (
    clean
      .slice(0, 4)
      .map((w) => w.slice(0, 1))
      .join('')
      .toUpperCase() || 'GEN'
  )
}

interface CategoryNode extends Category {
  children: CategoryNode[]
}

function buildTree(categories: Category[]): CategoryNode[] {
  const nodes = new Map<string, CategoryNode>()
  categories.forEach((c) => nodes.set(c.id, { ...c, children: [] }))
  const roots: CategoryNode[] = []
  categories.forEach((c) => {
    const node = nodes.get(c.id)!
    if (c.parent_id && nodes.has(c.parent_id)) nodes.get(c.parent_id)!.children.push(node)
    else roots.push(node)
  })
  const sort = (n: CategoryNode) => {
    n.children.sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name))
    n.children.forEach(sort)
  }
  roots.sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name))
  roots.forEach(sort)
  return roots
}

/** Flat select options with `Parent / Child` labels and depth info. */
function flattenForSelect(categories: Category[]): Array<{ id: string; label: string; depth: number }> {
  const byId = new Map(categories.map((c) => [c.id, c]))
  const options: Array<{ id: string; label: string; depth: number }> = []
  const walk = (node: CategoryNode, depth: number) => {
    options.push({ id: node.id, label: depth === 0 ? node.name : `${labelOf(node.parent_id)} / ${node.name}`, depth })
    node.children.forEach((child) => walk(child, depth + 1))
  }
  const labelOf = (parentId: string | null) => {
    let cur: Category | undefined = parentId ? byId.get(parentId) : undefined
    while (cur?.parent_id) cur = byId.get(cur.parent_id)
    return cur?.name ?? ''
  }
  buildTree(categories).forEach((root) => walk(root, 0))
  return options
}

/** Resolve the top-level ancestor name for a category (used for SKU suggestion). */
function topLevelName(categoryId: string, categories: Category[]): string {
  const byId = new Map(categories.map((c) => [c.id, c]))
  let cur = byId.get(categoryId)
  let top = cur
  while (cur) {
    top = cur
    cur = cur.parent_id ? byId.get(cur.parent_id) : undefined
  }
  return top?.name ?? ''
}

export default function ProductsPage() {
  const user = useAuthStore((s) => s.user)
  const isAdmin = user?.role === 'admin'

  const [activeTab, setActiveTab] = useState('products')

  // Product filters & pagination
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'archived'>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [limit, setLimit] = useState(10)
  const [offset, setOffset] = useState(0)

  const { data: productsData, isLoading } = useProducts({
    search: searchTerm,
    status: statusFilter,
    categoryId: categoryFilter === 'all' ? undefined : categoryFilter,
    limit,
    offset,
  })
  const { data: categoriesData } = useCategories({ status: 'all' })
  const { data: unitsData } = useUnits({ status: 'all' })
  const archiveMutation = useArchiveProduct()
  const updateUnitMutation = useUpdateUnit()

  const handleReactivateUnit = async (u: Unit) => {
    try {
      await updateUnitMutation.mutateAsync({ id: u.id, status: 'active' })
      toast.success(`${u.name} reactivated`)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to reactivate unit')
    }
  }

  const products = useMemo<ProductRow[]>(() => productsData?.products ?? [], [productsData])
  const categories = useMemo(() => categoriesData?.categories ?? [], [categoriesData])
  const units = useMemo(() => unitsData?.units ?? [], [unitsData])
  const total = productsData?.total ?? products.length

  const page = Math.floor(offset / limit) + 1
  const pageCount = Math.max(1, Math.ceil(total / limit))

  // Dialog state
  const [isAddProductOpen, setIsAddProductOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<ProductRow | null>(null)
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [categoryParent, setCategoryParent] = useState<string | null>(null)
  const [isAddUnitOpen, setIsAddUnitOpen] = useState(false)
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null)

  const activeCount = products.filter((p) => p.status === 'active').length
  const archivedCount = products.filter((p) => p.status === 'archived').length
  const totalVisible = products.length

  const goToPage = (next: number) => {
    setOffset(limit * (next - 1))
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Page Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Package className="size-6 text-primary" />
            Products & Categories
          </h1>
          <p className="text-sm text-muted-foreground">
            Maintain the product master — SKUs, pricing, stock targets, product categories, and units of measure.
          </p>
        </div>
        {isAdmin && activeTab === 'products' && (
          <Button onClick={() => setIsAddProductOpen(true)} className="gap-2 shrink-0">
            <Plus className="size-4" />
            Add Product
          </Button>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="products" className="gap-2">
            <Package className="size-4" /> Products
          </TabsTrigger>
          <TabsTrigger value="categories" className="gap-2">
            <Tag className="size-4" /> Categories
          </TabsTrigger>
          <TabsTrigger value="units" className="gap-2">
            <Ruler className="size-4" /> Units
          </TabsTrigger>
        </TabsList>

        {/* ── Products tab ─────────────────────────────────────────────── */}
        <TabsContent value="products" className="mt-4 space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <Card className="shadow-xs">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium">Total (Filtered)</CardTitle>
                <Package className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalVisible}</div>
                <p className="text-xs text-muted-foreground mt-1">{total} in matching set</p>
              </CardContent>
            </Card>
            <Card className="shadow-xs">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium">Active</CardTitle>
                <Layers className="size-4 text-emerald-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{activeCount}</div>
                <p className="text-xs text-muted-foreground mt-1">Sellable across stores</p>
              </CardContent>
            </Card>
            <Card className="shadow-xs">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium">Archived</CardTitle>
                <Archive className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{archivedCount}</div>
                <p className="text-xs text-muted-foreground mt-1">Kept for history, not sellable</p>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card className="shadow-xs">
            <CardContent className="pt-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by product name or SKU..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value)
                      setOffset(0)
                    }}
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

                <div className="flex flex-wrap items-center gap-2">
                  <Select value={categoryFilter} onValueChange={(v) => { setCategoryFilter(v); setOffset(0) }}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {flattenForSelect(categories).map((opt) => (
                        <SelectItem key={opt.id} value={opt.id} style={{ paddingLeft: 8 + opt.depth * 12 }}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v as typeof statusFilter); setOffset(0) }}>
                    <SelectTrigger className="w-[130px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Products Table */}
          <Card className="shadow-xs">
            <CardHeader>
              <CardTitle>Product Master</CardTitle>
              <CardDescription>
                SKU, pricing, and reorder targets. Cost price is masked for non-admin roles.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
                  <Loader2 className="size-8 animate-spin text-primary" />
                  <p>Loading products...</p>
                </div>
              ) : products.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
                  <Package className="size-12 stroke-1" />
                  <div className="text-center">
                    <p className="font-medium text-foreground">No products found</p>
                    <p className="text-xs text-muted-foreground">
                      {searchTerm ? 'Try adjusting your search criteria' : 'Get started by creating your first product'}
                    </p>
                  </div>
                  {isAdmin && !searchTerm && (
                    <Button onClick={() => setIsAddProductOpen(true)} size="sm" className="mt-2 gap-2">
                      <Plus className="size-4" />
                      Add Product
                    </Button>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Unit</TableHead>
                        <TableHead className="text-right">Cost</TableHead>
                        <TableHead className="text-right">Sale Price</TableHead>
                        <TableHead className="text-right">Target</TableHead>
                        <TableHead className="text-right">Reorder</TableHead>
                        <TableHead className="text-right">Safety</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {products.map((p) => (
                        <TableRow key={p.id} className="hover:bg-muted/40 transition-colors">
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium text-foreground">{p.name}</span>
                              <span className="font-mono text-xs text-muted-foreground">{p.sku_code}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">{p.category_name ?? '—'}</TableCell>
                          <TableCell className="text-sm">{p.unit_name ?? '—'}</TableCell>
                          <TableCell className="text-right font-mono text-sm">{currency(p.cost_price)}</TableCell>
                          <TableCell className="text-right font-mono text-sm">{currency(p.sale_price)}</TableCell>
                          <TableCell className="text-right font-mono text-sm">{p.default_target_level}</TableCell>
                          <TableCell className="text-right font-mono text-sm">{p.default_reorder_point}</TableCell>
                          <TableCell className="text-right font-mono text-sm">{p.default_safety_stock}</TableCell>
                          <TableCell>
                            <Badge
                              variant={p.status === 'active' ? 'default' : 'outline'}
                              className={
                                p.status === 'active'
                                  ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/20'
                                  : ''
                              }
                            >
                              {p.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              {isAdmin && p.status === 'active' && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  title="Edit Product"
                                  onClick={() => setEditingProduct(p)}
                                  className="size-8 p-0"
                                >
                                  <Edit2 className="size-4 text-muted-foreground hover:text-foreground" />
                                </Button>
                              )}
                              {isAdmin && p.status === 'active' && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  title="Archive Product"
                                  onClick={async () => {
                                    if (!confirm(`Archive ${p.name}? It will be excluded from new transactions.`)) return
                                    try {
                                      await archiveMutation.mutateAsync(p.id)
                                      toast.success(`${p.name} archived`)
                                    } catch (err: unknown) {
                                      const msg = err instanceof Error ? err.message : 'Failed to archive product'
                                      toast.error(msg)
                                    }
                                  }}
                                  className="size-8 p-0"
                                >
                                  <Archive className="size-4 text-muted-foreground hover:text-destructive" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* Pagination */}
              <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <span>Rows per page:</span>
                  <Select value={String(limit)} onValueChange={(v) => { setLimit(Number(v)); setOffset(0) }}>
                    <SelectTrigger className="w-[70px] h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[10, 25, 50].map((n) => (
                        <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <span>Page {page} of {pageCount} ({total} total)</span>
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => goToPage(page - 1)}>
                    Previous
                  </Button>
                  <Button variant="outline" size="sm" disabled={page >= pageCount} onClick={() => goToPage(page + 1)}>
                    Next
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Categories tab ────────────────────────────────────────────── */}
        <TabsContent value="categories" className="mt-4 space-y-4">
          <Card className="shadow-xs">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle>Category Hierarchy</CardTitle>
                <CardDescription>
                  Self-referencing tree. Top-level names drive SKU prefixes; deactivated categories are kept for history.
                </CardDescription>
              </div>
              {isAdmin && (
                <Button onClick={() => { setEditingCategory(null); setCategoryParent(null); setIsAddCategoryOpen(true) }} className="gap-2 shrink-0">
                  <Plus className="size-4" />
                  Add Category
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {categories.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3 text-muted-foreground">
                  <Tag className="size-12 stroke-1" />
                  <p className="font-medium text-foreground">No categories yet</p>
                </div>
              ) : (
                <div className="rounded-md border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Category</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Sort Order</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {renderCategoryNodes(buildTree(categories), 0, {
                        isAdmin,
                        onAddSub: (c) => { setEditingCategory(null); setCategoryParent(c.id); setIsAddCategoryOpen(true) },
                        onEdit: (c) => { setCategoryParent(null); setEditingCategory(c); setIsAddCategoryOpen(true) },
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Units tab ─────────────────────────────────────────────────── */}
        <TabsContent value="units" className="mt-4 space-y-4">
          <Card className="shadow-xs">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle>Units of Measure</CardTitle>
                <CardDescription>Standard units assigned to products for stock and pricing.</CardDescription>
              </div>
              {isAdmin && (
                <Button onClick={() => { setEditingUnit(null); setIsAddUnitOpen(true) }} className="gap-2 shrink-0">
                  <Plus className="size-4" />
                  Add Unit
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {units.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3 text-muted-foreground">
                  <Ruler className="size-12 stroke-1" />
                  <p className="font-medium text-foreground">No units yet</p>
                </div>
              ) : (
                <div className="rounded-md border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Unit</TableHead>
                        <TableHead>Abbreviation</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {units.map((u) => (
                        <TableRow key={u.id} className="hover:bg-muted/40 transition-colors">
                          <TableCell className="font-medium text-foreground">{u.name}</TableCell>
                          <TableCell className="font-mono text-sm">{u.abbreviation ?? '—'}</TableCell>
                          <TableCell>
                            <Badge
                              variant={u.status === 'active' ? 'default' : 'outline'}
                              className={
                                u.status === 'active'
                                  ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/20'
                                  : ''
                              }
                            >
                              {u.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {isAdmin && (
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  title="Edit Unit"
                                  onClick={() => { setEditingUnit(u); setIsAddUnitOpen(true) }}
                                  className="size-8 p-0"
                                >
                                  <Edit2 className="size-4 text-muted-foreground hover:text-foreground" />
                                </Button>
                                {u.status === 'archived' && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    title="Reactivate Unit"
                                    onClick={() => handleReactivateUnit(u)}
                                    className="size-8 p-0"
                                  >
                                    <RotateCcw className="size-4 text-muted-foreground hover:text-emerald-600" />
                                  </Button>
                                )}
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      {(isAddProductOpen || editingProduct) && (
        <ProductFormDialog
          open={isAddProductOpen || Boolean(editingProduct)}
          onOpenChange={(open) => {
            if (!open) {
              setIsAddProductOpen(false)
              setEditingProduct(null)
            }
          }}
          initialData={editingProduct}
          categories={categories}
          units={units}
          knownSkus={products.map((p) => p.sku_code)}
        />
      )}

      {isAddCategoryOpen && (
        <CategoryFormDialog
          open={isAddCategoryOpen}
          onOpenChange={setIsAddCategoryOpen}
          initialData={editingCategory}
          defaultParentId={categoryParent}
          categories={categories}
        />
      )}

      {isAddUnitOpen && (
        <UnitFormDialog
          open={isAddUnitOpen}
          onOpenChange={setIsAddUnitOpen}
          initialData={editingUnit}
        />
      )}
    </div>
  )
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function renderCategoryNodes(
  nodes: CategoryNode[],
  depth: number,
  actions: { isAdmin: boolean; onAddSub: (c: Category) => void; onEdit: (c: Category) => void },
) {
  return nodes.map((c) => (
    <CategoryNodeRows key={c.id} category={c} depth={depth} actions={actions} />
  ))
}

function CategoryNodeRows({
  category,
  depth,
  actions,
}: {
  category: CategoryNode
  depth: number
  actions: { isAdmin: boolean; onAddSub: (c: Category) => void; onEdit: (c: Category) => void }
}) {
  return (
    <>
      <TableRow className="hover:bg-muted/40 transition-colors">
        <TableCell>
          <div className="flex items-center gap-2" style={{ paddingLeft: depth * 20 }}>
            {category.children.length > 0 ? (
              <ChevronRight className="size-4 text-muted-foreground shrink-0" />
            ) : (
              <span className="size-4 shrink-0" />
            )}
            <span className="font-medium text-foreground">{category.name}</span>
          </div>
        </TableCell>
        <TableCell>
          <Badge variant="outline" className="text-[11px]">{depth === 0 ? 'Top-level' : `Sub (level ${depth})`}</Badge>
        </TableCell>
        <TableCell className="font-mono text-sm">{category.sort_order}</TableCell>
        <TableCell>
          <Badge
            variant={category.status === 'active' ? 'default' : 'outline'}
            className={
              category.status === 'active'
                ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/20'
                : ''
            }
          >
            {category.status}
          </Badge>
        </TableCell>
        <TableCell className="text-right">
          <div className="flex items-center justify-end gap-1">
            {actions.isAdmin && category.status === 'active' && (
              <Button
                variant="ghost"
                size="sm"
                title="Add Sub-category"
                onClick={() => actions.onAddSub(category)}
                className="size-8 p-0"
              >
                <Plus className="size-4 text-muted-foreground hover:text-foreground" />
              </Button>
            )}
            {actions.isAdmin && category.status === 'active' && (
              <Button
                variant="ghost"
                size="sm"
                title="Edit Category"
                onClick={() => actions.onEdit(category)}
                className="size-8 p-0"
              >
                <Edit2 className="size-4 text-muted-foreground hover:text-foreground" />
              </Button>
            )}
          </div>
        </TableCell>
      </TableRow>
      {category.children.length > 0 && renderCategoryNodes(category.children, depth + 1, actions)}
    </>
  )
}

// -----------------------------------------------------------------------------
// Component: Create / Edit Product Dialog
// -----------------------------------------------------------------------------
interface ProductFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialData?: ProductRow | null
  categories: Category[]
  units: Unit[]
  knownSkus: string[]
}

function ProductFormDialog({
  open,
  onOpenChange,
  initialData,
  categories,
  units,
  knownSkus,
}: ProductFormDialogProps) {
  const isEdit = Boolean(initialData)
  const createMutation = useCreateProduct()
  const updateMutation = useUpdateProduct()
  const archiveMutation = useArchiveProduct()

  const categoryOptions = useMemo(() => flattenForSelect(categories), [categories])
  const activeUnits = useMemo(
    () => units.filter((u) => u.status === 'active' || (initialData && u.id === initialData.unit_id)),
    [units, initialData],
  )

  const [name, setName] = useState(initialData?.name ?? '')
  const [skuCode, setSkuCode] = useState(initialData?.sku_code ?? '')
  const [description, setDescription] = useState(initialData?.description ?? '')
  const [categoryId, setCategoryId] = useState(initialData?.category_id ?? '')
  const [unitId, setUnitId] = useState(initialData?.unit_id ?? '')
  const [costPrice, setCostPrice] = useState(
    initialData && typeof initialData.cost_price === 'number' ? String(initialData.cost_price) : '',
  )
  const [salePrice, setSalePrice] = useState(initialData ? String(initialData.sale_price) : '')
  const [targetLevel, setTargetLevel] = useState(initialData ? String(initialData.default_target_level) : '')
  const [reorderPoint, setReorderPoint] = useState(initialData ? String(initialData.default_reorder_point) : '')
  const [safetyStock, setSafetyStock] = useState(initialData ? String(initialData.default_safety_stock) : '')

  const isPending = createMutation.isPending || updateMutation.isPending || archiveMutation.isPending

  const suggestSku = () => {
    if (!categoryId) {
      toast.error('Select a category first to suggest an SKU')
      return
    }
    const prefix = deriveSkuPrefix(topLevelName(categoryId, categories))
    const pattern = new RegExp(`^P${prefix}-(\\d+)$`, 'i')
    let maxSeq = 0
    knownSkus.forEach((sku) => {
      const m = sku.match(pattern)
      if (m) maxSeq = Math.max(maxSeq, Number(m[1]))
    })
    setSkuCode(`P${prefix}-${String(maxSeq + 1).padStart(3, '0')}`)
  }

  const num = (v: string) => (v.trim() === '' ? null : Number(v))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim()) {
      toast.error('Product name is required')
      return
    }
    if (!categoryId) {
      toast.error('Please select a category')
      return
    }
    if (!unitId) {
      toast.error('Please select a unit')
      return
    }
    if (num(costPrice) == null || (num(costPrice) as number) < 0) {
      toast.error('Cost price must be 0 or greater')
      return
    }
    const target = num(targetLevel) ?? 0
    const reorder = num(reorderPoint) ?? 0
    const safety = num(safetyStock) ?? 0
    if (target < reorder || reorder < safety) {
      toast.error('Stock levels must satisfy Target ≥ Reorder ≥ Safety')
      return
    }

    const numericPayload = {
      cost_price: costPrice.trim() === '' ? undefined : Number(costPrice),
      sale_price: salePrice.trim() === '' ? undefined : Number(salePrice),
      default_target_level: num(targetLevel) ?? undefined,
      default_reorder_point: num(reorderPoint) ?? undefined,
      default_safety_stock: num(safetyStock) ?? undefined,
    }

    try {
      if (isEdit && initialData) {
        await updateMutation.mutateAsync({
          id: initialData.id,
          name: name.trim(),
          sku_code: skuCode.trim(),
          description: description.trim() || undefined,
          categoryId,
          unitId,
          ...numericPayload,
        })
        toast.success('Product updated successfully')
      } else {
        await createMutation.mutateAsync({
          name: name.trim(),
          sku_code: skuCode.trim() || 'P-SKU-' + Date.now().toString().slice(-4),
          description: description.trim() || undefined,
          categoryId,
          unitId,
          cost_price: Number(costPrice),
          sale_price: salePrice.trim() === '' ? 0 : Number(salePrice),
          default_target_level: target,
          default_reorder_point: reorder,
          default_safety_stock: safety,
          is_perishable: false,
          status: 'active',
        })
        toast.success('Product created successfully')
      }
      onOpenChange(false)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save product'
      toast.error(msg)
    }
  }

  const handleArchive = async () => {
    if (!initialData) return
    if (!confirm(`Are you sure you want to archive ${initialData.name}?`)) return
    try {
      await archiveMutation.mutateAsync(initialData.id)
      toast.success('Product archived — excluded from new transactions')
      onOpenChange(false)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to archive product'
      toast.error(msg)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? `Edit ${initialData?.name}` : 'Add New Product'}</DialogTitle>
          <DialogDescription>
            SKU is auto-suggested from the category prefix. Stock levels must satisfy Target ≥ Reorder ≥ Safety.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="p-name">
                Product Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="p-name"
                placeholder="e.g. USB-C Charging Cable 1m"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="p-sku">SKU Code</Label>
              <div className="flex gap-2">
                <Input
                  id="p-sku"
                  placeholder="e.g. PELEC-001"
                  value={skuCode}
                  onChange={(e) => setSkuCode(e.target.value)}
                  className="font-mono"
                />
                <Button type="button" variant="outline" onClick={suggestSku} className="gap-1.5 shrink-0" title="Suggest from category">
                  <Sparkles className="size-4" />
                  Suggest
                </Button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="p-category">
                Category <span className="text-destructive">*</span>
              </Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger id="p-category">
                  <SelectValue placeholder="Select category..." />
                </SelectTrigger>
                <SelectContent>
                  {categoryOptions.map((opt) => (
                    <SelectItem key={opt.id} value={opt.id} style={{ paddingLeft: 8 + opt.depth * 12 }}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="p-unit">
                Unit of Measure <span className="text-destructive">*</span>
              </Label>
              <Select value={unitId} onValueChange={setUnitId}>
                <SelectTrigger id="p-unit">
                  <SelectValue placeholder="Select unit..." />
                </SelectTrigger>
                <SelectContent>
                  {activeUnits.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name} ({u.abbreviation ?? '—'})
                      {u.status === 'archived' && ' (archived)'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="p-cost">Cost Price (₹) — masked for non-admin</Label>
              <Input
                id="p-cost"
                type="number"
                min="0"
                step="0.01"
                placeholder="e.g. 120.00"
                value={costPrice}
                onChange={(e) => setCostPrice(e.target.value)}
                required={!isEdit}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="p-sale">Sale Price (₹)</Label>
              <Input
                id="p-sale"
                type="number"
                min="0"
                step="0.01"
                placeholder="e.g. 249.00"
                value={salePrice}
                onChange={(e) => setSalePrice(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="p-target">Default Target Level</Label>
              <Input
                id="p-target"
                type="number"
                min="0"
                placeholder="e.g. 100"
                value={targetLevel}
                onChange={(e) => setTargetLevel(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="p-reorder">Default Reorder Point</Label>
              <Input
                id="p-reorder"
                type="number"
                min="0"
                placeholder="e.g. 30"
                value={reorderPoint}
                onChange={(e) => setReorderPoint(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="p-safety">Default Safety Stock</Label>
              <Input
                id="p-safety"
                type="number"
                min="0"
                placeholder="e.g. 10"
                value={safetyStock}
                onChange={(e) => setSafetyStock(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="p-desc">Description</Label>
            <Input
              id="p-desc"
              placeholder="Short product description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
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
                <Archive className="size-4 mr-1" />
                Archive
              </Button>
            )}
            <div className="flex gap-2 ml-auto">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="size-4 animate-spin mr-2" />}
                {isEdit ? 'Save Changes' : 'Create Product'}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// -----------------------------------------------------------------------------
// Component: Create / Edit Category Dialog
// -----------------------------------------------------------------------------
interface CategoryFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialData?: Category | null
  defaultParentId?: string | null
  categories: Category[]
}

function CategoryFormDialog({ open, onOpenChange, initialData, defaultParentId, categories }: CategoryFormDialogProps) {
  const isEdit = Boolean(initialData)
  const createMutation = useCreateCategory()
  const updateMutation = useUpdateCategory()

  const categoryOptions = useMemo(() => flattenForSelect(categories.filter((c) => c.status === 'active')), [categories])

  const [name, setName] = useState(initialData?.name ?? '')
  const [parentId, setParentId] = useState<string>(initialData?.parent_id ?? defaultParentId ?? '')
  const [sortOrder, setSortOrder] = useState(initialData ? String(initialData.sort_order) : '0')

  const isPending = createMutation.isPending || updateMutation.isPending

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      toast.error('Category name is required')
      return
    }

    const payload = {
      name: name.trim(),
      parentId: parentId || undefined,
      sortOrder: sortOrder.trim() === '' ? 0 : Number(sortOrder),
      status: 'active' as const,
    }

    try {
      if (isEdit && initialData) {
        await updateMutation.mutateAsync({ id: initialData.id, ...payload })
        toast.success('Category updated successfully')
      } else {
        await createMutation.mutateAsync(payload)
        toast.success('Category created successfully')
      }
      onOpenChange(false)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save category'
      toast.error(msg)
    }
  }

  const handleArchive = async () => {
    if (!initialData) return
    if (!confirm(`Archive ${initialData.name}? Products keep their category reference for history.`)) return
    try {
      await updateMutation.mutateAsync({ id: initialData.id, status: 'archived' })
      toast.success('Category deactivated')
      onOpenChange(false)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to deactivate category'
      toast.error(msg)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? `Edit ${initialData?.name}` : 'Add Category'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Rename, re-parent, or deactivate this category.'
              : parentId
                ? 'Create a sub-category under the selected parent.'
                : 'Create a new top-level category. Top-level names drive SKU prefixes.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="c-name">
              Category Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="c-name"
              placeholder="e.g. Beverages"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="c-parent">Parent Category</Label>
            <Select value={parentId} onValueChange={setParentId}>
              <SelectTrigger id="c-parent">
                <SelectValue placeholder="None (top-level)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">None (top-level)</SelectItem>
                {categoryOptions
                  .filter((o) => o.id !== initialData?.id)
                  .map((opt) => (
                    <SelectItem key={opt.id} value={opt.id} style={{ paddingLeft: 8 + opt.depth * 12 }}>
                      {opt.label}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="c-sort">Sort Order</Label>
            <Input
              id="c-sort"
              type="number"
              min="0"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
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
                <Archive className="size-4 mr-1" />
                Deactivate
              </Button>
            )}
            <div className="flex gap-2 ml-auto">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="size-4 animate-spin mr-2" />}
                {isEdit ? 'Save Changes' : 'Create Category'}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// -----------------------------------------------------------------------------
// Component: Create / Edit Unit Dialog
// -----------------------------------------------------------------------------
interface UnitFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialData?: Unit | null
}

function UnitFormDialog({ open, onOpenChange, initialData }: UnitFormDialogProps) {
  const isEdit = Boolean(initialData)
  const createMutation = useCreateUnit()
  const updateMutation = useUpdateUnit()

  const [name, setName] = useState(initialData?.name ?? '')
  const [abbreviation, setAbbreviation] = useState(initialData?.abbreviation ?? '')

  const isPending = createMutation.isPending || updateMutation.isPending

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      toast.error('Unit name is required')
      return
    }

    try {
      if (isEdit && initialData) {
        await updateMutation.mutateAsync({
          id: initialData.id,
          name: name.trim(),
          abbreviation: abbreviation.trim() || undefined,
        })
        toast.success('Unit updated successfully')
      } else {
        await createMutation.mutateAsync({
          name: name.trim(),
          abbreviation: abbreviation.trim() || undefined,
        })
        toast.success('Unit created successfully')
      }
      onOpenChange(false)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save unit'
      toast.error(msg)
    }
  }

  const handleArchive = async () => {
    if (!initialData) return
    if (!confirm(`Deactivate ${initialData.name}? It will no longer be selectable for new products.`)) return
    try {
      await updateMutation.mutateAsync({ id: initialData.id, status: 'archived' })
      toast.success('Unit deactivated')
      onOpenChange(false)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to deactivate unit'
      toast.error(msg)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? `Edit ${initialData?.name}` : 'Add Unit'}</DialogTitle>
          <DialogDescription>Units of measure used for stock and pricing.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="u-name">
              Unit Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="u-name"
              placeholder="e.g. Pieces"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="u-abbr">Abbreviation</Label>
            <Input
              id="u-abbr"
              placeholder="e.g. pcs"
              value={abbreviation}
              onChange={(e) => setAbbreviation(e.target.value)}
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
                <Archive className="size-4 mr-1" />
                Deactivate
              </Button>
            )}
            <div className="flex gap-2 ml-auto">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="size-4 animate-spin mr-2" />}
                {isEdit ? 'Save Changes' : 'Create Unit'}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}