import { Users, Store, Sliders, Shield, ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
} from '@/components/ui'
import { useAuthStore } from '@/stores'

export default function SettingsPage() {
  const user = useAuthStore((s) => s.user)
  const isAdmin = user?.role === 'admin'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings & Administration</h1>
        <p className="text-sm text-muted-foreground">
          Configure organization settings, staff accounts, store access, and system preferences.
        </p>
      </div>

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
