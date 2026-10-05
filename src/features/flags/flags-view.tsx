'use client'
// Feature Flags: progressive delivery with rollout controls + full audit trail.
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useFlags, useInvalidatePlatform } from '@/features/use-platform'
import { PageHeader, SectionTitle, EmptyState } from '@/components/shared/kit'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Flag, History, Globe2, Users, Loader2, ShieldCheck } from 'lucide-react'
import { timeAgo } from '@/lib/format'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { FlagDTO } from '@/lib/types'

export function FlagsView() {
  const { data, isLoading } = useFlags()

  return (
    <div className="space-y-4">
      <PageHeader
        icon={<Flag className="h-4 w-4" />}
        title="Feature Flags"
        description="Progressive delivery with percentage rollouts, region and team targeting. Every change is audited."
      />
      {isLoading ? (
        <div className="grid gap-3 lg:grid-cols-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-44" />)}</div>
      ) : !data?.flags.length ? (
        <EmptyState icon={<Flag className="h-5 w-5" />} title="No flags yet" body="Feature flags enable safe, progressive delivery of new functionality." />
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {data.flags.map((f) => <FlagCard key={f.id} flag={f} />)}
        </div>
      )}
      <FlagAuditPanel />
    </div>
  )
}

function FlagCard({ flag }: { flag: FlagDTO }) {
  const invalidate = useInvalidatePlatform()
  const [enabled, setEnabled] = useState(flag.enabled)
  const [rollout, setRollout] = useState(flag.rollout)
  const [pending, setPending] = useState(false)
  const [confirm, setConfirm] = useState<null | { enabled?: boolean; rollout?: number }>(null)

  const apply = async (change: { enabled?: boolean; rollout?: number }) => {
    setPending(true)
    try {
      await api.updateFlag(flag.id, { ...change, reason: 'Changed from NEXUS UI' })
      toast.success(`${flag.key} updated`, { description: change.enabled !== undefined ? `Toggled ${change.enabled ? 'on' : 'off'}` : `Rollout ${change.rollout}%` })
      invalidate()
    } catch (e) {
      setEnabled(flag.enabled); setRollout(flag.rollout)
      toast.error('Change rejected', { description: e instanceof Error ? e.message : 'Requires feature_flags.write — try the Developer persona.' })
    } finally {
      setPending(false)
      setConfirm(null)
    }
  }

  return (
    <div className="nexus-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-semibold">{flag.key}</span>
            <Badge variant="secondary" className="font-mono text-[9px]">{flag.envName}</Badge>
          </div>
          <p className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">{flag.description}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {pending && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
          <Switch
            checked={enabled}
            disabled={pending}
            onCheckedChange={(v) => { setEnabled(v); setConfirm({ enabled: v }) }}
            aria-label={`Toggle ${flag.key}`}
          />
        </div>
      </div>

      <div className="mt-4">
        <div className="mb-1.5 flex items-center justify-between text-[11px]">
          <span className="text-muted-foreground">Global rollout</span>
          <span className={cn('font-mono font-semibold', !enabled && 'text-muted-foreground/60')}>{rollout}%</span>
        </div>
        <Slider
          value={[rollout]} min={0} max={100} step={5} disabled={!enabled || pending}
          onValueChange={([v]) => setRollout(v)}
          onValueCommit={([v]) => { if (v !== flag.rollout) setConfirm({ rollout: v }) }}
          aria-label="Rollout percentage"
          className="[&_[role=slider]]:h-3.5 [&_[role=slider]]:w-3.5"
        />
      </div>

      {flag.rules.length > 0 && (
        <div className="mt-4 space-y-1.5">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Targeting rules</div>
          {flag.rules.map((r, i) => (
            <div key={i} className="flex items-center gap-2 rounded-md border border-border/60 bg-muted/20 px-2.5 py-1.5 text-[11px]">
              {r.type === 'region' ? <Globe2 className="h-3 w-3 text-[var(--info)]" /> : <Users className="h-3 w-3 text-[var(--primary)]" />}
              <span className="font-medium">{r.region ?? r.team}</span>
              <div className="ml-auto flex w-28 items-center gap-2">
                <div className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-[var(--primary)]" style={{ width: `${r.rollout}%` }} />
                </div>
                <span className="w-8 text-right font-mono">{r.rollout}%</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-3 flex items-center gap-1.5 border-t border-border/60 pt-2.5 text-[10px] text-muted-foreground">
        <History className="h-3 w-3" />
        {flag.audits[0] ? `${flag.audits[0].userName}: ${flag.audits[0].previousValue} → ${flag.audits[0].newValue} · ${timeAgo(flag.audits[0].at)}` : 'No changes yet'}
      </div>

      <AlertDialog open={!!confirm} onOpenChange={(v) => !v && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-[var(--warning)]" /> Confirm flag change</AlertDialogTitle>
            <AlertDialogDescription>
              {confirm?.enabled !== undefined
                ? `${flag.key} → ${confirm.enabled ? 'ENABLED' : 'DISABLED'}`
                : `${flag.key} rollout → ${confirm?.rollout}%`} in {flag.envName}. This is immediately live and written to the audit trail.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setEnabled(flag.enabled); setRollout(flag.rollout) }}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); apply(confirm!) }}>Apply change</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function FlagAuditPanel() {
  const { data: all } = useFlags()
  const audits = (all?.flags ?? []).flatMap((f) => f.audits.map((a) => ({ ...a, key: f.key }))).sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()).slice(0, 10)
  return (
    <div className="nexus-card p-4">
      <SectionTitle aside={<Badge variant="secondary" className="font-mono text-[10px]">who · what · when · why</Badge>}>Flag audit trail</SectionTitle>
      {audits.length === 0 ? (
        <div className="py-4 text-center text-xs text-muted-foreground">No flag changes recorded yet.</div>
      ) : (
        <div className="divide-y divide-border/50">
          {audits.map((a, i) => (
            <div key={i} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 text-[11px]">
              <span className="w-24 shrink-0 font-medium">{a.userName}</span>
              <span className="font-mono font-semibold text-[var(--primary)]">{a.key}</span>
              <span className="font-mono text-muted-foreground">{a.previousValue} → {a.newValue}</span>
              {a.reason && <span className="min-w-0 flex-1 truncate text-muted-foreground">“{a.reason}”</span>}
              <span className="ml-auto shrink-0 text-muted-foreground">{timeAgo(a.at)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

void Button
