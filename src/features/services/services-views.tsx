'use client'
// Service Catalog + Service Detail with tabbed workspace.
import { useState } from 'react'
import { useServices, useService, useInvalidatePlatform } from '@/features/use-platform'
import { useAppStore } from '@/stores/app-store'
import { StatusBadge, PageHeader, SectionTitle, EmptyState, MetricHint, Sparkline } from '@/components/shared/kit'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Line, LineChart, CartesianGrid, ResponsiveContainer, Tooltip as ChartTooltip, XAxis, YAxis } from 'recharts'
import { Boxes, Search, GitBranch, Star, Clock, ArrowRight, Users, FileCode2, Gauge, GitPullRequest, ShieldAlert, Network, Siren } from 'lucide-react'
import { timeAgo, shortSha, ms, kb, duration } from '@/lib/format'
import { cn } from '@/lib/utils'

const chartStyle = { backgroundColor: 'var(--popover)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }

export function ServicesView() {
  const [q, setQ] = useState('')
  const [team, setTeam] = useState('')
  const { data, isLoading } = useServices({ q, team })

  return (
    <div className="space-y-4">
      <PageHeader
        icon={<Boxes className="h-4 w-4" />}
        title="Service Catalog"
        description="Every service, its owner, health and delivery posture — the platform's source of truth."
      />
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-56 flex-1 md:max-w-sm">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter services…" className="h-9 pl-8 text-sm" aria-label="Filter services" />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {['', 'frontend-platform', 'checkout', 'payments', 'infrastructure', 'ai-platform', 'security', 'data'].map((t) => (
            <button
              key={t || 'all'}
              onClick={() => setTeam(t)}
              className={cn(
                'rounded-md border px-2.5 py-1 text-[11px] font-medium transition-colors',
                team === t ? 'border-[var(--primary)]/50 bg-[color-mix(in_oklch,var(--primary)_12%,transparent)] text-foreground' : 'border-border text-muted-foreground hover:text-foreground',
              )}
            >
              {t || 'All teams'}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-40" />)}
        </div>
      ) : !data?.services.length ? (
        <EmptyState icon={<Boxes className="h-5 w-5" />} title="No services match" body="Adjust the filter or clear the search to see the catalog." />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {data.services.map((s) => (
            <ServiceCard key={s.id} service={s} />
          ))}
        </div>
      )}
    </div>
  )
}

function ServiceCard({ service: s }: { service: any }) {
  const navigate = useAppStore((st) => st.navigate)
  return (
    <button
      onClick={() => navigate('service', { slug: s.slug })}
      className="nexus-card group flex flex-col p-4 text-left transition-colors hover:border-ring/40"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="truncate font-mono text-sm font-semibold">{s.name}</span>
            {s.tier === 'tier-1' && <Badge variant="outline" className="px-1 py-0 font-mono text-[9px] text-[var(--warning)]">T1</Badge>}
          </div>
          <div className="mt-0.5 truncate text-[11px] text-muted-foreground">{s.framework} · {s.language}</div>
        </div>
        <StatusBadge status={s.status} live />
      </div>
      <p className="mt-2 line-clamp-2 min-h-8 text-xs leading-relaxed text-muted-foreground">{s.description}</p>
      <div className="mt-3 grid grid-cols-3 gap-2 border-t border-border/60 pt-3 text-center">
        <div>
          <div className="font-mono text-xs font-semibold">{s.p95Latency7d != null ? ms(s.p95Latency7d) : '—'}</div>
          <div className="text-[9px] uppercase tracking-wide text-muted-foreground">p95</div>
        </div>
        <div>
          <div className={cn('font-mono text-xs font-semibold', (s.errorRate7d ?? 0) > 0.5 && 'text-[var(--destructive)]')}>
            {s.errorRate7d != null ? `${s.errorRate7d.toFixed(2)}%` : '—'}
          </div>
          <div className="text-[9px] uppercase tracking-wide text-muted-foreground">errors</div>
        </div>
        <div>
          <div className="font-mono text-xs font-semibold">{s.availability7d != null ? `${s.availability7d.toFixed(2)}%` : '—'}</div>
          <div className="text-[9px] uppercase tracking-wide text-muted-foreground">uptime</div>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2 text-[10px] text-muted-foreground">
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: s.team.color }} />
        <span className="truncate">{s.team.name}</span>
        <span className="ml-auto flex items-center gap-1">
          {s.openIncidents > 0 && <span className="font-medium text-[var(--destructive)]">{s.openIncidents} open incident{s.openIncidents > 1 ? 's' : ''}</span>}
          <ArrowRight className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
        </span>
      </div>
    </button>
  )
}

// ── Service detail ───────────────────────────────────────────────────────────
const TABS = ['Overview', 'Deployments', 'Performance', 'Observability', 'Incidents', 'Dependencies', 'Ownership'] as const

export function ServiceDetailView({ slug }: { slug: string }) {
  const { data, isLoading } = useService(slug)
  const { params, navigate } = useAppStore()
  const activeTab = params.tab || 'Overview'

  if (isLoading || !data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-80" />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20" />)}</div>
        <Skeleton className="h-72" />
      </div>
    )
  }
  const svc = data.service

  return (
    <div className="space-y-4">
      <PageHeader
        icon={<FileCode2 className="h-4 w-4" />}
        title={<span className="font-mono">{svc.name}</span>}
        description={svc.description}
        actions={
          <>
            <StatusBadge status={svc.status} live />
            <Badge variant="outline" className="font-mono text-[10px]">{svc.version}</Badge>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <MetricTile label={<MetricHint term="p95 latency">95th percentile response time over 7 days (production).</MetricHint>} value={ms(data.metrics.p95Latency7d)} />
        <MetricTile label={<MetricHint term="Error rate">Share of failed requests over 7 days. SLO budget: ≤ 0.5%.</MetricHint>} value={`${(data.metrics.errorRate7d ?? 0).toFixed(3)}%`} tone={(data.metrics.errorRate7d ?? 0) > 0.5 ? 'error' : 'default'} />
        <MetricTile label={<MetricHint term="Throughput">Average requests per second over the last hour.</MetricHint>} value={`${Math.round((data.metrics.requests7d ?? 0))} rps`} />
        <MetricTile label={<MetricHint term="Tier">Business criticality: tier-1 is revenue critical, drives on-call and rollout policy.</MetricHint>} value={svc.tier} sub={svc.kind} />
      </div>

      <Tabs value={activeTab} onValueChange={(t) => navigate('service', { slug, tab: t })}>
        <TabsList className="h-9 w-full justify-start overflow-x-auto bg-muted/50 scrollbar-thin">
          {TABS.map((t) => <TabsTrigger key={t} value={t} className="text-xs">{t}</TabsTrigger>)}
        </TabsList>

        <TabsContent value="Overview" className="mt-4 space-y-4">
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="nexus-card p-5 lg:col-span-2">
              <SectionTitle aside={<span className="text-[11px] text-muted-foreground">7 days</span>}>p95 latency</SectionTitle>
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.series.p95} margin={{ top: 4, right: 4, bottom: 0, left: -18 }}>
                    <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="ts" tickFormatter={(t) => new Date(t).getHours() + 'h'} tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} tickLine={false} axisLine={false} interval={11} />
                    <YAxis tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} tickLine={false} axisLine={false} tickFormatter={(v) => ms(v)} />
                    <ChartTooltip contentStyle={chartStyle} labelFormatter={(t) => timeAgo(t)} />
                    <Line type="monotone" dataKey="v" name="p95" stroke="var(--chart-1)" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="nexus-card p-5">
              <SectionTitle>Repository</SectionTitle>
              {svc.repository ? (
                <div className="space-y-3 text-xs">
                  <div className="flex items-center gap-2">
                    <GitBranch className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="font-mono">{svc.repository.name}</span>
                  </div>
                  <div className="rounded-md border border-border/60 bg-muted/20 p-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="font-mono text-[10px]">{shortSha(svc.repository.lastCommitSha)}</Badge>
                      <span className="text-[10px] text-muted-foreground">{timeAgo(svc.repository.lastCommitAt as any)}</span>
                      <StatusBadge status={svc.repository.buildStatus} className="ml-auto" />
                    </div>
                    <p className="mt-2 line-clamp-2 text-[11px] text-muted-foreground">{svc.repository.lastCommitMessage}</p>
                  </div>
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span className="flex items-center gap-1.5"><GitPullRequest className="h-3.5 w-3.5" /> {svc.repository.openPrs} open PRs</span>
                    <span className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5" /> {svc.repository.contributors} contributors</span>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-muted-foreground">No repository connected.</div>
              )}
            </div>
          </div>
          {!!data.vulnerabilities.length && (
            <div className="nexus-card border-[color-mix(in_oklch,var(--warning)_40%,transparent)] p-5">
              <SectionTitle aside={<ShieldAlert className="h-3.5 w-3.5 text-[var(--warning)]" />}>Open vulnerabilities</SectionTitle>
              <div className="space-y-2">
                {data.vulnerabilities.map((v: any) => (
                  <div key={v.cve} className="flex items-start gap-3 text-xs">
                    <Badge variant="outline" className="shrink-0 font-mono text-[10px]">{v.cve}</Badge>
                    <div className="min-w-0">
                      <div className="font-mono">{v.pkg} <span className="text-muted-foreground">CVSS {v.cvss}</span></div>
                      <div className="mt-0.5 line-clamp-1 text-muted-foreground">{v.description}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="Deployments" className="mt-4">
          <div className="nexus-card divide-y divide-border/60 p-0">
            {data.deployments.map((d: any) => (
              <button key={d.id} onClick={() => useAppStore.getState().navigate('deployment', { ref: d.ref })} className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-muted/30">
                <span className="w-20 shrink-0 font-mono text-xs font-medium text-[var(--primary)]">{d.ref}</span>
                <span className="w-16 shrink-0 font-mono text-xs text-muted-foreground">{d.version}</span>
                <span className="hidden min-w-0 flex-1 truncate text-xs text-muted-foreground md:block">{d.changeSummary}</span>
                <span className="ml-auto flex shrink-0 items-center gap-2 text-[11px] text-muted-foreground">
                  <Clock className="h-3 w-3" />{timeAgo(d.startedAt)}
                </span>
                <StatusBadge status={d.status} className="w-28 justify-center" />
              </button>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="Performance" className="mt-4">
          {data.performance.length ? (
            <div className="grid gap-3 md:grid-cols-2">
              {data.performance.map((p: any) => (
                <div key={p.route} className="nexus-card p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-semibold">{p.route}</span>
                    <span className={cn('font-mono text-sm font-bold', p.score >= 90 ? 'text-[var(--success)]' : p.score >= 75 ? 'text-[var(--warning)]' : 'text-[var(--destructive)]')}>{p.score}</span>
                  </div>
                  <div className="mt-3 grid grid-cols-4 gap-2 text-center">
                    {[[ms(p.lcpMs), 'LCP'], [ms(p.inpMs), 'INP'], [p.cls.toFixed(3), 'CLS'], [kb(p.bundleKb), 'JS']].map(([v, l]) => (
                      <div key={l as string} className="rounded-md bg-muted/30 py-2">
                        <div className="font-mono text-xs font-semibold">{v}</div>
                        <div className="text-[9px] uppercase text-muted-foreground">{l}</div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 text-right text-[10px] text-muted-foreground">as of {timeAgo(p.ts)}</div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState icon={<Gauge className="h-5 w-5" />} title="No performance snapshots" body="This service has no frontend performance telemetry. Performance Center monitors frontend services." />
          )}
        </TabsContent>

        <TabsContent value="Observability" className="mt-4 space-y-4">
          <div className="nexus-card p-5">
            <SectionTitle>Error rate (7d)</SectionTitle>
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.series.errors} margin={{ top: 4, right: 4, bottom: 0, left: -18 }}>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="ts" tickFormatter={(t) => new Date(t).getHours() + 'h'} tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} tickLine={false} axisLine={false} interval={11} />
                  <YAxis tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} />
                  <ChartTooltip contentStyle={chartStyle} />
                  <Line type="monotone" dataKey="v" name="error %" stroke="var(--chart-3)" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => useAppStore.getState().navigate('observability')}>
            <Network className="h-3.5 w-3.5" /> Open full Observability
          </Button>
        </TabsContent>

        <TabsContent value="Incidents" className="mt-4">
          {data.incidents.length ? (
            <div className="nexus-card divide-y divide-border/60 p-0">
              {data.incidents.map((i: any) => (
                <button key={i.id} onClick={() => useAppStore.getState().navigate('incident', { ref: i.ref })} className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/30">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs font-medium">{i.ref} · {i.title}</div>
                    <div className="text-[10px] text-muted-foreground">{timeAgo(i.startedAt)} · {i.affectedServices.join(', ')}</div>
                  </div>
                  <StatusBadge status={i.status} className="w-24 justify-center" />
                </button>
              ))}
            </div>
          ) : (
            <EmptyState icon={<Siren className="h-5 w-5" />} title="No incidents on record" body="This service has a clean incident history. Synthetic checks and SLO alerts remain active." />
          )}
        </TabsContent>

        <TabsContent value="Dependencies" className="mt-4">
          <div className="nexus-card p-5">
            <SectionTitle aside={<Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => useAppStore.getState().navigate('architecture')}>Open graph</Button>}>
              Architecture neighbours
            </SectionTitle>
            <div className="grid gap-2 sm:grid-cols-2">
              {data.dependencies.map((d: any, idx: number) => (
                <div key={idx} className="flex items-center gap-2.5 rounded-md border border-border/60 bg-muted/20 px-3 py-2">
                  <Badge variant="outline" className={cn('shrink-0 text-[9px]', d.direction === 'upstream' ? 'text-[var(--info)]' : 'text-[var(--success)]')}>
                    {d.direction === 'upstream' ? 'depends on' : 'used by'}
                  </Badge>
                  <span className="truncate font-mono text-xs">{d.label}</span>
                  {d.slug && (
                    <button className="ml-auto text-[10px] text-[var(--primary)] hover:underline" onClick={() => useAppStore.getState().navigate('service', { slug: d.slug })}>
                      open
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="Ownership" className="mt-4">
          <div className="nexus-card p-5">
            <SectionTitle>Team &amp; ownership</SectionTitle>
            <div className="flex flex-wrap items-center gap-4 text-xs">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full" style={{ background: svc.team.color }} />
                <span className="font-medium">{svc.team.name}</span>
              </div>
              {svc.owner && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: svc.owner.avatarColor }} />
                  Owner: <span className="font-medium text-foreground">{svc.owner.name}</span> · {svc.owner.title}
                </div>
              )}
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {svc.team.members?.map((m: any) => (
                <div key={m.id} className="flex items-center gap-2 rounded-md border border-border/60 px-3 py-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full text-[9px] font-bold text-white" style={{ background: m.user.avatarColor }}>
                    {m.user.name.split(' ').map((n: string) => n[0]).slice(0, 2).join('')}
                  </span>
                  <div className="min-w-0">
                    <div className="truncate text-xs font-medium">{m.user.name}</div>
                    <div className="text-[10px] text-muted-foreground">{m.user.title} · {m.role}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function MetricTile({ label, value, sub, tone }: { label: React.ReactNode; value: string; sub?: string; tone?: 'default' | 'error' }) {
  return (
    <div className="nexus-card p-4">
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className={cn('mt-1 font-mono text-xl font-semibold tracking-tight', tone === 'error' && 'text-[var(--destructive)]')}>{value}</div>
      {sub && <div className="text-[10px] text-muted-foreground">{sub}</div>}
    </div>
  )
}

void Star; void duration; void useInvalidatePlatform; void Sparkline; void Dialog; void DialogContent; void DialogHeader; void DialogTitle; void DialogFooter
