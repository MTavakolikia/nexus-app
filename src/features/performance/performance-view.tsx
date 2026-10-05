'use client'
// Performance Center: Core Web Vitals, route scores, regression detection (AI-reviewed).
import { useState } from 'react'
import { usePerformance } from '@/features/use-platform'
import { useAppStore } from '@/stores/app-store'
import { PageHeader, SectionTitle, EmptyState, MetricHint, Sparkline } from '@/components/shared/kit'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip as ChartTooltip, XAxis, YAxis } from 'recharts'
import { Gauge, TriangleAlert, ArrowUpRight, Bot } from 'lucide-react'
import { dateShort, ms, kb } from '@/lib/format'
import { cn } from '@/lib/utils'

const chartStyle = { backgroundColor: 'var(--popover)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }

export function PerformanceView() {
  const { data, isLoading } = usePerformance()
  const [selected, setSelected] = useState<string | null>(null)

  if (isLoading || !data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-80" />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20" />)}</div>
        <Skeleton className="h-72" />
      </div>
    )
  }

  const active = data.routes.find((r) => `${r.serviceSlug}${r.route}` === selected) ?? data.routes[0]

  return (
    <div className="space-y-4">
      <PageHeader
        icon={<Gauge className="h-4 w-4" />}
        title="Performance Center"
        description="Core Web Vitals and bundle budgets for every frontend surface — regressions are caught before users report them."
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {[
          { label: 'LCP p75', value: ms(data.cwv.lcpP75), budget: '≤ 2.5s', ok: data.cwv.lcpP75 <= 2500, hint: 'Largest Contentful Paint — when the main content is visually complete.' },
          { label: 'INP p75', value: ms(data.cwv.inpP75), budget: '≤ 200ms', ok: data.cwv.inpP75 <= 200, hint: 'Interaction to Next Paint — responsiveness to user input.' },
          { label: 'CLS p75', value: data.cwv.clsP75.toFixed(3), budget: '≤ 0.1', ok: data.cwv.clsP75 <= 0.1, hint: 'Cumulative Layout Shift — visual stability.' },
          { label: 'TTFB p75', value: ms(data.cwv.ttfbP75), budget: '≤ 800ms', ok: data.cwv.ttfbP75 <= 800, hint: 'Time to First Byte — server + network responsiveness.' },
          { label: 'Avg score', value: String(data.cwv.avgScore), budget: '≥ 90', ok: data.cwv.avgScore >= 90, hint: 'Composite route score across all monitored surfaces.' },
        ].map((m) => (
          <div key={m.label} className="nexus-card p-4">
            <div className="text-[11px] text-muted-foreground"><MetricHint term={m.label}>{m.hint}</MetricHint></div>
            <div className={cn('mt-1 font-mono text-xl font-semibold', !m.ok && 'text-[var(--warning)]')}>{m.value}</div>
            <div className={cn('mt-0.5 font-mono text-[10px]', m.ok ? 'text-[var(--success)]' : 'text-[var(--warning)]')}>budget {m.budget}</div>
          </div>
        ))}
      </div>

      {data.regressions.length > 0 && (
        <div className="nexus-card border-[color-mix(in_oklch,var(--warning)_45%,transparent)] bg-[color-mix(in_oklch,var(--warning)_6%,transparent)] p-5">
          <SectionTitle aside={<Badge variant="outline" className="gap-1 border-[color-mix(in_oklch,var(--warning)_45%,transparent)] text-[10px] text-[var(--warning)]"><TriangleAlert className="h-3 w-3" /> {data.regressions.length} detected</Badge>}>
            Regression detection — release vs baseline
          </SectionTitle>
          <div className="space-y-3">
            {data.regressions.map((r, i) => (
              <div key={i} className="rounded-md border border-border/60 bg-card/60 p-3.5">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <Badge variant="secondary" className="font-mono text-[10px]">{r.serviceSlug}</Badge>
                  <span className="font-mono font-semibold">{r.route}</span>
                  <span className="font-mono text-muted-foreground">{r.version}</span>
                  <span className="ml-auto text-[10px] text-muted-foreground">{dateShort(r.detectedAt)}</span>
                </div>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  <DeltaChip label="LCP" delta={`${r.lcpDeltaMs > 0 ? '+' : ''}${r.lcpDeltaMs}ms`} bad={r.lcpDeltaMs > 0} />
                  <DeltaChip label="INP" delta={`${r.inpDeltaMs > 0 ? '+' : ''}${r.inpDeltaMs}ms`} bad={r.inpDeltaMs > 0} />
                  <DeltaChip label="Bundle" delta={`${r.bundleDeltaPct > 0 ? '+' : ''}${r.bundleDeltaPct}%`} bad={r.bundleDeltaPct > 0} />
                </div>
                <p className="mt-2.5 border-t border-border/50 pt-2.5 text-[11px] leading-relaxed text-muted-foreground">
                  <span className="font-medium text-foreground">AI hypothesis:</span> {r.hypothesis}
                </p>
                <Button size="sm" variant="outline" className="mt-2.5 h-7 gap-1.5 text-[11px]" onClick={() => useAppStore.getState().navigate('assistant')}>
                  <Bot className="h-3 w-3 text-[var(--primary)]" /> Investigate with AI
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-5">
        <div className="nexus-card p-4 lg:col-span-2">
          <SectionTitle>Route scores</SectionTitle>
          <div className="space-y-1.5">
            {data.routes.map((r) => (
              <button
                key={`${r.serviceSlug}${r.route}`}
                onClick={() => setSelected(`${r.serviceSlug}${r.route}`)}
                className={cn('flex w-full items-center gap-3 rounded-md border px-3 py-2 text-left transition-colors',
                  active?.route === r.route && active?.serviceSlug === r.serviceSlug ? 'border-[var(--primary)]/50 bg-[color-mix(in_oklch,var(--primary)_8%,transparent)]' : 'border-transparent hover:bg-muted/40')}
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate font-mono text-xs font-medium">{r.route}</div>
                  <div className="text-[10px] text-muted-foreground">{r.serviceSlug} · {kb(r.bundleKb)}</div>
                </div>
                <Sparkline data={r.lcpHistory.map((h) => h.lcp)} width={64} height={20} />
                <span className={cn('w-9 text-right font-mono text-sm font-bold',
                  r.score >= 90 ? 'text-[var(--success)]' : r.score >= 75 ? 'text-[var(--warning)]' : 'text-[var(--destructive)]')}>
                  {r.score}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="nexus-card p-5 lg:col-span-3">
          {active && (
            <>
              <SectionTitle aside={
                <Badge variant="outline" className={cn('gap-1 text-[10px]',
                  active.budgetStatus === 'good' ? 'border-[color-mix(in_oklch,var(--success)_45%,transparent)] text-[var(--success)]'
                    : active.budgetStatus === 'warning' ? 'border-[color-mix(in_oklch,var(--warning)_45%,transparent)] text-[var(--warning)]'
                    : 'border-[color-mix(in_oklch,var(--destructive)_45%,transparent)] text-[var(--destructive)]')}>
                  {active.budgetStatus === 'good' ? 'within budget' : active.budgetStatus === 'warning' ? 'approaching budget' : 'budget breached'}
                </Badge>
              }>
                <span className="font-mono">{active.route}</span> · 30-day LCP trend
              </SectionTitle>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={active.lcpHistory} margin={{ top: 4, right: 8, bottom: 0, left: -8 }}>
                    <defs>
                      <linearGradient id="lcpTrend" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.32} />
                        <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="ts" tickFormatter={dateShort} tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} tickLine={false} axisLine={false} interval={4} />
                    <YAxis tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} tickLine={false} axisLine={false} tickFormatter={(v) => ms(v)} domain={['dataMin - 200', 'dataMax + 200']} />
                    <ChartTooltip contentStyle={chartStyle} />
                    <Area type="monotone" dataKey="lcp" name="LCP" stroke="var(--chart-1)" fill="url(#lcpTrend)" strokeWidth={2} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-3 grid grid-cols-4 gap-2 text-center">
                {[[ms(active.lcpMs), 'LCP'], [ms(active.inpMs), 'INP'], [active.cls.toFixed(3), 'CLS'], [kb(active.bundleKb), 'JS bundle']].map(([v, l]) => (
                  <div key={l as string} className="rounded-md bg-muted/30 py-2">
                    <div className="font-mono text-xs font-semibold">{v}</div>
                    <div className="text-[9px] uppercase text-muted-foreground">{l}</div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function DeltaChip({ label, delta, bad }: { label: string; delta: string; bad: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-md border px-2 py-1 font-mono text-[11px]',
      bad ? 'border-[color-mix(in_oklch,var(--destructive)_40%,transparent)] text-[var(--destructive)]' : 'border-[color-mix(in_oklch,var(--success)_40%,transparent)] text-[var(--success)]')}>
      <ArrowUpRight className={cn('h-3 w-3', bad && 'rotate-0')} />
      {label} {delta}
    </span>
  )
}

void EmptyState
