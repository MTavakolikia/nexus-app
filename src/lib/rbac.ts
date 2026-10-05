// Server-enforced RBAC (ADR-006). The UI only mirrors these decisions for affordance.
import type { Role } from './types'

export const PERMISSIONS = {
  'services.read': ['USER', 'DEVELOPER', 'ENGINEER', 'TEAM_LEAD', 'ADMIN', 'PLATFORM_ADMIN', 'SECURITY_ADMIN', 'SUPER_ADMIN'],
  'services.write': ['TEAM_LEAD', 'ADMIN', 'PLATFORM_ADMIN', 'SUPER_ADMIN'],
  'deployments.read': ['USER', 'DEVELOPER', 'ENGINEER', 'TEAM_LEAD', 'ADMIN', 'PLATFORM_ADMIN', 'SECURITY_ADMIN', 'SUPER_ADMIN'],
  'deployments.create': ['DEVELOPER', 'ENGINEER', 'TEAM_LEAD', 'ADMIN', 'PLATFORM_ADMIN', 'SUPER_ADMIN'],
  'incidents.read': ['USER', 'DEVELOPER', 'ENGINEER', 'TEAM_LEAD', 'ADMIN', 'PLATFORM_ADMIN', 'SECURITY_ADMIN', 'SUPER_ADMIN'],
  'incidents.create': ['DEVELOPER', 'ENGINEER', 'TEAM_LEAD', 'ADMIN', 'PLATFORM_ADMIN', 'SECURITY_ADMIN', 'SUPER_ADMIN'],
  'incidents.resolve': ['ENGINEER', 'TEAM_LEAD', 'ADMIN', 'PLATFORM_ADMIN', 'SECURITY_ADMIN', 'SUPER_ADMIN'],
  'feature_flags.read': ['USER', 'DEVELOPER', 'ENGINEER', 'TEAM_LEAD', 'ADMIN', 'PLATFORM_ADMIN', 'SECURITY_ADMIN', 'SUPER_ADMIN'],
  'feature_flags.write': ['DEVELOPER', 'ENGINEER', 'TEAM_LEAD', 'ADMIN', 'PLATFORM_ADMIN', 'SUPER_ADMIN'],
  'users.read': ['ENGINEER', 'TEAM_LEAD', 'ADMIN', 'PLATFORM_ADMIN', 'SECURITY_ADMIN', 'SUPER_ADMIN'],
  'users.manage': ['ADMIN', 'PLATFORM_ADMIN', 'SUPER_ADMIN'],
  'security.read': ['ENGINEER', 'TEAM_LEAD', 'ADMIN', 'PLATFORM_ADMIN', 'SECURITY_ADMIN', 'SUPER_ADMIN'],
  'security.manage': ['SECURITY_ADMIN', 'PLATFORM_ADMIN', 'SUPER_ADMIN'],
  'audit.read': ['TEAM_LEAD', 'ADMIN', 'PLATFORM_ADMIN', 'SECURITY_ADMIN', 'SUPER_ADMIN'],
  'ai.use': ['USER', 'DEVELOPER', 'ENGINEER', 'TEAM_LEAD', 'ADMIN', 'PLATFORM_ADMIN', 'SECURITY_ADMIN', 'SUPER_ADMIN'],
} as const satisfies Record<string, readonly Role[]>

export type Permission = keyof typeof PERMISSIONS

export function can(role: Role | undefined | null, permission: Permission): boolean {
  if (!role) return false
  return (PERMISSIONS[permission] as readonly Role[]).includes(role)
}

export function permissionSet(role: Role): Permission[] {
  return (Object.keys(PERMISSIONS) as Permission[]).filter((p) => can(role, p))
}
