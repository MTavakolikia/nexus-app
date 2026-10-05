'use client'
// Incident Management: list, detail with interactive timeline, AI postmortem draft.
import { useState } from 'react'
import { useIncidents, useIncident, useInvalidatePlatform } from '@/features/use-platform'
import { useAppStore } from '@/stores/app-store'
import { StatusBadge, SeverityBadge, PageHeader, SectionTitle, EmptyState } from '@/components/shared/kit'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Siren, Plus, Loader2, Sparkles, CheckCircle2, CircleDot, Wrench, ShieldCheck, Rocket, BellRing, Search, Activity, Undo2, FileText } from 'lucide-react'
import { timeAgo, clockTime, duration } from '@/lib/format'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

const TIMELINE_ICONS: Record<string, typeof CircleDot> = {
  deploy: Rocket, signal: Activity, alert: BellRing, incident: Siren, analysis: Search,
  recovery: CheckCircle2, resolved: ShieldCheck, event: CircleDot,
}

export function IncidentsView() {
  const { data, isLoading } = useIncidents()
  const navigate = useAppStore((s) => s.navigate)
  const [statusFilter, setStatusFilter] = useState('')

  return (
    <div className="space-y-4">
      <PageHeader
        icon={<Siren className="h-4 w-4" />}
        title="Incidents"
        description="Declare, investigate and resolve — with a complete timeline and AI-drafted postmortems."
        actions={
          <Button size="sm" className="gap-1.5" onClick={() => useAppStore.getState().setIncidentDialogOpen(true)}>
            <Plus className="h-3.5 w-3.5" /> Declare incident
          </Button>
        }
      />

      <div className="flex flex-wrap gap-1.5">
        {['', 'open', 'investigating', 'identified', 'monitoring', 'resolved'].map((s) => (
          <button
            key={s || 'all'} onClick={() => setStatusFilter(s)}
            className={cn('rounded-md border px-2.5 py-1 text-[11px] font-medium capitalize transition-colors',
              statusFilter === s ? 'border-[var(--primary)]/50 bg-[color-mix(in_oklch,var(--primary)_12%,transparent)]' : 'border-border text-muted-foreground hover:text-foreground')}
          >
            {s || 'All'}
          </button>
        ))}
      </div>

      {isLoading ? (
        <Skeleton className="h-80" />
      ) : !data?.incidents.filter((i) => !statusFilter || i.status === statusFilter).length ? (
        <EmptyState
          icon={<CheckCircle2 className="h-5 w-5 text-[var(--success)]" />}
          title="No active incidents. Your systems are healthy."
          body="SLO burn-rate alerts, synthetic checks and the AI assistant remain on watch. Resolved history is available under All."
        />
      ) : (
        <div className="nexus-card divide-y divide-border/60 p-0">
          {data.incidents.filter((i) => !statusFilter || i.status === statusFilter).map((i) => (
            <button
              key={i.id}
              onClick={() => navigate('incident', { ref: i.ref })}
              className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/30"
            >
              <SeverityBadge severity={i.severity} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs font-medium">{i.ref} · {i.title}</div>
                <div className="mt-0.5 truncate text-[11px] text-muted-foreground">
                  {i.affectedServices.join(' · ')} — owner {i.owner.name} · {timeAgo(i.startedAt)}
                </div>
              </div>
              {i.impact && <span className="hidden max-w-56 truncate text-[11px] text-muted-foreground lg:block">{i.impact}</span>}
              <StatusBadge status={i.status} className="w-28 justify-center" />
            </button>
          ))}
        </div>
      )}
      <CreateIncidentDialog />
    </div>
  )
}

function CreateIncidentDialog() {
  const { incidentDialogOpen, setIncidentDialogOpen } = useAppStore()
  const [title, setTitle] = useState('')
  const [severity, setSeverity] = useState('SEV-2')
  const [impact, setImpact] = useState('')
  const [services, setServices] = useState<string[]>(['checkout-web'])
  const [deploymentRef, setDeploymentRef] = useState('')
  const [pending, setPending] = useState(false)
  const invalidate = useInvalidatePlatform()

  const submit = async () => {
    setPending(true)
    try {
      const res = await api.createIncident({ title, severity, serviceSlugs: services, impact: impact || undefined, deploymentRef: deploymentRef || undefined })
      toast.success(`${res.ref} declared`, { description: 'Timeline started. Postmortem draft available on the incident page.' })
      setIncidentDialogOpen(false)
      setTitle(''); setImpact(''); setDeploymentRef('')
      invalidate()
      useAppStore.getState().navigate('incident', { ref: res.ref })
    } catch (e) {
      toast.error('Could not declare incident', { description: e instanceof Error ? e.message : 'Requires incidents.create' })
    } finally {
      setPending(false)
    }
  }

  return (
    <Dialog open={incidentDialogOpen} onOpenChange={setIncidentDialogOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Siren className="h-4 w-4 text-[var(--destructive)]" /> Declare incident</DialogTitle>
          <DialogDescription>Creates the record, starts the timeline and pages the owning team. Requires <span className="font-mono text-[11px]">incidents.create</span>.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-1">
          <div className="space-y-1.5">
            <label className="text-xs font-medium" htmlFor="inc-title">Title</label>
            <Input id="inc-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What is user-impacting?" className="h-9 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Severity</label>
              <Select value={severity} onValueChange={setSeverity}>
                <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['SEV-1', 'SEV-2', 'SEV-3', 'SEV-4'].map((s) => <SelectItem key={s} value={s} className="font-mono text-xs">{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium" htmlFor="inc-dep">Suspect deployment (optional)</label>
              <Input id="inc-dep" value={deploymentRef} onChange={(e) => setDeploymentRef(e.target.value)} placeholder="DPL-1042" className="h-9 font-mono text-xs" />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium">Affected services</label>
            <div className="flex flex-wrap gap-1.5">
              {['checkout-web', 'checkout-api', 'payment-api', 'frontend-web', 'auth-service', 'search-service', 'notification-service'].map((s) => (
                <button
                  key={s}
                  onClick={() => setServices((cur) => cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s])}
                  className={cn('rounded-md border px-2 py-1 font-mono text-[10px] transition-colors',
                    services.includes(s) ? 'border-[var(--destructive)]/50 bg-[color-mix(in_oklch,var(--destructive)_10%,transparent)]' : 'border-border text-muted-foreground')}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium" htmlFor="inc-impact">Impact</label>
            <Input id="inc-impact" value={impact} onChange={(e) => setImpact(e.target.value)} placeholder="Users affected, revenue at risk…" className="h-9 text-xs" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => setIncidentDialogOpen(false)}>Cancel</Button>
          <Button size="sm" variant="destructive" disabled={pending || title.length < 6 || !services.length} onClick={submit} className="gap-1.5">
            {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Siren className="h-3.5 w-3.5" />} Declare
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Detail ───────────────────────────────────────────────────────────────────
export function IncidentDetailView({ ref_ }: { ref_: string }) {
  const { data, isLoading } = useIncident(ref_)
  const [postmortemPending, setPostmortemPending] = useState(false)
  const [confirmResolve, setConfirmResolve] = useState(false)
  const [resolvePending, setResolvePending] = useState(false)
  const [draft, setDraft] = useState<null | {
    summary: string; impact: string; rootCause: string; resolution: string
    lessons: string[]; actions: { action: string; owner: string; status: string }[]
    generatedByAi: boolean; published: boolean
  }>(null)
  const invalidate = useInvalidatePlatform()
  const navigate = useAppStore((s) => s.navigate)
  const pm = draft ?? data?.postmortem ?? null

  if (isLoading || !data) return <Skeleton className="h-96" />

  const generatePostmortem = async () => {
    setPostmortemPending(true)
    try {
      const res = await api.generatePostmortem(data.ref)
      setDraft(res.postmortem)
      toast.success(res.regenerated ? 'Postmortem draft generated' : 'Postmortem loaded', { description: 'Everything is editable before publishing.' })
      invalidate()
    } catch (e) {
      toast.error('Generation failed', { description: e instanceof Error ? e.message : 'Requires incidents.resolve' })
    } finally {
      setPostmortemPending(false)
    }
  }

  const resolve = async () => {
    setResolvePending(true)
    try {
      await api.updateIncident(data.ref, { status: 'resolved', resolution: data.rootCause ? 'Recovered and verified within SLO.' : undefined })
      toast.success(`${data.ref} resolved`)
      setConfirmResolve(false)
      invalidate()
    } catch (e) {
      toast.error('Could not resolve', { description: e instanceof Error ? e.message : 'Requires incidents.resolve' })
    } finally {
      setResolvePending(false)
    }
  }

  const durationOpen = data.resolvedAt
    ? duration(new Date(data.resolvedAt).getTime() - new Date(data.startedAt).getTime())
    : 'ongoing'

  return (
    <div className="space-y-4">
      <div>
        <Button variant="ghost" size="sm" className="-ml-2 mb-1 h-7 gap-1 text-xs text-muted-foreground" onClick={() => navigate('incidents')}>← Incidents</Button>
        <PageHeader
          icon={<Siren className="h-4 w-4" />}
          title={<span className="flex flex-wrap items-center gap-2">{data.ref} <span className="font-sans text-sm font-normal text-muted-foreground">{data.title}</span></span>}
          description={data.impact ?? undefined}
          actions={
            <>
              <SeverityBadge severity={data.severity} />
              <StatusBadge status={data.status} live={data.status !== 'resolved'} />
              {data.status !== 'resolved' && (
                <Button size="sm" variant="outline" onClick={() => setConfirmResolve(true)} className="gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5" /> Resolve
                </Button>
              )}
            </>
          }
        />
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <MiniStat label="Owner" value={data.owner.name} />
        <MiniStat label="Started" value={clockTime(data.startedAt)} sub={timeAgo(data.startedAt)} />
        <MiniStat label="Duration" value={durationOpen} />
        <MiniStat label="Affected" value={data.affectedServices.join(', ') || '—'} />
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        {/* Timeline */}
        <div className="nexus-card p-5 lg:col-span-3">
          <SectionTitle aside={<span className="text-[11px] text-muted-foreground">{data.timeline.length} events</span>}>Timeline</SectionTitle>
          <ol className="relative space-y-0 before:absolute before:bottom-2 before:left-[7px] before:top-2 before:w-px before:bg-border" aria-label="Incident timeline">
            {data.timeline.map((t, i) => {
              const Icon = TIMELINE_ICONS[t.kind] ?? CircleDot
              return (
                <li key={i} className="relative flex gap-3 pb-4 pl-6 last:pb-0">
                  <span className={cn('absolute left-0 top-0.5 flex h-[15px] w-[15px] items-center justify-center rounded-full border bg-card',
                    t.kind === 'recovery' || t.kind === 'resolved' ? 'border-[color-mix(in_oklch,var(--success)_50%,transparent)] text-[var(--success)]'
                      : t.kind === 'alert' || t.kind === 'signal' ? 'border-[color-mix(in_oklch,var(--warning)_50%,transparent)] text-[var(--warning)]'
                      : 'border-border text-muted-foreground')}>
                    <Icon className="h-2.5 w-2.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-2">
                      <span className="text-xs font-medium">{t.label}</span>
                      <time className="font-mono text-[10px] text-muted-foreground">{clockTime(t.at)}</time>
                    </div>
                    {t.detail && <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">{t.detail}</p>}
                  </div>
                </li>
              )
            })}
          </ol>
        </div>

        {/* Facts + postmortem */}
        <div className="space-y-4 lg:col-span-2">
          {!!data.deploymentRef && (
            <div className="nexus-card p-4">
              <SectionTitle>Linked deployment</SectionTitle>
              <button onClick={() => navigate('deployment', { ref: data.deploymentRef! })} className="flex w-full items-center gap-2 rounded-md border border-border/60 px-3 py-2 text-left transition-colors hover:border-ring/40">
                <Rocket className="h-3.5 w-3.5 text-[var(--primary)]" />
                <span className="font-mono text-xs font-medium">{data.deploymentRef}</span>
                <span className="ml-auto text-[10px] text-[var(--primary)]">open →</span>
              </button>
            </div>
          )}
          <div className="nexus-card p-4">
            <SectionTitle>Root cause &amp; resolution</SectionTitle>
            <dl className="space-y-3 text-xs leading-relaxed">
              {data.detection && <div><dt className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Detection</dt><dd className="text-muted-foreground">{data.detection}</dd></div>}
              {data.rootCause && <div><dt className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Root cause</dt><dd>{data.rootCause}</dd></div>}
              {data.resolution && <div><dt className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Resolution</dt><dd className="text-muted-foreground">{data.resolution}</dd></div>}
            </dl>
          </div>

          <div className="nexus-card p-4">
            <SectionTitle aside={pm?.generatedByAi ? <Badge variant="outline" className="gap-1 text-[9px]"><Sparkles className="h-2.5 w-2.5 text-[var(--primary)]" /> AI draft</Badge> : undefined}>
              Postmortem
            </SectionTitle>
            {pm ? (
              <div className="space-y-3 text-xs">
                <PostmortemField label="Summary" value={pm.summary} />
                <PostmortemField label="Impact" value={pm.impact} />
                <PostmortemField label="Root cause" value={pm.rootCause} />
                <PostmortemField label="Resolution" value={pm.resolution} />
                <div>
                  <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Lessons learned</div>
                  <ul className="list-disc space-y-1 pl-4 text-[11px] leading-relaxed text-muted-foreground">
                    {pm.lessons.map((l, i) => <li key={i}>{l}</li>)}
                  </ul>
                </div>
                <div>
                  <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Corrective actions</div>
                  <div className="space-y-1.5">
                    {pm.actions.map((a, i) => (
                      <div key={i} className="flex items-center gap-2 rounded border border-border/60 px-2.5 py-1.5">
                        {a.status === 'done' ? <CheckCircle2 className="h-3 w-3 shrink-0 text-[var(--success)]" /> : <Wrench className="h-3 w-3 shrink-0 text-[var(--warning)]" />}
                        <span className="min-w-0 flex-1 truncate text-[11px]">{a.action}</span>
                        <span className="shrink-0 text-[10px] text-muted-foreground">{a.owner}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-2 text-center">
                <p className="mb-3 text-[11px] text-muted-foreground">Generate an editable draft from the timeline, deployment correlation and metrics.</p>
                <Button size="sm" variant="outline" className="gap-1.5" disabled={postmortemPending} onClick={generatePostmortem}>
                  {postmortemPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 text-[var(--primary)]" />}
                  Generate postmortem
                </Button>
              </div>
            )}
            {pm && <p className="mt-3 flex items-center gap-1.5 text-[10px] text-muted-foreground"><FileText className="h-3 w-3" /> Fields are editable before publishing to the knowledge base.</p>}
          </div>
        </div>
      </div>

      <AlertDialog open={confirmResolve} onOpenChange={setConfirmResolve}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Resolve {data.ref}?</AlertDialogTitle>
            <AlertDialogDescription>Marks the incident resolved, stops the SLO burn timer and records the action in the audit log. Verify metrics are within budget for 10 minutes first.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); resolve() }} disabled={resolvePending} className="gap-1.5">
              {resolvePending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />} Confirm resolve
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function PostmortemField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
      <p className="rounded border border-border/50 bg-muted/20 p-2 leading-relaxed">{value}</p>
    </div>
  )
}

function MiniStat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="nexus-card p-3.5">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 truncate text-sm font-medium">{value}</div>
      {sub && <div className="text-[10px] text-muted-foreground">{sub}</div>}
    </div>
  )
}

void Undo2
