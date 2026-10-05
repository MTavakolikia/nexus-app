'use client'
// Observability Center: platform metrics, log explorer, distributed trace waterfall.
import { useMemo, useState } from 'react'
import { useObservabilityData, useLogs, useTraces } from '@/features/use-platform'
import { useAppStore } from '@/stores/app-store'
import { PageHeader, StatusBadge, SectionTitle, MetricHint, EmptyState } from '@/components/shared/kit'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip as ChartTooltip, XAxis, YAxis, Legend } from 'recharts'
import { Activity, ScrollText, Waypoints, Clock, Search, CircleAlert, CircleX } from 'lucide-react'
import { clockTime, timeAgo, ms } from '@/lib/format'
import { cn } from '@/lib/utils'

const chartStyle = { backgroundColor: 'var(--popover)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }
type ObsData = {
  services: { slug: string; name: string; status: string }[]
  selected: string | null
  kpis: { requests: number; errorRate: number; p95: number; availability: number; throughput: number }
  series: { ts: string; requests: number; errorRate: number; p95: number }[]
}

function useObservability(service: string, hours: string) {
  return useObservabilityData(service, hours)
}

export function ObservabilityView() {
  const [service, setService] = useState('')
  const [hours, setHours] = useState('24')
  const { data, isLoading } = useObservability(service, hours)

  return (
    <div className="space-y-4">
      <PageHeader
        icon={<Activity className="h-4 w-4" />}
        title="Observability"
        description="Metrics, logs and traces in one correlated view. Filter by service, environment and time range."
      />
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={service}
          onChange={(e) => setService(e.target.value)}
          aria-label="Filter by service"
          className="h-9 rounded-md border border-border bg-card px-2.5 font-mono text-xs"
        >
          <option value="">All services</option>
          {data?.services.map((s) => <option key={s.slug} value={s.slug}>{s.name}</option>)}
        </select>
        <div className="flex gap-1.5">
          {['6', '24', '72', '168'].map((h) => (
            <button
              key={h}
              onClick={() => setHours(h)}
              className={cn('rounded-md border px-2.5 py-1 text-[11px] font-medium transition-colors',
                hours === h ? 'border-[var(--primary)]/50 bg-[color-mix(in_oklch,var(--primary)_12%,transparent)]' : 'border-border text-muted-foreground hover:text-foreground')}
            >
              {h === '168' ? '7D' : h === '72' ? '3D' : `${h}H`}
            </button>
          ))}
        </div>
        {isLoading && <Skeleton className="ml-auto h-9 w-40" />}
      </div>

      {isLoading || !data ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20" />)}</div>
          <Skeleton className="h-64" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <div className="nexus-card p-4">
              <div className="text-[11px] text-muted-foreground"><MetricHint term="Requests">Requests per second at the last sample, summed across selected services.</MetricHint></div>
              <div className="mt-1 font-mono text-xl font-semibold">{data.kpis.requests.toLocaleString()} <span className="text-xs text-muted-foreground">rps</span></div>
            </div>
            <div className="nexus-card p-4">
              <div className="text-[11px] text-muted-foreground"><MetricHint term="Error rate">Share of 5xx/failed responses. Budget: ≤ 0.5%.</MetricHint></div>
              <div className={cn('mt-1 font-mono text-xl font-semibold', data.kpis.errorRate > 0.5 && 'text-[var(--destructive)]')}>{data.kpis.errorRate.toFixed(3)}%</div>
            </div>
            <div className="nexus-card p-4">
              <div className="text-[11px] text-muted-foreground"><MetricHint term="p95 latency">95th percentile response time. Budget: ≤ 420ms.</MetricHint></div>
              <div className={cn('mt-1 font-mono text-xl font-semibold', data.kpis.p95 > 420 && 'text-[var(--warning)]')}>{ms(data.kpis.p95)}</div>
            </div>
            <div className="nexus-card p-4">
              <div className="text-[11px] text-muted-foreground"><MetricHint term="Availability">Success-based uptime over the selected window.</MetricHint></div>
              <div className="mt-1 font-mono text-xl font-semibold text-[var(--success)]">{data.kpis.availability.toFixed(3)}%</div>
            </div>
          </div>

          <Tabs defaultValue="metrics">
            <TabsList className="h-9 bg-muted/50">
              <TabsTrigger value="metrics" className="gap-1.5 text-xs"><Activity className="h-3.5 w-3.5" /> Metrics</TabsTrigger>
              <TabsTrigger value="logs" className="gap-1.5 text-xs"><ScrollText className="h-3.5 w-3.5" /> Logs</TabsTrigger>
              <TabsTrigger value="traces" className="gap-1.5 text-xs"><Waypoints className="h-3.5 w-3.5" /> Traces</TabsTrigger>
            </TabsList>

            <TabsContent value="metrics" className="mt-4">
              <div className="nexus-card p-5">
                <SectionTitle aside={<span className="text-[11px] text-muted-foreground">{data.selected ?? 'platform-wide'}</span>}>
                  Traffic, latency and errors
                </SectionTitle>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data.series} margin={{ top: 4, right: 8, bottom: 0, left: -12 }}>
                      <defs>
                        <linearGradient id="reqFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.3} />
                          <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0.02} />
                        </linearGradient>
                        <linearGradient id="p95Fill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="var(--chart-5)" stopOpacity={0.25} />
                          <stop offset="100%" stopColor="var(--chart-5)" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="ts" tickFormatter={(t) => clockTime(t)} tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={40} />
                      <YAxis yAxisId="left" tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} tickLine={false} axisLine={false} />
                      <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} tickLine={false} axisLine={false} tickFormatter={(v) => ms(v)} />
                      <ChartTooltip contentStyle={chartStyle} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Area yAxisId="left" type="monotone" dataKey="requests" name="requests" stroke="var(--chart-1)" fill="url(#reqFill)" strokeWidth={2} dot={false} />
                      <Area yAxisId="right" type="monotone" dataKey="p95" name="p95 latency" stroke="var(--chart-5)" fill="url(#p95Fill)" strokeWidth={2} dot={false} />
                      <Area yAxisId="left" type="monotone" dataKey="errorRate" name="error %" stroke="var(--chart-3)" fill="transparent" strokeWidth={1.5} strokeDasharray="4 3" dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="logs" className="mt-4"><LogExplorer /></TabsContent>
            <TabsContent value="traces" className="mt-4"><TraceView /></TabsContent>
          </Tabs>
        </>
      )}
    </div>
  )
}

function LogExplorer() {
  const [level, setLevel] = useState('')
  const [q, setQ] = useState('')
  const [selected, setSelected] = useState<any>(null)
  const { data, isLoading } = useLogs({ level, q, hours: '24' })

  return (
    <div className="grid gap-4 lg:grid-cols-5">
      <div className="nexus-card p-4 lg:col-span-3">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <div className="relative min-w-40 flex-1">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q} onChange={(e) => setQ(e.target.value)}
              placeholder="Filter messages, request IDs…"
              aria-label="Filter logs"
              className="h-8 w-full rounded-md border border-border bg-card pl-8 pr-2 text-xs outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <div className="flex gap-1">
            {['', 'ERROR', 'WARN', 'INFO'].map((l) => (
              <button
                key={l || 'all'} onClick={() => setLevel(l)}
                className={cn('rounded border px-2 py-0.5 font-mono text-[10px] transition-colors',
                  level === l ? 'border-[var(--primary)]/50 bg-[color-mix(in_oklch,var(--primary)_12%,transparent)]' : 'border-border text-muted-foreground')}
              >
                {l || 'ALL'}
              </button>
            ))}
          </div>
        </div>
        {isLoading ? (
          <Skeleton className="h-80" />
        ) : !data?.logs.length ? (
          <EmptyState icon={<ScrollText className="h-5 w-5" />} title="No log lines match" body="Widen the time range or clear filters. Logs stream in continuously." />
        ) : (
          <div className="max-h-[420px] space-y-1 overflow-y-auto scrollbar-thin" role="list" aria-label="Log lines">
            {data.logs.map((l) => (
              <button
                key={l.id}
                onClick={() => setSelected(l)}
                role="listitem"
                className={cn('flex w-full items-start gap-2.5 rounded px-2 py-1.5 text-left font-mono text-[11px] transition-colors hover:bg-muted/40',
                  selected?.id === l.id && 'bg-muted/50')}
              >
                <span className="shrink-0 text-muted-foreground">{clockTime(l.ts)}</span>
                <span className={cn('w-11 shrink-0 font-semibold',
                  l.level === 'ERROR' ? 'text-[var(--destructive)]' : l.level === 'WARN' ? 'text-[var(--warning)]' : 'text-[var(--info)]')}>
                  {l.level}
                </span>
                <span className="w-32 shrink-0 truncate text-muted-foreground">{l.serviceSlug}</span>
                <span className="min-w-0 flex-1 truncate">{l.message}</span>
                {l.requestId && <span className="hidden shrink-0 text-muted-foreground/70 sm:inline">{l.requestId}</span>}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="nexus-card p-4 lg:col-span-2">
        <SectionTitle>Log context</SectionTitle>
        {selected ? (
          <div className="space-y-3 text-xs">
            <div className="flex items-center gap-2">
              <StatusBadge status={selected.level === 'ERROR' ? 'error' : selected.level === 'WARN' ? 'warning' : 'info'} label={selected.level} />
              <span className="font-mono text-muted-foreground">{selected.serviceSlug}</span>
            </div>
            <div className="rounded-md border border-border/60 bg-black/20 p-3 font-mono text-[11px] leading-relaxed">
              <div className="text-muted-foreground">{new Date(selected.ts).toLocaleString()}</div>
              <div className="mt-1">{selected.message}</div>
            </div>
            <dl className="space-y-1.5 font-mono text-[11px]">
              {selected.requestId && <div className="flex justify-between"><dt className="text-muted-foreground">requestId</dt><dd>{selected.requestId}</dd></div>}
              {selected.traceId && <div className="flex justify-between"><dt className="text-muted-foreground">traceId</dt><dd>{selected.traceId}</dd></div>}
              <div className="flex justify-between"><dt className="text-muted-foreground">env</dt><dd>{selected.envName}</dd></div>
            </dl>
            {selected.traceId && (
              <div className="rounded-md border border-[color-mix(in_oklch,var(--info)_35%,transparent)] bg-[color-mix(in_oklch,var(--info)_7%,transparent)] px-3 py-2 text-[11px] text-[var(--info)]">
                Correlated trace available — check the Traces tab for the full waterfall.
              </div>
            )}
          </div>
        ) : (
          <div className="flex h-64 flex-col items-center justify-center gap-2 text-center text-xs text-muted-foreground">
            <ScrollText className="h-5 w-5" />
            Select a log line to inspect request context, correlation IDs and linked traces.
          </div>
        )}
      </div>
    </div>
  )
}

function TraceView() {
  const { data, isLoading } = useTraces()
  if (isLoading) return <Skeleton className="h-80" />
  const serviceColors: Record<string, string> = {
    'frontend-web': 'var(--chart-1)', 'api-gateway': 'var(--chart-5)', 'checkout-api': 'var(--chart-3)',
    'payment-api': 'var(--chart-4)', 'inventory-service': 'var(--chart-2)', 'analytics-service': 'var(--destructive)',
    'search-service': 'var(--info)', 'recommendation-engine': 'var(--chart-5)', 'auth-service': 'var(--chart-2)',
    'notification-service': 'var(--warning)',
  }
  return (
    <div className="space-y-3">
      {!data?.traces.length ? (
        <EmptyState icon={<Waypoints className="h-5 w-5" />} title="No traces recorded" body="Traces appear as requests flow through the gateway and services." />
      ) : data.traces.map((t) => {
        const maxEnd = Math.max(...t.spans.map((s) => s.startOffsetMs + s.durationMs))
        const bottleneck = t.spans.reduce((a, b) => (b.durationMs > a.durationMs ? b : a))
        return (
          <div key={t.traceId} className="nexus-card p-4">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs font-semibold">{t.traceId}</span>
              <span className="font-mono text-[11px] text-muted-foreground">total {ms(maxEnd)}</span>
              <span className="ml-auto flex items-center gap-1.5 rounded border border-[color-mix(in_oklch,var(--destructive)_40%,transparent)] bg-[color-mix(in_oklch,var(--destructive)_8%,transparent)] px-2 py-0.5 text-[10px] font-medium text-[var(--destructive)]">
                <CircleAlert className="h-3 w-3" /> bottleneck: {bottleneck.serviceKey}
              </span>
            </div>
            <div className="space-y-1.5">
              {t.spans.map((s, i) => {
                const left = (s.startOffsetMs / maxEnd) * 100
                const width = Math.max((s.durationMs / maxEnd) * 100, 1.5)
                const isBottleneck = s === bottleneck
                return (
                  <div key={i} className="group flex items-center gap-2" style={{ paddingLeft: `${i * 8}px` }}>
                    <span className="w-40 shrink-0 truncate font-mono text-[10px] text-muted-foreground">{s.serviceKey}</span>
                    <span className="w-40 shrink-0 truncate text-[10px]">{s.operation}</span>
                    <div className="relative h-4 min-w-0 flex-1 rounded bg-muted/40">
                      <div
                        className={cn('absolute top-0.5 h-3 rounded-sm transition-all',
                          s.status === 'error' ? 'bg-[var(--destructive)]' : isBottleneck ? 'bg-[var(--warning)]' : '')}
                        style={{ left: `${left}%`, width: `${width}%`, background: s.status !== 'error' && !isBottleneck ? serviceColors[s.serviceKey] ?? 'var(--chart-1)' : undefined }}
                        title={`${s.operation} — ${ms(s.durationMs)}`}
                      />
                    </div>
                    <span className={cn('w-14 shrink-0 text-right font-mono text-[10px]', isBottleneck && 'font-bold text-[var(--warning)]')}>{ms(s.durationMs)}</span>
                    {s.status === 'error' && <CircleX className="h-3 w-3 shrink-0 text-[var(--destructive)]" />}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

void timeAgo; void Clock
