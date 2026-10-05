import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireSession } from '@/lib/session'
import type { ProductivityDTO } from '@/lib/types'

export const dynamic = 'force-dynamic'

const RANGES: Record<string, number> = { '7D': 7, '30D': 30, '90D': 90, '6M': 182 }

export async function GET(req: NextRequest) {
  await requireSession()
  const range = req.nextUrl.searchParams.get('range') ?? '30D'
  const days = RANGES[range] ?? 30
  const stats = await db.dailyStat.findMany({ orderBy: { date: 'desc' }, take: days })
  stats.reverse()

  const half = Math.floor(stats.length / 2)
  const recent = stats.slice(half)
  const prior = stats.slice(0, half)
  const avg = (arr: typeof stats, f: (s: (typeof stats)[number]) => number) => (arr.length ? arr.reduce((a, s) => a + f(s), 0) / arr.length : 0)
  const pct = (curr: number, prev: number) => (prev === 0 ? 0 : +(((curr - prev) / prev) * 100).toFixed(1))

  const summary = {
    deployments: Math.round(avg(recent, (s) => s.deployments)),
    leadTime: +avg(recent, (s) => s.leadTimeHours).toFixed(1),
    cfr: +avg(recent, (s) => s.changeFailureRate).toFixed(1),
    mttr: +avg(recent, (s) => s.mttrMinutes).toFixed(1),
    deltas: {
      deployments: pct(avg(recent, (s) => s.deployments), avg(prior, (s) => s.deployments)),
      leadTime: pct(avg(recent, (s) => s.leadTimeHours), avg(prior, (s) => s.leadTimeHours)),
      cfr: pct(avg(recent, (s) => s.changeFailureRate), avg(prior, (s) => s.changeFailureRate)),
      mttr: pct(avg(recent, (s) => s.mttrMinutes), avg(prior, (s) => s.mttrMinutes)),
    },
  }

  const dto: ProductivityDTO = {
    range,
    stats: stats.map((s) => ({
      date: s.date, deployments: s.deployments, failed: s.failedDeployments,
      leadTime: s.leadTimeHours, cfr: s.changeFailureRate, mttr: s.mttrMinutes,
      prs: s.prThroughput, availability: s.availability,
    })),
    summary,
  }
  return NextResponse.json(dto)
}
