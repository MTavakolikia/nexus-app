import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { getSession, requireSession, setSessionUser, sessionToUserDTO } from '@/lib/session'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getSession()
  if (session) return NextResponse.json({ session, users: await listUsers() })
  // auto-attach demo persona (zero-friction demo, still a real server session)
  const fallback = await db.user.findUnique({ where: { email: 'mohammad@acme.dev' } })
  if (fallback) {
    await setSessionUser(fallback.id)
    return NextResponse.json({ session: sessionToUserDTO(fallback), users: await listUsers() })
  }
  return NextResponse.json({ session: null, users: await listUsers() })
}

const SwitchSchema = z.object({ email: z.string().email() })

export async function POST(req: NextRequest) {
  const body = SwitchSchema.safeParse(await req.json())
  if (!body.success) return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  const user = await db.user.findUnique({ where: { email: body.data.email } })
  if (!user) return NextResponse.json({ error: 'Unknown persona' }, { status: 404 })
  await setSessionUser(user.id)
  const session = await requireSession()
  return NextResponse.json({ session, users: await listUsers() })
}

async function listUsers() {
  return db.user.findMany({
    select: { id: true, name: true, email: true, title: true, role: true, avatarColor: true },
    orderBy: { name: 'asc' },
  })
}
