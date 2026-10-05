import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireSession } from '@/lib/session'
import type { LogDTO } from '@/lib/types'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  await requireSession()
  const sp = req.nextUrl.searchParams
  const service = sp.get('service') ?? ''
  const level = sp.get('level') ?? ''
  const q = sp.get('q')?.toLowerCase() ?? ''
  const hours = Math.min(Number(sp.get('hours') ?? 24) || 24, 168)
  const requestId = sp.get('requestId') ?? ''

  const logs = await db.logEntry.findMany({
    where: {
      ts: { gte: new Date(Date.now() - hours * 3600_000) },
      ...(service ? { service: { slug: service } } : {}),
      ...(level ? { level } : {}),
      ...(requestId ? { requestId } : {}),
    },
    orderBy: { ts: 'desc' }, take: 300,
    include: { service: { select: { name: true } } },
  })

  const list: LogDTO[] = logs
    .filter((l) => (q ? `${l.message} ${l.requestId ?? ''} ${l.service.name}`.toLowerCase().includes(q) : true))
    .map((l) => ({
      id: l.id, ts: l.ts.toISOString(), level: l.level, message: l.message,
      serviceSlug: l.service.name, envName: l.envName, requestId: l.requestId, traceId: l.traceId,
    }))
  return NextResponse.json({ logs: list, total: list.length })
}
