import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { assertCan, ForbiddenError, requireSession } from '@/lib/session'
import type { SecurityDTO } from '@/lib/types'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = await requireSession()
    assertCan(session, 'security.read')
    const [vulns, events] = await Promise.all([
      db.vulnerability.findMany({ orderBy: { cvss: 'desc' }, include: { service: { select: { slug: true } } } }),
      db.securityEvent.findMany({ orderBy: { at: 'desc' }, take: 12 }),
    ])
    const weight = { critical: 14, high: 7, medium: 2.5, low: 0.5 } as Record<string, number>
    const openPressure = vulns.filter((v) => v.status !== 'resolved').reduce((a, v) => a + (weight[v.severity] ?? 1), 0)
    const bySeverity = ['critical', 'high', 'medium', 'low'].map((severity) => ({
      severity, count: vulns.filter((v) => v.severity === severity && v.status !== 'resolved').length,
    }))
    const dto: SecurityDTO = {
      score: Math.max(40, Math.round(100 - openPressure * 2.4)),
      bySeverity,
      vulnerabilities: vulns.map((v) => ({
        id: v.id, cve: v.cve, pkg: v.pkg, version: v.version, severity: v.severity,
        cvss: v.cvss, status: v.status, description: v.description,
        serviceSlug: v.service?.slug ?? null, discoveredAt: v.discoveredAt.toISOString(),
      })),
      events: events.map((e) => ({ id: e.id, kind: e.kind, severity: e.severity, message: e.message, actor: e.actor, at: e.at.toISOString() })),
    }
    return NextResponse.json(dto)
  } catch (e) {
    if (e instanceof ForbiddenError) return NextResponse.json({ error: e.message }, { status: 403 })
    throw e
  }
}
