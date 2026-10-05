import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireSession } from '@/lib/session'
import { parseJson } from '@/server/queries'

export const dynamic = 'force-dynamic'

export async function GET(req: import('next/server').NextRequest) {
  await requireSession()
  const type = req.nextUrl.searchParams.get('type') ?? ''
  const docs = await db.document.findMany({
    where: type ? { type } : {},
    orderBy: { title: 'asc' },
  })
  return NextResponse.json({
    docs: docs.map((d) => ({
      id: d.id, title: d.title, type: d.type, ref: d.ref, content: d.content,
      tags: parseJson<string[]>(d.tags, []), updatedAt: d.updatedAt.toISOString(),
    })),
  })
}
