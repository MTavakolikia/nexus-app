import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireSession } from '@/lib/session'
import type { PerformanceRouteDTO, RegressionDTO } from '@/lib/types'

export const dynamic = 'force-dynamic'

export async function GET() {
  await requireSession()
  const services = await db.service.findMany({ where: { kind: 'frontend' }, select: { id: true, slug: true, name: true } })
  const since30 = new Date(Date.now() - 30 * 24 * 3600_000)
  const snaps = await db.performanceSnapshot.findMany({
    where: { serviceId: { in: services.map((s) => s.id) }, ts: { gte: since30 } },
    orderBy: { ts: 'asc' },
  })
  const svcById = new Map(services.map((s) => [s.id, s]))

  // group by service+route; latest snapshot + history
  const groups = new Map<string, typeof snaps>()
  for (const s of snaps) {
    const key = `${s.serviceId}:${s.route}`
    const arr = groups.get(key) ?? []
    arr.push(s)
    groups.set(key, arr)
  }
  const routes: PerformanceRouteDTO[] = []
  for (const [key, arr] of groups) {
    const latest = arr[arr.length - 1]
    const svc = svcById.get(latest.serviceId)
    if (!svc) continue
    const budgetStatus = latest.lcpMs > 2500 || latest.bundleKb > 1200 ? 'breach' : latest.lcpMs > 2200 ? 'warning' : 'good'
    routes.push({
      route: latest.route, serviceSlug: svc.slug, score: latest.score,
      lcpMs: Math.round(latest.lcpMs), inpMs: Math.round(latest.inpMs), cls: latest.cls,
      ttfbMs: Math.round(latest.ttfbMs), fcpMs: Math.round(latest.fcpMs),
      bundleKb: Math.round(latest.bundleKb), cssKb: Math.round(latest.cssKb), imageKb: Math.round(latest.imageKb),
      lcpHistory: arr.map((s) => ({ ts: s.ts.toISOString(), lcp: Math.round(s.lcpMs), bundle: Math.round(s.bundleKb) })),
      budgetStatus,
    })
  }
  routes.sort((a, b) => a.score - b.score)

  // regressions: latest vs prior 7-snapshot baseline
  const regressions: RegressionDTO[] = []
  for (const [, arr] of groups) {
    if (arr.length < 6) continue
    const latest = arr[arr.length - 1]
    const baseline = arr.slice(-6, -1)
    const avg = (f: (s: typeof latest) => number) => baseline.reduce((a, s) => a + f(s), 0) / baseline.length
    const lcpDelta = latest.lcpMs - avg((s) => s.lcpMs)
    const bundleDeltaPct = ((latest.bundleKb - avg((s) => s.bundleKb)) / avg((s) => s.bundleKb)) * 100
    if (lcpDelta > 60 || bundleDeltaPct > 4) {
      const svc = svcById.get(latest.serviceId)
      regressions.push({
        version: latest.version, serviceSlug: svc?.slug ?? 'unknown', route: latest.route,
        bundleDeltaPct: +bundleDeltaPct.toFixed(1), lcpDeltaMs: Math.round(lcpDelta), inpDeltaMs: Math.round(latest.inpMs - avg((s) => s.inpMs)),
        detectedAt: latest.ts.toISOString(),
        hypothesis: `Release ${latest.version} correlates with the shift. Diff the bundle composition and check newly added client dependencies before forwarding.`,
      })
    }
  }

  const cwv = {
    lcpP75: Math.round(routes.reduce((a, r) => a + r.lcpMs, 0) / (routes.length || 1)),
    inpP75: Math.round(routes.reduce((a, r) => a + r.inpMs, 0) / (routes.length || 1)),
    clsP75: +(routes.reduce((a, r) => a + r.cls, 0) / (routes.length || 1)).toFixed(3),
    ttfbP75: Math.round(routes.reduce((a, r) => a + r.ttfbMs, 0) / (routes.length || 1)),
    avgScore: Math.round(routes.reduce((a, r) => a + r.score, 0) / (routes.length || 1)),
  }
  return NextResponse.json({ routes, regressions, cwv })
}
