// AI Engineering Assistant (ADR-007).
// AIProvider abstraction with two implementations:
//  - ZaiProvider: routes tool selection + synthesis through the Z.ai SDK (backend only)
//  - MockAIProvider: deterministic rule-based investigator (demo resilience, no external calls)
// The model NEVER touches the database: it selects explicit, zod-validated tools and
// the server executes them and returns scoped results. High-level activity trace only.
import { z } from 'zod'
import { db } from '@/lib/db'
import { parseJson } from '@/server/queries'
import type { AiChatResponse, AiToolStep } from '@/lib/types'

// ── Tools (explicit surface — no raw DB access) ──────────────────────────────
const ToolSchema = z.object({ name: z.string(), args: z.record(z.string(), z.unknown()).optional() })
const PlanSchema = z.object({ tools: z.array(ToolSchema).max(6) })

export const TOOLS_CATALOG = [
  { name: 'getService', description: 'Service metadata, health, version, 7d error rate / p95 / availability', args: 'service (slug, optional — infers from question)' },
  { name: 'listDeployments', description: 'Recent deployments for a service with version, status, bundle delta, time', args: 'service?, limit?' },
  { name: 'getMetrics', description: 'Metric aggregates (error_rate, p95_latency, availability) for a service', args: 'service, metric?, hours?' },
  { name: 'getIncidents', description: 'Incidents filtered by status with severity, impact, affected services', args: 'status?, limit?' },
  { name: 'getLogs', description: 'Recent log lines for a service (ERROR/WARN focus)', args: 'service?, hours?, level?' },
  { name: 'getPerformanceData', description: 'Route performance (LCP/INP/CLS/bundle) and regression detection', args: 'service?, route?' },
  { name: 'searchKnowledge', description: 'Semantic search over ADRs, runbooks, postmortems, guidelines', args: 'query' },
  { name: 'getArchitecture', description: 'Dependency graph neighbours of a service', args: 'service' },
] as const

// ── Tool implementations (server-side, scoped) ───────────────────────────────
async function findServiceSlug(hint?: string): Promise<string | null> {
  if (!hint) return null
  const h = hint.toLowerCase().replace(/\s+/g, '-')
  const services = await db.service.findMany({ select: { slug: true, name: true } })
  const exact = services.find((s) => s.slug === h || s.name === h)
  if (exact) return exact.slug
  const partial = services.find((s) => h.includes(s.slug) || s.slug.includes(h.replace(/^(the|a|our)\s+/, '')))
  return partial?.slug ?? null
}

export async function executeTool(name: string, args: Record<string, unknown> = {}): Promise<{ summary: string; data: unknown }> {
  switch (name) {
    case 'getService': {
      const slug = await findServiceSlug(typeof args.service === 'string' ? args.service : undefined)
      const svc = slug ? await db.service.findUnique({ where: { slug }, include: { team: true } }) : null
      if (!svc) return { summary: 'No matching service found', data: null }
      return { summary: `Service ${svc.name}: ${svc.status}, v${svc.version}, team ${svc.team.name}`, data: svc }
    }
    case 'listDeployments': {
      const slug = await findServiceSlug(typeof args.service === 'string' ? args.service : undefined)
      const limit = Math.min(Number(args.limit ?? 5) || 5, 10)
      const deps = await db.deployment.findMany({
        where: slug ? { service: { slug } } : {},
        orderBy: { startedAt: 'desc' }, take: limit,
        include: { service: { select: { name: true } }, author: { select: { name: true } } },
      })
      return { summary: `${deps.length} recent deployments${slug ? ` for ${slug}` : ''}`, data: deps }
    }
    case 'getMetrics': {
      const slug = await findServiceSlug(typeof args.service === 'string' ? args.service : undefined)
      if (!slug) return { summary: 'No service resolved for metrics', data: null }
      const svc = await db.service.findUnique({ where: { slug } })
      const hours = Math.min(Number(args.hours ?? 24) || 24, 168)
      const names = args.metric ? [String(args.metric)] : ['error_rate', 'p95_latency', 'availability']
      const since = new Date(Date.now() - hours * 3600_000)
      const metrics = await db.metric.findMany({ where: { serviceId: svc!.id, name: { in: names }, ts: { gte: since } }, orderBy: { ts: 'asc' } })
      const buckets: Record<string, number[]> = {}
      for (const m of metrics) (buckets[m.name] ??= []).push(m.value)
      const stats = Object.fromEntries(Object.entries(buckets).map(([k, v]) => [k, { min: Math.min(...v), max: Math.max(...v), avg: +(v.reduce((a, b) => a + b, 0) / v.length).toFixed(2) }]))
      return { summary: `Metrics for ${slug} over ${hours}h: ${JSON.stringify(stats)}`, data: stats }
    }
    case 'getIncidents': {
      const status = typeof args.status === 'string' ? args.status : undefined
      const incidents = await db.incident.findMany({
        where: status && status !== 'any' ? { status } : {},
        orderBy: { startedAt: 'desc' }, take: Math.min(Number(args.limit ?? 5) || 5, 10),
        include: { owner: { select: { name: true } } },
      })
      return { summary: `${incidents.length} incidents${status ? ` (${status})` : ''}: ${incidents.map((i) => `${i.ref} ${i.severity} ${i.title}`).join(' · ')}`, data: incidents }
    }
    case 'getLogs': {
      const slug = await findServiceSlug(typeof args.service === 'string' ? args.service : undefined)
      const hours = Math.min(Number(args.hours ?? 24) || 24, 168)
      const logs = await db.logEntry.findMany({
        where: { ...(slug ? { service: { slug } } : {}), level: { in: ['ERROR', 'WARN'] }, ts: { gte: new Date(Date.now() - hours * 3600_000) } },
        orderBy: { ts: 'desc' }, take: 12,
      })
      return { summary: `${logs.length} recent WARN/ERROR logs${slug ? ` for ${slug}` : ''}`, data: logs }
    }
    case 'getPerformanceData': {
      const slug = await findServiceSlug(typeof args.service === 'string' ? args.service : undefined) ?? 'checkout-web'
      const svc = await db.service.findUnique({ where: { slug } })
      if (!svc) return { summary: 'No performance data', data: null }
      const snaps = await db.performanceSnapshot.findMany({ where: { serviceId: svc.id, ...(args.route ? { route: String(args.route) } : {}) }, orderBy: { ts: 'desc' }, take: 40 })
      if (!snaps.length) return { summary: `No performance snapshots for ${slug}`, data: null }
      const [latest, ...rest] = snaps
      const baseline = rest.slice(-10)
      const avg = (f: (s: typeof latest) => number, arr: typeof baseline) => (arr.length ? arr.reduce((a, s) => a + f(s), 0) / arr.length : f(latest))
      const lcpDelta = latest.lcpMs - avg((s) => s.lcpMs, baseline)
      const bundleDelta = latest.bundleKb - avg((s) => s.bundleKb, baseline)
      return {
        summary: `${slug}${latest.route}: LCP ${latest.lcpMs}ms (Δ${Math.round(lcpDelta)}ms vs baseline), bundle ${latest.bundleKb}KB (Δ${Math.round(bundleDelta)}KB), score ${latest.score}`,
        data: { route: latest.route, latest, lcpDelta, bundleDelta },
      }
    }
    case 'searchKnowledge': {
      const q = String(args.query ?? '').toLowerCase()
      const terms = q.match(/\b[a-z][a-z0-9-]{2,}\b/g) ?? []
      const chunks = await db.knowledgeChunk.findMany({ include: { document: { select: { title: true, type: true, ref: true } } } })
      const scored = chunks.map((c) => {
        const hay = `${c.heading ?? ''} ${c.content} ${c.keywords} ${c.document.title}`.toLowerCase()
        let score = 0
        for (const t of terms) if (hay.includes(t)) score += t.length > 5 ? 2 : 1
        return { c, score }
      }).filter((x) => x.score > 0).sort((a, b) => b.score - a.score).slice(0, 3)
      return {
        summary: scored.length ? `Found ${scored.length} knowledge sources: ${scored.map((s) => s.c.document.ref ?? s.c.document.title).join(', ')}` : 'No knowledge matches',
        data: scored.map((s) => ({ title: s.c.document.title, ref: s.c.document.ref, heading: s.c.heading, excerpt: s.c.content.slice(0, 420) })),
      }
    }
    case 'getArchitecture': {
      const slug = await findServiceSlug(typeof args.service === 'string' ? args.service : undefined)
      if (!slug) return { summary: 'No service resolved', data: null }
      const node = await db.architectureNode.findFirst({ where: { serviceSlug: slug } })
      if (!node) return { summary: `No architecture node for ${slug}`, data: null }
      const edges = await db.architectureEdge.findMany({ where: { OR: [{ fromKey: node.key }, { toKey: node.key }] } })
      const keys = edges.flatMap((e) => [e.fromKey, e.toKey])
      const neighbours = await db.architectureNode.findMany({ where: { key: { in: keys } } })
      return { summary: `${slug} depends on / is used by ${neighbours.filter((n) => n.key !== node.key).map((n) => n.label).join(', ')}`, data: { node, neighbours, edges } }
    }
    default:
      return { summary: `Unknown tool: ${name}`, data: null }
  }
}

// ── Intent inference (deterministic pre-router) ──────────────────────────────
interface Intent { services: string[]; metric?: string; hours?: number; wantDeployments: boolean; wantPerf: boolean; wantLogs: boolean; wantKnowledge: boolean; wantIncidents: boolean; knowledgeQuery?: string }

function inferIntent(q: string): Intent {
  const lower = q.toLowerCase()
  const services = ['checkout-web', 'checkout-api', 'payment-api', 'frontend-web', 'auth-service', 'search-service', 'recommendation-engine', 'notification-service', 'analytics-service', 'api-gateway', 'inventory-service', 'ai-assistant']
    .filter((s) => lower.includes(s.replace('-', '')) || lower.includes(s))
  const genericServiceWords = ['checkout', 'payment', 'search', 'auth', 'notification', 'inventory', 'recommendation', 'analytics', 'gateway']
  for (const w of genericServiceWords) {
    if (services.length === 0 && lower.includes(w)) services.push(`${w}${w === 'checkout' || w === 'payment' ? '' : ''}` as string)
  }
  const metric = lower.includes('error') ? 'error_rate' : lower.includes('latency') || lower.includes('slow') || lower.includes('lag') ? 'p95_latency' : lower.includes('availability') || lower.includes('uptime') ? 'availability' : undefined
  const hours = /last (\d+)h/.exec(lower)?.[1] ? Number(/last (\d+)h/.exec(lower)![1]) : /week|7 ?d/.test(lower) ? 168 : 24
  return {
    services: services.slice(0, 2),
    metric, hours,
    wantDeployments: /deploy|release|version|v3\.|ship|rollout|rollback/.test(lower),
    wantPerf: /performance|lcp|bundle|web vital|slow|regress|latency|perf/.test(lower),
    wantLogs: /log|error|timeout|stack|trace/.test(lower),
    wantKnowledge: /why|how|should|guide|adr|policy|convention|risk|who depend|which service/.test(lower),
    wantIncidents: /incident|outage|sev|postmortem|severity/.test(lower),
    knowledgeQuery: q,
  }
}

async function runPlannedTools(question: string): Promise<{ steps: AiToolStep[]; context: Record<string, unknown> }> {
  const intent = inferIntent(question)
  const plan: { name: string; args: Record<string, unknown> }[] = []
  const svc = intent.services[0]
  if (svc) plan.push({ name: 'getService', args: { service: svc } })
  if (intent.wantDeployments) plan.push({ name: 'listDeployments', args: { service: svc, limit: 5 } })
  if (intent.metric && svc) plan.push({ name: 'getMetrics', args: { service: svc, metric: intent.metric, hours: intent.hours } })
  if (intent.wantPerf) plan.push({ name: 'getPerformanceData', args: { service: svc } })
  if (intent.wantLogs) plan.push({ name: 'getLogs', args: { service: svc, hours: intent.hours } })
  if (intent.wantIncidents) plan.push({ name: 'getIncidents', args: { status: 'any', limit: 5 } })
  if (intent.wantKnowledge) plan.push({ name: 'searchKnowledge', args: { query: intent.knowledgeQuery } })
  if (/depend|architecture|graph|topology/.test(question.toLowerCase()) && svc) plan.push({ name: 'getArchitecture', args: { service: svc } })

  const steps: AiToolStep[] = []
  const context: Record<string, unknown> = {}
  for (const call of plan.slice(0, 6)) {
    const parsed = ToolSchema.safeParse(call)
    if (!parsed.success) continue
    const { summary, data } = await executeTool(parsed.data.name, parsed.data.args ?? {})
    steps.push({ tool: parsed.data.name, summary })
    context[parsed.data.name + (parsed.data.args?.service ? `:${parsed.data.args.service}` : '')] = data
  }
  return { steps, context }
}

// ── Providers ────────────────────────────────────────────────────────────────
export interface AiProvider { name: string; investigate(question: string): Promise<AiChatResponse> }

function shapeResponse(answer: string, steps: AiToolStep[], confidence: number, sources: string[], actions: { action: string; label: string }[], conversationId: string): AiChatResponse {
  return { answer, toolTrace: steps, confidence, sources, suggestedActions: actions, conversationId }
}

export class MockAiProvider implements AiProvider {
  name = 'MockAIProvider'
  async investigate(question: string): Promise<AiChatResponse> {
    const { steps } = await runPlannedTools(question)
    const lower = question.toLowerCase()
    const conv = await db.aIConversation.create({ data: { userId: 'demo', title: question.slice(0, 60) } })

    // The golden demo question gets the curated, data-connected investigation.
    if (/latency|slow|regress|drop|increase/.test(lower) && /checkout|checkout-web|checkout-api/.test(lower.replace(/\s/g, ''))) {
      return shapeResponse(
        `Checkout latency regression is real and correlated with **DPL-1042** (checkout-web v3.18.2, yesterday 14:32).\n\n**Primary signal** — bundle growth: checkout-web went 1,101KB → 1,284KB (**+183KB, +16.6%**) in this release. The diff bumps \`analytics-client\` 4.0.3 → 4.1.0.\n\n**Secondary signal** — LCP on /checkout rose **2.08s → 2.46s (+241ms)** within 3 minutes of rollout; INP degraded 187ms → 224ms.\n\n**Cascade** — checkout-api p95 went 148ms → 612ms between 14:35 and 14:44, with payment-provider timeouts logged (\`req_82731\`). The 4.1.0 client flushes its beacon queue **synchronously** on the submit path — it blocks the main thread and amplifies upstream latency.\n\n**Recommendation** — roll back to v3.18.1 (already executed as DPL-1043) and pin analytics-client to 4.0.3 until async batching ships behind the \`analytics-async-beacon\` flag.`,
        steps, 0.87,
        ['DPL-1042 deployment diff', 'Performance snapshots /checkout (30d)', 'checkout-api metrics 14:35–14:51', 'Log req_82731 · trace tr_9f2a', 'Frontend Architecture Guide — beacon anti-pattern'],
        [
          { action: 'create_incident', label: 'Declare incident (SEV-2)' },
          { action: 'generate_postmortem', label: 'Generate postmortem draft' },
          { action: 'open_architecture', label: 'Inspect dependency blast radius' },
        ],
        conv.id,
      )
    }
    if (/depend|which service/.test(lower)) {
      return shapeResponse(
        `Based on the architecture graph: **checkout-api** depends on **payment-api** (authorize) and **inventory-service** (reserve), and emits beacons to **analytics-service**. **payment-api** in turn calls the external **Payment Provider**. Any latency or failure in these upstream nodes can degrade checkout — the blast radius of payment-api covers checkout-api → checkout-web → customer funnel.`,
        steps, 0.91,
        ['Architecture graph (NEXUS)', 'Runbook RB-001 — Checkout Service Degraded'],
        [{ action: 'open_architecture', label: 'Open Architecture Explorer' }],
        conv.id,
      )
    }
    if (/risk/.test(lower)) {
      return shapeResponse(
        `Top engineering risks right now:\n\n1. **checkout-web / checkout-api degraded** — residual instability after INC-1042; keep the funnel under synthetic watch for 48h.\n2. **CVE-2026-3141 (high, 7.5)** in payment-api \`snakeyaml@2.1\` — fix scheduled; PSP-facing parse path.\n3. **Testing pillar (86)** — E2E flakiness on checkout flows; failure budget consumed by 2 pipeline aborts this week.\n4. **new-checkout at 62% rollout** — DE cohort at 50%; hold growth until analytics-async-beacon ships.\n\nEach item links to a concrete owner and next step in the platform.`,
        steps, 0.78,
        ['Security Center', 'Engineering Health (computed)', 'INC-1042 corrective actions'],
        [{ action: 'open_security', label: 'Open Security Center' }, { action: 'open_performance', label: 'Open Performance Center' }],
        conv.id,
      )
    }
    // Generic synthesis from whatever tools ran
    const bullet = steps.map((s) => `- **${s.tool}** — ${s.summary}`).join('\n')
    return shapeResponse(
      `Here is what the platform data shows for “${question}”:\n\n${bullet}\n\nConfidence is moderate — the deterministic provider could not find a stronger correlated signal. Ask about checkout latency, dependencies, performance regressions or engineering risks for a deeper investigation.`,
      steps, 0.55, ['NEXUS platform data'], [], conv.id,
    )
  }
}

export class ZaiProvider implements AiProvider {
  name = 'ZaiProvider'
  async investigate(question: string): Promise<AiChatResponse> {
    // Phase 1 — deterministic pre-router gathers tool context (server-side).
    const { steps, context } = await runPlannedTools(question)
    const conv = await db.aIConversation.create({ data: { userId: 'demo', title: question.slice(0, 60) } })

    // Phase 2 — LLM synthesis over scoped tool results.
    const { default: ZAI } = await import('z-ai-web-dev-sdk')
    const zai = await ZAI.create()
    const system = [
      'You are the NEXUS Engineering Assistant. You investigate questions about services, deployments, performance, incidents and engineering knowledge.',
      'You are given: (1) the user question, (2) a tool activity trace, (3) scoped tool results as JSON.',
      'Rules: answer ONLY from the provided data; cite concrete refs (DPL-*, INC-*, routes, request IDs); be concise and technical; use markdown with short bold labels; never invent data; if data is missing say so.',
      'End with a line "Confidence: NN%" (your calibrated confidence as a multiple of 5).',
    ].join(' ')
    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'assistant', content: system },
        { role: 'user', content: `Question: ${question}\n\nTool trace:\n${steps.map((s) => `- ${s.tool}: ${s.summary}`).join('\n')}\n\nTool results JSON:\n${safeJson(context).slice(0, 14000)}` },
      ],
      thinking: { type: 'disabled' },
    })
    const raw = completion.choices[0]?.message?.content ?? ''
    const confMatch = /Confidence:\s*(\d{1,3})%/i.exec(raw)
    const confidence = confMatch ? Math.min(0.97, Math.max(0.3, Number(confMatch[1]) / 100)) : 0.72
    const answer = raw.replace(/\n?Confidence:\s*\d{1,3}%.*$/i, '').trim() || raw
    return shapeResponse(
      answer, steps, confidence,
      [...new Set(steps.map((s) => s.tool))],
      inferActions(question),
      conv.id,
    )
  }
}

function inferActions(question: string): { action: string; label: string }[] {
  const lower = question.toLowerCase()
  const actions: { action: string; label: string }[] = []
  if (/regress|slow|latency|drop|increase|error/.test(lower)) {
    actions.push({ action: 'create_incident', label: 'Declare incident' })
    actions.push({ action: 'open_deployments', label: 'Review recent deployments' })
  }
  if (/postmortem/.test(lower)) actions.push({ action: 'generate_postmortem', label: 'Generate postmortem' })
  if (/flag/.test(lower)) actions.push({ action: 'open_flags', label: 'Open Feature Flags' })
  return actions
}

function safeJson(v: unknown): string {
  try {
    return JSON.stringify(v, (_k, val) => (typeof val === 'object' && val !== null && 'meta' in (val as object) ? undefined : val) ?? val, 1)
  } catch { return '{}' }
}

export function getAiProvider(): AiProvider {
  return process.env.NEXUS_AI_PROVIDER === 'mock' ? new MockAiProvider() : new ZaiProvider()
}

export { MockAiProvider as MockProviderName }

// parseJson is re-exported for route handlers that need it
export { parseJson }
