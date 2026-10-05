'use client'
// NEXUS — single-entry application shell with a client-side view router.
// Navigation is state-based rather than route-based; see ADR-001.
import { Suspense } from 'react'
import { AppProviders } from '@/providers/app-providers'
import { useAppStore, type ViewKey } from '@/stores/app-store'
import { AppShell } from '@/components/shell/app-shell'
import { CommandPalette } from '@/components/shell/command-palette'
import { useBootstrap } from '@/features/use-platform'
import { OverviewView } from '@/features/overview/overview-view'
import { ServicesView, ServiceDetailView } from '@/features/services/services-views'
import { DeploymentsView, DeploymentDetailView } from '@/features/deployments/deployments-views'
import { ObservabilityView } from '@/features/observability/observability-view'
import { PerformanceView } from '@/features/performance/performance-view'
import { IncidentsView, IncidentDetailView } from '@/features/incidents/incidents-views'
import { FlagsView } from '@/features/flags/flags-view'
import { ArchitectureView } from '@/features/architecture/architecture-view'
import { AssistantView } from '@/features/assistant/assistant-view'
import { DesignSystemView } from '@/features/design-system/design-system-view'
import { SecurityView, ProductivityView } from '@/features/security/security-productivity-views'
import { RecruiterView, CaseStudyView, TechnicalView, AdrView } from '@/features/company/company-views'
import { Skeleton } from '@/components/ui/skeleton'

const ViewRouter = () => {
  const { view, params } = useAppStore()
  switch (view) {
    case 'overview': return <OverviewView />
    case 'services': return <ServicesView />
    case 'service': return params.slug ? <ServiceDetailView slug={params.slug} /> : <ServicesView />
    case 'deployments': return <DeploymentsView />
    case 'deployment': return params.ref ? <DeploymentDetailView ref_={params.ref} /> : <DeploymentsView />
    case 'observability': return <ObservabilityView />
    case 'performance': return <PerformanceView />
    case 'incidents': return <IncidentsView />
    case 'incident': return params.ref ? <IncidentDetailView ref_={params.ref} /> : <IncidentsView />
    case 'flags': return <FlagsView />
    case 'architecture': return <ArchitectureView />
    case 'assistant': return <AssistantView />
    case 'design-system': return <DesignSystemView />
    case 'security': return <SecurityView />
    case 'productivity': return <ProductivityView />
    case 'recruiter': return <RecruiterView />
    case 'case-study': return <CaseStudyView />
    case 'technical': return <TechnicalView />
    case 'adr': return <AdrView docId={params.docId} />
    default: return <OverviewView />
  }
}

function BootGate({ children }: { children: React.ReactNode }) {
  const { data, isError, refetch, isFetching } = useBootstrap()
  if (isError) {
    return (
      <div className="flex h-dvh flex-col items-center justify-center gap-3 p-6 text-center">
        <div className="text-sm font-semibold">Platform API unreachable</div>
        <p className="max-w-sm text-xs text-muted-foreground">
          The NEXUS API did not respond. Check that the dev server is running and the database is seeded
          (<code className="rounded bg-muted px-1 font-mono">npm run db:seed</code>).
        </p>
        <button
          onClick={() => refetch()}
          className="rounded-md bg-[var(--primary)] px-3.5 py-1.5 text-xs font-medium text-[var(--primary-foreground)]"
        >
          {isFetching ? 'Retrying…' : 'Retry connection'}
        </button>
      </div>
    )
  }
  if (!data) {
    return (
      <div className="flex h-dvh items-center justify-center bg-background">
        <div className="w-64 space-y-3">
          <div className="flex items-center justify-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[var(--primary)] font-mono text-sm font-bold text-[var(--primary-foreground)]">N</div>
            <span className="text-sm font-semibold tracking-tight">NEXUS</span>
          </div>
          <Skeleton className="h-2 w-full" />
          <p className="text-center text-[11px] text-muted-foreground">Connecting to your engineering control plane…</p>
        </div>
      </div>
    )
  }
  return <>{children}</>
}

export default function NexusApp() {
  return (
    <AppProviders>
      <BootGate>
        <AppShell>
          <Suspense fallback={<Skeleton className="h-96" />}>
            <ViewRouter />
          </Suspense>
          <CommandPalette />
        </AppShell>
      </BootGate>
    </AppProviders>
  )
}
