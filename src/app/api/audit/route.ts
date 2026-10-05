import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { assertCan, ForbiddenError, requireSession } from '@/lib/session'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession()
    assertCan(session, 'audit.read')
    const action = req.nextUrl.searchParams.get('action') ?? ''
    const logs = await db.auditLog.findMany({
      where: action ? { action: { contains: action } } : {},
      orderBy: { at: 'desc' }, take: 60,
    })
    return NextResponse.json({
      logs: logs.map((l) => ({ id: l.id, userName: l.userName, action: l.action, targetType: l.targetType, targetId: l.targetId, detail: l.detail, at: l.at.toISOString() })),
    })
  } catch (e) {
    if (e instanceof ForbiddenError) return NextResponse.json({ error: e.message }, { status: 403 })
    throw e
  }
}
