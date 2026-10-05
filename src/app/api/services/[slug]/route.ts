import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireSession } from '@/lib/session'
import { parseJson } from '@/server/queries'
import type { DeploymentSummary, IncidentSummary } from '@/lib/types'

export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  await requireSession()
  const { slug } = await params
  const service = await db.service.findUnique({
    where: { slug },
    include: { team: { include: { members: { include: { user: true } } } }, repository: true },
  })
  if (!service) return NextResponse.json({ error: 'Service not found' }, { status: 404 })
  const owner = service.ownerId ? await db.user.findUnique({ where: { id: service.ownerId }, select: { name: true, avatarColor: true, title: true } }) : null

  const since7 = new Date(Date.now() - 7 * 24 * 3600_000)
  const [deps, incidents, metrics7d, perfLatest, vulns] = await Promise.all([
    db.deployment.findMany({
      where: { serviceId: service.id }, orderBy: { startedAt: 'desc' }, take: 12,
      include: { author: { select: { name: true, avatarColor: true } } },
    }),
    db.incident.findMany({
      where: { affectedServiceIds: { contains: service.id } },
      orderBy: { startedAt: 'desc' }, take: 6,
      include: { owner: { select: { name: true, avatarColor: true } } },
    }),
    db.metric.findMany({
      where: { serviceId: service.id, ts: { gte: since7 }, name: { in: ['p95_latency', 'error_rate', 'requests'] } },
      orderBy: { ts: 'asc' },
    }),
    db.performanceSnapshot.findMany({ where: { serviceId: service.id }, orderBy: { ts: 'desc' }, take: 30 }),
    db.vulnerability.findMany({ where: { serviceId: service.id, status: { not: 'resolved' } } }),
  ])

  const agg = (name: string) => {
    const rows = metrics7d.filter((m) => m.name === name)
    return rows.length ? rows.reduce((a, m) => a + m.value, 0) / rows.length : null
  }

  const deploymentSummaries: DeploymentSummary[] = deps.map((d) => ({
    id: d.id, ref: d.ref, serviceSlug: service.slug, serviceName: service.name,
    envName: d.envName, version: d.version, commitSha: d.commitSha, branch: d.branch,
    status: d.status as DeploymentSummary['status'],
    author: { name: d.author.name, avatarColor: d.author.avatarColor },
    startedAt: d.startedAt.toISOString(), durationMs: d.durationMs,
    bundleDeltaKb: d.bundleDeltaKb, changeSummary: d.changeSummary, rollbackOfId: d.rollbackOfId,
  }))

  const allServices = await db.service.findMany({ select: { id: true, name: true } })
  const nameById = new Map(allServices.map((s) => [s.id, s.name]))

  const incidentSummaries: IncidentSummary[] = incidents.map((i) => ({
    id: i.id, ref: i.ref, title: i.title, severity: i.severity as IncidentSummary['severity'],
    status: i.status as IncidentSummary['status'],
    owner: { name: i.owner.name, avatarColor: i.owner.avatarColor },
    affectedServices: parseJson<string[]>(i.affectedServiceIds, []).map((id) => nameById.get(id) ?? id),
    startedAt: i.startedAt.toISOString(), resolvedAt: i.resolvedAt?.toISOString() ?? null,
    impact: i.impact, openTimelineCount: 0,
  }))

  // dependency neighbours
  const node = await db.architectureNode.findFirst({ where: { serviceSlug: slug } })
  let dependencies: { label: string; slug?: string; kind: string; direction: 'upstream' | 'downstream' }[] = []
  if (node) {
    const edges = await db.architectureEdge.findMany({ where: { OR: [{ fromKey: node.key }, { toKey: node.key }] } })
    const otherKeys = edges.map((e) => (e.fromKey === node.key ? { key: e.toKey, dir: 'downstream' as const, label: e.label } : { key: e.fromKey, dir: 'upstream' as const, label: e.label }))
    const nodes = await db.architectureNode.findMany({ where: { key: { in: otherKeys.map((o) => o.key) } } })
    dependencies = otherKeys.map((o) => {
      const n = nodes.find((x) => x.key === o.key)
      return { label: n?.label ?? o.key, slug: n?.serviceSlug ?? undefined, kind: n?.kind ?? 'service', direction: o.dir }
    })
  }

  return NextResponse.json({
    service: {
      id: service.id, name: service.name, slug: service.slug, description: service.description,
      kind: service.kind, language: service.language, framework: service.framework, tier: service.tier,
      status: service.status, version: service.version, createdAt: service.createdAt,
      team: { name: service.team.name, slug: service.team.slug, color: service.team.color },
      owner: owner ? { name: owner.name, avatarColor: owner.avatarColor, title: owner.title } : null,
      repository: service.repository ? {
        name: service.repository.name, url: service.repository.url, defaultBranch: service.repository.defaultBranch,
        lastCommitSha: service.repository.lastCommitSha, lastCommitMessage: service.repository.lastCommitMessage,
        lastCommitAt: service.repository.lastCommitAt, openPrs: service.repository.openPrs,
        contributors: service.repository.contributors, buildStatus: service.repository.buildStatus, language: service.repository.language,
      } : null,
    },
    metrics: {
      errorRate7d: agg('error_rate'), p95Latency7d: agg('p95_latency'), requests7d: agg('requests'),
      availability: service.status === 'healthy' ? 99.98 : 99.82,
    },
    series: {
      p95: metrics7d.filter((m) => m.name === 'p95_latency').map((m) => ({ ts: m.ts.toISOString(), v: Math.round(m.value) })),
      errors: metrics7d.filter((m) => m.name === 'error_rate').map((m) => ({ ts: m.ts.toISOString(), v: +m.value.toFixed(3) })),
      requests: metrics7d.filter((m) => m.name === 'requests').map((m) => ({ ts: m.ts.toISOString(), v: Math.round(m.value) })),
    },
    deployments: deploymentSummaries,
    incidents: incidentSummaries,
    performance: perfLatest.slice(0, 5).map((p) => ({ route: p.route, score: p.score, lcpMs: p.lcpMs, inpMs: p.inpMs, cls: p.cls, bundleKb: p.bundleKb, ts: p.ts.toISOString() })),
    dependencies,
    vulnerabilities: vulns.map((v) => ({ cve: v.cve, pkg: v.pkg, severity: v.severity, cvss: v.cvss, status: v.status, description: v.description })),
  })
}
