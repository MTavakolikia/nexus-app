import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireSession } from '@/lib/session'
import { computeHealth } from '@/lib/health'
import { parseJson, serviceAggregates, openIncidentCountByService } from '@/server/queries'
import type { BootstrapDTO, DeploymentSummary, IncidentSummary, ServiceSummary } from '@/lib/types'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await requireSession()
  const { score, health } = await computeHealth()

  const [org, teams, services, servicesAgg, incidentCounts, deployRows, recentDeps, activeIncidents, notifications, perf, owners] = await Promise.all([
    db.organization.findFirst({ where: { slug: 'acme' } }),
    db.team.findMany({ include: { _count: { select: { services: true, members: true } } }, orderBy: { name: 'asc' } }),
    db.service.findMany({ include: { team: true } }),
    serviceAggregates(),
    openIncidentCountByService(),
    db.dailyStat.findMany({ orderBy: { date: 'asc' }, take: 30 }),
    db.deployment.findMany({
      orderBy: { startedAt: 'desc' }, take: 8,
      include: { service: { select: { name: true, slug: true } }, author: { select: { name: true, avatarColor: true } } },
    }),
    db.incident.findMany({
      where: { status: { not: 'resolved' } },
      include: { owner: { select: { name: true, avatarColor: true } } },
      orderBy: { startedAt: 'desc' },
    }),
    db.notification.findMany({ where: { userId: session.id }, orderBy: { createdAt: 'desc' }, take: 12 }),
    db.performanceSnapshot.findMany({ where: { route: '/checkout' }, orderBy: { ts: 'desc' }, take: 10 }),
    db.user.findMany({ select: { id: true, name: true, avatarColor: true } }),
  ])
  const ownerById = new Map(owners.map((o) => [o.id, o]))

  const since7 = new Date(Date.now() - 7 * 24 * 3600_000)
  const [deployments30d, failedBuilds7d, avail7d] = await Promise.all([
    db.deployment.count({ where: { startedAt: { gte: new Date(Date.now() - 30 * 24 * 3600_000) } } }),
    db.deployment.count({ where: { status: 'FAILED', startedAt: { gte: since7 } } }),
    db.metric.aggregate({ where: { name: 'availability', ts: { gte: since7 } }, _avg: { value: true } }),
  ])

  const svcById = new Map(services.map((s) => [s.id, s]))

  function toServiceSummary(s: (typeof services)[number]): ServiceSummary {
    const agg = servicesAgg[s.id]
    return {
      id: s.id, name: s.name, slug: s.slug, description: s.description, kind: s.kind,
      language: s.language, framework: s.framework, tier: s.tier,
      status: s.status as ServiceSummary['status'], version: s.version,
      team: { name: s.team.name, slug: s.team.slug, color: s.team.color },
      owner: s.ownerId && ownerById.has(s.ownerId)
        ? { name: ownerById.get(s.ownerId)!.name, avatarColor: ownerById.get(s.ownerId)!.avatarColor }
        : null,
      lastDeployAt: agg?.lastDeployAt?.toISOString() ?? null,
      errorRate7d: agg ? +agg.errorRate.toFixed(3) : null,
      p95Latency7d: agg ? Math.round(agg.p95) : null,
      availability7d: agg ? +agg.availability.toFixed(3) : null,
      openIncidents: incidentCounts[s.id] ?? 0,
    }
  }

  function toIncidentSummary(i: (typeof activeIncidents)[number]): IncidentSummary {
    return {
      id: i.id, ref: i.ref, title: i.title, severity: i.severity as IncidentSummary['severity'],
      status: i.status as IncidentSummary['status'],
      owner: { name: i.owner.name, avatarColor: i.owner.avatarColor },
      affectedServices: parseJson<string[]>(i.affectedServiceIds, []).map((id) => svcById.get(id)?.name ?? id),
      startedAt: i.startedAt.toISOString(), resolvedAt: i.resolvedAt?.toISOString() ?? null,
      impact: i.impact, openTimelineCount: 0,
    }
  }

  const recentDeployments: DeploymentSummary[] = recentDeps.map((d) => ({
    id: d.id, ref: d.ref, serviceSlug: d.service.slug, serviceName: d.service.name,
    envName: d.envName, version: d.version, commitSha: d.commitSha, branch: d.branch,
    status: d.status as DeploymentSummary['status'],
    author: { name: d.author.name, avatarColor: d.author.avatarColor },
    startedAt: d.startedAt.toISOString(), durationMs: d.durationMs,
    bundleDeltaKb: d.bundleDeltaKb, changeSummary: d.changeSummary, rollbackOfId: d.rollbackOfId,
  }))

  // Regression detection: compare each recent snapshot against its own prior
  // baseline; surface the largest positive LCP regression from the last 3 days.
  const perfRegressions: BootstrapDTO['perfRegressions'] = []
  if (perf.length >= 4) {
    const ordered = [...perf].reverse() // asc
    let best: { delta: number; snap: (typeof ordered)[number]; baseAvg: number; baseBundle: number } | null = null
    for (let i = 4; i < ordered.length; i++) {
      const base = ordered.slice(Math.max(0, i - 5), i)
      const baseAvgLcp = base.reduce((a, p) => a + p.lcpMs, 0) / base.length
      const baseAvgBundle = base.reduce((a, p) => a + p.bundleKb, 0) / base.length
      const delta = ordered[i].lcpMs - baseAvgLcp
      if (!best || delta > best.delta) best = { delta, snap: ordered[i], baseAvg: baseAvgLcp, baseBundle: baseAvgBundle }
    }
    if (best && best.delta > 60) {
      perfRegressions.push({
        route: '/checkout', service: 'checkout-web', version: best.snap.version,
        lcpDeltaMs: Math.round(best.delta), bundleDeltaKb: Math.round(best.snap.bundleKb - best.baseBundle),
      })
    }
  }

  const deployTrend = deployRows.map((d) => ({ date: d.date, success: d.deployments - d.failedDeployments, failed: d.failedDeployments }))
  const checkoutSvc = services.find((s) => s.slug === 'checkout-api')
  const [lat, err] = await Promise.all([
    db.metric.findMany({ where: { serviceId: checkoutSvc!.id, name: 'p95_latency', ts: { gte: new Date(Date.now() - 24 * 3600_000) } }, orderBy: { ts: 'asc' } }),
    db.metric.findMany({ where: { serviceId: checkoutSvc!.id, name: 'error_rate', ts: { gte: new Date(Date.now() - 24 * 3600_000) } }, orderBy: { ts: 'asc' } }),
  ])
  const latencyTrend = lat.map((m, i) => ({ ts: m.ts.toISOString(), p95: Math.round(m.value), errorRate: +(err[i]?.value ?? 0).toFixed(2) }))

  const dto: BootstrapDTO = {
    session,
    org: { name: org?.name ?? 'Acme Engineering', slug: org?.slug ?? 'acme', plan: org?.plan ?? 'enterprise' },
    teams: teams.map((t) => ({ name: t.name, slug: t.slug, color: t.color, serviceCount: t._count.services, memberCount: t._count.members })),
    kpis: {
      healthScore: score, health,
      services: services.length, deployments30d, activeIncidents: activeIncidents.length,
      failedBuilds7d, availability7d: +(avail7d._avg.value ?? 99.9).toFixed(3),
    },
    deployTrend, latencyTrend, recentDeployments,
    activeIncidents: activeIncidents.map(toIncidentSummary),
    servicesNeedingAttention: services.filter((s) => s.status !== 'healthy').map(toServiceSummary),
    notifications: notifications.map((n) => ({ id: n.id, type: n.type, title: n.title, body: n.body, read: n.read, createdAt: n.createdAt.toISOString(), viewKey: n.viewKey })),
    perfRegressions,
  }
  return NextResponse.json(dto)
}
