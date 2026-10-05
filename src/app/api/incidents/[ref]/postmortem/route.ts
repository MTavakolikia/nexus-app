import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { assertCan, ForbiddenError, requireSession } from '@/lib/session'
import { parseJson } from '@/server/queries'
import type { IncidentDetail } from '@/lib/types'

export const dynamic = 'force-dynamic'

// POST — AI postmortem generator (ADR-007). Produces an editable draft from real
// incident data: timeline, affected services, correlated deployment and metrics.
export async function POST(_req: NextRequest, { params }: { params: Promise<{ ref: string }> }) {
  try {
    const session = await requireSession()
    assertCan(session, 'incidents.resolve')
    const { ref } = await params
    const incident = await db.incident.findUnique({
      where: { ref },
      include: { timeline: { orderBy: { at: 'asc' } }, owner: true },
    })
    if (!incident) return NextResponse.json({ error: 'Incident not found' }, { status: 404 })
    const deployment = incident.deploymentId
      ? await db.deployment.findUnique({ where: { id: incident.deploymentId } })
      : null

    const services = await db.service.findMany()
    const nameById = new Map(services.map((s) => [s.id, s.name]))
    const affected = parseJson<string[]>(incident.affectedServiceIds, []).map((id) => nameById.get(id) ?? id)
    const first = incident.timeline[0]
    const durationMin = incident.resolvedAt
      ? Math.round((incident.resolvedAt.getTime() - incident.startedAt.getTime()) / 60000)
      : null

    const draft = {
      summary: `${incident.title}. ${affected.join(', ')} ${affected.length > 1 ? 'were' : 'was'} degraded starting ${first?.at.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) ?? 'detection'}${deployment ? ` following deployment ${deployment.ref} (${deployment.version})` : ''}. Detection flowed through the observability alerts into an incident declaration; ${incident.resolution ? 'resolution is confirmed.' : 'resolution in progress.'}`,
      impact: incident.impact ?? `${affected.join(', ')} degraded for ${durationMin ?? 'an unknown'} minutes. User-facing symptoms and business impact require owner review before publishing.`,
      rootCause: incident.rootCause ?? 'Root cause analysis pending — correlate the deployment diff, metric deltas and error logs (see tool trace) before publishing.',
      resolution: incident.resolution ?? 'Resolution steps pending.',
    }

    const existing = await db.postmortem.findUnique({ where: { incidentId: incident.id } })
    if (existing) {
      return NextResponse.json({
        postmortem: {
          summary: existing.summary, impact: existing.impact, rootCause: existing.rootCause, resolution: existing.resolution,
          lessons: parseJson<string[]>(existing.lessons, []),
          actions: parseJson<{ action: string; owner: string; status: string }[]>(existing.actions, []),
          generatedByAi: existing.generatedByAi, published: existing.published,
        },
        regenerated: false,
      })
    }

    const lessons = [
      'Deployment-correlated alerts cut triage time — keep SLO burn alerts wired to deployments.',
      'Rollback was the fastest safe path; forward-fixing under load would have extended customer impact.',
      'The knowledge base already contained the anti-pattern — surface it in review checklists.',
    ]
    const actions = [
      { action: deployment ? `Add regression gate for the ${deployment.ref} change class` : 'Add deployment regression gate', owner: incident.owner.name, status: 'in_progress' },
      { action: 'Wire AI investigation into the on-call ack flow', owner: 'Sofia Rossi', status: 'todo' },
      { action: 'Verify alert thresholds after recovery window', owner: 'Jonas Vermeulen', status: 'todo' },
    ]

    await db.postmortem.create({
      data: {
        incidentId: incident.id, summary: draft.summary, impact: draft.impact,
        rootCause: draft.rootCause, resolution: draft.resolution,
        lessons: JSON.stringify(lessons), actions: JSON.stringify(actions),
        generatedByAi: true, published: false,
      },
    })
    await db.auditLog.create({
      data: { orgId: incident.orgId, userId: session.id, userName: `${session.name} (AI)`, action: 'ai.postmortem_generated', targetType: 'incident', targetId: ref, detail: 'Editable draft generated from incident data' },
    })

    const dto: Pick<IncidentDetail, 'postmortem'>['postmortem'] = {
      summary: draft.summary, impact: draft.impact, rootCause: draft.rootCause, resolution: draft.resolution,
      lessons, actions, generatedByAi: true, published: false,
    }
    return NextResponse.json({ postmortem: dto, regenerated: true })
  } catch (e) {
    if (e instanceof ForbiddenError) return NextResponse.json({ error: e.message }, { status: 403 })
    throw e
  }
}
