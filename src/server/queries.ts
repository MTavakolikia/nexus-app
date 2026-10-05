// Server-side query layer. UI → feature layer → these functions → db.
import { db } from '@/lib/db'

export const AGG_NAMES = ['error_rate', 'p95_latency', 'availability'] as const

/** 7-day per-service aggregates used across catalog + overview. */
export async function serviceAggregates(): Promise<Record<string, { errorRate: number; p95: number; availability: number; lastDeployAt: Date | null }>> {
  const since = new Date(Date.now() - 7 * 24 * 3600_000)
  const [metrics, lastDeploys] = await Promise.all([
    db.metric.findMany({
      where: { name: { in: [...AGG_NAMES] }, ts: { gte: since }, envName: 'production' },
      select: { serviceId: true, name: true, value: true },
    }),
    db.deployment.groupBy({
      by: ['serviceId'], _max: { startedAt: true },
      where: { envName: 'production' },
    }),
  ])
  const byService: Record<string, { err: number[]; p95: number[]; avail: number[] }> = {}
  for (const m of metrics) {
    const b = (byService[m.serviceId] ??= { err: [], p95: [], avail: [] })
    if (m.name === 'error_rate') b.err.push(m.value)
    if (m.name === 'p95_latency') b.p95.push(m.value)
    if (m.name === 'availability') b.avail.push(m.value)
  }
  const avg = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0)
  const out: Record<string, any> = {}
  for (const [serviceId, b] of Object.entries(byService)) {
    out[serviceId] = { errorRate: avg(b.err), p95: avg(b.p95), availability: avg(b.avail), lastDeployAt: null }
  }
  for (const d of lastDeploys) {
    if (out[d.serviceId]) out[d.serviceId].lastDeployAt = d._max.startedAt
  }
  return out
}

export async function openIncidentCountByService(): Promise<Record<string, number>> {
  const incidents = await db.incident.findMany({
    where: { status: { not: 'resolved' } },
    select: { affectedServiceIds: true },
  })
  const counts: Record<string, number> = {}
  for (const inc of incidents) {
    try {
      for (const id of JSON.parse(inc.affectedServiceIds) as string[]) counts[id] = (counts[id] ?? 0) + 1
    } catch { /* ignore malformed */ }
  }
  return counts
}

export function parseJson<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback
  try { return JSON.parse(raw) as T } catch { return fallback }
}
