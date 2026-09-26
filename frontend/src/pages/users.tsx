import { useMemo, useState } from 'react'
import {
  Users,
  Plus,
  Search,
  CheckCircle2,
  Shield,
  ShieldAlert,
  Store as StoreIcon,
  Phone,
  Mail,
  Edit2,
  UserX,
  UserCheck,
  RefreshCw,
  Loader2,
  Globe,
  AlertTriangle,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  Avatar,
  AvatarFallback,
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
  PasswordInput,
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
  useUsers,
  useCreateUser,
  useUpdateUser,
  useDeactivateUser,
  useStores,
} from '@/hooks'
import type { UserProfile, Role, Gender } from '@/lib/types'

const ROLE_CONFIG: Record<
  Role,
  { label: string; badgeClass: string; description: string }
> = {
  admin: {
    label: 'Admin',
    badgeClass: 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800',
    description: 'Full system configuration, staff management, and global oversight',
  },
  store_staff: {
    label: 'Store Staff',
    badgeClass: 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
    description: 'Inventory adjustments, stock-in receipt, and warehouse ops',
  },
  sales_personnel: {
    label: 'Sales Personnel',
    badgeClass: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    description: 'Order processing, customer transactions, and sales registry',
  },
  senior_stakeholder: {
    label: 'Senior Stakeholder',
    badgeClass: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    description: 'Executive reporting, multi-store metrics, and forecasting',
  },
}

export default function UsersPage() {
  const currentUser = useAuthStore((s) => s.user)
  const isAdmin = currentUser?.role === 'admin'

  // Filters state
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'archived'>('all')
  const [storeFilter, setStoreFilter] = useState<string>('all')

  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null)
  const [deactivatingUser, setDeactivatingUser] = useState<UserProfile | null>(null)
  const [reactivatingUser, setReactivatingUser] = useState<UserProfile | null>(null)

  // Data queries
  const {
    data: usersData,
    isLoading: usersLoading,
    isRefetching,
    refetch,
  } = useUsers({
    search: searchTerm || undefined,
    role: roleFilter !== 'all' ? roleFilter : undefined,
    status: statusFilter,
    store_id: storeFilter !== 'all' ? storeFilter : undefined,
    limit: 100,
  })

  const { data: storesData } = useStores()
  const stores = useMemo(() => storesData?.stores ?? [], [storesData])

  const users = useMemo(() => usersData?.users ?? [], [usersData])

  // Mutations
  const createMutation = useCreateUser()
  const updateMutation = useUpdateUser()
  const deactivateMutation = useDeactivateUser()

  // Form states for Create User
  const [createForm, setCreateForm] = useState({
    email: '',
    password: '',
    fullName: '',
    role: 'store_staff' as Role,
    storeId: '' as string,
    phone: '',
    address: '',
    gender: 'prefer_not_to_say' as Gender,
  })

  // Form states for Edit User
  const [editForm, setEditForm] = useState({
    fullName: '',
    role: 'store_staff' as Role,
    storeId: '' as string,
    phone: '',
    address: '',
    gender: 'prefer_not_to_say' as Gender,
  })

  // Metrics
  const metrics = useMemo(() => {
    const total = users.length
    const active = users.filter((u) => u.status === 'active').length
    const deactivated = users.filter((u) => u.status === 'archived').length
    const storesWithStaff = new Set(users.map((u) => u.store_id).filter(Boolean)).size

    return { total, active, deactivated, storesWithStaff }
  }, [users])

  // Helpers
  const getStoreName = (storeId: string | null | undefined) => {
    if (!storeId) return 'Global Access (All Stores)'
    const match = stores.find((s) => s.id === storeId)
    return match ? `${match.name} (${match.code})` : 'Assigned Store'
  }

  // Handlers
  const handleOpenAdd = () => {
    setCreateForm({
      email: '',
      password: '',
      fullName: '',
      role: 'store_staff',
      storeId: '',
      phone: '',
      address: '',
      gender: 'prefer_not_to_say',
    })
    setIsAddOpen(true)
  }

  const handleOpenEdit = (user: UserProfile) => {
    setEditingUser(user)
    setEditForm({
      fullName: user.full_name,
      role: user.role,
      storeId: user.store_id ?? '',
      phone: user.phone ?? '',
      address: user.address ?? '',
      gender: user.gender ?? 'prefer_not_to_say',
    })
  }

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!createForm.email || !createForm.password || !createForm.fullName) {
      toast.error('Please fill in all required fields.')
      return
    }

    if (createForm.password.length < 8) {
      toast.error('Password must be at least 8 characters long.')
      return
    }

    const scoped = createForm.role === 'store_staff' || createForm.role === 'sales_personnel'
    if (scoped && (!createForm.storeId || createForm.storeId === 'none')) {
      toast.error('Please assign a store for this role.')
      return
    }

    try {
      await createMutation.mutateAsync({
        email: createForm.email,
        password: createForm.password,
        fullName: createForm.fullName,
        role: createForm.role,
        storeId: createForm.storeId && createForm.storeId !== 'none' ? createForm.storeId : null,
        phone: createForm.phone || null,
        address: createForm.address || null,
        gender: createForm.gender || null,
      })
      toast.success('User account created successfully.')
      setIsAddOpen(false)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create user'
      toast.error(msg)
    }
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingUser) return

    if (!editForm.fullName.trim()) {
      toast.error('Full name is required.')
      return
    }

    const scoped = editForm.role === 'store_staff' || editForm.role === 'sales_personnel'
    if (scoped && (!editForm.storeId || editForm.storeId === 'none')) {
      toast.error('Please assign a store for this role.')
      return
    }

    try {
      await updateMutation.mutateAsync({
        id: editingUser.id,
        data: {
          fullName: editForm.fullName,
          role: editForm.role,
          storeId: editForm.storeId && editForm.storeId !== 'none' ? editForm.storeId : null,
          phone: editForm.phone || null,
          address: editForm.address || null,
          gender: editForm.gender || null,
        },
      })
      toast.success('User details updated successfully.')
      setEditingUser(null)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update user'
      toast.error(msg)
    }
  }

  const handleConfirmDeactivate = async () => {
    if (!deactivatingUser) return
    try {
      await deactivateMutation.mutateAsync({
        id: deactivatingUser.id,
        status: 'archived',
      })
      toast.success(`Account for ${deactivatingUser.full_name} deactivated. Historical records preserved.`)
      setDeactivatingUser(null)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to deactivate user'
      toast.error(msg)
    }
  }

  const handleConfirmReactivate = async () => {
    if (!reactivatingUser) return
    try {
      await deactivateMutation.mutateAsync({
        id: reactivatingUser.id,
        status: 'active',
      })
      toast.success(`Account for ${reactivatingUser.full_name} restored to active status.`)
      setReactivatingUser(null)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to reactivate user'
      toast.error(msg)
    }
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center p-6">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
          <ShieldAlert className="size-7" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight">Access Restricted</h2>
        <p className="max-w-md text-sm text-muted-foreground">
          User administration is restricted to System Administrators. If you need access, please contact your organization administrator.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">User Management</h1>
          <p className="text-sm text-muted-foreground">
            Manage system access, roles, store assignments, and account lifecycles.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            id="refresh-users-button"
            variant="outline"
            size="sm"
            onClick={() => void refetch()}
            disabled={isRefetching || usersLoading}
            className="gap-2"
          >
            <RefreshCw className={`size-3.5 ${isRefetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button id="add-user-button" size="sm" onClick={handleOpenAdd} className="gap-2">
            <Plus className="size-4" />
            Add User
          </Button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Staff</CardTitle>
            <Users className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.total}</div>
            <CardDescription className="text-xs">Registered across system</CardDescription>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Accounts</CardTitle>
            <CheckCircle2 className="size-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {metrics.active}
            </div>
            <CardDescription className="text-xs">Authorized to authenticate</CardDescription>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Deactivated</CardTitle>
            <UserX className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-muted-foreground">
              {metrics.deactivated}
            </div>
            <CardDescription className="text-xs">Access revoked (retained records)</CardDescription>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Store Deployments</CardTitle>
            <StoreIcon className="size-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.storesWithStaff}</div>
            <CardDescription className="text-xs">Stores with dedicated staff</CardDescription>
          </CardContent>
        </Card>
      </div>

      {/* Search & Filter Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="users-search-input"
                placeholder="Search staff by name, email, or phone number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Role Filter */}
            <div className="w-full lg:w-44">
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger id="role-filter-trigger" className="w-full">
                  <SelectValue placeholder="Role: All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="store_staff">Store Staff</SelectItem>
                  <SelectItem value="sales_personnel">Sales Personnel</SelectItem>
                  <SelectItem value="senior_stakeholder">Senior Stakeholder</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Store Filter */}
            <div className="w-full lg:w-48">
              <Select value={storeFilter} onValueChange={setStoreFilter}>
                <SelectTrigger id="store-filter-trigger" className="w-full">
                  <SelectValue placeholder="Store: All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Locations</SelectItem>
                  <SelectItem value="none">Global Access (No Store)</SelectItem>
                  {stores.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status Filter */}
            <div className="w-full lg:w-40">
              <Select
                value={statusFilter}
                onValueChange={(val) => setStatusFilter(val as 'all' | 'active' | 'archived')}
              >
                <SelectTrigger id="status-filter-trigger" className="w-full">
                  <SelectValue placeholder="Status: All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active Only</SelectItem>
                  <SelectItem value="archived">Deactivated Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {(searchTerm || roleFilter !== 'all' || storeFilter !== 'all' || statusFilter !== 'all') && (
              <Button
                id="reset-filters-btn"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchTerm('')
                  setRoleFilter('all')
                  setStoreFilter('all')
                  setStatusFilter('all')
                }}
              >
                Reset
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Staff Member</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Assigned Store</TableHead>
                <TableHead>Account Status</TableHead>
                <TableHead className="hidden md:table-cell">Registered</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {usersLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-48 text-center">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Loader2 className="size-6 animate-spin text-primary" />
                      <span className="text-sm text-muted-foreground">Loading users...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-48 text-center">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Users className="size-8 text-muted-foreground/60" />
                      <p className="font-medium text-muted-foreground">No users found</p>
                      <p className="text-xs text-muted-foreground">
                        {searchTerm || roleFilter !== 'all' || statusFilter !== 'all'
                          ? 'Try adjusting your search criteria or filters.'
                          : 'Click "Add User" above to create your first team member.'}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                users.map((u) => {
                  const roleCfg = ROLE_CONFIG[u.role] ?? {
                    label: u.role,
                    badgeClass: 'bg-muted text-muted-foreground',
                  }
                  const isSelf = currentUser?.id === u.id
                  const isArchived = u.status === 'archived'
                  const initials = u.full_name
                    .split(' ')
                    .map((p) => p[0])
                    .slice(0, 2)
                    .join('')
                    .toUpperCase()

                  return (
                    <TableRow key={u.id} className={isArchived ? 'bg-muted/30 opacity-75' : undefined}>
                      {/* Name & Contact */}
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="size-9">
                            <AvatarFallback className={isArchived ? 'bg-muted text-muted-foreground' : 'bg-primary/10 text-primary font-semibold'}>
                              {initials || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-foreground">{u.full_name}</span>
                              {isSelf && (
                                <Badge variant="outline" className="text-[10px] py-0 px-1.5 h-4">
                                  You
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Mail className="size-3" />
                                {u.email}
                              </span>
                              {u.phone && (
                                <span className="flex items-center gap-1 hidden sm:inline-flex">
                                  <Phone className="size-3" />
                                  {u.phone}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </TableCell>

                      {/* Role */}
                      <TableCell>
                        <Badge variant="outline" className={roleCfg.badgeClass}>
                          <Shield className="size-3 mr-1" />
                          {roleCfg.label}
                        </Badge>
                      </TableCell>

                      {/* Store Assignment */}
                      <TableCell>
                        {u.store_id ? (
                          <div className="flex items-center gap-1.5 text-sm">
                            <StoreIcon className="size-3.5 text-blue-500 shrink-0" />
                            <span className="truncate max-w-[200px]" title={getStoreName(u.store_id)}>
                              {getStoreName(u.store_id)}
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                            <Globe className="size-3.5 text-emerald-500 shrink-0" />
                            <span>Global Access</span>
                          </div>
                        )}
                      </TableCell>

                      {/* Account Status */}
                      <TableCell>
                        {isArchived ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:text-zinc-400">
                            <span className="size-1.5 rounded-full bg-zinc-400 dark:bg-zinc-500" />
                            Deactivated
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                            <span className="size-1.5 rounded-full bg-emerald-500" />
                            Active
                          </span>
                        )}
                      </TableCell>

                      {/* Registered Date */}
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                        {u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            id={`edit-user-btn-${u.id}`}
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenEdit(u)}
                            className="h-8 gap-1.5 text-xs"
                          >
                            <Edit2 className="size-3.5" />
                            Edit
                          </Button>

                          {isArchived ? (
                            <Button
                              id={`reactivate-user-btn-${u.id}`}
                              variant="outline"
                              size="sm"
                              onClick={() => setReactivatingUser(u)}
                              className="h-8 gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950"
                            >
                              <UserCheck className="size-3.5" />
                              Reactivate
                            </Button>
                          ) : (
                            <Button
                              id={`deactivate-user-btn-${u.id}`}
                              variant="ghost"
                              size="sm"
                              disabled={isSelf}
                              onClick={() => setDeactivatingUser(u)}
                              title={isSelf ? 'You cannot deactivate your own account' : 'Deactivate user'}
                              className="h-8 gap-1.5 text-xs text-destructive hover:bg-destructive/10"
                            >
                              <UserX className="size-3.5" />
                              Deactivate
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
        </CardContent>
      </Card>

      {/* CREATE USER MODAL */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-[540px]">
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
            <DialogDescription>
              Create an employee account with assigned system role and store access.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateSubmit} className="space-y-4 pt-2">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="create-name">
                  Full Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="create-name"
                  placeholder="e.g. Vikram Malhotra"
                  value={createForm.fullName}
                  onChange={(e) => setCreateForm({ ...createForm, fullName: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="create-email">
                  Email Address <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="create-email"
                  type="email"
                  placeholder="staff@vaultory.app"
                  value={createForm.email}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="create-password">
                  Initial Password <span className="text-destructive">*</span>
                </Label>
                <PasswordInput
                  id="create-password"
                  placeholder="Minimum 8 characters"
                  value={createForm.password}
                  onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                  required
                />
                <p className="text-[11px] text-muted-foreground">
                  The user can sign in immediately with these credentials.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="create-role">
                  System Role <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={createForm.role}
                  onValueChange={(val) => setCreateForm({ ...createForm, role: val as Role })}
                >
                  <SelectTrigger id="create-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="store_staff">Store Staff</SelectItem>
                    <SelectItem value="sales_personnel">Sales Personnel</SelectItem>
                    <SelectItem value="admin">System Admin</SelectItem>
                    <SelectItem value="senior_stakeholder">Senior Stakeholder</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="create-store">Store Assignment</Label>
                <Select
                  value={createForm.storeId || 'none'}
                  onValueChange={(val) => setCreateForm({ ...createForm, storeId: val === 'none' ? '' : val })}
                >
                  <SelectTrigger id="create-store">
                    <SelectValue placeholder="Select Store" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Global Access (HQ / All Stores)</SelectItem>
                    {stores.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name} ({s.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="create-phone">Phone Number</Label>
                <Input
                  id="create-phone"
                  placeholder="+91 98200 00000"
                  value={createForm.phone}
                  onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="create-gender">Gender (Optional)</Label>
                <Select
                  value={createForm.gender || 'prefer_not_to_say'}
                  onValueChange={(val) => setCreateForm({ ...createForm, gender: val as Gender })}
                >
                  <SelectTrigger id="create-gender">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                    <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="create-address">Street Address (Optional)</Label>
                <Textarea
                  id="create-address"
                  placeholder="Employee residential / base location"
                  rows={2}
                  value={createForm.address}
                  onChange={(e) => setCreateForm({ ...createForm, address: e.target.value })}
                />
              </div>
            </div>

            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddOpen(false)}
                disabled={createMutation.isPending}
              >
                Cancel
              </Button>
              <Button id="submit-create-user-btn" type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
                Create Account
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* EDIT USER MODAL */}
      <Dialog open={Boolean(editingUser)} onOpenChange={(open) => !open && setEditingUser(null)}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Edit User Profile</DialogTitle>
            <DialogDescription>
              Update name, assigned role, and store access for {editingUser?.email}.
            </DialogDescription>
          </DialogHeader>

          {editingUser && (
            <form onSubmit={handleEditSubmit} className="space-y-4 pt-2">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="edit-name">Full Name</Label>
                  <Input
                    id="edit-name"
                    value={editForm.fullName}
                    onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="edit-role">System Role</Label>
                  <Select
                    value={editForm.role}
                    disabled={currentUser?.id === editingUser.id}
                    onValueChange={(val) => setEditForm({ ...editForm, role: val as Role })}
                  >
                    <SelectTrigger id="edit-role">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">System Admin</SelectItem>
                      <SelectItem value="store_staff">Store Staff</SelectItem>
                      <SelectItem value="sales_personnel">Sales Personnel</SelectItem>
                      <SelectItem value="senior_stakeholder">Senior Stakeholder</SelectItem>
                    </SelectContent>
                  </Select>
                  {currentUser?.id === editingUser.id && (
                    <p className="text-[11px] text-muted-foreground">
                      You cannot remove your own Admin role.
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="edit-store">Assigned Store</Label>
                  <Select
                    value={editForm.storeId || 'none'}
                    onValueChange={(val) => setEditForm({ ...editForm, storeId: val === 'none' ? '' : val })}
                  >
                    <SelectTrigger id="edit-store">
                      <SelectValue placeholder="Select Store" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Global Access (No Store)</SelectItem>
                      {stores.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name} ({s.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="edit-phone">Phone Number</Label>
                  <Input
                    id="edit-phone"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="edit-gender">Gender</Label>
                  <Select
                    value={editForm.gender || 'prefer_not_to_say'}
                    onValueChange={(val) => setEditForm({ ...editForm, gender: val as Gender })}
                  >
                    <SelectTrigger id="edit-gender">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                      <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="edit-address">Street Address</Label>
                  <Textarea
                    id="edit-address"
                    rows={2}
                    value={editForm.address}
                    onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                  />
                </div>
              </div>

              <DialogFooter className="pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingUser(null)}
                  disabled={updateMutation.isPending}
                >
                  Cancel
                </Button>
                <Button id="submit-edit-user-btn" type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
                  Save Changes
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* DEACTIVATE CONFIRMATION DIALOG */}
      <Dialog
        open={Boolean(deactivatingUser)}
        onOpenChange={(open) => !open && setDeactivatingUser(null)}
      >
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <div className="flex size-10 items-center justify-center rounded-full bg-destructive/10 text-destructive mb-2">
              <AlertTriangle className="size-5" />
            </div>
            <DialogTitle>Deactivate User Account?</DialogTitle>
            <DialogDescription className="space-y-2 pt-2">
              <p>
                Are you sure you want to deactivate{' '}
                <strong className="text-foreground">{deactivatingUser?.full_name}</strong> (
                {deactivatingUser?.email})?
              </p>
              <div className="rounded-md bg-muted/60 p-3 text-xs text-muted-foreground space-y-1">
                <p className="font-semibold text-foreground">Important System Protections:</p>
                <ul className="list-disc pl-4 space-y-1">
                  <li>This user will immediately be blocked from logging in or calling protected APIs.</li>
                  <li>Historical records, sales, purchase orders, and audit logs are <strong>fully preserved</strong>.</li>
                  <li>You can reactivate this account at any time from this dashboard.</li>
                </ul>
              </div>
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="pt-4">
            <Button
              variant="outline"
              onClick={() => setDeactivatingUser(null)}
              disabled={deactivateMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              id="confirm-deactivate-user-btn"
              variant="destructive"
              onClick={handleConfirmDeactivate}
              disabled={deactivateMutation.isPending}
              className="gap-1.5"
            >
              {deactivateMutation.isPending && <Loader2 className="size-4 animate-spin" />}
              Deactivate User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* REACTIVATE CONFIRMATION DIALOG */}
      <Dialog
        open={Boolean(reactivatingUser)}
        onOpenChange={(open) => !open && setReactivatingUser(null)}
      >
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <div className="flex size-10 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 mb-2">
              <UserCheck className="size-5" />
            </div>
            <DialogTitle>Reactivate User Account?</DialogTitle>
            <DialogDescription className="pt-2">
              Restore system access for <strong className="text-foreground">{reactivatingUser?.full_name}</strong> (
              {reactivatingUser?.email}). The user will immediately be permitted to sign in and resume operations.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="pt-4">
            <Button
              variant="outline"
              onClick={() => setReactivatingUser(null)}
              disabled={deactivateMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              id="confirm-reactivate-user-btn"
              onClick={handleConfirmReactivate}
              disabled={deactivateMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
            >
              {deactivateMutation.isPending && <Loader2 className="size-4 animate-spin" />}
              Reactivate Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
