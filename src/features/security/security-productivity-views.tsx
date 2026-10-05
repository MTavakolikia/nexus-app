'use client'
// Security Center + Developer Productivity (DORA-style analytics).
import { useState } from 'react'
import { useSecurity, useAudit, useProductivity } from '@/features/use-platform'
import { PageHeader, SectionTitle, StatusBadge, MetricHint } from '@/components/shared/kit'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip as ChartTooltip, XAxis, YAxis, Legend, Line, LineChart } from 'recharts'
import { ShieldCheck, ShieldAlert, Bug, KeyRound, UserCheck, EyeOff, TrendingUp, Timer, GitMerge, Package, AlertTriangle } from 'lucide-react'
import { timeAgo, dateShort, clockTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/stores/app-store'

const chartStyle = { backgroundColor: 'var(--popover)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }

export function SecurityView() {
  const { data, isLoading } = useSecurity()
  const { data: audit } = useAudit()

  if (isLoading || !data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-80" />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20" />)}</div>
        <Skeleton className="h-64" />
      </div>
    )
  }

  const eventIcon: Record<string, typeof ShieldAlert> = {
    failed_login: KeyRound, permission_change: UserCheck, api_key_rotated: KeyRound,
    suspicious_activity: EyeOff, flag_changed: AlertTriangle,
  }

  return (
    <div className="space-y-4">
      <PageHeader
        icon={<ShieldCheck className="h-4 w-4" />}
        title="Security"
        description="Dependency CVEs, authentication events and governance — the security posture of the whole platform."
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {data.bySeverity.map((s) => (
          <div key={s.severity} className="nexus-card p-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium capitalize text-muted-foreground">{s.severity}</span>
              <Bug className={cn('h-3.5 w-3.5', s.severity === 'critical' || s.severity === 'high' ? 'text-[var(--destructive)]' : s.severity === 'medium' ? 'text-[var(--warning)]' : 'text-muted-foreground')} />
            </div>
            <div className={cn('mt-1 font-mono text-2xl font-semibold', s.count > 0 && s.severity !== 'low' && 'text-[var(--warning)]')}>{s.count}</div>
            <div className="text-[10px] text-muted-foreground">open</div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3 rounded-lg border border-border/70 bg-muted/20 px-4 py-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg" style={{ background: 'color-mix(in oklch, var(--success) 14%, transparent)' }}>
          <ShieldCheck className="h-5 w-5 text-[var(--success)]" />
        </div>
        <div>
          <div className="text-xs font-semibold">Security score {data.score}/100</div>
          <div className="text-[11px] text-muted-foreground">Weighted CVE pressure (critical ×14, high ×7, medium ×2.5), triage SLAs: critical ≤ 24h, high ≤ 7d. RBAC is enforced server-side on every mutation; see the audit trail below.</div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="nexus-card p-5">
          <SectionTitle aside={<Badge variant="secondary" className="font-mono text-[10px]">{data.vulnerabilities.filter((v) => v.status !== 'resolved').length} open</Badge>}>
            Dependency vulnerabilities
          </SectionTitle>
          <div className="space-y-2">
            {data.vulnerabilities.map((v) => (
              <div key={v.id} className="rounded-md border border-border/60 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="font-mono text-[10px]">{v.cve}</Badge>
                  <span className="font-mono text-xs font-medium">{v.pkg}@{v.version}</span>
                  <Badge variant="secondary" className={cn('text-[9px] uppercase',
                    v.severity === 'high' || v.severity === 'critical' ? 'text-[var(--destructive)]' : 'text-[var(--warning)]')}>
                    {v.severity} · CVSS {v.cvss}
                  </Badge>
                  <StatusBadge status={v.status === 'resolved' ? 'healthy' : v.status === 'fix_scheduled' ? 'warning' : 'down'} label={v.status.replace('_', ' ')} className="ml-auto" />
                </div>
                <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">{v.description}</p>
                <div className="mt-1.5 flex items-center gap-2 text-[10px] text-muted-foreground">
                  {v.serviceSlug && <span className="font-mono">{v.serviceSlug}</span>}
                  <span>· discovered {timeAgo(v.discoveredAt)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="nexus-card p-5">
          <SectionTitle>Security events</SectionTitle>
          <div className="space-y-1.5">
            {data.events.map((e) => {
              const Icon = eventIcon[e.kind] ?? ShieldAlert
              return (
                <div key={e.id} className="flex items-start gap-2.5 rounded-md border border-border/50 px-3 py-2">
                  <Icon className={cn('mt-0.5 h-3.5 w-3.5 shrink-0',
                    e.severity === 'high' ? 'text-[var(--destructive)]' : e.severity === 'medium' ? 'text-[var(--warning)]' : 'text-muted-foreground')} />
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] font-medium">{e.message}</div>
                    <div className="mt-0.5 text-[10px] text-muted-foreground">{e.actor} · {timeAgo(e.at)}</div>
                  </div>
                  <Badge variant="outline" className="shrink-0 font-mono text-[9px]">{e.severity}</Badge>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {audit && (
        <div className="nexus-card p-5">
          <SectionTitle aside={<span className="text-[11px] text-muted-foreground">server-recorded · append-only</span>}>Audit log</SectionTitle>
          <div className="divide-y divide-border/50">
            {audit.logs.slice(0, 10).map((l) => (
              <div key={l.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 text-[11px]">
                <span className="w-28 shrink-0 truncate font-medium">{l.userName}</span>
                <span className="font-mono font-semibold text-[var(--primary)]">{l.action}</span>
                <span className="font-mono text-muted-foreground">{l.targetType}{l.targetId ? `:${l.targetId}` : ''}</span>
                <span className="min-w-0 flex-1 truncate text-muted-foreground">{l.detail}</span>
                <span className="ml-auto shrink-0 text-muted-foreground">{timeAgo(l.at)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export function ProductivityView() {
  const [range, setRange] = useState('30D')
  const { data, isLoading } = useProductivity(range)
  const navigate = useAppStore((s) => s.navigate)

  if (isLoading || !data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-80" />
        <Skeleton className="h-64" />
      </div>
    )
  }

  const { summary, stats } = data
  const deltaChip = (label: string, value: number, goodWhenDown: boolean) => (
    <div className="nexus-card p-4">
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-muted-foreground">{label}</span>
        <span className={cn('font-mono text-[11px] font-medium', (value < 0) === goodWhenDown ? 'text-[var(--success)]' : 'text-[var(--destructive)]')}>
          {value > 0 ? '+' : ''}{value}%
        </span>
      </div>
    </div>
  )

  return (
    <div className="space-y-4">
      <PageHeader
        icon={<TrendingUp className="h-4 w-4" />}
        title="Developer Productivity"
        description="DORA-style metrics that matter: throughput, lead time, failure rate and recovery. No vanity dashboards."
        actions={
          <div className="flex gap-1">
            {['7D', '30D', '90D', '6M'].map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={cn('rounded-md border px-2.5 py-1 font-mono text-[11px] font-medium transition-colors',
                  range === r ? 'border-[var(--primary)]/50 bg-[color-mix(in_oklch,var(--primary)_12%,transparent)]' : 'border-border text-muted-foreground')}
              >
                {r}
              </button>
            ))}
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="nexus-card p-4">
          <div className="text-[11px] text-muted-foreground"><MetricHint term="Deployment frequency">Average deployments per day in the selected window. Elite: multiple per day.</MetricHint></div>
          <div className="mt-1 font-mono text-xl font-semibold">{summary.deployments}<span className="text-xs text-muted-foreground">/day</span></div>
        </div>
        <div className="nexus-card p-4">
          <div className="text-[11px] text-muted-foreground"><MetricHint term="Lead time">Median time from merge to production.</MetricHint></div>
          <div className="mt-1 font-mono text-xl font-semibold">{summary.leadTime}h</div>
        </div>
        <div className="nexus-card p-4">
          <div className="text-[11px] text-muted-foreground"><MetricHint term="Change failure rate">Share of deployments causing degraded service. World-class: &lt; 15%.</MetricHint></div>
          <div className={cn('mt-1 font-mono text-xl font-semibold', summary.cfr > 15 && 'text-[var(--warning)]')}>{summary.cfr}%</div>
        </div>
        <div className="nexus-card p-4">
          <div className="text-[11px] text-muted-foreground"><MetricHint term="MTTR">Mean time to recovery after a degradation.</MetricHint></div>
          <div className="mt-1 font-mono text-xl font-semibold">{summary.mttr}m</div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {deltaChip('Deploy freq', summary.deltas.deployments, false)}
        {deltaChip('Lead time', summary.deltas.leadTime, true)}
        {deltaChip('Failure rate', summary.deltas.cfr, true)}
        {deltaChip('MTTR', summary.deltas.mttr, true)}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="nexus-card p-5">
          <SectionTitle aside={<GitMerge className="h-3.5 w-3.5 text-muted-foreground" />}>Deployment frequency &amp; failures</SectionTitle>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats} margin={{ top: 4, right: 4, bottom: 0, left: -22 }}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tickFormatter={dateShort} tick={{ fontSize: 9, fill: 'var(--muted-foreground)' }} tickLine={false} axisLine={false} interval={Math.floor(stats.length / 6)} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} tickLine={false} axisLine={false} />
                <ChartTooltip contentStyle={chartStyle} cursor={{ fill: 'color-mix(in oklch, var(--primary) 8%, transparent)' }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="deployments" name="deployments" fill="var(--chart-1)" radius={[3, 3, 0, 0]} />
                <Bar dataKey="failed" name="failed" fill="var(--chart-4)" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="nexus-card p-5">
          <SectionTitle aside={<Timer className="h-3.5 w-3.5 text-muted-foreground" />}>Lead time &amp; MTTR trends</SectionTitle>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats} margin={{ top: 4, right: 4, bottom: 0, left: -22 }}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tickFormatter={dateShort} tick={{ fontSize: 9, fill: 'var(--muted-foreground)' }} tickLine={false} axisLine={false} interval={Math.floor(stats.length / 6)} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} tickLine={false} axisLine={false} />
                <ChartTooltip contentStyle={chartStyle} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="leadTime" name="lead time (h)" stroke="var(--chart-1)" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="mttr" name="MTTR (m)" stroke="var(--chart-2)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="nexus-card p-5">
          <SectionTitle aside={<Package className="h-3.5 w-3.5 text-muted-foreground" />}>Change failure rate</SectionTitle>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats} margin={{ top: 4, right: 4, bottom: 0, left: -22 }}>
                <defs>
                  <linearGradient id="cfrFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--chart-3)" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="var(--chart-3)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tickFormatter={dateShort} tick={{ fontSize: 9, fill: 'var(--muted-foreground)' }} tickLine={false} axisLine={false} interval={Math.floor(stats.length / 6)} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} />
                <ChartTooltip contentStyle={chartStyle} />
                <Area type="monotone" dataKey="cfr" name="change failure rate" stroke="var(--chart-3)" fill="url(#cfrFill)" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="nexus-card p-5">
          <SectionTitle>Availability</SectionTitle>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats} margin={{ top: 4, right: 4, bottom: 0, left: -22 }}>
                <defs>
                  <linearGradient id="availFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--chart-2)" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="var(--chart-2)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tickFormatter={dateShort} tick={{ fontSize: 9, fill: 'var(--muted-foreground)' }} tickLine={false} axisLine={false} interval={Math.floor(stats.length / 6)} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} tickLine={false} axisLine={false} domain={[99.7, 100]} tickFormatter={(v) => `${Number(v).toFixed(1)}%`} />
                <ChartTooltip contentStyle={chartStyle} />
                <Area type="monotone" dataKey="availability" name="availability" stroke="var(--chart-2)" fill="url(#availFill)" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <button onClick={() => navigate('incidents')} className="text-[11px] text-[var(--primary)] hover:underline">
        See how INC-1042 moved these metrics →
      </button>
    </div>
  )
}

void clockTime
