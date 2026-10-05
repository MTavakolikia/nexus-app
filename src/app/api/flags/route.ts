import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { assertCan, ForbiddenError, requireSession } from '@/lib/session'
import { parseJson } from '@/server/queries'
import type { FlagDTO } from '@/lib/types'

export const dynamic = 'force-dynamic'

export async function GET() {
  await requireSession()
  const flags = await db.featureFlag.findMany({
    orderBy: { key: 'asc' },
    include: { audits: { orderBy: { at: 'desc' }, take: 6 } },
  })
  const list: FlagDTO[] = flags.map((f) => ({
    id: f.id, key: f.key, name: f.name, description: f.description,
    enabled: f.enabled, envName: f.envName, rollout: f.rollout,
    rules: parseJson<FlagDTO['rules']>(f.rules, []),
    owner: f.ownerId, updatedAt: f.updatedAt.toISOString(),
    audits: f.audits.map((a) => ({ userName: a.userName, action: a.action, previousValue: a.previousValue, newValue: a.newValue, reason: a.reason, at: a.at.toISOString() })),
  }))
  return NextResponse.json({ flags: list })
}

const PatchSchema = z.object({
  enabled: z.boolean().optional(),
  rollout: z.number().int().min(0).max(100).optional(),
  reason: z.string().max(300).optional(),
})

export async function PATCH(req: NextRequest) {
  try {
    const session = await requireSession()
    assertCan(session, 'feature_flags.write')
    const body = await req.json()
    const id = z.string().min(1).parse(body.id)
    const parsed = PatchSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })

    const flag = await db.featureFlag.findUnique({ where: { id } })
    if (!flag) return NextResponse.json({ error: 'Flag not found' }, { status: 404 })

    const changes: string[] = []
    const prev = { enabled: flag.enabled, rollout: flag.rollout }
    if (parsed.data.enabled !== undefined && parsed.data.enabled !== flag.enabled) {
      changes.push(`${flag.enabled ? 'enabled' : 'disabled'} → ${parsed.data.enabled ? 'enabled' : 'disabled'}`)
    }
    if (parsed.data.rollout !== undefined && parsed.data.rollout !== flag.rollout) {
      changes.push(`rollout ${flag.rollout}% → ${parsed.data.rollout}%`)
    }
    if (!changes.length) return NextResponse.json({ ok: true, unchanged: true })

    await db.featureFlag.update({
      where: { id },
      data: {
        ...(parsed.data.enabled !== undefined ? { enabled: parsed.data.enabled } : {}),
        ...(parsed.data.rollout !== undefined ? { rollout: parsed.data.rollout } : {}),
      },
    })
    await db.featureFlagAudit.create({
      data: {
        flagId: id, userId: session.id, userName: session.name,
        action: parsed.data.enabled !== undefined ? 'toggle_changed' : 'rollout_changed',
        previousValue: `${prev.enabled ? 'on' : 'off'} @ ${prev.rollout}%`,
        newValue: `${parsed.data.enabled ?? prev.enabled ? 'on' : 'off'} @ ${parsed.data.rollout ?? prev.rollout}%`,
        reason: parsed.data.reason ?? null,
      },
    })
    await db.auditLog.create({
      data: { orgId: (await db.organization.findFirst())!.id, userId: session.id, userName: session.name, action: 'feature_flag.changed', targetType: 'feature_flag', targetId: flag.key, detail: changes.join(', ') },
    })
    return NextResponse.json({ ok: true })
  } catch (e) {
    if (e instanceof ForbiddenError) return NextResponse.json({ error: e.message }, { status: 403 })
    throw e
  }
}
