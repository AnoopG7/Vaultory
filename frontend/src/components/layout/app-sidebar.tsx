import {
  BarChart3,
  Boxes,
  PackageCheck,
  ShoppingCart,
  Sparkles,
  Store as StoreIcon,
  Settings,
  Component as ComponentIcon,
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
      { to: '/', label: 'Dashboard', icon: BarChart3, end: true },
      { to: '/inventory', label: 'Inventory', icon: Boxes },
      { to: '/sales', label: 'Sales & Orders', icon: ShoppingCart },
    ],
  },
  {
    group: 'Automation',
    items: [
      { to: '/auto-order', label: 'Auto-Ordering', icon: Sparkles },
      { to: '/purchase-orders', label: 'Purchase Orders', icon: PackageCheck },
    ],
  },
  {
    group: 'Manage',
    items: [
      { to: '/stores', label: 'Stores', icon: StoreIcon, roles: ['admin'] },
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
        <div className="flex items-center gap-2 px-2 py-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Sparkles className="size-4" />
          </div>
          <div className="flex flex-col leading-none">
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
