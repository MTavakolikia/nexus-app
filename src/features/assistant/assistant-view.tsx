'use client'
// AI Engineering Assistant: tool-calling investigations over NEXUS data.
// Shows a safe, high-level activity trace (never private chain-of-thought),
// calibrated confidence, cited sources and confirmation-gated actions.
import { useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useAppStore } from '@/stores/app-store'
import { PageHeader } from '@/components/shared/kit'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Bot, SendHorizonal, Sparkles, Loader2, Wrench, ShieldCheck, Undo2, Siren, ArrowRight, RefreshCcw, Gauge, Cpu } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import ReactMarkdown from 'react-markdown'
import type { AiChatResponse, AiToolStep } from '@/lib/types'

interface Turn {
  role: 'user' | 'assistant'
  content: string
  toolTrace?: AiToolStep[]
  confidence?: number
  sources?: string[]
  suggestedActions?: { action: string; label: string }[]
  provider?: string
}

const SUGGESTED = [
  'Why did checkout latency increase after the latest deployment?',
  'Which services depend on payment-api?',
  'What are our biggest engineering risks right now?',
  'Which frontend routes are currently unhealthy?',
  'Why do we use Zustand instead of Redux in checkout-web?',
]

export function AssistantView() {
  const [turns, setTurns] = useState<Turn[]>([])
  const [input, setInput] = useState('')
  const [pending, setPending] = useState(false)
  const [conversationId, setConversationId] = useState<string | undefined>()
  const [confirmAction, setConfirmAction] = useState<null | { action: string; label: string }>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const qc = useQueryClient()
  const { params } = useAppStore()

  useEffect(() => {
    if (params.tab === 'investigate-checkout' && turns.length === 0 && !pending) {
      ask(SUGGESTED[0])
      useAppStore.setState({ params: {} })
    }
  }, [params.tab])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [turns, pending])

  const ask = async (message: string) => {
    if (!message.trim() || pending) return
    setInput('')
    setTurns((t) => [...t, { role: 'user', content: message }])
    setPending(true)
    try {
      const res = await api.aiChat(message, conversationId)
      setConversationId(res.conversationId)
      setTurns((t) => [...t, {
        role: 'assistant', content: res.answer, toolTrace: res.toolTrace,
        confidence: res.confidence, sources: res.sources, suggestedActions: res.suggestedActions, provider: res.provider,
      }])
    } catch (e) {
      setTurns((t) => [...t, { role: 'assistant', content: `Investigation failed: ${e instanceof Error ? e.message : 'unknown error'}. The AI provider is unavailable — the deterministic MockAIProvider normally covers this path.` }])
    } finally {
      setPending(false)
    }
  }

  const runAction = async (action: { action: string; label: string }) => {
    if (['create_incident', 'rollback'].includes(action.action)) {
      setConfirmAction(action)
      return
    }
    switch (action.action) {
      case 'open_architecture': useAppStore.getState().navigate('architecture'); break
      case 'open_deployments': useAppStore.getState().navigate('deployments'); break
      case 'open_flags': useAppStore.getState().navigate('flags'); break
      case 'open_security': useAppStore.getState().navigate('security'); break
      case 'open_performance': useAppStore.getState().navigate('performance'); break
      case 'generate_postmortem': {
        try {
          await api.generatePostmortem('INC-1042')
          toast.success('Postmortem draft ready', { description: 'Open INC-1042 to review and publish.' })
          qc.invalidateQueries()
        } catch (e) {
          toast.error('Failed', { description: e instanceof Error ? e.message : 'error' })
        }
        break
      }
      default:
        toast('Action acknowledged', { description: action.label })
    }
  }

  const executeConfirmed = async () => {
    const action = confirmAction
    if (!action) return
    setConfirmAction(null)
    if (action.action === 'create_incident') {
      useAppStore.getState().setIncidentDialogOpen(true)
      toast('Review incident details', { description: 'Prefill from the investigation, then declare.' })
    }
    if (action.action === 'rollback') {
      useAppStore.getState().navigate('deployments')
      toast('Review rollback in Deployment Center', { description: 'Rollbacks always require explicit human confirmation.' })
    }
  }

  return (
    <div className="flex h-[calc(100dvh-8.5rem)] min-h-[560px] flex-col gap-4">
      <PageHeader
        icon={<Bot className="h-4 w-4" />}
        title="AI Engineering Assistant"
        description="Not a chatbot — an investigator with scoped tools over services, deployments, metrics, incidents and the engineering knowledge base. Destructive actions always require your confirmation."
        actions={
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => { setTurns([]); setConversationId(undefined) }}>
            <RefreshCcw className="h-3.5 w-3.5" /> New session
          </Button>
        }
      />

      <div className="nexus-card flex min-h-0 flex-1 flex-col">
        {/* conversation */}
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto scrollbar-thin p-4 md:p-5">
          {turns.length === 0 && !pending && (
            <div className="flex h-full flex-col items-center justify-center gap-5 py-8 text-center">
              <div className="relative">
                <div className="absolute -inset-4 rounded-full bg-[color-mix(in_oklch,var(--primary)_14%,transparent)] blur-xl" />
                <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl border border-[color-mix(in_oklch,var(--primary)_40%,transparent)] bg-[color-mix(in_oklch,var(--primary)_10%,var(--card))]">
                  <Sparkles className="h-6 w-6 text-[var(--primary)]" />
                </div>
              </div>
              <div>
                <h2 className="text-sm font-semibold">Investigate with platform context</h2>
                <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-muted-foreground">
                  The assistant plans tool calls, reads live platform data and answers with citations, confidence and next actions.
                  Try the golden path below.
                </p>
              </div>
              <div className="grid w-full max-w-xl gap-2 sm:grid-cols-2">
                {SUGGESTED.map((s) => (
                  <button
                    key={s}
                    onClick={() => ask(s)}
                    className="group rounded-lg border border-border/70 bg-card p-3 text-left text-[11px] leading-snug transition-colors hover:border-[var(--primary)]/40 hover:bg-[color-mix(in_oklch,var(--primary)_5%,transparent)]"
                  >
                    <span className="flex items-start gap-2">
                      <Sparkles className="mt-0.5 h-3 w-3 shrink-0 text-[var(--primary)]" />
                      {s}
                      <ArrowRight className="ml-auto mt-0.5 h-3 w-3 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {turns.map((t, i) => (
            <div key={i} className={cn('flex gap-3', t.role === 'user' && 'justify-end')}>
              {t.role === 'assistant' && (
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-[color-mix(in_oklch,var(--primary)_35%,transparent)] bg-[color-mix(in_oklch,var(--primary)_10%,transparent)]">
                  <Bot className="h-3.5 w-3.5 text-[var(--primary)]" />
                </div>
              )}
              <div className={cn('min-w-0 max-w-[85%] rounded-xl border px-4 py-3 text-[13px] leading-relaxed',
                t.role === 'user'
                  ? 'border-transparent bg-[var(--primary)] text-[var(--primary-foreground)]'
                  : 'border-border/70 bg-card shadow-sm')}>
                {t.role === 'assistant' && t.toolTrace && t.toolTrace.length > 0 && (
                  <div className="mb-3 rounded-lg border border-border/60 bg-muted/25 p-2.5">
                    <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      <Wrench className="h-3 w-3" /> Investigation trace · {t.provider ?? 'AIProvider'}
                    </div>
                    <ol className="space-y-1">
                      {t.toolTrace.map((step, si) => (
                        <li key={si} className="flex items-center gap-2 font-mono text-[10.5px] text-muted-foreground">
                          <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_oklch,var(--primary)_18%,transparent)] text-[8px] font-bold text-[var(--primary)]">{si + 1}</span>
                          <span className="font-semibold text-foreground/80">{step.tool}</span>
                          <span className="truncate">— {step.summary}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
                {t.role === 'assistant' ? (
                  <div className="space-y-2 [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[11px] [&_h3]:mt-2 [&_h3]:text-xs [&_h3]:font-semibold [&_li]:ml-4 [&_li]:list-disc [&_ol]:space-y-1 [&_p]:leading-relaxed [&_strong]:font-semibold [&_ul]:space-y-1">
                    <ReactMarkdown>{t.content}</ReactMarkdown>
                  </div>
                ) : (
                  t.content
                )}

                {t.role === 'assistant' && t.confidence != null && (
                  <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border/50 pt-2.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Confidence</span>
                      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
                        <div
                          className={cn('h-full rounded-full', t.confidence >= 0.8 ? 'bg-[var(--success)]' : t.confidence >= 0.6 ? 'bg-[var(--warning)]' : 'bg-[var(--destructive)]')}
                          style={{ width: `${t.confidence * 100}%` }}
                        />
                      </div>
                      <span className="font-mono text-[11px] font-semibold">{Math.round(t.confidence * 100)}%</span>
                    </div>
                    {!!t.sources?.length && (
                      <div className="flex min-w-0 flex-wrap items-center gap-1">
                        {t.sources.slice(0, 4).map((s, si) => (
                          <Badge key={si} variant="secondary" className="max-w-44 truncate font-mono text-[9px]">{s}</Badge>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                {t.role === 'assistant' && !!t.suggestedActions?.length && (
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {t.suggestedActions.map((a) => (
                      <Button key={a.action} size="sm" variant="outline" className="h-7 gap-1.5 text-[11px]" onClick={() => runAction(a)}>
                        {a.action === 'create_incident' && <Siren className="h-3 w-3 text-[var(--destructive)]" />}
                        {a.action === 'rollback' && <Undo2 className="h-3 w-3 text-[var(--warning)]" />}
                        {a.action === 'generate_postmortem' && <Sparkles className="h-3 w-3 text-[var(--primary)]" />}
                        {a.label}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {pending && (
            <div className="flex gap-3">
              <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-[color-mix(in_oklch,var(--primary)_35%,transparent)] bg-[color-mix(in_oklch,var(--primary)_10%,transparent)]">
                <Bot className="h-3.5 w-3.5 text-[var(--primary)]" />
              </div>
              <div className="rounded-xl border border-border/70 bg-card px-4 py-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-[var(--primary)]" />
                  Investigating — planning tool calls…
                </div>
                <Skeleton className="mt-3 h-3 w-56" />
                <Skeleton className="mt-2 h-3 w-40" />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* composer */}
        <div className="border-t border-border/70 p-3">
          <form
            className="flex items-center gap-2"
            onSubmit={(e) => { e.preventDefault(); ask(input) }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about deployments, regressions, dependencies, runbooks…"
              aria-label="Ask the AI assistant"
              className="h-10 min-w-0 flex-1 rounded-lg border border-border bg-card px-3.5 text-sm outline-none transition-shadow placeholder:text-muted-foreground/60 focus:ring-2 focus:ring-ring/40"
            />
            <Button type="submit" size="sm" className="h-10 gap-1.5 px-4" disabled={pending || input.trim().length < 3}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <SendHorizonal className="h-4 w-4" />}
              Investigate
            </Button>
          </form>
          <div className="mt-1.5 flex items-center gap-3 px-1 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1"><Cpu className="h-3 w-3" /> AIProvider abstraction — Z.ai provider with deterministic fallback</span>
            <span className="hidden items-center gap-1 sm:flex"><Gauge className="h-3 w-3" /> tools: getService · listDeployments · getMetrics · getIncidents · getLogs · getPerformanceData · searchKnowledge · getArchitecture</span>
          </div>
        </div>
      </div>

      <SafetyConfirm action={confirmAction} onClose={() => setConfirmAction(null)} onConfirm={executeConfirmed} />
    </div>
  )
}

function SafetyConfirm({ action, onClose, onConfirm }: {
  action: { action: string; label: string } | null
  onClose: () => void; onConfirm: () => void
}) {
  if (!action) return null
  const dangerous = ['create_incident', 'rollback'].includes(action.action)
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Confirm AI action" onClick={onClose}>
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-[var(--warning)]" />
          <h3 className="text-sm font-semibold">{dangerous ? 'AI proposes a consequential action' : 'Confirm action'}</h3>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          The assistant recommends: <span className="font-medium text-foreground">{action.label}</span>.
          {action.action === 'rollback' && ' Rollbacks are never automatic — you will review the deployment diff before anything executes.'}
          {action.action === 'create_incident' && ' You will review severity and impact before the incident is declared.'}
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <Button size="sm" variant="outline" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={onConfirm} className="gap-1.5">
            {action.action === 'rollback' && <Undo2 className="h-3.5 w-3.5" />}
            {action.action === 'create_incident' && <Siren className="h-3.5 w-3.5" />}
            Review &amp; proceed
          </Button>
        </div>
      </div>
    </div>
  )
}
