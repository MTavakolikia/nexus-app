'use client'
// Command palette (⌘K): navigation, service/deployment/incident jump, docs search,
// and privileged actions. Keyboard-first (cmdk).
import { useEffect, useState } from 'react'
import { Command } from 'cmdk'
import {
  LayoutDashboard, Boxes, Rocket, Activity, Gauge, Siren, Flag, Network, ShieldCheck,
  Bot, Palette, TrendingUp, Presentation, FileText, MessagesSquare, BookOpen,
  Sparkles, Plus, Search, CornerDownLeft,
} from 'lucide-react'
import { useAppStore, type ViewKey } from '@/stores/app-store'
import { useBootstrap, useDeployments, useIncidents, useServices } from '@/features/use-platform'
import { api } from '@/lib/api'
import { timeAgo } from '@/lib/format'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { VisuallyHidden } from '@radix-ui/react-visually-hidden'

export function CommandPalette() {
  const { paletteOpen, setPaletteOpen, navigate, setDeployDialogOpen, setIncidentDialogOpen } = useAppStore()
  const { data: boot } = useBootstrap()
  const { data: services } = useServices()
  const { data: deployments } = useDeployments({ limit: '8' })
  const { data: incidents } = useIncidents()
  const [query, setQuery] = useState('')
  const [docs, setDocs] = useState<{ id: string; title: string; ref?: string; snippet: string }[]>([])

  useEffect(() => {
    if (!paletteOpen) {
      const t = setTimeout(() => setQuery(''), 0)
      return () => clearTimeout(t)
    }
  }, [paletteOpen])

  useEffect(() => {
    if (query.trim().length < 3) {
      const t0 = setTimeout(() => setDocs([]), 0)
      return () => clearTimeout(t0)
    }
    const t = setTimeout(async () => {
      try {
        const res = await api.knowledge(query)
        setDocs(res.results)
      } catch { setDocs([]) }
    }, 220)
    return () => clearTimeout(t)
  }, [query])

  const go = (view: ViewKey, params?: Parameters<typeof navigate>[1]) => { navigate(view, params) }

  return (
    <Dialog open={paletteOpen} onOpenChange={setPaletteOpen}>
      <DialogContent className="top-[18%] translate-y-0 gap-0 overflow-hidden p-0 sm:max-w-xl" aria-describedby={undefined}>
        <VisuallyHidden><DialogTitle>Command palette</DialogTitle></VisuallyHidden>
        <Command loop className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-widest [&_[cmdk-group-heading]]:text-muted-foreground/70">
          <div className="flex items-center gap-2 border-b border-border px-3">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <Command.Input
              autoFocus
              value={query}
              onValueChange={setQuery}
              placeholder="Search services, deployments, incidents, docs…"
              className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
            />
            <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">ESC</kbd>
          </div>
          <Command.List className="max-h-[52vh] overflow-y-auto scrollbar-thin p-1.5">
            <Command.Empty className="py-8 text-center text-sm text-muted-foreground">No matches. Try “checkout”, “rollback”, “ADR”…</Command.Empty>

            <Command.Group heading="Actions">
              <PaletteItem icon={<Sparkles className="h-4 w-4 text-[var(--primary)]" />} label="Ask AI: why did checkout latency increase?" hint="AI investigation" onSelect={() => go('assistant', { tab: 'investigate-checkout' })} />
              <PaletteItem icon={<Rocket className="h-4 w-4" />} label="Start a deployment…" hint="deployments.create" onSelect={() => { setPaletteOpen(false); setDeployDialogOpen(true) }} />
              <PaletteItem icon={<Siren className="h-4 w-4" />} label="Create an incident…" hint="incidents.create" onSelect={() => { setPaletteOpen(false); setIncidentDialogOpen(true) }} />
            </Command.Group>

            <Command.Group heading="Navigate">
              <PaletteItem icon={<LayoutDashboard className="h-4 w-4" />} label="Overview" hint="G D" onSelect={() => go('overview')} />
              <PaletteItem icon={<Boxes className="h-4 w-4" />} label="Service Catalog" hint="G S" onSelect={() => go('services')} />
              <PaletteItem icon={<Rocket className="h-4 w-4" />} label="Deployment Center" onSelect={() => go('deployments')} />
              <PaletteItem icon={<Activity className="h-4 w-4" />} label="Observability" hint="G O" onSelect={() => go('observability')} />
              <PaletteItem icon={<Gauge className="h-4 w-4" />} label="Performance" hint="G P" onSelect={() => go('performance')} />
              <PaletteItem icon={<Siren className="h-4 w-4" />} label="Incidents" hint="G I" onSelect={() => go('incidents')} />
              <PaletteItem icon={<Flag className="h-4 w-4" />} label="Feature Flags" onSelect={() => go('flags')} />
              <PaletteItem icon={<Network className="h-4 w-4" />} label="Architecture" onSelect={() => go('architecture')} />
              <PaletteItem icon={<Bot className="h-4 w-4" />} label="AI Assistant" hint="G A" onSelect={() => go('assistant')} />
              <PaletteItem icon={<Palette className="h-4 w-4" />} label="Design System" onSelect={() => go('design-system')} />
              <PaletteItem icon={<TrendingUp className="h-4 w-4" />} label="Productivity" onSelect={() => go('productivity')} />
              <PaletteItem icon={<ShieldCheck className="h-4 w-4" />} label="Security" onSelect={() => go('security')} />
              <PaletteItem icon={<Presentation className="h-4 w-4" />} label="Recruiter Mode" onSelect={() => go('recruiter')} />
              <PaletteItem icon={<FileText className="h-4 w-4" />} label="Case Study" onSelect={() => go('case-study')} />
              <PaletteItem icon={<MessagesSquare className="h-4 w-4" />} label="Technical Q&A" onSelect={() => go('technical')} />
              <PaletteItem icon={<BookOpen className="h-4 w-4" />} label="Architecture Decision Records" onSelect={() => go('adr')} />
            </Command.Group>

            {!!services?.services.length && (
              <Command.Group heading="Services">
                {services.services.slice(0, 12).map((s) => (
                  <PaletteItem key={s.slug} icon={<Boxes className="h-4 w-4" />} label={s.name} hint={s.status} onSelect={() => go('service', { slug: s.slug })} />
                ))}
              </Command.Group>
            )}

            {!!deployments?.deployments.length && (
              <Command.Group heading="Recent deployments">
                {deployments.deployments.slice(0, 6).map((d) => (
                  <PaletteItem
                    key={d.id}
                    icon={<Rocket className="h-4 w-4" />}
                    label={`${d.ref} · ${d.serviceName} ${d.version}`}
                    hint={timeAgo(d.startedAt)}
                    onSelect={() => go('deployment', { ref: d.ref })}
                  />
                ))}
              </Command.Group>
            )}

            {!!incidents?.incidents.length && (
              <Command.Group heading="Incidents">
                {incidents.incidents.slice(0, 5).map((i) => (
                  <PaletteItem key={i.id} icon={<Siren className="h-4 w-4" />} label={`${i.ref} · ${i.title}`} hint={i.severity} onSelect={() => go('incident', { ref: i.ref })} />
                ))}
              </Command.Group>
            )}

            {docs.length > 0 && (
              <Command.Group heading="Engineering knowledge">
                {docs.map((d) => (
                  <PaletteItem key={d.id} icon={<BookOpen className="h-4 w-4" />} label={d.title} hint={d.ref} onSelect={() => go('adr', { docId: d.id })} />
                ))}
              </Command.Group>
            )}
          </Command.List>
          <div className="flex items-center gap-3 border-t border-border px-3 py-2 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1"><kbd className="rounded border border-border bg-muted px-1 font-mono">↑↓</kbd> navigate</span>
            <span className="flex items-center gap-1"><kbd className="rounded border border-border bg-muted px-1 font-mono"><CornerDownLeft className="h-2.5 w-2.5" /></kbd> select</span>
            <span className="ml-auto">{boot ? `Signed in as ${boot.session.name.split(' ')[0]} · ${boot.session.role}` : ''}</span>
          </div>
        </Command>
      </DialogContent>
    </Dialog>
  )
}

function PaletteItem({ icon, label, hint, onSelect }: {
  icon: React.ReactNode; label: string; hint?: string; onSelect: () => void
}) {
  return (
    <Command.Item
      onSelect={onSelect}
      className="flex cursor-pointer items-center gap-2.5 rounded-md px-3 py-2 text-sm text-foreground/90 data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground"
    >
      {icon}
      <span className="truncate">{label}</span>
      {hint && <span className="ml-auto shrink-0 font-mono text-[10px] text-muted-foreground">{hint}</span>}
    </Command.Item>
  )
}

void Plus
