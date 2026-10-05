'use client'
// Recruiter Mode, Case Study, Technical Q&A and the ADR browser.
// The 60-second pitch plus the full technical depth behind it.
import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useAppStore } from '@/stores/app-store'
import { PageHeader, SectionTitle, ScoreRing } from '@/components/shared/kit'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Bot, Activity, Gauge, Boxes, Network, Flag, Palette, ShieldCheck, TrendingUp, Presentation, Rocket, BookOpen, MessagesSquare, FileText, ArrowRight, Cpu, Timer, Accessibility, Database, Layers, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'

function useDocs(type: string) {
  return useQuery({
    queryKey: ['docs', type],
    queryFn: async () => (await fetch(`/api/docs?type=${type}`).then((r) => r.json())) as { docs: { id: string; title: string; type: string; ref?: string; content: string; tags: string[]; updatedAt: string }[] },
  })
}

// ── Recruiter Mode ───────────────────────────────────────────────────────────
export function RecruiterView() {
  const navigate = useAppStore((s) => s.navigate)
  const modules = [
    { icon: Bot, title: 'AI Engineering Agent', body: 'Tool-calling investigations over live platform data with confidence, citations and confirmation-gated actions — not a chatbot.', view: 'assistant' as const },
    { icon: Activity, title: 'Real-time Observability', body: 'Metrics, logs and traces correlated by request ID and time; deployment pipelines stream over SSE.', view: 'observability' as const },
    { icon: Gauge, title: 'Frontend Performance', body: 'Core Web Vitals per route, bundle budgets, and regression detection wired to the AI assistant.', view: 'performance' as const },
    { icon: Boxes, title: 'Service Catalog', body: 'Ownership, health, 7-day SLOs and dependency neighbours for every service in the org.', view: 'services' as const },
    { icon: Network, title: 'Architecture Graph', body: 'Interactive topology with blast-radius highlighting — click a node, see what breaks with it.', view: 'architecture' as const },
    { icon: Flag, title: 'Feature Flags', body: 'Percentage rollouts, region/team targeting and a full who-changed-what audit trail.', view: 'flags' as const },
    { icon: Palette, title: 'Design System', body: 'Tokens, components, motion and accessibility documented as a living lab inside the product.', view: 'design-system' as const },
    { icon: ShieldCheck, title: 'Security & RBAC', body: 'Eight roles with server-enforced granular permissions, audit logs and a security center.', view: 'security' as const },
    { icon: TrendingUp, title: 'Developer Productivity', body: 'DORA metrics computed from real delivery data — deployment frequency, lead time, CFR, MTTR.', view: 'productivity' as const },
  ]

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-xl border border-border/70">
        <div className="nexus-grid-bg absolute inset-0" aria-hidden />
        <div className="relative px-6 py-12 text-center md:py-16">
          <Badge variant="outline" className="mb-4 gap-1.5 border-[color-mix(in_oklch,var(--primary)_40%,transparent)] text-[11px]">
            <Presentation className="h-3 w-3" /> Recruiter mode
          </Badge>
          <h1 className="mx-auto max-w-2xl text-balance text-3xl font-semibold tracking-tight md:text-4xl">
            NEXUS — an <span className="text-[var(--primary)]">AI-native engineering control plane</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-balance text-sm leading-relaxed text-muted-foreground md:text-base">
            Build. Ship. Observe. Improve. A demonstration of how a senior engineer designs and ships a complete internal developer platform: nine integrated modules, one coherent product.
          </p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-2.5">
            <Button size="lg" className="gap-2" onClick={() => navigate('assistant')}>
              <Rocket className="h-4 w-4" /> Launch the golden demo
            </Button>
            <Button size="lg" variant="outline" className="gap-2" onClick={() => navigate('architecture')}>
              <Network className="h-4 w-4" /> View architecture
            </Button>
            <Button size="lg" variant="ghost" className="gap-2" onClick={() => navigate('case-study')}>
              <FileText className="h-4 w-4" /> Read the case study
            </Button>
          </div>
          <p className="mx-auto mt-5 max-w-lg text-[11px] leading-relaxed text-muted-foreground">
            The golden demo walks the flagship incident end-to-end in under five minutes: a checkout regression is detected, correlated by the AI, rolled back, and turned into a postmortem.
          </p>
        </div>
      </section>

      <section>
        <SectionTitle aside={<span className="text-[11px] text-muted-foreground">every module is functional — click through</span>}>What this project demonstrates</SectionTitle>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {modules.map((m) => (
            <button key={m.title} onClick={() => navigate(m.view)} className="nexus-card group p-4 text-left transition-colors hover:border-[var(--primary)]/40">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-border/70 bg-muted/30">
                  <m.icon className="h-4 w-4 text-[var(--primary)]" />
                </div>
                <span className="text-sm font-semibold">{m.title}</span>
                <ArrowRight className="ml-auto h-3.5 w-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
              </div>
              <p className="mt-2.5 text-[11.5px] leading-relaxed text-muted-foreground">{m.body}</p>
            </button>
          ))}
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-3">
        {[
          { icon: Layers, title: 'Architecture over technology', body: 'Feature-domain folder structure, deliberate server/client boundaries, a service layer the UI never bypasses. The stack is the easy part.' },
          { icon: Cpu, title: 'AI with judgment', body: 'Scoped tools instead of raw DB access, activity traces instead of hidden reasoning, calibrated confidence instead of false certainty.' },
          { icon: Accessibility, title: 'Enterprise UX', body: 'Dense where experts need it, calm everywhere else, keyboard-first, screen-reader aware, and honest about empty and error states.' },
        ].map((c) => (
          <div key={c.title} className="nexus-card p-5">
            <c.icon className="h-4 w-4 text-[var(--primary)]" />
            <h3 className="mt-2.5 text-sm font-semibold">{c.title}</h3>
            <p className="mt-1.5 text-[11.5px] leading-relaxed text-muted-foreground">{c.body}</p>
          </div>
        ))}
      </section>
    </div>
  )
}

// ── Case Study ───────────────────────────────────────────────────────────────
export function CaseStudyView() {
  const navigate = useAppStore((s) => s.navigate)
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader icon={<FileText className="h-4 w-4" />} title="Case Study" description="Why NEXUS exists, what it took to build, and the tradeoffs made along the way." />
      {[
        {
          h: 'The problem',
          p: 'Modern engineering teams run on disconnected tools: a service catalog nobody updates, dashboards that don\u2019t correlate, incidents tracked in one place and deployments in another. The cost is real — every investigation starts with humans stitching context across five tabs, and junior engineers repeat the same archaeology every time. NEXUS exists to collapse that: one control plane where deployment, performance, incidents, knowledge and AI investigation share the same data and the same timeline.',
        },
        {
          h: 'The goal',
          p: 'Build the platform I would want as an on-call engineer: answer \u201cwhat changed, what broke, and what to do next\u201d without leaving the page. Demonstrate production-grade engineering judgment across frontend, platform, and AI — in a product that feels like something a real team ships, not a portfolio of screens.',
        },
        {
          h: 'Architecture',
          p: 'Next.js 16 App Router with React Server Components by default and client islands only where interactivity demands them (charts, tables, palette, live pipeline). A typed service layer separates UI from data; Prisma + SQLite in this demo with provider abstractions (AIProvider, MonitoringProvider, VectorSearchProvider, GitHubProvider) so production swaps are driver changes, not rewrites. Deployment state streams over SSE with a polling fallback; TanStack Query owns server state while Zustand is restricted to UI state. Every mutating API route re-validates input with zod and enforces RBAC server-side.',
        },
        {
          h: 'Challenges',
          p: 'Real-time without a WebSocket fleet — solved with SSE plus optimistic UI and a documented tradeoff (ADR-004). Making AI trustworthy — solved with explicit zod-validated tools, source citations, confidence scores, and human confirmation on anything consequential (ADR-007). Keeping the demo coherent — the seed data tells one connected story: the same deployment ref appears in the incident timeline, the performance regression, the logs, the audit trail and the AI answer.',
        },
        {
          h: 'Tradeoffs, stated honestly',
          p: 'SQLite instead of PostgreSQL here — the schema avoids PG-specific features and documents the migration path. Lexical knowledge search instead of pgvector embeddings — the interface matches, the ranking quality is lower, and ADR-005 says so. A demo session cookie instead of full OAuth — session resolution and permission enforcement are real; the social logins are stubbed as providers. Every mock is labeled as a Mock Provider rather than pretending to be production.',
        },
        {
          h: 'Results (demo metrics)',
          p: 'A recruiter can understand the product in 60 seconds and replay the flagship incident in under five minutes. The engineering health score is computed from live telemetry — availability, CWV budgets, CVE pressure, test pass rates and telemetry coverage — not hard-coded. MTTR in the demo data drops from ~50 minutes to 23 minutes as AI-assisted investigation lands; that improvement is the thesis of the product.',
        },
      ].map((s) => (
        <section key={s.h}>
          <h2 className="text-sm font-semibold tracking-tight text-[var(--primary)]">{s.h}</h2>
          <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">{s.p}</p>
        </section>
      ))}
      <div className="flex flex-wrap gap-2 border-t border-border/60 pt-4">
        <Button size="sm" className="gap-1.5" onClick={() => navigate('assistant')}><Bot className="h-3.5 w-3.5" /> Try the AI investigation</Button>
        <Button size="sm" variant="outline" className="gap-1.5" onClick={() => navigate('adr')}><BookOpen className="h-3.5 w-3.5" /> Read the ADRs</Button>
      </div>
    </div>
  )
}

// ── Technical Q&A ────────────────────────────────────────────────────────────
const QA: { q: string; a: string; icon: typeof Zap }[] = [
  { icon: Layers, q: 'Why Next.js (App Router)?', a: 'One framework for the whole platform: RSC removes an entire API layer for read-heavy views (data is fetched in the component tree on the server), route handlers cover the API surface, and streaming + Suspense give progressive rendering for heavy dashboards. The cost is boundary discipline — enforced here with a documented convention (ADR-001) and by keeping "use client" out of layouts.' },
  { icon: Zap, q: 'Why React Server Components?', a: 'Nine modules of dense, mostly-read UI. Shipping all of that as client JS would be megabytes. RSC lets me keep data fetching colocated, keep secrets server-side, and reserve client components for charts, tables, the palette, dialogs and the live pipeline — where interactivity genuinely pays rent.' },
  { icon: Database, q: 'Why TanStack Query + Zustand, and where is the line?', a: 'Server state lives exclusively in TanStack Query: caching, invalidation, optimistic updates and polling are its job. Zustand owns UI state only — view params, sidebar, palette, density — persisted where it matters. Mirroring server data into Zustand is banned by convention because it creates two sources of truth (ADR-002/003).' },
  { icon: Timer, q: 'Why SSE over WebSockets for deployments?', a: 'Deployment progress is strictly server→client. SSE works over plain HTTP, auto-reconnects, and needs no sticky sessions or extra service. The UI also carries a 2s polling fallback for proxies that buffer streams. If bidirectional needs appear (collaborative editing, terminals), socket.io behind the gateway is the documented upgrade path (ADR-004).' },
  { icon: Database, q: 'Why PostgreSQL + pgvector for knowledge?', a: 'Keeping embeddings next to relational data means one transaction story, one backup story. The VectorSearchProvider interface hides the engine; this demo runs SQLite with lexical scoring behind the same interface, and ADR-005 records the quality gap honestly.' },
  { icon: ShieldCheck, q: 'How does RBAC actually work?', a: 'Roles (USER → SUPER_ADMIN) map to granular permission strings. The API layer resolves the session, checks the permission with a pure function, and rejects with 403 — the UI hides unauthorized actions only as affordance. Every mutation writes an audit row with actor and diff. Switch personas in the avatar menu to watch permission boundaries change live (ADR-006).' },
  { icon: Bot, q: 'How does the AI access data safely?', a: 'The model never sees the database. It plans tool calls from a fixed catalog (getService, listDeployments, getMetrics, getIncidents, getLogs, getPerformanceData, searchKnowledge, getArchitecture); the server executes them with zod-validated inputs and returns scoped JSON. Answers must cite what they used; confidence is surfaced; destructive actions are proposals that require human confirmation; every AI action is audited (ADR-007).' },
  { icon: Activity, q: 'How is observability implemented?', a: 'Metrics, structured logs with request/trace IDs, and span-based traces live behind a MonitoringProvider abstraction; the demo ships a MockMonitoringProvider with coherent synthetic telemetry. The UI correlates incident → deployment → metric → log → trace because the data model — not the UI — holds the relationships (ADR-009).' },
  { icon: TrendingUp, q: 'How does this scale from 10 to 10,000 engineers?', a: 'The seams are already in place: read replicas + pagination for catalog queries, Redis for rate limiting/queues/ephemeral state, event-driven deployments (outbox → queue), dedicated search (Meilisearch/Typesense) and pgvector for knowledge, OpenTelemetry + Prometheus/Tempo behind the monitoring provider, and multi-tenancy via the org-scoped data model. None of these require re-architecting the frontend.' },
]

export function TechnicalView() {
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <PageHeader icon={<MessagesSquare className="h-4 w-4" />} title="Technical Q&A" description="The architecture decisions an interviewer will probe — with direct answers and the tradeoffs behind them." />
      <Tabs defaultValue={QA[0].q}>
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 bg-muted/50 p-1">
          {QA.map((item, i) => (
            <TabsTrigger key={i} value={item.q} className="h-7 px-2.5 text-[11px]">
              {item.q.split(' ')[0]}…
            </TabsTrigger>
          ))}
        </TabsList>
        {QA.map((item, i) => (
          <TabsContent key={i} value={item.q} className="mt-4">
            <div className="nexus-card p-5">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-border/70 bg-muted/30">
                  <item.icon className="h-4 w-4 text-[var(--primary)]" />
                </div>
                <h2 className="text-sm font-semibold">{item.q}</h2>
              </div>
              <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground">{item.a}</p>
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}

// ── ADR browser ──────────────────────────────────────────────────────────────
export function AdrView({ docId }: { docId?: string }) {
  const { data, isLoading } = useDocs('')
  // docId from the store seeds the selection; user clicks then take over.
  const [override, setOverride] = useState<string | undefined>(undefined)
  const selected = override ?? docId
  const docs = data?.docs ?? []
  const doc = docs.find((d) => d.id === selected) ?? docs[0]

  const grouped = docs.reduce<Record<string, typeof docs>>((acc, d) => {
    ;(acc[d.type] ??= []).push(d)
    return acc
  }, {})

  if (isLoading) return <div className="grid gap-4 lg:grid-cols-4"><Skeleton className="h-96" /><Skeleton className="h-96 lg:col-span-3" /></div>

  return (
    <div className="space-y-4">
      <PageHeader icon={<BookOpen className="h-4 w-4" />} title="Architecture Decision Records" description="Real decisions with problem, context, options, decision, tradeoffs and consequences — the written memory of the engineering org." />
      <div className="grid gap-4 lg:grid-cols-4">
        <div className="nexus-card h-fit p-3 lg:sticky lg:top-20">
          {Object.entries(grouped).map(([type, list]) => (
            <div key={type} className="mb-3 last:mb-0">
              <div className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">{type}s</div>
              {list.map((d) => (
                <button
                  key={d.id}
                  onClick={() => setOverride(d.id)}
                  className={cn('flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[11.5px] transition-colors',
                    doc?.id === d.id ? 'bg-[color-mix(in_oklch,var(--primary)_10%,transparent)] font-medium' : 'text-muted-foreground hover:bg-muted/40 hover:text-foreground')}
                >
                  {d.ref && <span className="shrink-0 font-mono text-[9.5px] text-[var(--primary)]">{d.ref}</span>}
                  <span className="min-w-0 truncate">{d.title.replace(/^(ADR-\d+|Runbook|Postmortem)[:\s]*/, '')}</span>
                </button>
              ))}
            </div>
          ))}
        </div>
        <div className="nexus-card p-6 lg:col-span-3">
          {doc ? (
            <article className="max-w-none [&_h1]:mb-4 [&_h1]:text-lg [&_h1]:font-semibold [&_h2]:mb-1.5 [&_h2]:mt-5 [&_h2]:text-sm [&_h2]:font-semibold [&_h2]:text-[var(--primary)] [&_li]:ml-4 [&_li]:list-disc [&_ol]:list-decimal [&_ol]:space-y-1 [&_ol]:pl-1 [&_p]:text-[13px] [&_p]:leading-relaxed [&_p]:text-muted-foreground [&_section]:mb-4 [&_strong]:text-foreground [&_ul]:space-y-1 [&_ul]:pl-1">
              <div className="mb-4 flex items-center gap-2 border-b border-border/60 pb-3">
                {doc.ref && <Badge variant="outline" className="font-mono text-[10px]">{doc.ref}</Badge>}
                <Badge variant="secondary" className="text-[10px] capitalize">{doc.type}</Badge>
                <span className="ml-auto text-[10px] text-muted-foreground">updated {new Date(doc.updatedAt).toLocaleDateString()}</span>
              </div>
              {doc.content.split(/(?=\n## )/).map((section, i) => (
                <div key={i}>
                  {section.split('\n').map((line, li) => {
                    if (line.startsWith('## ')) return <h2 key={li}>{line.slice(3)}</h2>
                    if (line.startsWith('# ')) return <h1 key={li}>{line.slice(2)}</h1>
                    if (line.startsWith('- ')) return <li key={li}>{inlineBold(line.slice(2))}</li>
                    if (/^\d+\. /.test(line)) return <ol key={li}>{inlineBold(line.replace(/^\d+\. /, ''))}</ol>
                    if (line.trim() === '') return null
                    return <p key={li}>{inlineBold(line)}</p>
                  })}
                </div>
              ))}
            </article>
          ) : (
            <Skeleton className="h-96" />
          )}
        </div>
      </div>
    </div>
  )
}

function inlineBold(text: string): React.ReactNode[] {
  const parts = text.split(/\*\*(.+?)\*\*/g)
  return parts.map((p, i) => (i % 2 === 1 ? <strong key={i}>{p}</strong> : <span key={i}>{p.replace(/`/g, '')}</span>))
}

void ScoreRing
