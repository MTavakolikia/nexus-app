// Typed client fetchers. Server state belongs to TanStack Query; these are its loaders.
import type {
  BootstrapDTO, DeploymentDetail, DeploymentSummary, IncidentDetail, IncidentSummary,
  FlagDTO, SecurityDTO, ProductivityDTO, ArchitectureDTO, AiChatResponse,
  PerformanceRouteDTO, RegressionDTO, LogDTO, TraceDTO, SessionUser,
} from './types'

async function get<T>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: 'include' })
  if (!res.ok) throw new Error(`${res.status} ${url}`)
  return res.json() as Promise<T>
}

async function post<T>(url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method: 'POST', credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.error ?? `${res.status}`)
  return json as T
}

async function patch<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: 'PATCH', credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.error ?? `${res.status}`)
  return json as T
}

export const api = {
  bootstrap: () => get<BootstrapDTO>('/api/bootstrap'),
  switchPersona: (email: string) => post<{ session: SessionUser }>('/api/session', { email }),
  deployments: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : ''
    return get<{ deployments: DeploymentSummary[] }>(`/api/deployments${qs}`)
  },
  deployment: (ref: string) => get<DeploymentDetail>(`/api/deployments/${ref}`),
  rollback: (ref: string) => post<{ ref: string; version: string }>(`/api/deployments/${ref}/rollback`),
  createDeployment: (body: { serviceSlug: string; envName: string; version: string; changeSummary?: string }) =>
    post<{ ref: string; id: string }>('/api/deployments', body),
  incidents: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : ''
    return get<{ incidents: IncidentSummary[] }>(`/api/incidents${qs}`)
  },
  incident: (ref: string) => get<IncidentDetail>(`/api/incidents/${ref}`),
  createIncident: (body: { title: string; severity: string; serviceSlugs: string[]; impact?: string; deploymentRef?: string }) =>
    post<{ ref: string }>('/api/incidents', body),
  updateIncident: (ref: string, body: { status?: string; resolution?: string }) => patch<{ ok: boolean }>(`/api/incidents/${ref}`, body),
  generatePostmortem: (ref: string) => post<{ postmortem: NonNullable<IncidentDetail['postmortem']>; regenerated: boolean }>(`/api/incidents/${ref}/postmortem`),
  flags: () => get<{ flags: FlagDTO[] }>('/api/flags'),
  updateFlag: (id: string, body: { enabled?: boolean; rollout?: number; reason?: string }) => patch<{ ok: boolean }>('/api/flags', { id, ...body }),
  observability: (params: Record<string, string>) => get<import('./types').BootstrapDTO | any>(`/api/observability?${new URLSearchParams(params)}`),
  logs: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : ''
    return get<{ logs: LogDTO[]; total: number }>(`/api/logs${qs}`)
  },
  traces: () => get<{ traces: (TraceDTO & { totalMs: number; bottleneck: string })[] }>('/api/traces'),
  performance: () => get<{ routes: PerformanceRouteDTO[]; regressions: RegressionDTO[]; cwv: { lcpP75: number; inpP75: number; clsP75: number; ttfbP75: number; avgScore: number } }>('/api/performance'),
  architecture: () => get<ArchitectureDTO>('/api/architecture'),
  knowledge: (q: string) => get<{ results: { id: string; title: string; type: string; ref?: string; snippet: string; heading?: string; updatedAt: string }[] }>(`/api/knowledge?q=${encodeURIComponent(q)}`),
  security: () => get<SecurityDTO>('/api/security'),
  audit: () => get<{ logs: { id: string; userName: string; action: string; targetType: string; targetId?: string; detail?: string; at: string }[] }>('/api/audit'),
  productivity: (range: string) => get<ProductivityDTO>(`/api/productivity?range=${range}`),
  aiChat: (message: string, conversationId?: string) => post<AiChatResponse & { provider?: string }>('/api/ai/chat', { message, conversationId }),
  service: (slug: string) => get<any>(`/api/services/${slug}`),
  services: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : ''
    return get<{ services: any[] }>(`/api/services${qs}`)
  },
}
