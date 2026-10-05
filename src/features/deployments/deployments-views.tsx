'use client'
// Deployment Center: history, live pipeline (SSE + poll fallback), detail with
// diff-vs-previous and rollback. Statuses update without refresh (ADR-004).
import { useEffect, useMemo, useRef, useState } from 'react'
import { useDeployments, useDeployment, useServices, useInvalidatePlatform } from '@/features/use-platform'
import { useAppStore } from '@/stores/app-store'
import { StatusBadge, PageHeader, EmptyState, SectionTitle } from '@/components/shared/kit'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Rocket, Search, Check, X, Loader2, Circle, Undo2, FileDiff, Timer, GitCommitHorizontal } from 'lucide-react'
import { timeAgo, shortSha, duration, kb, deltaKb, clockTime } from '@/lib/format'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

// ── List ─────────────────────────────────────────────────────────────────────
export function DeploymentsView() {
  const [status, setStatus] = useState('')
  const [q, setQ] = useState('')
  const { data, isLoading } = useDeployments({ status, q, limit: '50' })
  const navigate = useAppStore((s) => s.navigate)

  return (
    <div className="space-y-4">
      <PageHeader
        icon={<Rocket className="h-4 w-4" />}
        title="Deployment Center"
        description="Full history with pipeline detail. Live deployments stream state over SSE — no refresh needed."
        actions={
          <Button size="sm" className="gap-1.5" onClick={() => useAppStore.getState().setDeployDialogOpen(true)}>
            <Rocket className="h-3.5 w-3.5" /> New deployment
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-56 flex-1 md:max-w-xs">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search ref, version, author…" className="h-9 pl-8 text-sm" aria-label="Search deployments" />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {['', 'SUCCESS', 'FAILED', 'ROLLED_BACK', 'BUILDING', 'TESTING', 'DEPLOYING'].map((s) => (
            <button
              key={s || 'all'}
              onClick={() => setStatus(s)}
              className={cn('rounded-md border px-2.5 py-1 text-[11px] font-medium transition-colors',
                status === s ? 'border-[var(--primary)]/50 bg-[color-mix(in_oklch,var(--primary)_12%,transparent)]' : 'border-border text-muted-foreground hover:text-foreground')}
            >
              {s || 'All'}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <Skeleton className="h-96" />
      ) : !data?.deployments.length ? (
        <EmptyState icon={<Rocket className="h-5 w-5" />} title="No deployments found" body="Adjust the filters, or trigger a new deployment from the Deploy action." />
      ) : (
        <div className="nexus-card overflow-hidden p-0">
          <div className="hidden grid-cols-[90px_150px_80px_1fr_110px_120px_90px] gap-3 border-b border-border/70 bg-muted/30 px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground md:grid">
            <span>Ref</span><span>Service</span><span>Version</span><span>Summary</span><span>Author</span><span>Started</span><span>Status</span>
          </div>
          <div className="divide-y divide-border/60">
            {data.deployments.map((d) => (
              <button
                key={d.id}
                onClick={() => navigate('deployment', { ref: d.ref })}
                className="grid w-full grid-cols-2 gap-2 px-4 py-2.5 text-left transition-colors hover:bg-muted/30 md:grid-cols-[90px_150px_80px_1fr_110px_120px_90px] md:gap-3"
              >
                <span className="font-mono text-xs font-semibold text-[var(--primary)]">{d.ref}</span>
                <span className="truncate font-mono text-xs">{d.serviceName}</span>
                <span className="hidden font-mono text-xs text-muted-foreground md:block">{d.version}</span>
                <span className="col-span-2 truncate text-xs text-muted-foreground md:col-span-1">{d.changeSummary}</span>
                <span className="hidden text-xs text-muted-foreground md:block">{d.author.name}</span>
                <span className="hidden text-xs text-muted-foreground md:block">{timeAgo(d.startedAt)}</span>
                <span className="justify-self-end md:justify-self-start"><StatusBadge status={d.status} live={['BUILDING', 'TESTING', 'DEPLOYING', 'QUEUED'].includes(d.status)} /></span>
              </button>
            ))}
          </div>
        </div>
      )}
      <DeployDialog />
      <DeploymentDetailController />
    </div>
  )
}

// ── Create dialog ────────────────────────────────────────────────────────────
function DeployDialog() {
  const { deployDialogOpen, setDeployDialogOpen } = useAppStore()
  const { data: services } = useServices()
  const frontend = useMemo(() => services?.services ?? [], [services])
  const [slug, setSlug] = useState('')
  const [env, setEnv] = useState('staging')
  const [version, setVersion] = useState('')
  const [summary, setSummary] = useState('')
  const [pending, setPending] = useState(false)
  const invalidate = useInvalidatePlatform()

  // Preselect the first service and suggest a version when the dialog opens;
  // both are derived, so reset on open rather than persisting stale choices.
  const effectiveSlug = slug || (frontend[0]?.slug ?? '')
  const effectiveVersion =
    version || (deployDialogOpen && frontend.length ? `v3.19.${1 + Math.floor(Math.random() * 4)}` : '')

  const submit = async () => {
    setPending(true)
    try {
      const res = await api.createDeployment({
        serviceSlug: effectiveSlug,
        envName: env,
        version: effectiveVersion,
        changeSummary: summary || undefined,
      })
      toast.success(`${res.ref} queued`, { description: `${effectiveSlug} ${effectiveVersion} → ${env}. Pipeline streaming live.` })
      setDeployDialogOpen(false)
      invalidate()
      useAppStore.getState().navigate('deployment', { ref: res.ref })
    } catch (e) {
      toast.error('Deployment rejected', { description: e instanceof Error ? e.message : 'Permission or validation error' })
    } finally {
      setPending(false)
    }
  }

  return (
    <Dialog open={deployDialogOpen} onOpenChange={setDeployDialogOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Rocket className="h-4 w-4 text-[var(--primary)]" /> Start deployment</DialogTitle>
          <DialogDescription>Runs the full pipeline: install → lint → typecheck → tests → security scan → build → deploy. Requires <span className="font-mono text-[11px]">deployments.create</span>.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-1">
          <div className="space-y-1.5">
            <label className="text-xs font-medium" htmlFor="dep-svc">Service</label>
            <Select value={effectiveSlug} onValueChange={setSlug}>
              <SelectTrigger id="dep-svc" className="h-9 font-mono text-xs"><SelectValue placeholder="Select a service" /></SelectTrigger>
              <SelectContent>
                {frontend.map((s: any) => <SelectItem key={s.slug} value={s.slug} className="font-mono text-xs">{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium" htmlFor="dep-env">Environment</label>
              <Select value={env} onValueChange={setEnv}>
                <SelectTrigger id="dep-env" className="h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['staging', 'production', 'development'].map((e) => <SelectItem key={e} value={e} className="text-xs">{e}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium" htmlFor="dep-ver">Version</label>
              <Input id="dep-ver" value={effectiveVersion} onChange={(e) => setVersion(e.target.value)} className="h-9 font-mono text-xs" />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium" htmlFor="dep-sum">Change summary</label>
            <Input id="dep-sum" value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="What does this release change?" className="h-9 text-xs" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => setDeployDialogOpen(false)}>Cancel</Button>
          <Button size="sm" disabled={pending || !effectiveSlug || !effectiveVersion} onClick={submit} className="gap-1.5">
            {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Rocket className="h-3.5 w-3.5" />}
            Queue deployment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Live pipeline hook: SSE with polling fallback ────────────────────────────
export interface PipelineTick {
  ref: string; status: string; stageIdx: number; done: boolean
  stages: { name: string; status: string; durationMs: number | null; position: number }[]
}

export function useDeploymentStream(ref: string | undefined, initialStatus: string | undefined) {
  const [tick, setTick] = useState<PipelineTick | null>(null)
  const [connected, setConnected] = useState(false)
  const invalidate = useInvalidatePlatform()
  const esRef = useRef<EventSource | null>(null)
  const live = initialStatus && ['QUEUED', 'BUILDING', 'TESTING', 'DEPLOYING'].includes(initialStatus)

  useEffect(() => {
    if (!ref || !live) return
    let poll: ReturnType<typeof setInterval> | null = null
    const finish = () => { invalidate(); }

    const startPolling = () => {
      if (poll) return
      poll = setInterval(async () => {
        try {
          const d = await api.deployment(ref)
          setTick({ ref: d.ref, status: d.status, stageIdx: d.stages.length, done: !['QUEUED', 'BUILDING', 'TESTING', 'DEPLOYING'].includes(d.status), stages: d.stages })
          if (d.status === 'SUCCESS' || d.status === 'FAILED' || d.status === 'ROLLED_BACK') {
            if (poll) clearInterval(poll)
            finish()
          }
        } catch { /* keep polling */ }
      }, 2000)
    }

    try {
      const es = new EventSource(`/api/deployments/${ref}/stream`)
      esRef.current = es
      es.addEventListener('open', () => setConnected(true))
      es.addEventListener('tick', (ev) => {
        setConnected(true)
        setTick(JSON.parse((ev as MessageEvent).data))
      })
      es.addEventListener('end', (ev) => {
        setTick(JSON.parse((ev as MessageEvent).data))
        es.close()
        finish()
      })
      es.addEventListener('error', () => {
        es.close()
        setConnected(false)
        startPolling()
      })
    } catch {
      startPolling()
    }
    return () => {
      esRef.current?.close()
      if (poll) clearInterval(poll)
    }
  }, [ref, live])

  return { tick, connected }
}

// ── Detail ───────────────────────────────────────────────────────────────────
function DeploymentDetailController() {
  const { view, params } = useAppStore()
  return view === 'deployment' && params.ref ? <DeploymentDetailView key={params.ref} ref_={params.ref} /> : null
}

export function DeploymentDetailView({ ref_ }: { ref_: string }) {
  const { data, isLoading } = useDeployment(ref_)
  const { tick, connected } = useDeploymentStream(ref_, data?.status)
  const [rollbackOpen, setRollbackOpen] = useState(false)
  const [rollbackPending, setRollbackPending] = useState(false)
  const invalidate = useInvalidatePlatform()
  const navigate = useAppStore((s) => s.navigate)

  if (isLoading || !data) return <Skeleton className="h-96" />
  const stages = tick?.stages ?? data.stages
  const status = tick?.status ?? data.status
  const isLive = ['QUEUED', 'BUILDING', 'TESTING', 'DEPLOYING'].includes(status)
  const bundleDelta = data.bundleDeltaKb

  const doRollback = async () => {
    setRollbackPending(true)
    try {
      const res = await api.rollback(data.ref)
      toast.success(`Rollback queued: ${res.ref}`, { description: `Restoring ${data.serviceName} to ${res.version}.` })
      setRollbackOpen(false)
      invalidate()
      navigate('deployment', { ref: res.ref })
    } catch (e) {
      toast.error('Rollback failed', { description: e instanceof Error ? e.message : 'Requires deployments.create' })
    } finally {
      setRollbackPending(false)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <Button variant="ghost" size="sm" className="-ml-2 mb-1 h-7 gap-1 text-xs text-muted-foreground" onClick={() => navigate('deployments')}>
          ← Deployment Center
        </Button>
        <PageHeader
          icon={<Rocket className="h-4 w-4" />}
          title={<span className="flex flex-wrap items-center gap-2 font-mono">{data.ref} <span className="font-sans text-sm text-muted-foreground">· {data.serviceName} {data.version}</span></span>}
          description={data.changeSummary ?? undefined}
          actions={
            <>
              <StatusBadge status={status} live={isLive} />
              {data.rollbackOfId && <Badge variant="outline" className="gap-1 text-[10px]"><Undo2 className="h-3 w-3" /> rollback</Badge>}
              {!isLive && data.status === 'SUCCESS' && (
                <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setRollbackOpen(true)}>
                  <Undo2 className="h-3.5 w-3.5" /> Rollback
                </Button>
              )}
            </>
          }
        />
      </div>

      {isLive && (
        <div className="flex items-center gap-2 rounded-lg border border-[color-mix(in_oklch,var(--info)_40%,transparent)] bg-[color-mix(in_oklch,var(--info)_8%,transparent)] px-3 py-2 text-xs text-[var(--info)]">
          {connected ? <><span className="h-1.5 w-1.5 rounded-full live-dot bg-[var(--info)]" /> Live stream connected (SSE) — pipeline state updates automatically.</>
            : <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Streaming via polling fallback…</>}
        </div>
      )}

      {/* Pipeline visualization */}
      <div className="nexus-card p-5">
        <SectionTitle aside={
          <span className="flex items-center gap-3 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1"><GitCommitHorizontal className="h-3 w-3" />{shortSha(data.commitSha)}</span>
            <span className="flex items-center gap-1"><Timer className="h-3 w-3" />{duration(data.durationMs)}</span>
            <Badge variant="secondary" className="font-mono text-[10px]">{data.branch}</Badge>
            <Badge variant="secondary" className="font-mono text-[10px]">{data.envName}</Badge>
          </span>
        }>
          Pipeline
        </SectionTitle>
        <ol className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5" aria-label="Pipeline stages">
          {stages.map((s, i) => {
            const running = s.status === 'RUNNING'
            const passed = s.status === 'PASSED'
            const failed = s.status === 'FAILED'
            const skipped = s.status === 'SKIPPED'
            return (
              <li
                key={s.name}
                className={cn(
                  'rounded-md border px-3 py-2.5 transition-colors',
                  passed && 'border-[color-mix(in_oklch,var(--success)_35%,transparent)] bg-[color-mix(in_oklch,var(--success)_7%,transparent)]',
                  failed && 'border-[color-mix(in_oklch,var(--destructive)_45%,transparent)] bg-[color-mix(in_oklch,var(--destructive)_8%,transparent)]',
                  running && 'border-[color-mix(in_oklch,var(--info)_45%,transparent)] bg-[color-mix(in_oklch,var(--info)_8%,transparent)]',
                  (skipped || s.status === 'PENDING') && 'border-border/70 bg-muted/20 opacity-70',
                )}
              >
                <div className="flex items-center gap-2">
                  {passed && <Check className="h-3.5 w-3.5 text-[var(--success)]" />}
                  {failed && <X className="h-3.5 w-3.5 text-[var(--destructive)]" />}
                  {running && <Loader2 className="h-3.5 w-3.5 animate-spin text-[var(--info)]" />}
                  {(skipped || s.status === 'PENDING') && <Circle className="h-3 w-3 text-muted-foreground/50" />}
                  <span className={cn('text-xs font-medium', failed && 'text-[var(--destructive)]')}>{s.name}</span>
                  {s.durationMs != null && <span className="ml-auto font-mono text-[10px] text-muted-foreground">{duration(s.durationMs)}</span>}
                </div>
                {s.log && (failed || running) && (
                  <pre className="mt-2 max-h-20 overflow-y-auto scrollbar-thin whitespace-pre-wrap rounded bg-black/30 p-1.5 font-mono text-[9px] leading-relaxed text-foreground/80">{s.log}</pre>
                )}
              </li>
            )
          })}
        </ol>
      </div>

      {/* Metadata + diff vs previous */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="nexus-card p-5">
          <SectionTitle>Changes</SectionTitle>
          <dl className="space-y-2.5 text-xs">
            <Row label="Author" value={<span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: data.author.avatarColor }} />{data.author.name}</span>} />
            <Row label="Files changed" value={`${data.filesChanged} (+${data.addLines} / −${data.delLines})`} />
            <Row label="Started" value={`${clockTime(data.startedAt)} · ${timeAgo(data.startedAt)}`} />
            <Row label="Duration" value={duration(data.durationMs)} />
            {data.testsTotal != null && <Row label="Tests" value={<span>{data.testsPassed}/{data.testsTotal} passed</span>} />}
            {data.bundleSizeKb != null && (
              <Row label="Bundle" value={
                <span className="flex items-center gap-2">
                  {kb(data.bundleSizeKb)}
                  {bundleDelta != null && bundleDelta !== 0 && (
                    <span className={cn('font-mono text-[11px]', bundleDelta > 50 ? 'font-semibold text-[var(--destructive)]' : bundleDelta > 0 ? 'text-[var(--warning)]' : 'text-[var(--success)]')}>
                      {deltaKb(bundleDelta)}
                    </span>
                  )}
                </span>
              } />
            )}
          </dl>
        </div>
        <div className="nexus-card p-5">
          <SectionTitle aside={<FileDiff className="h-3.5 w-3.5 text-muted-foreground" />}>Comparison to previous release</SectionTitle>
          {data.previous ? (
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between rounded-md border border-border/60 bg-muted/20 px-3 py-2">
                <span className="font-mono text-muted-foreground">{data.previous.ref} · {data.previous.version}</span>
                <span className="font-mono">→</span>
                <span className="font-mono font-medium">{data.ref} · {data.version}</span>
              </div>
              {data.previous.bundleSizeKb != null && data.bundleSizeKb != null && (
                <div>
                  <div className="mb-1 flex justify-between text-[11px] text-muted-foreground"><span>Bundle size</span><span className="font-mono">{kb(data.previous.bundleSizeKb)} → {kb(data.bundleSizeKb)}</span></div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn('h-full rounded-full', data.bundleSizeKb > data.previous.bundleSizeKb * 1.05 ? 'bg-[var(--destructive)]' : data.bundleSizeKb > data.previous.bundleSizeKb ? 'bg-[var(--warning)]' : 'bg-[var(--success)]')}
                      style={{ width: `${Math.min(100, (data.bundleSizeKb / Math.max(data.previous.bundleSizeKb, 1)) * 50)}%` }}
                    />
                  </div>
                </div>
              )}
              {bundleDelta != null && bundleDelta > 100 && (
                <div className="rounded-md border border-[color-mix(in_oklch,var(--warning)_40%,transparent)] bg-[color-mix(in_oklch,var(--warning)_8%,transparent)] px-3 py-2 text-[11px] text-[var(--warning)]">
                  Bundle grew {deltaKb(bundleDelta)} (+{Math.round((bundleDelta / Math.max(data.previous.bundleSizeKb ?? 1, 1)) * 100)}%) — above the 5% review threshold. Run an AI investigation to correlate with performance.
                </div>
              )}
              {!!data.incident && (
                <button onClick={() => navigate('incident', { ref: data.incident!.ref })} className="flex w-full items-center gap-2 rounded-md border border-[color-mix(in_oklch,var(--destructive)_40%,transparent)] bg-[color-mix(in_oklch,var(--destructive)_7%,transparent)] px-3 py-2 text-left text-[var(--destructive)] transition-colors hover:bg-[color-mix(in_oklch,var(--destructive)_12%,transparent)]">
                  <SirenInline /> Linked incident: <span className="font-mono font-semibold">{data.incident.ref}</span> — {data.incident.title}
                </button>
              )}
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => { useAppStore.getState().navigate('assistant'); }}>
                Ask AI what changed and why it matters
              </Button>
            </div>
          ) : (
            <div className="text-xs text-muted-foreground">No previous successful deployment to compare.</div>
          )}
        </div>
      </div>

      <AlertDialog open={rollbackOpen} onOpenChange={setRollbackOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2"><Undo2 className="h-4 w-4 text-[var(--warning)]" /> Review rollback</AlertDialogTitle>
            <AlertDialogDescription>
              This creates a <strong>new</strong> deployment of {data.serviceName} pinning {data.previous?.version ?? 'the previous version'} (never rewrites history) and marks {data.ref} as rolled back. The pipeline runs end-to-end with health checks.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); doRollback() }} disabled={rollbackPending} className="gap-1.5 bg-[var(--warning)] text-black hover:bg-[var(--warning)]/90">
              {rollbackPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Undo2 className="h-3.5 w-3.5" />}
              Confirm rollback
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function SirenInline() {
  return <SirenSmall />
}
function SirenSmall() {
  return <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--destructive)] live-dot" />
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border/40 pb-2 last:border-0 last:pb-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-mono">{value}</dd>
    </div>
  )
}
