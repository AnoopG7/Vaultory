import {
  BarChart3,
  Boxes,
  Package,
  PackageCheck,
  ShoppingCart,
  Sparkles,
  Store as StoreIcon,
  Settings,
  Component as ComponentIcon,
  Truck,
  Users,
} from 'lucide-react'
import { NavLink } from 'react-router-dom'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@/components/ui'
import { cn } from '@/lib'
import { useAuthStore } from '@/stores'
import type { UserRole } from '@/lib'

type NavItem = {
  to: string
  label: string
  icon: typeof BarChart3
  end?: boolean
  roles?: UserRole[]
}

type NavGroup = {
  group: string
  items: NavItem[]
}

const navGroups: NavGroup[] = [
  {
    group: 'Operations',
    items: [
      { to: '/dashboard', label: 'Dashboard', icon: BarChart3, end: true },
      {
        to: '/inventory',
        label: 'Inventory',
        icon: Boxes,
        roles: ['admin', 'store_staff', 'senior_stakeholder'],
      },
      { to: '/sales', label: 'Sales & Orders', icon: ShoppingCart },
    ],
  },
  {
    group: 'Automation',
    items: [
      {
        to: '/auto-order',
        label: 'Auto-Ordering',
        icon: Sparkles,
        roles: ['admin', 'store_staff'],
      },
      {
        to: '/purchase-orders',
        label: 'Purchase Orders',
        icon: PackageCheck,
        roles: ['admin', 'store_staff'],
      },
    ],
  },
  {
    group: 'Manage',
    items: [
      { to: '/users', label: 'Users', icon: Users, roles: ['admin'] },
      { to: '/products', label: 'Products', icon: Package, roles: ['admin'] },
      { to: '/suppliers', label: 'Suppliers', icon: Truck, roles: ['admin'] },
      { to: '/stores', label: 'Stores', icon: StoreIcon, roles: ['admin', 'senior_stakeholder'] },
      { to: '/reports', label: 'Reports', icon: BarChart3, roles: ['admin', 'senior_stakeholder'] },
      { to: '/settings', label: 'Settings', icon: Settings, roles: ['admin'] },
    ],
  },
  {
    group: 'Dev',
    items: [{ to: '/components', label: 'Components', icon: ComponentIcon, roles: ['admin'] }],
  },
]

function canSee(item: NavItem, role: UserRole | undefined): boolean {
  if (!item.roles) return true
  if (!role) return false
  return item.roles.includes(role)
}

export function AppSidebar() {
  const user = useAuthStore((s) => s.user)

  const visibleGroups = navGroups
    .map((group) => ({ ...group, items: group.items.filter((i) => canSee(i, user?.role)) }))
    .filter((group) => group.items.length > 0)

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-2 group-data-[collapsible=icon]:w-full group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Sparkles className="size-4" />
          </div>
          <div className="flex min-w-0 flex-col leading-none group-data-[collapsible=icon]:hidden">
            <span className="font-semibold">Vaultory</span>
            <span className="text-xs text-muted-foreground">Retail Ops</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        {visibleGroups.map((group) => (
          <SidebarGroup key={group.group}>
            <SidebarGroupLabel>{group.group}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.to}>
                    <SidebarMenuButton asChild tooltip={item.label}>
                      <NavLink
                        to={item.to}
                        end={item.end}
                        className={({ isActive }) =>
                          cn(isActive && 'bg-accent text-accent-foreground')
                        }
                      >
                        <item.icon />
                        <span>{item.label}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter />
      <SidebarRail />
    </Sidebar>
  )
}
