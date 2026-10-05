import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireSession } from '@/lib/session'
import type { TraceDTO } from '@/lib/types'

export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest) {
  await requireSession()
  const spans = await db.traceSpan.findMany({ orderBy: [{ traceId: 'asc' }, { startOffsetMs: 'asc' }] })
  const byTrace = new Map<string, typeof spans>()
  for (const s of spans) {
    const arr = byTrace.get(s.traceId) ?? []
    arr.push(s)
    byTrace.set(s.traceId, arr)
  }
  const traces: (TraceDTO & { totalMs: number; bottleneck: string })[] = []
  for (const [traceId, arr] of byTrace) {
    const slowest = arr.reduce((a, b) => (b.durationMs > a.durationMs ? b : a))
    traces.push({
      traceId,
      spans: arr.map((s) => ({ serviceKey: s.serviceKey, operation: s.operation, startOffsetMs: s.startOffsetMs, durationMs: s.durationMs, status: s.status })),
      totalMs: Math.max(...arr.map((s) => s.startOffsetMs + s.durationMs)),
      bottleneck: slowest.serviceKey,
    })
  }
  traces.sort((a, b) => b.totalMs - a.totalMs)
  return NextResponse.json({ traces })
}
