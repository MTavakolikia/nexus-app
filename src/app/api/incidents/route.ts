import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { assertCan, ForbiddenError, requireSession } from '@/lib/session'
import { parseJson } from '@/server/queries'
import type { IncidentSummary } from '@/lib/types'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  await requireSession()
  const status = req.nextUrl.searchParams.get('status') ?? ''
  const sev = req.nextUrl.searchParams.get('severity') ?? ''
  const incidents = await db.incident.findMany({
    where: { ...(status ? { status } : {}), ...(sev ? { severity: sev } : {}) },
    orderBy: { startedAt: 'desc' },
    include: { owner: { select: { name: true, avatarColor: true } }, _count: { select: { timeline: true } } },
  })
  const services = await db.service.findMany({ select: { id: true, name: true } })
  const nameById = new Map(services.map((s) => [s.id, s.name]))
  const list: IncidentSummary[] = incidents.map((i) => ({
    id: i.id, ref: i.ref, title: i.title, severity: i.severity as IncidentSummary['severity'],
    status: i.status as IncidentSummary['status'],
    owner: { name: i.owner.name, avatarColor: i.owner.avatarColor },
    affectedServices: parseJson<string[]>(i.affectedServiceIds, []).map((id) => nameById.get(id) ?? id),
    startedAt: i.startedAt.toISOString(), resolvedAt: i.resolvedAt?.toISOString() ?? null,
    impact: i.impact, openTimelineCount: i._count.timeline,
  }))
  return NextResponse.json({ incidents: list })
}

const CreateSchema = z.object({
  title: z.string().min(6).max(140),
  severity: z.enum(['SEV-1', 'SEV-2', 'SEV-3', 'SEV-4']),
  serviceSlugs: z.array(z.string()).min(1),
  impact: z.string().max(600).optional(),
  deploymentRef: z.string().optional(),
})

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession()
    assertCan(session, 'incidents.create')
    const parsed = CreateSchema.safeParse(await req.json())
    if (!parsed.success) return NextResponse.json({ error: 'Invalid payload', issues: parsed.error.issues }, { status: 400 })

    const services = await db.service.findMany({ where: { slug: { in: parsed.data.serviceSlugs } }, select: { id: true, orgId: true } })
    if (!services.length) return NextResponse.json({ error: 'Unknown services' }, { status: 404 })
    const maxInc = await db.incident.aggregate({ _max: { ref: true } })
    const ref = `INC-${Math.max(1042, Number((maxInc._max.ref ?? 'INC-0').split('-')[1])) + 1}`

    const incident = await db.incident.create({
      data: {
        orgId: services[0].orgId, ref, title: parsed.data.title, severity: parsed.data.severity,
        status: 'investigating', ownerId: session.id,
        affectedServiceIds: JSON.stringify(services.map((s) => s.id)),
        impact: parsed.data.impact ?? null,
        startedAt: new Date(),
      },
    })
    if (parsed.data.deploymentRef) {
      const dep = await db.deployment.findUnique({ where: { ref: parsed.data.deploymentRef } })
      if (dep) await db.incident.update({ where: { id: incident.id }, data: { deploymentId: dep.id } })
    }
    await db.incidentTimeline.create({
      data: { incidentId: incident.id, at: new Date(), label: 'Incident declared', detail: `${parsed.data.severity} declared by ${session.name}`, kind: 'incident' },
    })
    await db.auditLog.create({
      data: { orgId: services[0].orgId, userId: session.id, userName: session.name, action: 'incident.created', targetType: 'incident', targetId: ref, detail: `${parsed.data.severity} · ${parsed.data.title}` },
    })
    return NextResponse.json({ ref })
  } catch (e) {
    if (e instanceof ForbiddenError) return NextResponse.json({ error: e.message }, { status: 403 })
    throw e
  }
}
