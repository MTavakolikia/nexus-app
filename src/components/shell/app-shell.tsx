'use client'
// NEXUS app shell: sidebar (collapse + persistence + mobile drawer), topbar,
// environment switcher, notifications, persona menu, keyboard shortcuts.
import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  LayoutDashboard, Boxes, Rocket, Activity, Gauge, Siren, Flag, Network,
  ShieldCheck, Bot, Palette, TrendingUp, Presentation, FileText, MessagesSquare,
  BookOpen, PanelLeftClose, PanelLeft, Search, Bell, ChevronsUpDown, LogOut,
  Sun, Moon, Command, Menu, X, Check,
} from 'lucide-react'
import { useTheme } from 'next-themes'
import { cn } from '@/lib/utils'
import { useAppStore, type ViewKey } from '@/stores/app-store'
import { useBootstrap } from '@/features/use-platform'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu'
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { timeAgo } from '@/lib/format'
import type { Role } from '@/lib/types'

interface NavItem { view: ViewKey; label: string; icon: React.ComponentType<{ className?: string }>; shortcut?: string }
interface NavGroup { label: string; items: NavItem[] }

export const NAV_GROUPS: NavGroup[] = [
  { label: '', items: [{ view: 'overview', label: 'Overview', icon: LayoutDashboard, shortcut: 'D' }] },
  {
    label: 'Platform', items: [
      { view: 'services', label: 'Services', icon: Boxes, shortcut: 'S' },
      { view: 'deployments', label: 'Deployments', icon: Rocket },
      { view: 'flags', label: 'Feature Flags', icon: Flag },
      { view: 'architecture', label: 'Architecture', icon: Network },
    ],
  },
  {
    label: 'Insights', items: [
      { view: 'observability', label: 'Observability', icon: Activity, shortcut: 'O' },
      { view: 'performance', label: 'Performance', icon: Gauge, shortcut: 'P' },
      { view: 'incidents', label: 'Incidents', icon: Siren, shortcut: 'I' },
      { view: 'productivity', label: 'Productivity', icon: TrendingUp },
      { view: 'security', label: 'Security', icon: ShieldCheck },
    ],
  },
  {
    label: 'Engineering', items: [
      { view: 'assistant', label: 'AI Assistant', icon: Bot, shortcut: 'A' },
      { view: 'design-system', label: 'Design System', icon: Palette },
    ],
  },
  {
    label: 'About this project', items: [
      { view: 'recruiter', label: 'Recruiter Mode', icon: Presentation },
      { view: 'case-study', label: 'Case Study', icon: FileText },
      { view: 'technical', label: 'Technical Q&A', icon: MessagesSquare },
      { view: 'adr', label: 'ADRs', icon: BookOpen },
    ],
  },
]

export function AppShell({ children }: { children: React.ReactNode }) {
  const { view, params, sidebarCollapsed, toggleSidebar, mobileNavOpen, setMobileNavOpen, density, reducedMotion, setPaletteOpen } = useAppStore()
  const { data: boot } = useBootstrap()
  const qc = useQueryClient()

  // Keyboard-first: ⌘K palette, G+letter navigation
  useEffect(() => {
    let pendingG = false
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      const typing = ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPaletteOpen(true)
        return
      }
      if (typing) return
      if (pendingG) {
        pendingG = false
        const map: Record<string, ViewKey> = { d: 'overview', s: 'services', i: 'incidents', p: 'performance', o: 'observability', a: 'assistant' }
        const v = map[e.key.toLowerCase()]
        if (v) { e.preventDefault(); useAppStore.getState().navigate(v) }
        return
      }
      if (e.key.toLowerCase() === 'g') pendingG = true
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [setPaletteOpen])

  useEffect(() => {
    document.documentElement.dataset.density = density
    document.documentElement.dataset.reducedMotion = String(reducedMotion)
  }, [density, reducedMotion])

  return (
    <div className="flex h-dvh overflow-hidden bg-background" data-view={view}>
      {/* Desktop sidebar */}
      <aside
        className={cn(
          'hidden md:flex flex-col border-r border-sidebar-border bg-sidebar transition-[width] duration-200',
          sidebarCollapsed ? 'w-14' : 'w-60',
        )}
      >
        <Brand collapsed={sidebarCollapsed} />
        <SidebarNav collapsed={sidebarCollapsed} />
        <SidebarFooter collapsed={sidebarCollapsed} />
      </aside>

      {/* Mobile drawer */}
      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent side="left" className="w-72 p-0 bg-sidebar [&>button.absolute]:hidden">
          <SheetHeader className="border-b border-sidebar-border px-4 py-3">
            <SheetTitle className="flex items-center gap-2 text-left">
              <BrandMark /> <span className="font-semibold tracking-tight">NEXUS</span>
            </SheetTitle>
          </SheetHeader>
          <SidebarNav collapsed={false} onNavigate={() => setMobileNavOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main id="nexus-main" className="flex-1 overflow-y-auto scrollbar-thin">
          <div className="mx-auto w-full max-w-[1400px] px-4 py-5 md:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>

      {/* global palette + dialogs are mounted by NexusApp */}
      <CommandPaletteShortcut qc={qc} boot={boot} />
    </div>
  )
}

function CommandPaletteShortcut(_: { qc: ReturnType<typeof useQueryClient>; boot: any }) {
  return null
}

function BrandMark() {
  return (
    <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[var(--primary)] font-mono text-[13px] font-bold text-[var(--primary-foreground)]">
      N
    </div>
  )
}

function Brand({ collapsed }: { collapsed: boolean }) {
  const { data: boot } = useBootstrap()
  return (
    <div className={cn('flex h-14 items-center border-b border-sidebar-border', collapsed ? 'justify-center px-2' : 'px-4')}>
      <div className="flex min-w-0 items-center gap-2.5">
        <BrandMark />
        {!collapsed && (
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold tracking-tight">NEXUS</div>
            <div className="truncate text-[10px] text-muted-foreground">{boot?.org.name ?? 'Acme Engineering'}</div>
          </div>
        )}
      </div>
    </div>
  )
}

function SidebarNav({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  const { view, params } = useAppStore()
  const { data: boot } = useBootstrap()
  const activeBase = (itemView: ViewKey) => {
    if (view === itemView) return true
    if (itemView === 'overview') return ['overview'].includes(view)
    return false
  }
  return (
    <nav className="flex-1 space-y-4 overflow-y-auto scrollbar-thin px-2 py-3" aria-label="Primary">
      {NAV_GROUPS.map((group, gi) => (
        <div key={gi}>
          {group.label && !collapsed && (
            <div className="px-2 pb-1.5 pt-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">{group.label}</div>
          )}
          {group.label && collapsed && <div className="mx-2 my-2 border-t border-sidebar-border" />}
          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const active = activeBase(item.view) ||
                (item.view === 'services' && view === 'service') ||
                (item.view === 'deployments' && view === 'deployment') ||
                (item.view === 'incidents' && view === 'incident')
              const badge = item.view === 'incidents' ? boot?.kpis.activeIncidents : undefined
              const link = (
                <button
                  onClick={() => { useAppStore.getState().navigate(item.view); onNavigate?.() }}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'group flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-[13px] font-medium text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                    active && 'bg-sidebar-accent text-sidebar-accent-foreground',
                    collapsed && 'justify-center px-0',
                  )}
                >
                  <item.icon className={cn('h-4 w-4 shrink-0', active && 'text-[var(--primary)]')} />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                  {!collapsed && badge ? (
                    <span className="ml-auto rounded-full bg-[color-mix(in_oklch,var(--destructive)_18%,transparent)] px-1.5 py-px font-mono text-[10px] font-semibold text-[var(--destructive)]">{badge}</span>
                  ) : null}
                  {!collapsed && item.shortcut && !active && (
                    <kbd className="ml-auto hidden font-mono text-[10px] text-muted-foreground/60 group-hover:inline">G {item.shortcut}</kbd>
                  )}
                </button>
              )
              return (
                <li key={item.view}>
                  {collapsed ? (
                    <Tooltip>
                      <TooltipTrigger asChild>{link}</TooltipTrigger>
                      <TooltipContent side="right">{item.label}</TooltipContent>
                    </Tooltip>
                  ) : link}
                </li>
              )
            })}
          </ul>
        </div>
      ))}
      {!collapsed && params.ref && view === 'deployment' && (
        <div className="mx-2 rounded-md border border-border/70 bg-muted/30 px-2.5 py-2 text-[11px] text-muted-foreground">
          Viewing deployment <span className="font-mono text-foreground">{params.ref}</span>
        </div>
      )}
    </nav>
  )
}

function SidebarFooter({ collapsed }: { collapsed: boolean }) {
  const { toggleSidebar } = useAppStore()
  return (
    <div className="border-t border-sidebar-border p-2">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="sm" className={cn('h-8 w-full justify-center text-muted-foreground')} onClick={toggleSidebar} aria-label="Toggle sidebar">
            {collapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right">Collapse sidebar</TooltipContent>
      </Tooltip>
    </div>
  )
}

function Topbar() {
  const { setPaletteOpen, setMobileNavOpen, view } = useAppStore()
  const { data: boot } = useBootstrap()
  const { theme, setTheme } = useTheme()
  const qc = useQueryClient()
  const session = boot?.session

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b border-border/70 bg-background/85 px-3 backdrop-blur md:px-5">
      <Button variant="ghost" size="icon" className="md:hidden h-8 w-8" onClick={() => setMobileNavOpen(true)} aria-label="Open navigation">
        <Menu className="h-4 w-4" />
      </Button>
      <div className="hidden min-w-0 items-center gap-1.5 text-[13px] text-muted-foreground md:flex">
        <button className="hover:text-foreground" onClick={() => useAppStore.getState().navigate('overview')}>{boot?.org.name ?? 'Acme'}</button>
        <span className="text-muted-foreground/50">/</span>
        <span className="truncate font-medium text-foreground">{viewLabel(view)}</span>
      </div>

      <button
        onClick={() => setPaletteOpen(true)}
        className="ml-auto flex h-8 w-8 items-center justify-center rounded-md border border-border bg-card text-muted-foreground transition-colors hover:text-foreground md:w-64 md:justify-start md:gap-2 md:px-3"
        aria-label="Open command palette"
      >
        <Search className="h-3.5 w-3.5" />
        <span className="hidden text-xs md:inline">Search or run a command…</span>
        <kbd className="ml-auto hidden items-center gap-0.5 rounded border border-border bg-muted px-1 font-mono text-[10px] text-muted-foreground md:flex">
          <Command className="h-2.5 w-2.5" />K
        </kbd>
      </button>

      <EnvSwitcher />

      <NotificationsMenu />

      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} aria-label="Toggle theme">
            <Sun className="h-4 w-4 dark:hidden" />
            <Moon className="hidden h-4 w-4 dark:block" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Toggle theme</TooltipContent>
      </Tooltip>

      {session && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 rounded-md px-1.5 py-1 transition-colors hover:bg-muted" aria-label="Account menu">
              <Avatar className="h-7 w-7">
                <AvatarFallback style={{ background: session.avatarColor }} className="text-[11px] font-semibold text-white">
                  {session.name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
                </AvatarFallback>
              </Avatar>
              <div className="hidden text-left lg:block">
                <div className="text-xs font-medium leading-tight">{session.name}</div>
                <div className="text-[10px] leading-tight text-muted-foreground">{prettyRole(session.role)}</div>
              </div>
              <ChevronsUpDown className="hidden h-3 w-3 text-muted-foreground lg:block" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel>
              <div className="text-sm font-medium">{session.name}</div>
              <div className="text-xs font-normal text-muted-foreground">{session.title}</div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <div className="px-2 py-1.5">
              <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Role (server-enforced RBAC)</div>
              <Badge variant="outline" className="font-mono text-[10px]">{session.role}</Badge>
              <div className="mt-2 text-[10px] leading-relaxed text-muted-foreground">{session.permissions.length} permissions resolved server-side</div>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Switch persona (demo)</DropdownMenuLabel>
            {(PERSONAS).map((p) => (
              <DropdownMenuCheckboxItem
                key={p.email}
                checked={session.email === p.email}
                onSelect={async () => {
                  const { api } = await import('@/lib/api')
                  await api.switchPersona(p.email)
                  qc.invalidateQueries()
                }}
              >
                <span className="flex w-full items-center gap-2">
                  <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
                  <span className="text-xs">{p.name}</span>
                  <span className="ml-auto font-mono text-[9px] text-muted-foreground">{prettyRole(p.role as Role)}</span>
                </span>
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </header>
  )
}

const PERSONAS = [
  { email: 'mohammad@acme.dev', name: 'Mohammad Tavakoli', role: 'TEAM_LEAD', color: '#14b8a6' },
  { email: 'sarah@acme.dev', name: 'Sarah Chen', role: 'PLATFORM_ADMIN', color: '#f59e0b' },
  { email: 'alex@acme.dev', name: 'Alex Morgan', role: 'ADMIN', color: '#8b5cf6' },
  { email: 'emma@acme.dev', name: 'Emma Davis', role: 'SECURITY_ADMIN', color: '#ef4444' },
  { email: 'lucas@acme.dev', name: 'Lucas Meyer', role: 'DEVELOPER', color: '#eab308' },
]

export function prettyRole(role: string): string {
  return role.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())
}

function viewLabel(view: ViewKey): string {
  const map: Record<ViewKey, string> = {
    overview: 'Overview', services: 'Service Catalog', service: 'Service', deployments: 'Deployment Center',
    deployment: 'Deployment', observability: 'Observability', performance: 'Performance', incidents: 'Incidents',
    incident: 'Incident', flags: 'Feature Flags', architecture: 'Architecture', assistant: 'AI Assistant',
    'design-system': 'Design System', security: 'Security', productivity: 'Productivity',
    recruiter: 'Recruiter Mode', 'case-study': 'Case Study', technical: 'Technical Q&A', adr: 'ADRs',
  }
  return map[view]
}

function EnvSwitcher() {
  const { envFilter, setEnvFilter } = useAppStore()
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-1.5 px-2.5 font-mono text-[11px]">
          <span className={cn('h-1.5 w-1.5 rounded-full', envFilter === 'production' ? 'bg-[var(--success)]' : 'bg-[var(--warning)]')} />
          {envFilter}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {['production', 'staging', 'development'].map((e) => (
          <DropdownMenuItem key={e} onSelect={() => setEnvFilter(e)} className="font-mono text-xs">
            <Check className={cn('mr-1.5 h-3 w-3', envFilter === e ? 'opacity-100' : 'opacity-0')} />
            {e}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function NotificationsMenu() {
  const { data: boot } = useBootstrap()
  const navigate = useAppStore((s) => s.navigate)
  const notifications = boot?.notifications ?? []
  const unread = notifications.filter((n) => !n.read).length
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-8 w-8" aria-label={`Notifications (${unread} unread)`}>
          <Bell className="h-4 w-4" />
          {unread > 0 && <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-[var(--destructive)] live-dot" />}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <span className="text-xs font-semibold">Notifications</span>
          {unread > 0 && <Badge variant="secondary" className="font-mono text-[10px]">{unread} new</Badge>}
        </div>
        <div className="max-h-80 overflow-y-auto scrollbar-thin">
          {notifications.length === 0 ? (
            <div className="px-3 py-8 text-center text-xs text-muted-foreground">You are all caught up.</div>
          ) : notifications.map((n) => (
            <button
              key={n.id}
              onClick={() => {
                if (!n.viewKey) return
                const [kind, arg] = n.viewKey.split(':')
                if (kind === 'view') navigate(arg as ViewKey)
                else if (kind === 'incident') navigate('incident', { ref: arg })
                else if (kind === 'deployment') navigate('deployments')
              }}
              className={cn('flex w-full gap-2.5 border-b border-border/60 px-3 py-2.5 text-left transition-colors last:border-0 hover:bg-muted/50', !n.read && 'bg-[color-mix(in_oklch,var(--primary)_5%,transparent)]')}
            >
              <span className={cn('mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full', n.read ? 'bg-muted-foreground/40' : 'bg-[var(--primary)]')} />
              <span className="min-w-0">
                <span className="block truncate text-xs font-medium">{n.title}</span>
                {n.body && <span className="mt-0.5 block line-clamp-2 text-[11px] leading-snug text-muted-foreground">{n.body}</span>}
                <span className="mt-1 block text-[10px] text-muted-foreground/70">{timeAgo(n.createdAt)}</span>
              </span>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}

// keep X import used (mobile sheet close affordance in future layouts)
void X; void LogOut
