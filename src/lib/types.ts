// Shared type vocabulary for NEXUS (SQLite uses string unions instead of enums)
export type Role =
  | 'USER' | 'DEVELOPER' | 'ENGINEER' | 'TEAM_LEAD'
  | 'ADMIN' | 'PLATFORM_ADMIN' | 'SECURITY_ADMIN' | 'SUPER_ADMIN'

export type ServiceStatus = 'healthy' | 'degraded' | 'down' | 'unknown'
export type DeployStatus = 'QUEUED' | 'BUILDING' | 'TESTING' | 'DEPLOYING' | 'SUCCESS' | 'FAILED' | 'ROLLED_BACK' | 'CANCELLED'
export type StageStatus = 'PENDING' | 'RUNNING' | 'PASSED' | 'FAILED' | 'SKIPPED'
export type Severity = 'SEV-1' | 'SEV-2' | 'SEV-3' | 'SEV-4'
export type IncidentStatus = 'open' | 'investigating' | 'identified' | 'monitoring' | 'resolved'
export type VulnSeverity = 'critical' | 'high' | 'medium' | 'low'
export type EnvSlug = 'development' | 'staging' | 'production' | 'canary'

// ── DTOs returned by the API layer ──
export interface SessionUser {
  id: string; name: string; email: string; title: string; role: Role; avatarColor: string
  permissions: string[]
}

export interface ServiceSummary {
  id: string; name: string; slug: string; description: string; kind: string
  language: string; framework: string; tier: string; status: ServiceStatus
  version: string
  team: { name: string; slug: string; color: string }
  owner?: { name: string; avatarColor: string } | null
  lastDeployAt?: string | null
  errorRate7d?: number | null
  p95Latency7d?: number | null
  availability7d?: number | null
  openIncidents: number
}

export interface DeploymentSummary {
  id: string; ref: string; serviceSlug: string; serviceName: string; envName: string
  version: string; commitSha: string; branch: string; status: DeployStatus
  author: { name: string; avatarColor: string }
  startedAt: string; durationMs?: number | null; bundleDeltaKb?: number | null
  changeSummary?: string | null; rollbackOfId?: string | null
}

export interface StageDTO {
  name: string; status: StageStatus; durationMs?: number | null; log?: string | null; position: number
}

export interface DeploymentDetail extends DeploymentSummary {
  filesChanged: number; addLines: number; delLines: number
  bundleSizeKb?: number | null; testsPassed?: number | null; testsTotal?: number | null
  stages: StageDTO[]
  previous?: { ref: string; version: string; bundleSizeKb?: number | null } | null
  incident?: { ref: string; title: string } | null
}

export interface IncidentSummary {
  id: string; ref: string; title: string; severity: Severity; status: IncidentStatus
  owner: { name: string; avatarColor: string }
  affectedServices: string[]; startedAt: string; resolvedAt?: string | null
  impact?: string | null
  openTimelineCount: number
}

export interface IncidentDetail extends IncidentSummary {
  detection?: string | null; rootCause?: string | null; resolution?: string | null
  deploymentRef?: string | null
  timeline: { at: string; label: string; detail?: string | null; kind: string }[]
  postmortem?: {
    summary: string; impact: string; rootCause: string; resolution: string
    lessons: string[]; actions: { action: string; owner: string; status: string }[]
    generatedByAi: boolean; published: boolean
  } | null
}

export interface FlagDTO {
  id: string; key: string; name: string; description: string
  enabled: boolean; envName: string; rollout: number
  rules: { type: string; region?: string; team?: string; rollout: number }[]
  owner: string; updatedAt: string
  audits: { userName: string; action: string; previousValue: string; newValue: string; reason?: string | null; at: string }[]
}

export interface HealthBreakdown {
  reliability: number; performance: number; security: number
  accessibility: number; testing: number; observability: number
}

export interface BootstrapDTO {
  session: SessionUser
  org: { name: string; slug: string; plan: string }
  teams: { name: string; slug: string; color: string; serviceCount: number; memberCount: number }[]
  kpis: {
    healthScore: number; health: HealthBreakdown
    services: number; deployments30d: number; activeIncidents: number
    failedBuilds7d: number; availability7d: number
  }
  deployTrend: { date: string; success: number; failed: number }[]
  latencyTrend: { ts: string; p95: number; errorRate: number }[]
  recentDeployments: DeploymentSummary[]
  activeIncidents: IncidentSummary[]
  servicesNeedingAttention: ServiceSummary[]
  notifications: { id: string; type: string; title: string; body?: string | null; read: boolean; createdAt: string; viewKey?: string | null }[]
  perfRegressions: { route: string; service: string; lcpDeltaMs: number; bundleDeltaKb: number; version: string }[]
}

export interface PerformanceRouteDTO {
  route: string; serviceSlug: string; score: number
  lcpMs: number; inpMs: number; cls: number; ttfbMs: number; fcpMs: number
  bundleKb: number; cssKb: number; imageKb: number
  lcpHistory: { ts: string; lcp: number; bundle: number }[]
  budgetStatus: 'good' | 'warning' | 'breach'
}

export interface RegressionDTO {
  version: string; serviceSlug: string; route: string
  bundleDeltaPct: number; lcpDeltaMs: number; inpDeltaMs: number
  detectedAt: string; hypothesis: string
}

export interface LogDTO {
  id: string; ts: string; level: string; message: string
  serviceSlug: string; envName: string; requestId?: string | null; traceId?: string | null
}

export interface TraceDTO {
  traceId: string; spans: { serviceKey: string; operation: string; startOffsetMs: number; durationMs: number; status: string }[]
}

export interface SecurityDTO {
  score: number
  bySeverity: { severity: string; count: number }[]
  vulnerabilities: { id: string; cve: string; pkg: string; version: string; severity: string; cvss: number; status: string; description: string; serviceSlug?: string | null; discoveredAt: string }[]
  events: { id: string; kind: string; severity: string; message: string; actor?: string | null; at: string }[]
}

export interface ProductivityDTO {
  range: string
  stats: { date: string; deployments: number; failed: number; leadTime: number; cfr: number; mttr: number; prs: number; availability: number }[]
  summary: { deployments: number; leadTime: number; cfr: number; mttr: number; deltas: { deployments: number; leadTime: number; cfr: number; mttr: number } }
}

export interface ArchitectureDTO {
  nodes: { key: string; label: string; kind: string; serviceSlug?: string | null; tech?: string | null; x: number; y: number; status?: ServiceStatus }[]
  edges: { fromKey: string; toKey: string; label?: string | null; kind: string }[]
}

export interface AiToolStep { tool: string; summary: string }
export interface AiChatResponse {
  answer: string
  toolTrace: AiToolStep[]
  confidence: number
  sources: string[]
  suggestedActions: { action: string; label: string }[]
  conversationId: string
}
