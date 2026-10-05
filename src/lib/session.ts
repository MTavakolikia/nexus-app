// Cookie-backed demo session. Zero-friction for the demo (auto-attaches to the
// primary persona) while remaining a real server-side session that API routes
// enforce RBAC against. Swap with Auth.js/Better Auth in production (see ADR-006).
import { cookies } from 'next/headers'
import { createHmac } from 'crypto'
import { db } from '@/lib/db'
import { can, permissionSet, type Permission } from '@/lib/rbac'
import type { Role, SessionUser } from '@/lib/types'

const COOKIE = 'nexus_session'
const SECRET = process.env.AUTH_SECRET ?? 'nexus-demo-secret-not-for-production'

function sign(userId: string): string {
  return `${userId}.${createHmac('sha256', SECRET).update(userId).digest('hex').slice(0, 24)}`
}

function verify(token: string | undefined): string | null {
  if (!token) return null
  const idx = token.lastIndexOf('.')
  if (idx < 1) return null
  const userId = token.slice(0, idx)
  return sign(userId) === token ? userId : null
}

export async function getSession(): Promise<SessionUser | null> {
  const jar = await cookies()
  const userId = verify(jar.get(COOKIE)?.value)
  if (!userId) return null
  const user = await db.user.findUnique({ where: { id: userId } })
  if (!user) return null
  const role = user.role as Role
  return {
    id: user.id, name: user.name, email: user.email, title: user.title,
    role, avatarColor: user.avatarColor, permissions: permissionSet(role),
  }
}

/** Demo sessions auto-attach to the primary persona so the recruiter never sees a login wall. */
export async function requireSession(): Promise<SessionUser> {
  const session = await getSession()
  if (session) return session
  const fallback = await db.user.findUnique({ where: { email: 'mohammad@acme.dev' } })
  if (fallback) {
    const role = fallback.role as Role
    return {
      id: fallback.id, name: fallback.name, email: fallback.email, title: fallback.title,
      role, avatarColor: fallback.avatarColor, permissions: permissionSet(role),
    }
  }
  throw new Error('No session and no demo persona found')
}

export async function setSessionUser(userId: string): Promise<void> {
  const jar = await cookies()
  jar.set(COOKIE, sign(userId), { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 30 })
}

export function assertCan(session: SessionUser, permission: Permission): void {
  if (!can(session.role, permission)) {
    throw new ForbiddenError(`Requires permission: ${permission}`)
  }
}

export class ForbiddenError extends Error {}

export function sessionToUserDTO(u: { id: string; email: string; name: string; title: string; role: string; avatarColor: string }): SessionUser {
  const role = u.role as Role
  return { id: u.id, name: u.name, email: u.email, title: u.title, role, avatarColor: u.avatarColor, permissions: permissionSet(role) }
}
