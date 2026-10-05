import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireSession } from '@/lib/session'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  await requireSession()
  const sp = req.nextUrl.searchParams
  const service = sp.get('service') ?? ''
  const env = sp.get('env') ?? 'production'
  const hours = Math.min(Number(sp.get('hours') ?? 24) || 24, 168)

  const services = await db.service.findMany({ select: { id: true, name: true, slug: true, status: true } })
  const target = service ? services.find((s) => s.slug === service) : null
  const since = new Date(Date.now() - hours * 3600_000)

  const metrics = await db.metric.findMany({
    where: {
      ts: { gte: since }, envName: env,
      ...(target
        ? {}
        : { serviceId: { in: services.map((s) => s.id) }, name: { in: ['error_rate', 'p95_latency', 'requests'] } }),
    },
    orderBy: { ts: 'asc' },
  })

  // Sum across services for platform-level series; per-service for selection
  const byTs = new Map<number, { reqs: number; errs: number[]; p95s: number[]; count: number }>()
  for (const m of metrics) {
    const b = byTs.get(m.ts.getTime()) ?? { reqs: 0, errs: [], p95s: [], count: 0 }
    if (m.name === 'requests') b.reqs += m.value
    if (m.name === 'error_rate') b.errs.push(m.value)
    if (m.name === 'p95_latency') b.p95s.push(m.value)
    b.count++
    byTs.set(m.ts.getTime(), b)
  }
  const series = [...byTs.entries()].sort((a, b) => a[0] - b[0]).map(([ts, b]) => ({
    ts: new Date(ts).toISOString(),
    requests: b.reqs,
    errorRate: b.errs.length ? +(b.errs.reduce((a, v) => a + v, 0) / b.errs.length).toFixed(3) : 0,
    p95: b.p95s.length ? Math.round(b.p95s.reduce((a, v) => a + v, 0) / b.p95s.length) : 0,
  }))

  const availRows = await db.metric.findMany({
    where: { name: 'availability', ts: { gte: since }, envName: env, ...(target ? { serviceId: target.id } : {}) },
  })
  const availability = availRows.length ? availRows.reduce((a, m) => a + m.value, 0) / availRows.length : 99.9

  const errorNow = series.length ? series[series.length - 1].errorRate : 0
  const p95Now = series.length ? series[series.length - 1].p95 : 0
  const reqsNow = series.length ? series[series.length - 1].requests : 0

  return NextResponse.json({
    services: services.map((s) => ({ slug: s.slug, name: s.name, status: s.status })),
    selected: target?.slug ?? null,
    env, hours,
    kpis: {
      requests: reqsNow, errorRate: errorNow, p95: p95Now,
      availability: +availability.toFixed(3),
      throughput: Math.round(reqsNow * 60),
    },
    series,
  })
}
