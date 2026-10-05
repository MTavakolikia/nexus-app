'use client'
// Shared presentation kit: status system (never color-only — always icon/text),
// KPI cards, score rings, sparklines, headers, empty states.
import { cn } from '@/lib/utils'
import { CheckCircle2, AlertTriangle, XCircle, HelpCircle, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import type { ReactNode } from 'react'

// ── Status semantics ─────────────────────────────────────────────────────────
type Tone = 'success' | 'warning' | 'error' | 'info' | 'neutral'

const TONE_CLASSES: Record<Tone, string> = {
  success: 'text-[var(--success)] bg-[color-mix(in_oklch,var(--success)_14%,transparent)] border-[color-mix(in_oklch,var(--success)_35%,transparent)]',
  warning: 'text-[var(--warning)] bg-[color-mix(in_oklch,var(--warning)_14%,transparent)] border-[color-mix(in_oklch,var(--warning)_35%,transparent)]',
  error: 'text-[var(--destructive)] bg-[color-mix(in_oklch,var(--destructive)_14%,transparent)] border-[color-mix(in_oklch,var(--destructive)_35%,transparent)]',
  info: 'text-[var(--info)] bg-[color-mix(in_oklch,var(--info)_14%,transparent)] border-[color-mix(in_oklch,var(--info)_35%,transparent)]',
  neutral: 'text-muted-foreground bg-muted border-border',
}

const TONE_DOTS: Record<Tone, string> = {
  success: 'bg-[var(--success)]',
  warning: 'bg-[var(--warning)]',
  error: 'bg-[var(--destructive)]',
  info: 'bg-[var(--info)]',
  neutral: 'bg-muted-foreground',
}

const TONE_ICONS: Record<Tone, ReactNode> = {
  success: <CheckCircle2 className="h-3 w-3" />,
  warning: <AlertTriangle className="h-3 w-3" />,
  error: <XCircle className="h-3 w-3" />,
  info: <HelpCircle className="h-3 w-3" />,
  neutral: <Minus className="h-3 w-3" />,
}

export function toneForStatus(status: string): Tone {
  switch (status) {
    case 'healthy': case 'SUCCESS': case 'PASSED': case 'resolved': case 'passing': case 'resolved_low':
      return 'success'
    case 'degraded': case 'BUILDING': case 'TESTING': case 'DEPLOYING': case 'RUNNING': case 'investigating':
    case 'monitoring': case 'identified': case 'QUEUED': case 'open': case 'fix_scheduled': case 'warning':
      return 'warning'
    case 'down': case 'FAILED': case 'error': case 'breach':
      return 'error'
    case 'ROLLED_BACK': case 'SKIPPED': case 'CANCELLED':
      return 'info'
    default:
      return 'neutral'
  }
}

export function StatusBadge({ status, label, live, className }: { status: string; label?: string; live?: boolean; className?: string }) {
  const tone = toneForStatus(status)
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-medium whitespace-nowrap',
        TONE_CLASSES[tone],
        className,
      )}
    >
      {live ? (
        <span className={cn('h-1.5 w-1.5 rounded-full live-dot', TONE_DOTS[tone])} />
      ) : (
        TONE_ICONS[tone]
      )}
      {label ?? status.replace(/_/g, ' ')}
    </span>
  )
}

export function SeverityBadge({ severity }: { severity: string }) {
  const tone: Tone = severity === 'SEV-1' ? 'error' : severity === 'SEV-2' ? 'error' : severity === 'SEV-3' ? 'warning' : 'neutral'
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 font-mono text-[11px] font-semibold whitespace-nowrap', TONE_CLASSES[tone])}>
      {severity}
    </span>
  )
}

// ── Score ring ───────────────────────────────────────────────────────────────
export function ScoreRing({ value, size = 92, label }: { value: number; size?: number; label?: string }) {
  const stroke = 7
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const tone = value >= 90 ? 'var(--success)' : value >= 75 ? 'var(--warning)' : 'var(--destructive)'
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border)" strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={tone} strokeWidth={stroke}
          strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - value / 100)}
          className="transition-[stroke-dashoffset] duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono text-xl font-semibold leading-none">{Math.round(value)}</span>
        {label && <span className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>}
      </div>
    </div>
  )
}

// ── KPI card ─────────────────────────────────────────────────────────────────
export function KpiCard({
  label, value, sub, trend, trendGood, tooltip, onClick,
}: {
  label: string; value: ReactNode; sub?: string
  trend?: number; trendGood?: boolean; tooltip?: string; onClick?: () => void
}) {
  const body = (
    <div
      className={cn('nexus-card p-4 transition-colors', onClick && 'cursor-pointer hover:border-ring/50')}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={(e) => { if (onClick && (e.key === 'Enter' || e.key === ' ')) onClick() }}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        {trend != null && (
          <span className={cn('inline-flex items-center gap-0.5 text-[11px] font-medium',
            trendGood ? 'text-[var(--success)]' : 'text-[var(--destructive)]')}>
            {trend > 0 ? <ArrowUpRight className="h-3 w-3" /> : trend < 0 ? <ArrowDownRight className="h-3 w-3" /> : null}
            {trend > 0 ? '+' : ''}{trend.toFixed(1)}%
          </span>
        )}
      </div>
      <div className="mt-1.5 font-mono text-2xl font-semibold tracking-tight">{value}</div>
      {sub && <div className="mt-0.5 text-[11px] text-muted-foreground">{sub}</div>}
    </div>
  )
  return tooltip ? (
    <Tooltip>
      <TooltipTrigger asChild>{body}</TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-64 text-xs">{tooltip}</TooltipContent>
    </Tooltip>
  ) : body
}

// ── Sparkline ────────────────────────────────────────────────────────────────
export function Sparkline({ data, width = 120, height = 28, tone = 'var(--primary)', fill = true }: {
  data: number[]; width?: number; height?: number; tone?: string; fill?: boolean
}) {
  if (!data.length) return <div style={{ width, height }} className="rounded bg-muted/40" />
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const step = width / Math.max(data.length - 1, 1)
  const pts = data.map((v, i) => `${(i * step).toFixed(1)},${(height - 3 - ((v - min) / range) * (height - 6)).toFixed(1)}`)
  const line = `M${pts.join(' L')}`
  const area = `${line} L${width},${height} L0,${height} Z`
  return (
    <svg width={width} height={height} className="overflow-visible" aria-hidden>
      {fill && <path d={area} fill={tone} opacity={0.12} />}
      <path d={line} fill="none" stroke={tone} strokeWidth={1.5} strokeLinecap="round" />
    </svg>
  )
}

// ── Page header ──────────────────────────────────────────────────────────────
export function PageHeader({ title, description, actions, icon }: {
  title: ReactNode; description?: string; actions?: ReactNode; icon?: ReactNode
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="flex items-start gap-3">
        {icon && <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-lg border border-border/70 bg-card text-[var(--primary)]">{icon}</div>}
        <div>
          <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
          {description && <p className="mt-0.5 max-w-2xl text-sm text-muted-foreground">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}

// ── Empty state ──────────────────────────────────────────────────────────────
export function EmptyState({ icon, title, body, action }: {
  icon?: ReactNode; title: string; body: string; action?: ReactNode
}) {
  return (
    <div className="nexus-card flex flex-col items-center justify-center gap-2 px-6 py-10 text-center">
      {icon && <div className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-muted/40 text-muted-foreground">{icon}</div>}
      <div className="text-sm font-medium">{title}</div>
      <p className="max-w-sm text-xs text-muted-foreground">{body}</p>
      {action}
    </div>
  )
}

// ── Section title ────────────────────────────────────────────────────────────
export function SectionTitle({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="text-sm font-semibold tracking-tight">{children}</h2>
      {aside}
    </div>
  )
}

// ── Info tooltip for technical metrics ───────────────────────────────────────
export function MetricHint({ term, children }: { term: string; children: ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger className="cursor-help border-b border-dotted border-muted-foreground/50 font-medium">
        {term}
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-72 text-xs">
        <div className="font-semibold">{term}</div>
        <div className="mt-1 text-muted-foreground">{children}</div>
      </TooltipContent>
    </Tooltip>
  )
}
