import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireSession } from '@/lib/session'

export const dynamic = 'force-dynamic'

// Knowledge search — VectorSearchProvider interface, SQLite lexical implementation.
// Swapping to pgvector is a driver change, not an architecture change (ADR-005).
export async function GET(req: NextRequest) {
  await requireSession()
  const q = req.nextUrl.searchParams.get('q')?.toLowerCase() ?? ''
  if (q.length < 2) return NextResponse.json({ results: [] })
  const terms = q.match(/\b[a-z][a-z0-9-]{2,}\b/g) ?? []

  const docs = await db.document.findMany()
  const chunks = await db.knowledgeChunk.findMany()
  const docById = new Map(docs.map((d) => [d.id, d]))

  const scored = chunks.map((c) => {
    const doc = docById.get(c.documentId)!
    const hay = `${c.heading ?? ''} ${c.content} ${c.keywords} ${doc.title}`.toLowerCase()
    let score = 0
    for (const t of terms) {
      if (hay.includes(t)) score += t.length > 5 ? 2 : 1
    }
    return { doc, chunk: c, score }
  }).filter((x) => x.score > 0).sort((a, b) => b.score - a.score)

  // dedupe by document (best chunk), keep 6 docs
  const seen = new Set<string>()
  const results: {
    id: string
    title: string
    type: string
    ref: string | null
    updatedAt: string
    snippet: string
    heading: string | null
    score: number
  }[] = []
  for (const s of scored) {
    if (seen.has(s.doc.id)) continue
    seen.add(s.doc.id)
    results.push({
      id: s.doc.id, title: s.doc.title, type: s.doc.type, ref: s.doc.ref,
      updatedAt: s.doc.updatedAt.toISOString(),
      snippet: s.chunk.content.replace(/[#*\n]+/g, ' ').slice(0, 240),
      heading: s.chunk.heading,
      score: s.score,
    })
    if (results.length >= 6) break
  }
  return NextResponse.json({ results })
}
