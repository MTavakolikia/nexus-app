import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireSession } from '@/lib/session'
import type { DeploymentDetail } from '@/lib/types'

export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ ref: string }> }) {
  await requireSession()
  const { ref } = await params
  const dep = await db.deployment.findUnique({
    where: { ref },
    include: {
      service: { select: { name: true, slug: true } },
      author: { select: { name: true, avatarColor: true } },
      stages: { orderBy: { position: 'asc' } },
    },
  })
  if (!dep) return NextResponse.json({ error: 'Deployment not found' }, { status: 404 })

  // previous deployment of the same service (for the diff view)
  const previous = await db.deployment.findFirst({
    where: { serviceId: dep.serviceId, startedAt: { lt: dep.startedAt }, status: 'SUCCESS' },
    orderBy: { startedAt: 'desc' },
    select: { ref: true, version: true, bundleSizeKb: true, commitSha: true },
  })
  const incident = await db.incident.findFirst({ where: { deploymentId: dep.id }, select: { ref: true, title: true } })

  const dto: DeploymentDetail = {
    id: dep.id, ref: dep.ref, serviceSlug: dep.service.slug, serviceName: dep.service.name,
    envName: dep.envName, version: dep.version, commitSha: dep.commitSha, branch: dep.branch,
    status: dep.status as DeploymentDetail['status'],
    author: { name: dep.author.name, avatarColor: dep.author.avatarColor },
    startedAt: dep.startedAt.toISOString(), durationMs: dep.durationMs,
    bundleDeltaKb: dep.bundleDeltaKb, changeSummary: dep.changeSummary, rollbackOfId: dep.rollbackOfId,
    filesChanged: dep.filesChanged, addLines: dep.addLines, delLines: dep.delLines,
    bundleSizeKb: dep.bundleSizeKb, testsPassed: dep.testsPassed, testsTotal: dep.testsTotal,
    stages: dep.stages.map((s) => ({ name: s.name, status: s.status as never, durationMs: s.durationMs, log: s.log, position: s.position })),
    previous: previous ? { ref: previous.ref, version: previous.version, bundleSizeKb: previous.bundleSizeKb } : null,
    incident: incident ?? null,
  }
  return NextResponse.json(dto)
}
