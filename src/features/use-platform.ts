'use client'
// Platform data hooks — TanStack Query owns all server state (ADR-002).
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { BootstrapDTO } from '@/lib/types'

export function useBootstrap() {
  return useQuery<BootstrapDTO>({
    queryKey: ['bootstrap'],
    queryFn: api.bootstrap,
    staleTime: 15_000,
    refetchInterval: 60_000,
    retry: 3,
    retryDelay: 800,
    refetchOnWindowFocus: true,
  })
}

export function useServices(params?: Record<string, string>) {
  return useQuery({
    queryKey: ['services', params],
    queryFn: () => api.services(params),
  })
}

export function useService(slug?: string) {
  return useQuery({
    queryKey: ['service', slug],
    queryFn: () => api.service(slug!),
    enabled: !!slug,
  })
}

export function useDeployments(params?: Record<string, string>) {
  return useQuery({
    queryKey: ['deployments', params],
    queryFn: () => api.deployments(params),
  })
}

export function useDeployment(ref?: string) {
  return useQuery({
    queryKey: ['deployment', ref],
    queryFn: () => api.deployment(ref!),
    enabled: !!ref,
  })
}

export function useIncidents() {
  return useQuery({ queryKey: ['incidents'], queryFn: () => api.incidents() })
}

export function useIncident(ref?: string) {
  return useQuery({
    queryKey: ['incident', ref],
    queryFn: () => api.incident(ref!),
    enabled: !!ref,
  })
}

export function useFlags() {
  return useQuery({ queryKey: ['flags'], queryFn: api.flags })
}

export function usePerformance() {
  return useQuery({ queryKey: ['performance'], queryFn: api.performance })
}

export function useArchitecture() {
  return useQuery({ queryKey: ['architecture'], queryFn: api.architecture })
}

export function useSecurity() {
  return useQuery({ queryKey: ['security'], queryFn: api.security })
}

export function useProductivity(range: string) {
  return useQuery({ queryKey: ['productivity', range], queryFn: () => api.productivity(range) })
}

export function useObservabilityData(service: string, hours: string) {
  return useQuery({
    queryKey: ['observability', service, hours],
    queryFn: () => api.observability({ service, env: 'production', hours }),
  })
}

export function useLogs(params: Record<string, string>) {
  return useQuery({
    queryKey: ['logs', params],
    queryFn: () => api.logs(params),
    refetchInterval: 15_000,
  })
}

export function useTraces() {
  return useQuery({ queryKey: ['traces'], queryFn: api.traces })
}

export function useAudit() {
  return useQuery({ queryKey: ['audit'], queryFn: api.audit })
}

export function useInvalidatePlatform() {
  const qc = useQueryClient()
  return () => qc.invalidateQueries()
}
