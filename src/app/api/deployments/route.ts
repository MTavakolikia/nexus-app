import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { assertCan, ForbiddenError, requireSession } from '@/lib/session'
import type { DeploymentSummary } from '@/lib/types'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  await requireSession()
  const sp = req.nextUrl.searchParams
  const service = sp.get('service') ?? ''
  const status = sp.get('status') ?? ''
  const env = sp.get('env') ?? ''
  const q = sp.get('q')?.toLowerCase() ?? ''
  const limit = Math.min(Number(sp.get('limit') ?? 40) || 40, 100)

  const deps = await db.deployment.findMany({
    where: {
      ...(service ? { service: { slug: service } } : {}),
      ...(status ? { status } : {}),
      ...(env ? { envName: env } : {}),
    },
    orderBy: { startedAt: 'desc' }, take: limit,
    include: { service: { select: { name: true, slug: true } }, author: { select: { name: true, avatarColor: true } } },
  })

  const list: DeploymentSummary[] = deps
    .filter((d) => (q ? `${d.ref} ${d.version} ${d.service.name} ${d.author.name} ${d.changeSummary ?? ''}`.toLowerCase().includes(q) : true))
    .map((d) => ({
      id: d.id, ref: d.ref, serviceSlug: d.service.slug, serviceName: d.service.name,
      envName: d.envName, version: d.version, commitSha: d.commitSha, branch: d.branch,
      status: d.status as DeploymentSummary['status'],
      author: { name: d.author.name, avatarColor: d.author.avatarColor },
      startedAt: d.startedAt.toISOString(), durationMs: d.durationMs,
      bundleDeltaKb: d.bundleDeltaKb, changeSummary: d.changeSummary, rollbackOfId: d.rollbackOfId,
    }))
  return NextResponse.json({ deployments: list })
}

const CreateSchema = z.object({
  serviceSlug: z.string().min(1),
  envName: z.enum(['development', 'staging', 'production', 'canary']).default('staging'),
  version: z.string().min(1),
  changeSummary: z.string().max(280).optional(),
})

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession()
    assertCan(session, 'deployments.create')
    const parsed = CreateSchema.safeParse(await req.json())
    if (!parsed.success) return NextResponse.json({ error: 'Invalid payload', issues: parsed.error.issues }, { status: 400 })

    const service = await db.service.findUnique({ where: { slug: parsed.data.serviceSlug } })
    if (!service) return NextResponse.json({ error: 'Unknown service' }, { status: 404 })

    const allRefs = await db.deployment.findMany({ select: { ref: true } })
    const maxNum = allRefs.reduce((acc, r) => Math.max(acc, Number(r.ref.split('-')[1]) || 0), 0)
    const ref = `DPL-${Math.max(1043, maxNum) + 1}`
    const stages = ['Install', 'Lint', 'Typecheck', 'Unit Tests', 'Integration Tests', 'E2E Tests', 'Security Scan', 'Build', 'Deploy']

    const dep = await db.deployment.create({
      data: {
        ref, serviceId: service.id, envName: parsed.data.envName, version: parsed.data.version,
        commitSha: Array.from({ length: 40 }, () => '0123456789abcdef'[Math.floor(Math.random() * 16)]).join(''),
        branch: 'main', authorId: session.id, status: 'BUILDING', trigger: 'manual',
        filesChanged: 3 + Math.floor(Math.random() * 14), addLines: 40 + Math.floor(Math.random() * 300),
        delLines: 10 + Math.floor(Math.random() * 120),
        bundleSizeKb: service.kind === 'frontend' ? 1101 : null, bundleDeltaKb: service.kind === 'frontend' ? 0 : null,
        changeSummary: parsed.data.changeSummary ?? `Manual deployment of ${parsed.data.version} to ${parsed.data.envName}`,
      },
    })
    await db.pipelineStage.createMany({
      data: stages.map((name, position) => ({ deploymentId: dep.id, name, position, status: position === 0 ? 'RUNNING' : 'PENDING' })),
    })
    await db.auditLog.create({
      data: { orgId: service.orgId, userId: session.id, userName: session.name, action: 'deployment.created', targetType: 'deployment', targetId: ref, detail: `${service.name} ${parsed.data.version} → ${parsed.data.envName}` },
    })

    // Kick off the live simulation; the SSE stream picks it up.
    const { startSimulation } = await import('@/server/deploy-engine')
    startSimulation(dep.id)

    return NextResponse.json({ ref, id: dep.id })
  } catch (e) {
    if (e instanceof ForbiddenError) return NextResponse.json({ error: e.message }, { status: 403 })
    throw e
  }
}
