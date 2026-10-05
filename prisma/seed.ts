/* NEXUS seed — coherent golden-demo dataset.
 * Story: checkout-web v3.18.2 ships analytics-client@4.1.0 (+183KB), LCP regresses,
 * error rate spikes, INC-1042 is declared, rollback recovers, postmortem generated.
 * Deterministic PRNG; timestamps anchored relative to "now" so the demo is always fresh.
 */
import { PrismaClient } from '@prisma/client'

const db = new PrismaClient({ log: [] })

// Deterministic PRNG (mulberry32)
let s = 0x2f6e2b1
const rnd = () => {
  s |= 0; s = (s + 0x6d2b79f5) | 0
  let t = Math.imul(s ^ (s >>> 15), 1 | s)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}
const pick = <T,>(arr: T[]): T => arr[Math.floor(rnd() * arr.length)]
const between = (a: number, b: number) => a + rnd() * (b - a)
const intBetween = (a: number, b: number) => Math.floor(between(a, b + 1))

const NOW = new Date()
const H = 3600_000, D = 24 * H, MIN = 60_000
const ago = (ms: number) => new Date(NOW.getTime() - ms)
// Yesterday at 14:32 local — the flagship incident window
const incidentDay = new Date(NOW); incidentDay.setDate(incidentDay.getDate() - 1); incidentDay.setHours(0, 0, 0, 0)
const T = (h: number, m: number) => new Date(incidentDay.getTime() + h * H + m * MIN)

const j = (v: unknown) => JSON.stringify(v)

async function main() {
  console.log('Seeding NEXUS…')
  await db.$transaction([
    db.dailyStat.deleteMany(), db.aIMessage.deleteMany(), db.aIConversation.deleteMany(),
    db.knowledgeChunk.deleteMany(), db.document.deleteMany(), db.auditLog.deleteMany(),
    db.notification.deleteMany(), db.securityEvent.deleteMany(), db.vulnerability.deleteMany(),
    db.featureFlagAudit.deleteMany(), db.featureFlag.deleteMany(),
    db.postmortem.deleteMany(), db.incidentTimeline.deleteMany(), db.incident.deleteMany(),
    db.traceSpan.deleteMany(), db.logEntry.deleteMany(), db.metric.deleteMany(),
    db.performanceSnapshot.deleteMany(), db.pipelineStage.deleteMany(), db.deployment.deleteMany(),
    db.architectureEdge.deleteMany(), db.architectureNode.deleteMany(),
    db.environment.deleteMany(), db.service.deleteMany(), db.repository.deleteMany(),
    db.membership.deleteMany(), db.team.deleteMany(), db.user.deleteMany(), db.organization.deleteMany(),
  ])

  // ── Organization ─────────────────────────────────────────────
  const org = await db.organization.create({ data: { name: 'Acme Engineering', slug: 'acme', plan: 'enterprise' } })

  // ── Users ────────────────────────────────────────────────────
  const userData = [
    { email: 'mohammad@acme.dev', name: 'Mohammad Tavakoli', title: 'Senior Frontend Engineer', role: 'TEAM_LEAD', avatarColor: '#14b8a6' },
    { email: 'sarah@acme.dev', name: 'Sarah Chen', title: 'Platform Engineer', role: 'PLATFORM_ADMIN', avatarColor: '#f59e0b' },
    { email: 'alex@acme.dev', name: 'Alex Morgan', title: 'Engineering Manager', role: 'ADMIN', avatarColor: '#8b5cf6' },
    { email: 'emma@acme.dev', name: 'Emma Davis', title: 'Security Engineer', role: 'SECURITY_ADMIN', avatarColor: '#ef4444' },
    { email: 'priya@acme.dev', name: 'Priya Sharma', title: 'Backend Engineer', role: 'DEVELOPER', avatarColor: '#0ea5e9' },
    { email: 'jonas@acme.dev', name: 'Jonas Vermeulen', title: 'SRE', role: 'ENGINEER', avatarColor: '#22c55e' },
    { email: 'sofia@acme.dev', name: 'Sofia Rossi', title: 'AI Engineer', role: 'DEVELOPER', avatarColor: '#ec4899' },
    { email: 'lucas@acme.dev', name: 'Lucas Meyer', title: 'Checkout Engineer', role: 'DEVELOPER', avatarColor: '#eab308' },
  ]
  const users: Record<string, any> = {}
  for (const u of userData) users[u.email] = await db.user.create({ data: { ...u, orgId: org.id } })
  const U = {
    mohammad: users['mohammad@acme.dev'], sarah: users['sarah@acme.dev'], alex: users['alex@acme.dev'],
    emma: users['emma@acme.dev'], priya: users['priya@acme.dev'], jonas: users['jonas@acme.dev'],
    sofia: users['sofia@acme.dev'], lucas: users['lucas@acme.dev'],
  }

  // ── Teams ────────────────────────────────────────────────────
  const teamData = [
    { name: 'Frontend Platform', slug: 'frontend-platform', color: '#14b8a6', description: 'Design system, web performance and the frontend-web application.', ownerId: U.mohammad.id, members: [U.mohammad, U.sofia, U.jonas] },
    { name: 'Checkout', slug: 'checkout', color: '#f59e0b', description: 'Cart, checkout funnel and order placement services.', ownerId: U.lucas.id, members: [U.lucas, U.priya, U.mohammad] },
    { name: 'Payments', slug: 'payments', color: '#22c55e', description: 'Payment processing, provider integrations and ledger.', ownerId: U.priya.id, members: [U.priya, U.alex] },
    { name: 'Infrastructure', slug: 'infrastructure', color: '#0ea5e9', description: 'Kubernetes, gateways, databases and observability stack.', ownerId: U.sarah.id, members: [U.sarah, U.jonas] },
    { name: 'AI Platform', slug: 'ai-platform', color: '#ec4899', description: 'AI assistant, RAG pipeline and model gateway.', ownerId: U.sofia.id, members: [U.sofia, U.sarah] },
    { name: 'Security', slug: 'security', color: '#ef4444', description: 'Application security, compliance and incident response.', ownerId: U.emma.id, members: [U.emma, U.alex] },
  ]
  const teams: Record<string, any> = {}
  for (const t of teamData) {
    teams[t.slug] = await db.team.create({ data: { orgId: org.id, name: t.name, slug: t.slug, description: t.description, color: t.color, ownerId: t.ownerId } })
    for (const m of t.members) await db.membership.create({ data: { teamId: teams[t.slug].id, userId: m.id, role: m.id === t.ownerId ? 'owner' : 'member' } })
  }

  // ── Environments ─────────────────────────────────────────────
  for (const e of [
    { name: 'Development', slug: 'development', kind: 'ephemeral', url: 'https://dev.acme.dev', isDefault: false },
    { name: 'Staging', slug: 'staging', kind: 'static', url: 'https://staging.acme.dev', isDefault: false },
    { name: 'Production', slug: 'production', kind: 'static', url: 'https://app.acme.dev', isDefault: true },
    { name: 'Canary', slug: 'canary', kind: 'progressive', url: 'https://canary.acme.dev', isDefault: false },
  ]) await db.environment.create({ data: { ...e, orgId: org.id } })

  // ── Services + Repositories ──────────────────────────────────
  const svcData = [
    { name: 'frontend-web', kind: 'frontend', lang: 'TypeScript', fw: 'Next.js 16', team: 'frontend-platform', tier: 'tier-1', owner: U.mohammad, desc: 'Primary customer-facing web application. SSR, design system host and performance budget owner.' },
    { name: 'checkout-web', kind: 'frontend', lang: 'TypeScript', fw: 'Next.js 16', team: 'checkout', tier: 'tier-1', owner: U.lucas, desc: 'Cart and checkout funnel. Highest revenue-critical surface in the platform.' },
    { name: 'checkout-api', kind: 'backend', lang: 'Go', fw: 'go-kit', team: 'checkout', tier: 'tier-1', owner: U.lucas, desc: 'Order placement, pricing and cart state machine. Backs checkout-web.' },
    { name: 'payment-api', kind: 'backend', lang: 'Kotlin', fw: 'Spring Boot', team: 'payments', tier: 'tier-1', owner: U.priya, desc: 'Payment orchestration across PSPs with idempotent retry semantics.' },
    { name: 'auth-service', kind: 'backend', lang: 'Go', fw: 'chi', team: 'infrastructure', tier: 'tier-1', owner: U.sarah, desc: 'Authentication, sessions, MFA and OAuth flows for all properties.' },
    { name: 'api-gateway', kind: 'backend', lang: 'Rust', fw: 'axum', team: 'infrastructure', tier: 'tier-1', owner: U.sarah, desc: 'Edge routing, rate limiting and request authentication.' },
    { name: 'search-service', kind: 'backend', lang: 'TypeScript', fw: 'Node 22', team: 'frontend-platform', tier: 'tier-2', owner: U.jonas, desc: 'Product search with vector ranking and typo tolerance.' },
    { name: 'recommendation-engine', kind: 'backend', lang: 'Python', fw: 'FastAPI', team: 'ai-platform', tier: 'tier-2', owner: U.sofia, desc: 'Realtime personalization and product recommendations.' },
    { name: 'notification-service', kind: 'backend', lang: 'TypeScript', fw: 'Node 22', team: 'infrastructure', tier: 'tier-3', owner: U.jonas, desc: 'Email, push and in-app notification delivery with fan-out queues.' },
    { name: 'analytics-service', kind: 'backend', lang: 'Kotlin', fw: 'Spring Boot', team: 'data', tier: 'tier-2', owner: U.alex, desc: 'Event ingestion, sessionization and product analytics.' } as any,
    { name: 'inventory-service', kind: 'backend', lang: 'Go', fw: 'go-kit', team: 'checkout', tier: 'tier-2', owner: U.priya, desc: 'Stock levels, reservations and warehouse sync.' },
    { name: 'ai-assistant', kind: 'backend', lang: 'TypeScript', fw: 'Node 22', team: 'ai-platform', tier: 'tier-2', owner: U.sofia, desc: 'Engineering copilot: tool-calling agent over platform data and knowledge base.' },
  ]
  // add missing data team
  const dataTeam = await db.team.create({ data: { orgId: org.id, name: 'Data', slug: 'data', description: 'Analytics, data pipelines and reporting.', color: '#a855f7', ownerId: U.alex.id } })
  await db.membership.create({ data: { teamId: dataTeam.id, userId: U.alex.id, role: 'owner' } })

  const services: Record<string, any> = {}
  const svcStatus: Record<string, string> = { 'checkout-api': 'degraded', 'checkout-web': 'degraded' }
  for (const s of svcData) {
    const team = s.team === 'data' ? dataTeam : teams[s.team]
    const repo = await db.repository.create({
      data: {
        orgId: org.id, name: `acme/${s.name}`, url: `https://github.com/acme/${s.name}`, language: s.lang,
        lastCommitSha: randSha(), lastCommitMessage: pick(LAST_COMMITS), lastCommitAt: ago(intBetween(2, 30) * H),
        openPrs: intBetween(0, 7), contributors: intBetween(3, 12), buildStatus: pick(['passing', 'passing', 'passing', 'passing', 'failing']),
      },
    })
    services[s.name] = await db.service.create({
      data: {
        orgId: org.id, teamId: team.id, repoId: repo.id, name: s.name, slug: s.name,
        description: s.desc, kind: s.kind, language: s.lang, framework: s.fw, tier: s.tier,
        status: svcStatus[s.name] ?? 'healthy', version: `v${intBetween(2, 5)}.${intBetween(10, 24)}.${intBetween(0, 9)}`,
        ownerId: s.owner.id,
      },
    })
  }
  // fix: analytics-service should belong to Data team, not missing 'data' string
  await db.service.update({ where: { slug: 'analytics-service' }, data: { teamId: dataTeam.id } })

  // ── Deployments (30 days of history) ─────────────────────────
  const stageNames = ['Install', 'Lint', 'Typecheck', 'Unit Tests', 'Integration Tests', 'E2E Tests', 'Security Scan', 'Build', 'Deploy']
  let dplSeq = 700 // history stays below the reserved story refs (DPL-1036…1043)
  const mkStages = async (deploymentId: string, status: string, startedAt: Date) => {
    let t = startedAt.getTime()
    const failedAt = status === 'FAILED' ? intBetween(5, 8) : -1
    for (let i = 0; i < stageNames.length; i++) {
      const dur = stageNames[i] === 'E2E Tests' ? intBetween(90, 240) * 1000 : intBetween(12, 70) * 1000
      const st = failedAt === i ? 'FAILED' : status === 'FAILED' && i > failedAt ? 'SKIPPED' : (status === 'IN_PROGRESS' && i > 4) ? (i === 5 ? 'RUNNING' : 'PENDING') : 'PASSED'
      const s2 = await db.pipelineStage.create({
        data: {
          deploymentId, name: stageNames[i], status: st, position: i, startedAt: new Date(t),
          finishedAt: st === 'PENDING' ? null : new Date(t + dur), durationMs: st === 'PENDING' ? null : dur,
          log: st === 'PENDING' ? null : stageLog(stageNames[i], st),
        },
      })
      if (st === 'FAILED' && s2.name === 'E2E Tests') { /* keep */ }
      t += dur + 800
      if (st === 'FAILED' || st === 'SKIPPED') break
    }
  }

  const deployAuthors = [U.mohammad, U.lucas, U.priya, U.sarah, U.sofia, U.jonas]
  const svcKeys = Object.keys(services)
  // seed history
  for (let day = 30; day >= 1; day--) {
    const count = intBetween(2, 6)
    for (let k = 0; k < count; k++) {
      const svcName = pick(svcKeys)
      const svc = services[svcName]
      const startedAt = ago(day * D - intBetween(0, 20) * H)
      const roll = rnd()
      const status = roll < 0.82 ? 'SUCCESS' : roll < 0.92 ? 'FAILED' : roll < 0.96 ? 'ROLLED_BACK' : 'SUCCESS'
      const version = `v${intBetween(2, 5)}.${intBetween(10, 24)}.${intBetween(0, 12)}`
      const filesChanged = intBetween(2, 40)
      dplSeq++
      const dep = await db.deployment.create({
        data: {
          ref: `DPL-${dplSeq}`, serviceId: svc.id, envName: pick(['production', 'production', 'production', 'staging']),
          version, commitSha: randSha(), branch: pick(['main', 'main', 'main', 'release/canary']),
          authorId: pick(deployAuthors).id, status, trigger: pick(['push', 'push', 'merge', 'manual']),
          startedAt, finishedAt: new Date(startedAt.getTime() + intBetween(4, 11) * MIN), durationMs: intBetween(4, 11) * MIN,
          filesChanged, addLines: filesChanged * intBetween(3, 30), delLines: filesChanged * intBetween(1, 20),
          bundleSizeKb: svc.kind === 'frontend' ? Math.round(between(980, 1450)) : null,
          bundleDeltaKb: svc.kind === 'frontend' ? Math.round(between(-40, 60)) : null,
          testsPassed: intBetween(180, 320), testsTotal: intBetween(320, 335),
          changeSummary: pick(CHANGE_SUMMARIES),
        },
      })
      if (day <= 7) await mkStages(dep.id, status, startedAt)
    }
  }
  // ── FLAGSHIP: the golden-demo deployment (yesterday 14:32) ──
  const flagship = await db.deployment.create({
    data: {
      ref: 'DPL-1042', serviceId: services['checkout-web'].id, envName: 'production', version: 'v3.18.2',
      commitSha: randSha(), branch: 'main', authorId: U.lucas.id, status: 'ROLLED_BACK', trigger: 'push',
      startedAt: T(14, 32), finishedAt: T(14, 48), durationMs: 16 * MIN,
      filesChanged: 23, addLines: 412, delLines: 96,
      bundleSizeKb: 1284, bundleDeltaKb: 183, testsPassed: 298, testsTotal: 331,
      changeSummary: 'Checkout funnel redesign + bump analytics-client to 4.1.0. Ships new promo banner and A/B beacon batching.',
    },
  })
  await mkStages(flagship.id, 'SUCCESS', T(14, 32))
  // previous good version
  const previousGood = await db.deployment.create({
    data: {
      ref: 'DPL-1038', serviceId: services['checkout-web'].id, envName: 'production', version: 'v3.18.1',
      commitSha: randSha(), branch: 'main', authorId: U.lucas.id, status: 'SUCCESS', trigger: 'push',
      startedAt: T(9, 12), finishedAt: T(9, 21), durationMs: 9 * MIN,
      filesChanged: 6, addLines: 84, delLines: 31, bundleSizeKb: 1101, bundleDeltaKb: 12,
      testsPassed: 329, testsTotal: 331, changeSummary: 'Fix promo eligibility rounding on cart line items.',
    },
  })
  // rollback deployment
  await db.deployment.create({
    data: {
      ref: 'DPL-1043', serviceId: services['checkout-web'].id, envName: 'production', version: 'v3.18.1',
      commitSha: previousGood.commitSha, branch: 'main', authorId: U.jonas.id, status: 'SUCCESS', trigger: 'rollback',
      startedAt: T(14, 48), finishedAt: T(14, 51), durationMs: 3 * MIN, filesChanged: 0,
      bundleSizeKb: 1101, bundleDeltaKb: -183, testsPassed: 329, testsTotal: 331,
      changeSummary: 'Automatic rollback to v3.18.1 after INC-1042 checkout latency regression.',
      rollbackOfId: flagship.id,
    },
  })

  // ── Metrics: 7 days hourly for key services ──────────────────
  const metricServices = ['frontend-web', 'checkout-web', 'checkout-api', 'payment-api', 'auth-service', 'api-gateway', 'search-service', 'recommendation-engine', 'notification-service', 'analytics-service', 'inventory-service', 'ai-assistant']
  const metricRows: any[] = []
  for (const name of metricServices) {
    const svc = services[name]
    const baseReq = svc.tier === 'tier-1' ? between(800, 2400) : between(60, 400)
    for (let h = 24 * 7; h >= 0; h--) {
      const ts = new Date(NOW.getTime() - h * H)
      const hour = ts.getHours()
      const diurnal = 0.55 + 0.45 * Math.sin(((hour - 6) / 24) * Math.PI * 2) ** 2
      // incident window: yesterday 14:32–14:51
      const incidentTs = ts.getTime()
      const inIncident = incidentTs >= T(14, 35).getTime() && incidentTs <= T(15, 0).getTime()
      const postFix = incidentTs > T(15, 0).getTime() && incidentTs <= T(16, 0).getTime()
      const isCheckout = name.startsWith('checkout')
      const errBase = isCheckout ? 0.14 : between(0.02, 0.09)
      const latBase = isCheckout ? 140 : between(45, 210)
      const errRate = errBase + (inIncident && isCheckout ? between(1.8, 3.4) : postFix && isCheckout ? between(0.3, 0.8) : between(-0.02, 0.06))
      const p95 = latBase + (inIncident && isCheckout ? between(380, 720) : postFix && isCheckout ? between(40, 120) : between(-18, 26))
      metricRows.push({ serviceId: svc.id, name: 'requests', ts, value: Math.round(baseReq * diurnal * between(0.9, 1.1)), unit: 'rps' })
      metricRows.push({ serviceId: svc.id, name: 'error_rate', ts, value: Math.max(0, +errRate.toFixed(3)), unit: '%' })
      metricRows.push({ serviceId: svc.id, name: 'p95_latency', ts, value: Math.max(8, Math.round(p95)), unit: 'ms' })
      metricRows.push({ serviceId: svc.id, name: 'availability', ts, value: +(inIncident && isCheckout ? between(98.1, 99.2) : between(99.92, 100)).toFixed(3), unit: '%' })
    }
  }
  for (let i = 0; i < metricRows.length; i += 2000) await db.metric.createMany({ data: metricRows.slice(i, i + 2000) })

  // ── Logs around the incident ─────────────────────────────────
  const logRows: any[] = []
  const pushLog = (svcName: string, ts: Date, level: string, message: string, requestId?: string, traceId?: string) =>
    logRows.push({ serviceId: services[svcName].id, envName: 'production', ts, level, message, requestId, traceId })
  pushLog('checkout-api', T(14, 35, ), 'ERROR', 'Payment provider timeout after 3000ms — retrying with idempotency key', 'req_82731', 'tr_9f2a')
  pushLog('checkout-api', T(14, 35), 'ERROR', 'Upstream latency budget exceeded on POST /v1/orders (p95 gate 420ms)', 'req_82744')
  pushLog('checkout-web', T(14, 36), 'WARN', 'LCP 2.46s on /checkout — exceeds budget 2.5s threshold margin', 'req_82750')
  pushLog('checkout-api', T(14, 36), 'ERROR', 'Circuit breaker half-open: payment-api slow responses 412ms', 'req_82758')
  pushLog('checkout-web', T(14, 37), 'ERROR', 'Beacon queue overflow: analytics-client flushing 412 events synchronously', 'req_82761')
  pushLog('api-gateway', T(14, 37), 'WARN', 'Rate limiter: burst traffic from checkout funnel retry loop', 'req_82764')
  pushLog('checkout-api', T(14, 39), 'ERROR', 'Order submission failed: context deadline exceeded', 'req_82731', 'tr_9f2a')
  pushLog('checkout-api', T(14, 44), 'WARN', 'Heap pressure: analytics-client retain cycle suspected (v4.1.0)', 'req_82801')
  pushLog('payment-api', T(14, 45), 'INFO', 'Provider latency normalized — 214ms p95, no local fault detected', 'req_82810')
  pushLog('checkout-web', T(14, 48), 'INFO', 'Rollback triggered: DPL-1043 → v3.18.1 via NEXUS deploy API', 'req_82844')
  pushLog('checkout-web', T(14, 51), 'INFO', 'v3.18.1 healthy — LCP back to 2.08s, error rate 0.14%', 'req_82890')
  // ambient logs (last 12h)
  const ambient = [
    ['INFO', 'Request completed', null], ['INFO', 'Cache warmed for /products', null],
    ['WARN', 'Slow query detected: 812ms — SELECT stock WHERE warehouse', null],
    ['ERROR', 'Webhook signature mismatch — rejected', null],
    ['INFO', 'Autoscaler: replicas 6 → 8 (cpu 74%)', null],
    ['WARN', 'TLS certificate renews in 12 days', null],
    ['INFO', 'Nightly index rebuild finished in 4m12s', null],
  ] as const
  for (let i = 0; i < 160; i++) {
    const svcName = pick(metricServices)
    const [lvl, msg] = pick(ambient as unknown as [string, string, string][])
    logRows.push({ serviceId: services[svcName].id, envName: pick(['production', 'production', 'staging']), ts: ago(intBetween(0, 12 * H)), level: lvl, message: msg, requestId: `req_${intBetween(80000, 89999)}` })
  }
  for (let i = 0; i < logRows.length; i += 1000) await db.logEntry.createMany({ data: logRows.slice(i, i + 1000) })

  // ── Traces ───────────────────────────────────────────────────
  const mkTrace = async (traceId: string, spans: [string, string, number, number, string?][]) => {
    for (const [svcKey, op, off, dur, status] of spans)
      await db.traceSpan.create({ data: { traceId, serviceKey: svcKey, operation: op, startOffsetMs: off, durationMs: dur, status: status ?? 'ok' } })
  }
  await mkTrace('tr_9f2a', [ // the incident trace — checkout bottleneck
    ['frontend-web', 'GET /checkout', 0, 32], ['api-gateway', 'route /v1/*', 32, 14],
    ['checkout-api', 'POST /v1/orders', 46, 612, 'error'], ['payment-api', 'authorize()', 210, 348],
    ['inventory-service', 'reserve()', 96, 24], ['analytics-service', 'beacon.flush()', 180, 402, 'error'],
  ])
  await mkTrace('tr_8c1d', [ // healthy trace
    ['frontend-web', 'GET /product/anc-9021', 0, 28], ['api-gateway', 'route /v1/*', 28, 11],
    ['search-service', 'GET /v1/products/anc-9021', 39, 38], ['inventory-service', 'stock()', 52, 12],
    ['recommendation-engine', 'related()', 44, 66],
  ])
  await mkTrace('tr_7b3e', [
    ['frontend-web', 'GET /search?q=running+shoes', 0, 41], ['api-gateway', 'route /v1/*', 41, 9],
    ['search-service', 'search()', 50, 96], ['recommendation-engine', 'rerank()', 88, 74],
  ])
  await mkTrace('tr_6a9f', [
    ['frontend-web', 'POST /v1/sessions', 0, 19], ['api-gateway', 'route /v1/*', 19, 8],
    ['auth-service', 'issueSession()', 27, 44], ['notification-service', 'welcome.email', 58, 122],
  ])

  // ── Performance snapshots (30 days, checkout-web regression visible) ──
  const perfRoutes = [
    { svc: 'checkout-web', routes: ['/checkout', '/cart'] },
    { svc: 'frontend-web', routes: ['/', '/search', '/product/[id]'] },
  ]
  const perfRows: any[] = []
  for (const { svc, routes } of perfRoutes) {
    for (const route of routes) {
      for (let day = 30; day >= 0; day--) {
        const ts = new Date(NOW.getTime() - day * D)
        ts.setHours(12, 0, 0, 0)
        const isCheckout = svc === 'checkout-web' && route === '/checkout'
        const incidentPerfDay = day === 1 // yesterday
        const lcp = isCheckout
          ? (incidentPerfDay ? between(2.38, 2.52) : day < 1 ? between(2.02, 2.14) : between(2.0, 2.2)) * 1000
          : between(1.4, 2.3) * 1000
        const bundle = isCheckout ? (incidentPerfDay ? 1284 : day < 1 ? 1101 : between(1080, 1130)) : between(760, 1240)
        const score = Math.max(35, Math.min(99, Math.round(100 - (lcp / 1000 - 1.2) * 22 - (isCheckout && incidentPerfDay ? 12 : 0))))
        perfRows.push({
          serviceId: services[svc].id, route, version: incidentPerfDay && isCheckout ? 'v3.18.2' : `v3.18.${day < 1 ? 1 : intBetween(0, 1)}`, ts,
          lcpMs: Math.round(lcp), inpMs: Math.round(isCheckout && incidentPerfDay ? 224 : between(80, 190)),
          cls: +(isCheckout && incidentPerfDay ? 0.11 : between(0.01, 0.09)).toFixed(3), ttfbMs: Math.round(between(120, 420)),
          fcpMs: Math.round(lcp * 0.62), bundleKb: Math.round(bundle), cssKb: Math.round(between(60, 120)), imageKb: Math.round(between(180, 640)), score,
        })
      }
    }
  }
  await db.performanceSnapshot.createMany({ data: perfRows })

  // ── FLAGSHIP Incident INC-1042 ───────────────────────────────
  const incident = await db.incident.create({
    data: {
      orgId: org.id, ref: 'INC-1042', title: 'Checkout latency regression after v3.18.2',
      severity: 'SEV-2', status: 'resolved', ownerId: U.lucas.id,
      affectedServiceIds: j(['checkout-web', 'checkout-api', 'payment-api']),
      impact: '13,400 users experienced slow checkout; 412 abandoned carts; est. €38k GMV at risk during 19-minute window.',
      detection: 'Synthetic check + SLO burn-rate alert on checkout p95 latency (fired 14:37).',
      rootCause: 'analytics-client@4.1.0 shipped in checkout-web v3.18.2 flushed its beacon queue synchronously on the checkout path, blocking the main thread (+183KB bundle, LCP +241ms) and amplifying upstream latency into checkout-api/payment-api.',
      resolution: 'Rolled back checkout-web to v3.18.1 (DPL-1043). analytics-client pinned to 4.0.3; async beacon shipping queued behind flag ai-investigations. Verified recovery at 14:51.',
      deploymentId: flagship.id, startedAt: T(14, 39), resolvedAt: T(15, 2),
    },
  })
  const tl = [
    [14, 32, 'Deployment started', 'checkout-web v3.18.2 (DPL-1042) production rollout began', 'deploy'],
    [14, 35, 'Error rate increased', 'checkout-api error rate 0.14% → 2.9%; payment timeouts logged (req_82731)', 'signal'],
    [14, 37, 'Alert triggered', 'SLO burn-rate alert: checkout p95 latency 612ms (> 420ms budget)', 'alert'],
    [14, 39, 'Incident declared', 'INC-1042 SEV-2 declared by Jonas Vermeulen; Checkout team paged', 'incident'],
    [14, 44, 'Root cause identified', 'AI investigation + on-call: analytics-client@4.1.0 sync beacon flush', 'analysis'],
    [14, 48, 'Rollback started', 'DPL-1043 rollback to v3.18.1 initiated', 'deploy'],
    [14, 51, 'System recovered', 'p95 latency 148ms, error rate 0.14% — within SLO', 'recovery'],
    [15, 2, 'Incident resolved', 'Monitoring stable for 10 minutes; incident closed', 'resolved'],
  ] as const
  for (const [h, m, label, detail, kind] of tl)
    await db.incidentTimeline.create({ data: { incidentId: incident.id, at: T(h, m), label, detail, kind } })
  await db.postmortem.create({
    data: {
      incidentId: incident.id, generatedByAi: true, published: true,
      summary: 'A routine checkout funnel redesign shipped with a patched analytics client whose synchronous beacon flush blocked the main thread, degrading LCP and cascading latency into the order pipeline.',
      impact: '13,400 users affected · 412 abandoned carts · est. €38k GMV at risk · 19 minutes degraded (14:35–14:51) · no data loss.',
      rootCause: 'analytics-client@4.1.0 introduced a synchronous flush of a 412-event beacon queue inside the checkout submit handler. Combined with +183KB bundle growth this pushed LCP from 2.08s to 2.46s and inflated upstream checkout-api p95 from 148ms to 612ms.',
      resolution: 'Emergency rollback to v3.18.1 completed 14:51. analytics-client pinned to 4.0.3 pending async release. SLO burn alerts confirmed recovery.',
      lessons: j([
        'Client-side analytics upgrades must pass the performance budget gate before production rollout.',
        'Bundle-size deltas > +5% on tier-1 surfaces should require explicit review sign-off.',
        'The sync-beacon anti-pattern was undocumented — added to frontend guidelines.',
      ]),
      actions: j([
        { action: 'Add bundle-delta regression gate to checkout pipeline', owner: 'Lucas Meyer', status: 'in_progress' },
        { action: 'Ship analytics-client 4.2.0 with async batching', owner: 'Sofia Rossi', status: 'in_progress' },
        { action: 'Add LCP synthetic check on /checkout at 30s cadence', owner: 'Jonas Vermeulen', status: 'done' },
        { action: 'Document beacon anti-pattern in Frontend Guidelines', owner: 'Mohammad Tavakoli', status: 'done' },
      ]),
    },
  })

  // Secondary incidents for realism
  const inc2 = await db.incident.create({
    data: {
      orgId: org.id, ref: 'INC-1041', title: 'Notification delivery delays (email fan-out)', severity: 'SEV-3',
      status: 'resolved', ownerId: U.jonas.id, affectedServiceIds: j(['notification-service']),
      impact: 'Order confirmation emails delayed up to 14 minutes for 3% of customers.',
      detection: 'Queue depth alert on notification fan-out.', rootCause: 'Downstream SMTP provider throttling after provider failover.',
      resolution: 'Failed over to secondary SMTP provider; queue drained.', startedAt: ago(2 * D + 6 * H), resolvedAt: ago(2 * D + 5 * H),
    },
  })
  await db.incidentTimeline.createMany({
    data: [
      { incidentId: inc2.id, at: ago(2 * D + 6 * H), label: 'Alert triggered', detail: 'notification queue depth > 5k', kind: 'alert' },
      { incidentId: inc2.id, at: ago(2 * D + 6 * H + 12 * MIN), label: 'Incident declared', detail: 'SEV-3 declared', kind: 'incident' },
      { incidentId: inc2.id, at: ago(2 * D + 5 * H + 20 * MIN), label: 'System recovered', detail: 'provider failover complete, queue drained', kind: 'recovery' },
    ],
  })
  const inc3 = await db.incident.create({
    data: {
      orgId: org.id, ref: 'INC-1039', title: 'Search relevance drift after ranking deploy', severity: 'SEV-3',
      status: 'resolved', ownerId: U.jonas.id, affectedServiceIds: j(['search-service', 'recommendation-engine']),
      impact: 'Search CTR dropped 8% for 3 hours.', detection: 'Analytics CTR anomaly detection.', rootCause: 'Vector ranking weights misconfigured in v2.4.0.',
      resolution: 'Hotfixed ranking weights (v2.4.1).', startedAt: ago(5 * D), resolvedAt: ago(5 * D - 3 * H),
    },
  })
  await db.incident.create({
    data: {
      orgId: org.id, ref: 'INC-1036', title: 'Elevated 401s on mobile sessions', severity: 'SEV-4',
      status: 'resolved', ownerId: U.sarah.id, affectedServiceIds: j(['auth-service']),
      impact: '0.4% of mobile sessions re-authenticated once.', detection: 'Support tickets + error-rate watch.',
      rootCause: 'Clock skew on one auth replica invalidated short-lived tokens.', resolution: 'NTP re-synced; alert added for skew > 50ms.',
      startedAt: ago(9 * D), resolvedAt: ago(9 * D - 2 * H),
    },
  })

  // ── Feature flags ────────────────────────────────────────────
  const mkFlag = (data: any, audits: any[]) => db.featureFlag.create({ data }).then(async (f) => {
    for (const a of audits) await db.featureFlagAudit.create({ data: { ...a, flagId: f.id } })
    return f
  })
  await mkFlag({
    orgId: org.id, key: 'new-checkout', name: 'New Checkout Experience', enabled: true, envName: 'production', rollout: 62,
    ownerId: U.lucas.id, description: 'Redesigned one-page checkout with express payment options.',
    rules: j([
      { type: 'region', region: 'Netherlands', rollout: 100 },
      { type: 'region', region: 'Germany', rollout: 50 },
      { type: 'region', region: 'Italy', rollout: 20 },
      { type: 'team', team: 'internal', rollout: 100 },
    ]),
  }, [
    { userId: U.lucas.id, userName: 'Lucas Meyer', action: 'rollout_changed', previousValue: '50%', newValue: '62%', reason: 'Steady metrics in DE cohort', at: ago(2 * D) },
    { userId: U.lucas.id, userName: 'Lucas Meyer', action: 'rollout_changed', previousValue: '25%', newValue: '50%', reason: 'No regression in NL 100% cohort', at: ago(5 * D) },
    { userId: U.mohammad.id, userName: 'Mohammad Tavakoli', action: 'enabled', previousValue: 'off', newValue: 'on', reason: 'Launch new-checkout to production', at: ago(9 * D) },
  ])
  await mkFlag({
    orgId: org.id, key: 'ai-investigations', name: 'AI Investigations', enabled: true, envName: 'production', rollout: 100,
    ownerId: U.sofia.id, description: 'Autonomous AI investigation workflow for alerts and incidents.',
    rules: j([{ type: 'team', team: 'engineering', rollout: 100 }]),
  }, [{ userId: U.sofia.id, userName: 'Sofia Rossi', action: 'rollout_changed', previousValue: '40%', newValue: '100%', reason: 'GA after 3-week beta', at: ago(4 * D) }])
  await mkFlag({
    orgId: org.id, key: 'vector-search-ranking', name: 'Vector Search Ranking', enabled: true, envName: 'production', rollout: 35,
    ownerId: U.jonas.id, description: 'Hybrid BM25 + vector reranking in search-service.',
    rules: j([{ type: 'region', region: 'Netherlands', rollout: 100 }, { type: 'region', region: 'Germany', rollout: 30 }]),
  }, [{ userId: U.jonas.id, userName: 'Jonas Vermeulen', action: 'config_changed', previousValue: 'bm25 only', newValue: 'hybrid w/ vector rerank', reason: 'INC-1039 fix verified', at: ago(5 * D) }])
  await mkFlag({
    orgId: org.id, key: 'payment-retry-v2', name: 'Payment Retry v2', enabled: false, envName: 'production', rollout: 0,
    ownerId: U.priya.id, description: 'Idempotent retry with jittered backoff across PSPs.',
    rules: j([]),
  }, [{ userId: U.priya.id, userName: 'Priya Sharma', action: 'disabled', previousValue: 'on', newValue: 'off', reason: 'Awaiting PSP sandbox verification', at: ago(6 * D) }])
  await mkFlag({
    orgId: org.id, key: 'analytics-async-beacon', name: 'Analytics Async Beacon', enabled: false, envName: 'production', rollout: 0,
    ownerId: U.sofia.id, description: 'Ships analytics-client 4.2.0 with async batching (INC-1042 corrective action).',
    rules: j([{ type: 'team', team: 'checkout', rollout: 100 }]),
  }, [{ userId: U.sofia.id, userName: 'Sofia Rossi', action: 'created', previousValue: '—', newValue: 'off @ 0%', reason: 'Corrective action INC-1042', at: ago(20 * H) }])

  // ── Architecture graph ───────────────────────────────────────
  const nodes = [
    { key: 'users', label: 'Customers', kind: 'external', x: 60, y: 260, tech: 'Web · iOS · Android' },
    { key: 'cdn', label: 'Edge CDN', kind: 'infra', x: 250, y: 260, tech: 'CloudFront' },
    { key: 'frontend-web', label: 'frontend-web', kind: 'frontend', serviceSlug: 'frontend-web', x: 450, y: 150, tech: 'Next.js 16' },
    { key: 'checkout-web', label: 'checkout-web', kind: 'frontend', serviceSlug: 'checkout-web', x: 450, y: 380, tech: 'Next.js 16' },
    { key: 'api-gateway', label: 'api-gateway', kind: 'gateway', serviceSlug: 'api-gateway', x: 680, y: 260, tech: 'Rust · axum' },
    { key: 'auth-service', label: 'auth-service', kind: 'service', serviceSlug: 'auth-service', x: 910, y: 90, tech: 'Go' },
    { key: 'checkout-api', label: 'checkout-api', kind: 'service', serviceSlug: 'checkout-api', x: 910, y: 250, tech: 'Go' },
    { key: 'search-service', label: 'search-service', kind: 'service', serviceSlug: 'search-service', x: 910, y: 410, tech: 'Node 22' },
    { key: 'recommendation-engine', label: 'recommendation-engine', kind: 'service', serviceSlug: 'recommendation-engine', x: 910, y: 550, tech: 'Python · FastAPI' },
    { key: 'payment-api', label: 'payment-api', kind: 'service', serviceSlug: 'payment-api', x: 1140, y: 250, tech: 'Kotlin' },
    { key: 'inventory-service', label: 'inventory-service', kind: 'service', serviceSlug: 'inventory-service', x: 1140, y: 380, tech: 'Go' },
    { key: 'notification-service', label: 'notification-service', kind: 'service', serviceSlug: 'notification-service', x: 1140, y: 520, tech: 'Node 22' },
    { key: 'analytics-service', label: 'analytics-service', kind: 'service', serviceSlug: 'analytics-service', x: 1140, y: 100, tech: 'Kotlin' },
    { key: 'ai-assistant', label: 'ai-assistant', kind: 'service', serviceSlug: 'ai-assistant', x: 1140, y: 650, tech: 'Node 22' },
    { key: 'postgres', label: 'PostgreSQL Cluster', kind: 'data', x: 1370, y: 300, tech: 'pg 16 · primary + 2 replicas' },
    { key: 'redis', label: 'Redis', kind: 'data', x: 1370, y: 430, tech: 'cache · queues · sessions' },
    { key: 'vector-db', label: 'pgvector', kind: 'data', x: 1370, y: 560, tech: 'embeddings · RAG' },
    { key: 'payment-provider', label: 'Payment Provider', kind: 'external', x: 1370, y: 170, tech: 'PSP (3rd party)' },
    { key: 'llm-provider', label: 'LLM Provider', kind: 'external', x: 1370, y: 680, tech: 'model gateway' },
  ]
  for (const n of nodes) await db.architectureNode.create({ data: { orgId: org.id, ...n } })
  const edges = [
    ['users', 'cdn', 'traffic'], ['cdn', 'frontend-web', 'ssr'], ['cdn', 'checkout-web', 'ssr'],
    ['frontend-web', 'api-gateway', 'REST'], ['checkout-web', 'api-gateway', 'REST'],
    ['api-gateway', 'auth-service', 'auth'], ['api-gateway', 'checkout-api', 'proxy'], ['api-gateway', 'search-service', 'proxy'],
    ['api-gateway', 'recommendation-engine', 'proxy'], ['api-gateway', 'analytics-service', 'events'],
    ['checkout-api', 'payment-api', 'authorize'], ['checkout-api', 'inventory-service', 'reserve'],
    ['checkout-api', 'analytics-service', 'beacons'], ['checkout-web', 'analytics-service', 'beacons', 'async'],
    ['payment-api', 'payment-provider', 'PSP API'], ['search-service', 'recommendation-engine', 'rerank'],
    ['auth-service', 'redis', 'sessions'], ['checkout-api', 'postgres', 'sql'], ['payment-api', 'postgres', 'sql'],
    ['inventory-service', 'postgres', 'sql'], ['search-service', 'redis', 'cache'], ['recommendation-engine', 'vector-db', 'vectors'],
    ['ai-assistant', 'vector-db', 'rag'], ['ai-assistant', 'llm-provider', 'inference'], ['notification-service', 'redis', 'queues'],
  ] as const
  for (const [from, to, label, kind] of edges) await db.architectureEdge.create({ data: { orgId: org.id, fromKey: from, toKey: to, label, kind: kind ?? 'sync' } })

  // ── Knowledge base (ADRs, runbooks, guides) ──────────────────
  const docs: [string, string, string, string, string[], string][] = [
    ['ADR-001: Server Components Strategy', 'adr', 'ADR-001', `# ADR-001 — Server Components Strategy

## Problem
NEXUS renders dense, data-heavy dashboards. A client-everything approach would ship megabytes of JavaScript and slow first render.

## Context
Next.js App Router supports React Server Components by default. Interactive islands (charts, command palette, editors) still need client components.

## Options
1. Client components everywhere (SPA style)
2. Server components by default with client islands
3. Server components only for static content

## Decision
Option 2. Server Components fetch data directly via the service layer; Client Components are used only where interactivity genuinely requires it: charts, tables with sorting, command palette, dialogs, live deployment view.

## Tradeoffs
+ Minimal JS, fast TTFB, data stays on the server
+ Clear mental model: "server until it must be interactive"
- Requires deliberate boundary discipline
- Some duplication of types across boundary`, ['rsc', 'server components', 'architecture'], 'Mohammad Tavakoli'],
    ['ADR-002: TanStack Query vs Global State', 'adr', 'ADR-002', `# ADR-002 — TanStack Query vs Global State

## Problem
Platform data (services, deployments, incidents) changes constantly. Where does server state live?

## Context
Redux-style global stores mirror server state badly: stale caches, manual invalidation, duplicated fetch logic.

## Decision
TanStack Query owns ALL server state: fetching, caching, invalidation, optimistic updates. Zustand is restricted to UI state (sidebar, palette, view params, density).

## Tradeoffs
+ Cache invalidation is declarative (query keys)
+ Optimistic updates for flag toggles and rollbacks
- Team must resist "just put it in the store" temptation`, ['tanstack query', 'state management', 'zustand'], 'Mohammad Tavakoli'],
    ['ADR-003: Zustand State Boundaries', 'adr', 'ADR-003', `# ADR-003 — Zustand State Boundaries

## Problem
Cross-feature UI state (command palette open, sidebar collapsed, current view params) needs a home outside the component tree.

## Decision
Zustand stores with three slices: ui (sidebar, density, theme), navigation (view + params for the SPA router), palette (command palette state). Persisted slices use localStorage. Server data NEVER enters Zustand.

## Consequences
Any component can open the command palette or change the view without prop drilling; refresh-safe preferences; no duplicated server cache.`, ['zustand', 'ui state'], 'Mohammad Tavakoli'],
    ['ADR-004: SSE vs WebSockets', 'adr', 'ADR-004', `# ADR-004 — SSE vs WebSockets for Deployment State

## Problem
Deployment pipeline state must stream to the UI without polling or refresh.

## Context
Deployment progress is strictly server→client. No bidirectional messaging is required.

## Options
1. WebSockets (socket.io) — bidirectional, needs a separate service + sticky sessions
2. SSE over HTTP — one-way, works with plain HTTP/2, trivially proxies

## Decision
SSE for deployment state streaming. The event flow is one-directional; SSE reduces connection complexity and works through the existing gateway. A poll fallback (2s TanStack refetch) covers proxies that buffer SSE.

## Tradeoffs
+ No extra infrastructure, auto-reconnect built in
- One-way only (fine for this use case)
- Older proxies may buffer — hence the fallback`, ['sse', 'realtime', 'deployment'], 'Sarah Chen'],
    ['ADR-005: PostgreSQL + pgvector', 'adr', 'ADR-005', `# ADR-005 — PostgreSQL + pgvector for Knowledge Retrieval

## Problem
The AI assistant must retrieve relevant engineering knowledge (ADRs, runbooks, postmortems).

## Context
Dedicated vector DBs (Pinecone, Qdrant) add operational surface. pgvector keeps embeddings next to relational data.

## Decision
PostgreSQL + pgvector with a VectorSearchProvider abstraction. The sandbox demo runs SQLite with a keyword/BM25-style scorer behind the same interface — swapping to pgvector is a driver change, not an architecture change.

## Tradeoffs
+ One database, one backup strategy, transactional consistency
- pgvector upper scale < dedicated engines (fine to ~10M chunks)
- Demo provider is lexical, not semantic — documented, intentional`, ['pgvector', 'rag', 'embeddings'], 'Sofia Rossi'],
    ['ADR-006: RBAC Architecture', 'adr', 'ADR-006', `# ADR-006 — RBAC Architecture

## Problem
Enterprise platforms need enforced, auditable permissions — never client-side only.

## Decision
Roles: USER, DEVELOPER, ENGINEER, TEAM_LEAD, ADMIN, PLATFORM_ADMIN, SECURITY_ADMIN, SUPER_ADMIN. Permissions are granular strings (services.write, deployments.create, incidents.resolve, feature_flags.write, security.manage, users.manage). Enforcement happens in the API layer: every mutating route resolves the session role → permission set and rejects with 403. The UI hides unauthorized actions for affordance only.

## Consequences
- Permission checks are testable pure functions
- Audit log records actor + action for every mutation
- Role changes take effect on next request (no stale client grants)`, ['rbac', 'permissions', 'security'], 'Emma Davis'],
    ['ADR-007: AI Tool Architecture', 'adr', 'ADR-007', `# ADR-007 — AI Tool Architecture

## Problem
The AI assistant must reason over NEXUS data without raw database access.

## Decision
An AIProvider abstraction (Z.ai provider + deterministic MockProvider fallback) with explicit, zod-validated tools: getService, listDeployments, getMetrics, getIncidents, getPerformanceData, searchKnowledge, getArchitecture. The model selects tools; the server executes them and returns scoped results. Tool calls are logged to the audit trail. Destructive actions (rollback, incident creation) always require explicit user confirmation in the UI — the assistant can only propose.

## Safety rules
- Never expose secrets or raw SQL
- Cite sources for knowledge answers
- State confidence and missing data honestly
- High-level activity trace only (no private chain-of-thought)`, ['ai', 'tools', 'agent'], 'Sofia Rossi'],
    ['ADR-008: Feature Flag Model', 'adr', 'ADR-008', `# ADR-008 — Feature Flag Model

## Problem
Progressive delivery needs percentage rollouts, region/team targeting and a full audit trail.

## Decision
Flags own: enabled, env, global rollout %, ordered targeting rules (region, team). Evaluation API: isEnabled(flag, context), getRollout(flag, context). Every mutation writes a FeatureFlagAudit row (actor, previous, new, reason). UI mutations are optimistic with rollback on failure.

## Consequences
- Audit answers "who changed what, when, why"
- Rules are data — no code deploys to change rollout
- Flag table is org-scoped, ready for multi-tenancy`, ['feature flags', 'rollout'], 'Lucas Meyer'],
    ['ADR-009: Observability Architecture', 'adr', 'ADR-009', `# ADR-009 — Observability Architecture

## Problem
Engineers need metrics, logs and traces in one place, correlated by service and time.

## Decision
Metrics (requests, error rate, p95 latency, availability) sampled per minute per service; structured logs with requestId/traceId; trace spans with parent linkage and offsets. The UI correlates all three: incident → deployment → metrics → logs → trace. A MonitoringProvider abstraction mocks telemetry today; OpenTelemetry + Prometheus/Tempo drop in behind the same interface.

## Tradeoffs
+ Correlation-by-construction in the demo data
+ Provider swap needs no UI changes
- Mock telemetry is synthetic — clearly labeled as MockMonitoringProvider`, ['observability', 'traces', 'logs'], 'Jonas Vermeulen'],
    ['Runbook: Checkout Service Degraded', 'runbook', 'RB-001', `# Runbook — Checkout Service Degraded

1. Confirm impact: open checkout-api → Observability; check p95 latency and error rate against SLO (p95 ≤ 420ms, errors ≤ 0.5%).
2. Check the latest deployment. If a deploy landed in the last 60 minutes, suspect it first.
3. Inspect error logs for provider timeouts (payment-provider) vs internal errors.
4. Check the dependency graph for brown/out nodes upstream.
5. If the deploy correlates: roll back (Deployments → latest → Rollback). Rollback is safer than forward-fixing under load.
6. Verify recovery: p95 back under budget for 10 minutes, error rate normal.
7. Declare/cross-link the incident, attach the deployment, keep the timeline updated.
8. After resolution: run the AI postmortem draft, edit, then publish.`, ['runbook', 'checkout', 'incident'], 'Lucas Meyer'],
    ['Runbook: Production Rollback Procedure', 'runbook', 'RB-002', `# Runbook — Production Rollback

Preconditions: you hold deployments.create permission; the incident is declared or being declared.

1. Deployments → find the suspect deployment (status SUCCESS, most recent for the service).
2. Press "Rollback" — NEXUS creates a new deployment pinning the previous version; it does not mutate history.
3. Watch the pipeline: Install → Build → Deploy stages run; health checks gate completion.
4. Confirm the rollback deployment reaches SUCCESS and service health flips to healthy.
5. Post: note the rollback in the incident timeline with the new DPL ref.`, ['runbook', 'rollback', 'deployments'], 'Sarah Chen'],
    ['Postmortem: INC-1042 Checkout Latency Regression', 'postmortem', 'INC-1042', `# Postmortem — INC-1042

A checkout funnel redesign shipped with analytics-client@4.1.0. Its synchronous beacon flush blocked the main thread (+183KB bundle), pushed LCP from 2.08s → 2.46s, and cascaded into checkout-api/payment-api latency. 13,400 users were affected for 19 minutes. Detection was fast (SLO burn alert at 14:37), rollback completed at 14:51.

Key lessons: analytics upgrades on tier-1 surfaces must pass the performance budget gate; bundle deltas over +5% require review sign-off; sync beacon flushing is now a documented anti-pattern.

Full corrective actions live in the incident record; two remain in progress.`, ['postmortem', 'incident', 'checkout'], 'Alex Morgan'],
    ['Frontend Architecture Guide', 'design', 'ARCH-FE', `# Frontend Architecture

The frontend is a Next.js App Router application organised by feature domains, not by file type. features/ contains dashboard, services, deployments, observability, incidents, performance, feature-flags, architecture, ai, design-system, security, analytics modules. Shared primitives live in components/ui (shadcn) and components/shell (app chrome).

State: TanStack Query for server state; Zustand strictly for UI state (ADR-002/003). Styling: Tailwind with semantic tokens — no raw hex in feature code. Motion: Framer Motion for state transitions, always honouring prefers-reduced-motion.

Performance budget: initial JS < 250KB gzipped on tier-1 routes, LCP < 2.5s, INP < 200ms, CLS < 0.1. The Performance Center enforces and tracks these budgets.`, ['architecture', 'frontend', 'guidelines'], 'Mohammad Tavakoli'],
    ['State Management Guide: Zustand over Redux in checkout-web', 'guideline', 'ADR-012', `# Why Zustand instead of Redux in checkout-web

Per the Frontend Architecture ADR-012 review (Feb 2026): checkout-web state is small, local and UI-shaped — cart drawer open, step index, promo banner dismissal. Redux would add middleware ceremony for zero cross-page cache wins; TanStack Query already owns the server state (cart, prices, eligibility).

Zustand was selected because: (1) 0.6KB with no providers, (2) selectors prevent re-renders in the promo banner tree, (3) colocated stores per feature match the domain structure. Redux remains permitted for future complex client workflows but requires an ADR to adopt.`, ['zustand', 'redux', 'state management', 'checkout'], 'Mohammad Tavakoli'],
    ['API Design Guidelines', 'guideline', 'GL-API', `# API Design Guidelines

Resources over verbs; plural nouns; versioned paths (/v1). Mutations accept Idempotency-Key headers. Errors follow RFC 7807 (problem+json) with stable type URIs. Pagination is cursor-based (limit + next cursor). Every endpoint declares its required permission in the route manifest; the gateway enforces it and the service re-verifies. Rate limits are per org + per route class, returned via headers.

Zod schemas are the single source of truth for request validation — the same schema validates server actions, route handlers and AI tool inputs.`, ['api', 'guidelines', 'zod'], 'Priya Sharma'],
    ['Security Guidelines', 'guideline', 'GL-SEC', `# Security Guidelines

Secrets only via environment variables — never in code, logs or the AI context. Input validation at the boundary with zod; parameterised queries everywhere. Sessions: httpOnly, secure, sameSite=lax cookies with rotation on privilege change. Security-relevant mutations (role changes, flag changes, rollbacks) always write audit events. Dependency CVEs are triaged weekly: critical ≤ 24h, high ≤ 7d. Report vulnerabilities to security@acme.dev — see SECURITY.md.`, ['security', 'guidelines'], 'Emma Davis'],
  ]
  for (const [title, type, ref, content, tags, authorName] of docs) {
    const author = Object.values(users).find((u: any) => u.name === authorName) as any
    const doc = await db.document.create({ data: { orgId: org.id, title, type, ref, content, tags: j(tags), authorId: author?.id } })
    // split into chunks by ## sections
    const sections = content.split(/\n(?=#{2,3} )/g)
    let idx = 0
    for (const sec of sections) {
      const heading = sec.match(/^#{2,3} (.+)$/m)?.[1] ?? title
      const keywords = [...new Set(sec.toLowerCase().match(/\b[a-z][a-z0-9-]{3,}\b/g) ?? [])].slice(0, 24).join(' ')
      await db.knowledgeChunk.create({ data: { documentId: doc.id, idx, heading, content: sec.slice(0, 1200), keywords } })
      idx++
      if (idx > 8) break
    }
  }

  // ── Audit logs ───────────────────────────────────────────────
  const auditRows: any[] = [
    { userId: U.lucas.id, userName: 'Lucas Meyer', action: 'deployment.created', targetType: 'deployment', targetId: 'DPL-1042', detail: 'checkout-web v3.18.2 → production', at: T(14, 32) },
    { userId: U.jonas.id, userName: 'Jonas Vermeulen', action: 'incident.created', targetType: 'incident', targetId: 'INC-1042', detail: 'SEV-2 checkout latency regression', at: T(14, 39) },
    { userId: U.sofia.id, userName: 'Sofia Rossi (AI)', action: 'ai.investigation', targetType: 'incident', targetId: 'INC-1042', detail: 'AI correlated DPL-1042 with LCP regression; confidence 87%', at: T(14, 43) },
    { userId: U.jonas.id, userName: 'Jonas Vermeulen', action: 'deployment.rollback', targetType: 'deployment', targetId: 'DPL-1043', detail: 'Rolled back to v3.18.1', at: T(14, 48) },
    { userId: U.sofia.id, userName: 'Sofia Rossi (AI)', action: 'ai.postmortem_generated', targetType: 'incident', targetId: 'INC-1042', detail: 'Draft postmortem generated, pending review', at: T(15, 10) },
    { userId: U.emma.id, userName: 'Emma Davis', action: 'role.changed', targetType: 'user', targetId: U.priya.id, detail: 'Priya Sharma: DEVELOPER → DEVELOPER (payments scope confirmed)', at: ago(3 * D) },
    { userId: U.sarah.id, userName: 'Sarah Chen', action: 'service.modified', targetType: 'service', targetId: 'api-gateway', detail: 'Rate limit class production: 2k rps → 4k rps', at: ago(4 * D) },
  ]
  await db.auditLog.createMany({ data: auditRows.map((a) => ({ ...a, orgId: org.id })) })

  // ── Notifications for the demo persona ───────────────────────
  await db.notification.createMany({
    data: [
      { userId: U.mohammad.id, type: 'incident', title: 'INC-1042 · SEV-2 declared', body: 'Checkout latency regression after v3.18.2. You are on the Checkout team response.', read: false, viewKey: 'incident:INC-1042', createdAt: T(14, 39) },
      { userId: U.mohammad.id, type: 'performance', title: 'Performance regression detected', body: '/checkout LCP +241ms vs 30-day baseline. Release v3.18.2 correlated.', read: false, viewKey: 'view:performance', createdAt: T(14, 41) },
      { userId: U.mohammad.id, type: 'ai', title: 'AI investigation completed', body: 'Root cause hypothesis: analytics-client@4.1.0 sync beacon flush — 87% confidence.', read: false, viewKey: 'view:assistant', createdAt: T(14, 44) },
      { userId: U.mohammad.id, type: 'deployment', title: 'Rollback DPL-1043 succeeded', body: 'checkout-web restored to v3.18.1. Metrics recovering.', read: true, viewKey: 'view:deployments', createdAt: T(14, 51) },
      { userId: U.mohammad.id, type: 'security', title: 'Dependency alert', body: ' sponsorship: 1 high CVE on payment-api (CVE-2026-3141).', read: true, viewKey: 'view:security', createdAt: ago(3 * H) },
    ],
  })

  // ── Security events & vulnerabilities ────────────────────────
  await db.securityEvent.createMany({
    data: [
      { orgId: org.id, kind: 'failed_login', severity: 'low', message: '5 failed logins for jonas@acme.dev — same ASN', actor: 'jonas@acme.dev', ip: '84.22.17.3', at: ago(2 * H) },
      { orgId: org.id, kind: 'permission_change', severity: 'medium', message: 'SECURITY_ADMIN granted temporary access to audit export', actor: 'Emma Davis', ip: '84.22.19.10', at: ago(9 * H) },
      { orgId: org.id, kind: 'api_key_rotated', severity: 'info', message: 'PSP API key rotated (scheduled quarterly)', actor: 'Sarah Chen', ip: '10.0.4.7', at: ago(26 * H) },
      { orgId: org.id, kind: 'suspicious_activity', severity: 'high', message: 'Credential stuffing pattern blocked at gateway (1,204 reqs)', actor: '—', ip: '45.155.205.233', at: ago(30 * H) },
      { orgId: org.id, kind: 'flag_changed', severity: 'medium', message: 'Feature flag payment-retry-v2 disabled pending verification', actor: 'Priya Sharma', ip: '10.0.5.31', at: ago(6 * D) },
    ],
  })
  await db.vulnerability.createMany({
    data: [
      { orgId: org.id, serviceId: services['payment-api'].id, cve: 'CVE-2026-3141', pkg: 'snakeyaml', version: '2.1', severity: 'high', cvss: 7.5, status: 'fix_scheduled', description: 'Constructor deserialization in untrusted YAML parsing path. Fix: upgrade to 2.3 (scheduled this sprint).', discoveredAt: ago(3 * D) },
      { orgId: org.id, serviceId: services['frontend-web'].id, cve: 'CVE-2026-2887', pkg: 'undici', version: '6.19.2', severity: 'medium', cvss: 5.9, status: 'open', description: 'CRLF injection in fetch header handling — SSR routes only, low exploitability.', discoveredAt: ago(6 * D) },
      { orgId: org.id, serviceId: services['search-service'].id, cve: 'CVE-2025-9917', pkg: 'tar-fs', version: '3.0.6', severity: 'medium', cvss: 6.2, status: 'resolved', description: 'Path traversal on archive extraction. Patched in CI images.', discoveredAt: ago(20 * D), fixedAt: ago(16 * D) },
      { orgId: org.id, serviceId: services['notification-service'].id, cve: 'CVE-2025-8801', pkg: 'ws', version: '8.14.2', severity: 'low', cvss: 3.7, status: 'resolved', description: 'DoS via crafted headers on internal socket. Patched.', discoveredAt: ago(24 * D), fixedAt: ago(22 * D) },
    ],
  })

  // ── AI conversation (pre-seeded investigation) ───────────────
  const conv = await db.aIConversation.create({ data: { userId: U.mohammad.id, title: 'Why did checkout latency increase?', createdAt: T(14, 42) } })
  await db.aIMessage.createMany({
    data: [
      { conversationId: conv.id, role: 'user', content: 'Why did checkout latency increase after the latest deployment?', createdAt: T(14, 42) },
      {
        conversationId: conv.id, role: 'assistant',
        content: `Checkout latency regression is real and correlated with DPL-1042 (checkout-web v3.18.2).\n\n**Primary signal** — bundle growth: checkout-web JS bundle went 1,101KB → 1,284KB (+183KB, +16.6%) in this release. The diff bumps analytics-client 4.0.3 → 4.1.0.\n\n**Secondary signal** — LCP on /checkout rose 2.08s → 2.46s (+241ms) within 3 minutes of the rollout; INP also degraded 187ms → 224ms.\n\n**Cascade** — checkout-api p95 went 148ms → 612ms between 14:35 and 14:44 with payment-provider timeouts logged (req_82731). The analytics-client 4.1.0 beacon flush is synchronous on the submit path — it blocks the main thread and amplifies upstream latency.\n\n**Knowledge** — the Frontend Guidelines explicitly flag synchronous beacon flushing as an anti-pattern.\n\n**Recommendation** — roll back to v3.18.1 and pin analytics-client to 4.0.3 until async batching ships (flag: analytics-async-beacon).`,
        toolTrace: j([
          { tool: 'listDeployments', summary: 'Found DPL-1042 · checkout-web v3.18.2 · 14:32' },
          { tool: 'getPerformanceData', summary: 'LCP /checkout: 2.08s → 2.46s (+241ms) after deploy' },
          { tool: 'getMetrics', summary: 'checkout-api p95 148ms → 612ms; error rate 0.14% → 2.9%' },
          { tool: 'getLogs', summary: 'Beacon queue overflow + payment timeouts (req_82731)' },
          { tool: 'searchKnowledge', summary: 'Frontend Guidelines — sync beacon anti-pattern' },
        ]),
        confidence: 0.87,
        sources: j(['DPL-1042 deployment diff', 'Performance snapshot /checkout 14:35', 'checkout-api metrics 14:35–14:51', 'Log req_82731 · tr_9f2a', 'Frontend Architecture Guide']),
        suggestedActions: j([{ action: 'create_incident', label: 'Declare incident (SEV-2)' }, { action: 'rollback', label: 'Review rollback to v3.18.1' }, { action: 'create_flag', label: 'Create kill-switch flag' }]),
        createdAt: T(14, 43),
      },
    ],
  })

  // ── Daily stats (90 days, DORA-style) ────────────────────────
  const statRows: any[] = []
  for (let day = 90; day >= 0; day--) {
    const d = new Date(NOW.getTime() - day * D)
    const date = d.toISOString().slice(0, 10)
    const dow = d.getDay()
    const weekend = dow === 0 || dow === 6
    const deployments = weekend ? intBetween(0, 2) : intBetween(3, 9)
    const failed = rnd() < 0.16 ? intBetween(1, 2) : 0
    const isIncidentDay = day === 1
    statRows.push({
      orgId: org.id, date, deployments, failedDeployments: isIncidentDay ? 1 : failed,
      leadTimeHours: +Math.max(1.5, between(8, 26) - (90 - day) * 0.08).toFixed(1),
      changeFailureRate: isIncidentDay ? 14.3 : +between(2, 9).toFixed(1),
      mttrMinutes: isIncidentDay ? 23 : +Math.max(9, between(28, 75) - (90 - day) * 0.2).toFixed(1),
      prThroughput: weekend ? intBetween(1, 4) : intBetween(6, 17),
      availability: isIncidentDay ? 99.87 : +between(99.94, 99.995).toFixed(3),
    })
  }
  await db.dailyStat.createMany({ data: statRows })

  const counts = {
    services: await db.service.count(), deployments: await db.deployment.count(),
    metrics: await db.metric.count(), logs: await db.logEntry.count(),
    docs: await db.document.count(), chunks: await db.knowledgeChunk.count(),
  }
  console.log('Seed complete:', JSON.stringify(counts))
}

const shaChars = 'abcdef0123456789'
const randSha = () => Array.from({ length: 40 }, () => shaChars[Math.floor(Math.random() * 16)]).join('')
const LAST_COMMITS = [
  'fix: promo eligibility rounding on cart line items',
  'feat: express payment sheet for Apple Pay',
  'chore: bump toolchain to node 22.11',
  'refactor: extract pricing calculator module',
  'fix: debounce search suggestions (INP)',
  'feat: vector rerank behind flag',
  'test: contract tests for order placement',
  'perf: memoize cart totals selector',
]
const CHANGE_SUMMARIES = [
  'Routine dependency refresh and bug fixes.',
  'Feature rollout with progressive exposure.',
  'Performance pass: code splitting on heavy routes.',
  'Hotfix under incident coordination.',
  'Refactor with no behavioral change intended.',
  'New experiment instrumented behind flags.',
]
const stageLog = (name: string, status: string) => {
  if (status === 'FAILED') return `$ ${name.toLowerCase().replace(' ', '-')}\n✗ failed after retries\n→ see artifacts: junit-report.xml`
  if (status === 'RUNNING') return `$ ${name.toLowerCase().replace(' ', '-')}\n⟳ running…`
  return `$ ${name.toLowerCase().replace(' ', '-')}\n✓ completed in stage\n→ cache hit 87% · 0 vulnerabilities`
}

main().finally(() => db.$disconnect())
