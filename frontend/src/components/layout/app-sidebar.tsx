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

const nav = [
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
      { to: '/stores', label: 'Stores', icon: StoreIcon },
      { to: '/reports', label: 'Reports', icon: BarChart3 },
      { to: '/settings', label: 'Settings', icon: Settings },
    ],
  },
  {
    group: 'Dev',
    items: [{ to: '/components', label: 'Components', icon: ComponentIcon }],
  },
]

export function AppSidebar() {
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
        {nav.map((group) => (
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
