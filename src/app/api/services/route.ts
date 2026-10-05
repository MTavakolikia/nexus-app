import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireSession } from '@/lib/session'
import { parseJson, serviceAggregates, openIncidentCountByService } from '@/server/queries'
import type { ServiceSummary } from '@/lib/types'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  await requireSession()
  const q = req.nextUrl.searchParams.get('q')?.toLowerCase() ?? ''
  const team = req.nextUrl.searchParams.get('team') ?? ''

  const [services, agg, incidentCounts, users] = await Promise.all([
    db.service.findMany({ include: { team: true, repository: true } }),
    serviceAggregates(),
    openIncidentCountByService(),
    db.user.findMany({ select: { id: true, name: true, avatarColor: true } }),
  ])
  const ownerById = new Map(users.map((u) => [u.id, u]))

  const list: (ServiceSummary & { repoUrl?: string; docsUrl?: string | null })[] = services
    .filter((s) => (team ? s.team.slug === team : true))
    .filter((s) => (q ? `${s.name} ${s.description} ${s.language} ${s.framework} ${s.team.name}`.toLowerCase().includes(q) : true))
    .map((s) => {
      const a = agg[s.id]
      return {
        id: s.id, name: s.name, slug: s.slug, description: s.description, kind: s.kind,
        language: s.language, framework: s.framework, tier: s.tier,
        status: s.status as ServiceSummary['status'], version: s.version,
        team: { name: s.team.name, slug: s.team.slug, color: s.team.color },
        owner: s.ownerId && ownerById.has(s.ownerId)
          ? { name: ownerById.get(s.ownerId)!.name, avatarColor: ownerById.get(s.ownerId)!.avatarColor }
          : null,
        lastDeployAt: a?.lastDeployAt?.toISOString() ?? null,
        errorRate7d: a ? +a.errorRate.toFixed(3) : null,
        p95Latency7d: a ? Math.round(a.p95) : null,
        availability7d: a ? +a.availability.toFixed(3) : null,
        openIncidents: incidentCounts[s.id] ?? 0,
        repoUrl: s.repository?.url ?? undefined,
        docsUrl: s.docsUrl,
      }
    })
    .sort((a, b) => (a.tier === b.tier ? a.name.localeCompare(b.name) : a.tier.localeCompare(b.tier)))

  return NextResponse.json({ services: list })
}
