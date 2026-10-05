import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireSession } from '@/lib/session'
import type { ArchitectureDTO, ServiceStatus } from '@/lib/types'

export const dynamic = 'force-dynamic'

export async function GET() {
  await requireSession()
  const [nodes, edges, services] = await Promise.all([
    db.architectureNode.findMany({ orderBy: { x: 'asc' } }),
    db.architectureEdge.findMany(),
    db.service.findMany({ select: { slug: true, status: true } }),
  ])
  const statusBySlug = new Map(services.map((s) => [s.slug, s.status as ServiceStatus]))
  const dto: ArchitectureDTO = {
    nodes: nodes.map((n) => ({
      key: n.key, label: n.label, kind: n.kind, serviceSlug: n.serviceSlug,
      tech: n.tech, x: n.x, y: n.y,
      status: n.serviceSlug ? statusBySlug.get(n.serviceSlug) ?? 'unknown' : undefined,
    })),
    edges: edges.map((e) => ({ fromKey: e.fromKey, toKey: e.toKey, label: e.label, kind: e.kind })),
  }
  return NextResponse.json(dto)
}
