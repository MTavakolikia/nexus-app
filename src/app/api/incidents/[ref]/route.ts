import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { assertCan, ForbiddenError, requireSession } from '@/lib/session'
import { parseJson } from '@/server/queries'
import type { IncidentDetail } from '@/lib/types'

export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ ref: string }> }) {
  await requireSession()
  const { ref } = await params
  const incident = await db.incident.findUnique({
    where: { ref },
    include: {
      owner: { select: { name: true, avatarColor: true, title: true } },
      timeline: { orderBy: { at: 'asc' } },
      postmortem: true,
    },
  })
  if (!incident) return NextResponse.json({ error: 'Incident not found' }, { status: 404 })
  const deployment = incident.deploymentId
    ? await db.deployment.findUnique({ where: { id: incident.deploymentId }, select: { ref: true } })
    : null
  const services = await db.service.findMany({ select: { id: true, name: true } })
  const nameById = new Map(services.map((s) => [s.id, s.name]))

  const pm = incident.postmortem
  const dto: IncidentDetail = {
    id: incident.id, ref: incident.ref, title: incident.title,
    severity: incident.severity as IncidentDetail['severity'],
    status: incident.status as IncidentDetail['status'],
    owner: { name: incident.owner.name, avatarColor: incident.owner.avatarColor },
    affectedServices: parseJson<string[]>(incident.affectedServiceIds, []).map((id) => nameById.get(id) ?? id),
    startedAt: incident.startedAt.toISOString(), resolvedAt: incident.resolvedAt?.toISOString() ?? null,
    impact: incident.impact, openTimelineCount: incident.timeline.length,
    detection: incident.detection, rootCause: incident.rootCause, resolution: incident.resolution,
    deploymentRef: deployment?.ref ?? null,
    timeline: incident.timeline.map((t) => ({ at: t.at.toISOString(), label: t.label, detail: t.detail, kind: t.kind })),
    postmortem: pm ? {
      summary: pm.summary, impact: pm.impact, rootCause: pm.rootCause, resolution: pm.resolution,
      lessons: parseJson<string[]>(pm.lessons, []),
      actions: parseJson<{ action: string; owner: string; status: string }[]>(pm.actions, []),
      generatedByAi: pm.generatedByAi, published: pm.published,
    } : null,
  }
  return NextResponse.json(dto)
}

const PatchSchema = z.object({
  status: z.enum(['open', 'investigating', 'identified', 'monitoring', 'resolved']).optional(),
  resolution: z.string().max(2000).optional(),
})

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ ref: string }> }) {
  try {
    const session = await requireSession()
    assertCan(session, 'incidents.resolve')
    const { ref } = await params
    const parsed = PatchSchema.safeParse(await req.json())
    if (!parsed.success) return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })

    const incident = await db.incident.findUnique({ where: { ref } })
    if (!incident) return NextResponse.json({ error: 'Incident not found' }, { status: 404 })

    const data: Record<string, unknown> = {}
    if (parsed.data.status) data.status = parsed.data.status
    if (parsed.data.status === 'resolved') data.resolvedAt = new Date()
    if (parsed.data.resolution) data.resolution = parsed.data.resolution
    await db.incident.update({ where: { id: incident.id }, data })

    if (parsed.data.status) {
      await db.incidentTimeline.create({
        data: {
          incidentId: incident.id, at: new Date(),
          label: parsed.data.status === 'resolved' ? 'Incident resolved' : `Status → ${parsed.data.status}`,
          detail: `Updated by ${session.name}`,
          kind: parsed.data.status === 'resolved' ? 'resolved' : 'event',
        },
      })
      await db.auditLog.create({
        data: { orgId: incident.orgId, userId: session.id, userName: session.name, action: 'incident.status_changed', targetType: 'incident', targetId: ref, detail: `→ ${parsed.data.status}` },
      })
    }
    return NextResponse.json({ ok: true })
  } catch (e) {
    if (e instanceof ForbiddenError) return NextResponse.json({ error: e.message }, { status: 403 })
    throw e
  }
}
