'use client'
// Overview — engineering health computed from live platform data.
import { useBootstrap } from '@/features/use-platform'
import { useAppStore } from '@/stores/app-store'
import { KpiCard, ScoreRing, StatusBadge, SeverityBadge, SectionTitle, PageHeader, MetricHint, Sparkline } from '@/components/shared/kit'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip as ChartTooltip, XAxis, YAxis, Legend } from 'recharts'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Bot, Rocket, ArrowRight, Activity, Boxes, Siren, XCircle, Gauge } from 'lucide-react'
import { timeAgo, dateShort, clockTime, ms } from '@/lib/format'
import { cn } from '@/lib/utils'

const chartTooltipStyle = {
  backgroundColor: 'var(--popover)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  fontSize: 12,
  color: 'var(--foreground)',
}

export function OverviewView() {
  const { data, isLoading } = useBootstrap()
  const navigate = useAppStore((s) => s.navigate)

  if (isLoading || !data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-72" />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <Skeleton className="h-64 lg:col-span-2" />
          <Skeleton className="h-64" />
        </div>
      </div>
    )
  }

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  const firstName = data.session.name.split(' ')[0]
  const k = data.kpis
  const healthEntries = Object.entries(k.health) as [string, number][]
  const regression = data.perfRegressions[0]

  return (
    <div className="space-y-5">
      <PageHeader
        title={`${greeting}, ${firstName}`}
        description="Understand what changed, what broke, and what to do next."
        actions={
          <>
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => navigate('assistant')}>
              <Bot className="h-3.5 w-3.5 text-[var(--primary)]" /> Ask AI
            </Button>
            <Button size="sm" className="gap-1.5" onClick={() => useAppStore.getState().setDeployDialogOpen(true)}>
              <Rocket className="h-3.5 w-3.5" /> Deploy
            </Button>
          </>
        }
      />

      {regression && regression.lcpDeltaMs > 60 && (
        <button
          onClick={() => navigate('performance')}
          className="flex w-full items-center gap-3 rounded-lg border border-[color-mix(in_oklch,var(--warning)_45%,transparent)] bg-[color-mix(in_oklch,var(--warning)_10%,transparent)] px-4 py-3 text-left transition-colors hover:bg-[color-mix(in_oklch,var(--warning)_16%,transparent)]"
        >
          <Gauge className="h-4 w-4 shrink-0 text-[var(--warning)]" />
          <div className="min-w-0 flex-1">
            <div className="text-xs font-semibold text-[var(--warning)]">Performance regression detected on {regression.route}</div>
            <div className="mt-0.5 truncate text-xs text-muted-foreground">
              LCP {regression.lcpDeltaMs > 0 ? '+' : ''}{regression.lcpDeltaMs}ms · bundle {regression.bundleDeltaKb > 0 ? '+' : ''}{regression.bundleDeltaKb}KB in release {regression.version}. AI correlation available.
            </div>
          </div>
          <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
        </button>
      )}

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <KpiCard
          label="Services" value={k.services} sub="in catalog"
          tooltip="All services registered in the catalog across every team."
          onClick={() => navigate('services')}
        />
        <KpiCard
          label="Deployments (30d)" value={k.deployments30d} sub="production + staging"
          tooltip="Deployment frequency over the last 30 days, all environments."
          onClick={() => navigate('deployments')}
        />
        <KpiCard
          label="Active incidents" value={k.activeIncidents}
          sub={k.activeIncidents ? 'needs attention' : 'all clear'}
          onClick={() => navigate('incidents')}
        />
        <KpiCard
          label="Failed builds (7d)" value={k.failedBuilds7d}
          sub="pipeline failures"
          tooltip="Deployments that failed any pipeline stage in the last 7 days."
          onClick={() => navigate('deployments')}
        />
        <KpiCard
          label="Availability (7d)" value={`${k.availability7d.toFixed(2)}%`} sub="error-budget based"
          tooltip="Average production availability across emitting services over 7 days."
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        {/* Health */}
        <div className="nexus-card p-5">
          <SectionTitle aside={<MetricHint term="How is this computed?">Each pillar is derived from live telemetry: availability SLOs, CWV budgets, CVE pressure, test pass rates and telemetry coverage. Weighted into one score.</MetricHint>}>
            <span className="flex items-center gap-1.5"><Activity className="h-3.5 w-3.5 text-[var(--primary)]" /> Engineering Health</span>
          </SectionTitle>
          <div className="flex items-center gap-5">
            <ScoreRing value={k.healthScore} size={104} label="score" />
            <div className="min-w-0 flex-1 space-y-2">
              {healthEntries.map(([pillar, score]) => (
                <div key={pillar}>
                  <div className="mb-0.5 flex items-center justify-between text-[11px]">
                    <span className="capitalize text-muted-foreground">{pillar}</span>
                    <span className="font-mono font-medium">{score}</span>
                  </div>
                  <div className="h-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn('h-full rounded-full transition-all duration-700',
                        score >= 90 ? 'bg-[var(--success)]' : score >= 75 ? 'bg-[var(--warning)]' : 'bg-[var(--destructive)]')}
                      style={{ width: `${score}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Deploy trend */}
        <div className="nexus-card p-5 xl:col-span-2">
          <SectionTitle aside={<span className="text-[11px] text-muted-foreground">last 30 days</span>}>
            <span className="flex items-center gap-1.5"><Rocket className="h-3.5 w-3.5 text-[var(--primary)]" /> Deployment frequency</span>
          </SectionTitle>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.deployTrend} margin={{ top: 4, right: 4, bottom: 0, left: -22 }}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tickFormatter={dateShort} tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} tickLine={false} axisLine={false} interval={4} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} tickLine={false} axisLine={false} allowDecimals={false} />
                <ChartTooltip contentStyle={chartTooltipStyle} cursor={{ fill: 'color-mix(in oklch, var(--primary) 8%, transparent)' }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="success" name="successful" stackId="a" fill="var(--chart-1)" radius={[0, 0, 0, 0]} />
                <Bar dataKey="failed" name="failed" stackId="a" fill="var(--chart-4)" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        {/* Latency + error trend */}
        <div className="nexus-card p-5 xl:col-span-2">
          <SectionTitle aside={<span className="text-[11px] text-muted-foreground">checkout-api · 24h</span>}>
            <span className="flex items-center gap-1.5"><Activity className="h-3.5 w-3.5 text-[var(--primary)]" /> p95 latency &amp; error rate</span>
          </SectionTitle>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.latencyTrend} margin={{ top: 4, right: 4, bottom: 0, left: -22 }}>
                <defs>
                  <linearGradient id="p95Fill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="ts" tickFormatter={(t) => clockTime(t)} tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} tickLine={false} axisLine={false} interval={5} />
                <YAxis yAxisId="left" tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} tickLine={false} axisLine={false} tickFormatter={(v) => ms(v)} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} />
                <ChartTooltip contentStyle={chartTooltipStyle} />
                <Area yAxisId="left" type="monotone" dataKey="p95" name="p95 latency" stroke="var(--chart-1)" fill="url(#p95Fill)" strokeWidth={2} dot={false} />
                <Area yAxisId="right" type="monotone" dataKey="errorRate" name="error rate %" stroke="var(--chart-3)" fill="transparent" strokeWidth={1.5} dot={false} strokeDasharray="4 3" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Attention */}
        <div className="nexus-card p-5">
          <SectionTitle>Needs attention</SectionTitle>
          <div className="space-y-2">
            {data.servicesNeedingAttention.length === 0 ? (
              <div className="py-6 text-center text-xs text-muted-foreground">All services healthy.</div>
            ) : data.servicesNeedingAttention.map((s) => (
              <button
                key={s.id}
                onClick={() => navigate('service', { slug: s.slug })}
                className="flex w-full items-center gap-2.5 rounded-md border border-border/70 bg-muted/20 px-3 py-2 text-left transition-colors hover:border-ring/40"
              >
                <Boxes className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-mono text-xs font-medium">{s.name}</div>
                  <div className="text-[10px] text-muted-foreground">{s.team.name}</div>
                </div>
                <StatusBadge status={s.status} />
              </button>
            ))}
            {data.activeIncidents.map((i) => (
              <button
                key={i.id}
                onClick={() => navigate('incident', { ref: i.ref })}
                className="flex w-full items-center gap-2.5 rounded-md border border-border/70 bg-muted/20 px-3 py-2 text-left transition-colors hover:border-ring/40"
              >
                <Siren className="h-3.5 w-3.5 shrink-0 text-[var(--destructive)]" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs font-medium">{i.ref} · {i.title}</div>
                  <div className="text-[10px] text-muted-foreground">{timeAgo(i.startedAt)}</div>
                </div>
                <SeverityBadge severity={i.severity} />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Recent deployments */}
      <div className="nexus-card p-5">
        <SectionTitle aside={<Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => navigate('deployments')}>View all <ArrowRight className="ml-1 h-3 w-3" /></Button>}>
          Recent deployments
        </SectionTitle>
        <div className="divide-y divide-border/60">
          {data.recentDeployments.slice(0, 6).map((d) => (
            <button
              key={d.id}
              onClick={() => navigate('deployment', { ref: d.ref })}
              className="flex w-full items-center gap-3 py-2.5 text-left transition-colors hover:bg-muted/30"
            >
              <span className="w-20 shrink-0 font-mono text-xs font-medium text-[var(--primary)]">{d.ref}</span>
              <span className="w-36 shrink-0 truncate font-mono text-xs">{d.serviceName}</span>
              <span className="w-16 shrink-0 font-mono text-xs text-muted-foreground">{d.version}</span>
              <span className="hidden min-w-0 flex-1 truncate text-xs text-muted-foreground md:block">{d.changeSummary}</span>
              <span className="ml-auto shrink-0 text-[11px] text-muted-foreground">{timeAgo(d.startedAt)}</span>
              <StatusBadge status={d.status} className="w-28 justify-center" />
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

void XCircle; void Sparkline
