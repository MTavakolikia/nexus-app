import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { assertCan, ForbiddenError, requireSession } from '@/lib/session'

export const dynamic = 'force-dynamic'

// POST /api/deployments/:ref/rollback — creates a NEW deployment pinning the previous version.
// Never mutates history; fully audited (Runbook RB-002).
export async function POST(_req: NextRequest, { params }: { params: Promise<{ ref: string }> }) {
  try {
    const session = await requireSession()
    assertCan(session, 'deployments.create')
    const { ref } = await params
    const dep = await db.deployment.findUnique({ where: { ref }, include: { service: true } })
    if (!dep) return NextResponse.json({ error: 'Deployment not found' }, { status: 404 })

    const previous = await db.deployment.findFirst({
      where: { serviceId: dep.serviceId, id: { not: dep.id }, status: 'SUCCESS' },
      orderBy: { startedAt: 'desc' },
    })
    if (!previous) return NextResponse.json({ error: 'No previous successful deployment to roll back to' }, { status: 409 })

    const allRefs = await db.deployment.findMany({ select: { ref: true } })
    const maxNum = allRefs.reduce((acc, r) => Math.max(acc, Number(r.ref.split('-')[1]) || 0), 0)
    const newRef = `DPL-${Math.max(1043, maxNum) + 1}`
    const stages = ['Install', 'Lint', 'Typecheck', 'Unit Tests', 'Integration Tests', 'E2E Tests', 'Security Scan', 'Build', 'Deploy']

    const rollback = await db.deployment.create({
      data: {
        ref: newRef, serviceId: dep.serviceId, envName: dep.envName, version: previous.version,
        commitSha: previous.commitSha, branch: dep.branch, authorId: session.id, status: 'BUILDING',
        trigger: 'rollback', rollbackOfId: dep.id, filesChanged: 0,
        bundleSizeKb: previous.bundleSizeKb, bundleDeltaKb: dep.bundleSizeKb && previous.bundleSizeKb ? previous.bundleSizeKb - dep.bundleSizeKb : null,
        testsPassed: previous.testsPassed, testsTotal: previous.testsTotal,
        changeSummary: `Rollback of ${ref} → ${previous.version} initiated by ${session.name}`,
      },
    })
    await db.pipelineStage.createMany({
      data: stages.map((name, position) => ({ deploymentId: rollback.id, name, position, status: position === 0 ? 'RUNNING' : 'PENDING' })),
    })
    await db.deployment.update({ where: { id: dep.id }, data: { status: 'ROLLED_BACK' } })
    await db.auditLog.create({
      data: { orgId: dep.service.orgId, userId: session.id, userName: session.name, action: 'deployment.rollback', targetType: 'deployment', targetId: newRef, detail: `Rolled back ${ref} → ${previous.version}` },
    })

    const { startSimulation } = await import('@/server/deploy-engine')
    startSimulation(rollback.id)
    return NextResponse.json({ ref: newRef, id: rollback.id, version: previous.version })
  } catch (e) {
    if (e instanceof ForbiddenError) return NextResponse.json({ error: e.message }, { status: 403 })
    throw e
  }
}
