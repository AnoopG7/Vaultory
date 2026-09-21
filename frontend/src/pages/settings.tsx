import {
  Users,
  Store,
  Sliders,
  Shield,
  ArrowRight,
  Bell,
  AlertTriangle,
  PackageX,
  Sparkles,
  ShoppingBag,
  Loader2,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  Switch,
  Label,
  Badge,
} from '@/components/ui'
import { useAuthStore } from '@/stores'
import { useAlertPreferences, useUpdateAlertPreferences } from '@/hooks'
import type { AlertPreferences } from '@/lib/types'

export default function SettingsPage() {
  const user = useAuthStore((s) => s.user)
  const isAdmin = user?.role === 'admin'

  // Alert preferences query & mutation
  const { data: prefsData, isLoading: prefsLoading } = useAlertPreferences()
  const updatePrefsMutation = useUpdateAlertPreferences()

  const currentPrefs = prefsData?.data

  const handleToggle = async (key: keyof AlertPreferences, value: boolean) => {
    try {
      await updatePrefsMutation.mutateAsync({ [key]: value })
      toast.success('Alert preferences updated', {
        description: `Notification setting for ${key.replace(/_/g, ' ')} has been saved.`,
      })
    } catch {
      toast.error('Failed to save alert preference')
    }
  }

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings & Preferences</h1>
        <p className="text-sm text-muted-foreground">
          Configure organization modules, user accounts, alert subscriptions, and system preferences.
        </p>
      </div>

      {/* Inventory & Stock Alert Preferences Section */}
      <Card className="border-primary/20 shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Bell className="size-5" />
              </div>
              <div>
                <CardTitle className="text-base">Inventory Alert Preferences</CardTitle>
                <CardDescription className="text-xs">
                  Configure which stock health conditions and automated updates trigger alerts in your notification center.
                </CardDescription>
              </div>
            </div>
            {updatePrefsMutation.isPending && (
              <Badge variant="outline" className="gap-1.5 text-xs text-muted-foreground">
                <Loader2 className="size-3 animate-spin" />
                <span>Saving...</span>
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {prefsLoading ? (
            <div className="flex items-center justify-center p-8 text-muted-foreground gap-2">
              <Loader2 className="size-5 animate-spin" />
              <span className="text-sm">Loading alert preferences...</span>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Low Stock Alerts */}
              <div className="flex items-center justify-between gap-4 rounded-lg border p-3.5 transition-colors hover:bg-muted/30">
                <div className="flex items-start gap-3">
                  <div className="flex size-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 shrink-0 mt-0.5">
                    <AlertTriangle className="size-4" />
                  </div>
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="pref-low-stock" className="text-sm font-medium cursor-pointer">
                        Low Stock Alerts
                      </Label>
                      <Badge
                        variant="secondary"
                        className="h-4 px-1 text-[10px] bg-amber-500/15 text-amber-700 dark:text-amber-300"
                      >
                        Warning
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground leading-normal">
                      Receive alerts when any item's on-hand quantity drops to or below its configured reorder point.
                    </p>
                  </div>
                </div>
                <Switch
                  id="pref-low-stock"
                  checked={currentPrefs ? Boolean(currentPrefs.notify_low_stock) : true}
                  onCheckedChange={(checked) => handleToggle('notify_low_stock', checked)}
                  disabled={updatePrefsMutation.isPending}
                />
              </div>

              {/* Out of Stock Alerts */}
              <div className="flex items-center justify-between gap-4 rounded-lg border p-3.5 transition-colors hover:bg-muted/30">
                <div className="flex items-start gap-3">
                  <div className="flex size-8 items-center justify-center rounded-lg bg-destructive/10 text-destructive shrink-0 mt-0.5">
                    <PackageX className="size-4" />
                  </div>
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="pref-out-of-stock" className="text-sm font-medium cursor-pointer">
                        Out of Stock Alerts
                      </Label>
                      <Badge variant="destructive" className="h-4 px-1 text-[10px]">
                        Critical
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground leading-normal">
                      Immediate high-priority notification when stock of an active product reaches 0 units.
                    </p>
                  </div>
                </div>
                <Switch
                  id="pref-out-of-stock"
                  checked={currentPrefs ? Boolean(currentPrefs.notify_out_of_stock) : true}
                  onCheckedChange={(checked) => handleToggle('notify_out_of_stock', checked)}
                  disabled={updatePrefsMutation.isPending}
                />
              </div>

              {/* AI Recommendations */}
              <div className="flex items-center justify-between gap-4 rounded-lg border p-3.5 transition-colors hover:bg-muted/30">
                <div className="flex items-start gap-3">
                  <div className="flex size-8 items-center justify-center rounded-lg bg-purple-500/10 text-purple-600 shrink-0 mt-0.5">
                    <Sparkles className="size-4" />
                  </div>
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="pref-ai-rec" className="text-sm font-medium cursor-pointer">
                        AI Reorder Recommendations
                      </Label>
                      <Badge
                        variant="secondary"
                        className="h-4 px-1 text-[10px] bg-purple-500/15 text-purple-700 dark:text-purple-300"
                      >
                        Automated
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground leading-normal">
                      Notify when machine-learning demand forecasting suggests replenishment orders or inventory rebalances.
                    </p>
                  </div>
                </div>
                <Switch
                  id="pref-ai-rec"
                  checked={currentPrefs ? Boolean(currentPrefs.notify_ai_recommendation) : true}
                  onCheckedChange={(checked) => handleToggle('notify_ai_recommendation', checked)}
                  disabled={updatePrefsMutation.isPending}
                />
              </div>

              {/* Purchase Order Updates */}
              <div className="flex items-center justify-between gap-4 rounded-lg border p-3.5 transition-colors hover:bg-muted/30">
                <div className="flex items-start gap-3">
                  <div className="flex size-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 shrink-0 mt-0.5">
                    <ShoppingBag className="size-4" />
                  </div>
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="pref-po-updates" className="text-sm font-medium cursor-pointer">
                        Purchase Order Updates
                      </Label>
                      <Badge
                        variant="secondary"
                        className="h-4 px-1 text-[10px] bg-blue-500/15 text-blue-700 dark:text-blue-300"
                      >
                        Operations
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground leading-normal">
                      Receive notices when purchase orders are drafted, dispatched, or goods are received at locations.
                    </p>
                  </div>
                </div>
                <Switch
                  id="pref-po-updates"
                  checked={
                    currentPrefs
                      ? Boolean(currentPrefs.notify_po_created && currentPrefs.notify_po_received)
                      : true
                  }
                  onCheckedChange={(checked) => {
                    handleToggle('notify_po_created', checked)
                    handleToggle('notify_po_received', checked)
                  }}
                  disabled={updatePrefsMutation.isPending}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {/* User Management Card */}
        {isAdmin && (
          <Card className="border-primary/30 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-primary" />
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Users className="size-5" />
                </div>
                <div>
                  <CardTitle className="text-base">User Management</CardTitle>
                  <CardDescription className="text-xs">Staff, Roles & Permissions</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Provision new accounts, assign operational roles, map employees to retail stores, and manage account deactivation.
              </p>
              <Button asChild className="w-full justify-between" size="sm">
                <Link to="/users">
                  <span>Open User Management</span>
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Stores Configuration */}
        {isAdmin && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600">
                  <Store className="size-5" />
                </div>
                <div>
                  <CardTitle className="text-base">Store Locations</CardTitle>
                  <CardDescription className="text-xs">Physical outlets & warehouses</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Configure retail stores, warehouse hubs, addresses, and physical stock-keeping points.
              </p>
              <Button asChild variant="outline" className="w-full justify-between" size="sm">
                <Link to="/stores">
                  <span>Manage Stores</span>
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Security & Access */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-purple-500/10 text-purple-600">
                <Shield className="size-5" />
              </div>
              <div>
                <CardTitle className="text-base">Security & RBAC</CardTitle>
                <CardDescription className="text-xs">Access policies & session logs</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Review role definitions, permission matrix, password requirements, and audit trail records.
            </p>
            <div className="rounded-md bg-muted p-2.5 text-xs text-muted-foreground">
              RBAC enforced server-side on all endpoints. Deactivated accounts lose access immediately.
            </div>
            <Button asChild variant="outline" className="w-full justify-between" size="sm">
              <Link to="/audit">
                <span>View Audit Logs</span>
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* System Preferences */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600">
                <Sliders className="size-5" />
              </div>
              <div>
                <CardTitle className="text-base">System Preferences</CardTitle>
                <CardDescription className="text-xs">Currency, thresholds & auto-order</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Currency localization (INR ₹), default safety stock margins, lead-time buffers, and notifications.
            </p>
            <div className="rounded-md bg-muted p-2.5 text-xs text-muted-foreground">
              Operational parameters can also be configured via Auto-Order settings.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
