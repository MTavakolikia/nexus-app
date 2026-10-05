'use client'
// App-wide UI + navigation state (ADR-003). Server data NEVER lives here.
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ViewKey =
  | 'overview' | 'services' | 'service' | 'deployments' | 'deployment'
  | 'observability' | 'performance' | 'incidents' | 'incident'
  | 'flags' | 'architecture' | 'assistant' | 'design-system'
  | 'security' | 'productivity' | 'recruiter' | 'case-study' | 'technical' | 'adr'

export interface ViewParams {
  slug?: string      // service slug
  ref?: string       // deployment ref or incident ref
  tab?: string
  docId?: string
}

interface AppState {
  view: ViewKey
  params: ViewParams
  sidebarCollapsed: boolean
  mobileNavOpen: boolean
  paletteOpen: boolean
  density: 'comfortable' | 'compact'
  envFilter: string
  reducedMotion: boolean
  deployDialogOpen: boolean
  incidentDialogOpen: boolean
  navigate: (view: ViewKey, params?: ViewParams) => void
  setPaletteOpen: (open: boolean) => void
  toggleSidebar: () => void
  setMobileNavOpen: (open: boolean) => void
  setDensity: (d: 'comfortable' | 'compact') => void
  setEnvFilter: (e: string) => void
  setReducedMotion: (v: boolean) => void
  setDeployDialogOpen: (open: boolean) => void
  setIncidentDialogOpen: (open: boolean) => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      view: 'overview',
      params: {},
      sidebarCollapsed: false,
      mobileNavOpen: false,
      paletteOpen: false,
      density: 'comfortable',
      envFilter: 'production',
      reducedMotion: false,
      navigate: (view, params = {}) => {
        set({ view, params, mobileNavOpen: false, paletteOpen: false })
        if (typeof window !== 'undefined') window.scrollTo({ top: 0 })
      },
      setPaletteOpen: (paletteOpen) => set({ paletteOpen }),
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setMobileNavOpen: (mobileNavOpen) => set({ mobileNavOpen }),
      setDensity: (density) => set({ density }),
      setEnvFilter: (envFilter) => set({ envFilter }),
      setReducedMotion: (reducedMotion) => set({ reducedMotion }),
      deployDialogOpen: false,
      incidentDialogOpen: false,
      setDeployDialogOpen: (deployDialogOpen) => set({ deployDialogOpen }),
      setIncidentDialogOpen: (incidentDialogOpen) => set({ incidentDialogOpen }),
    }),
    {
      name: 'nexus-ui',
      partialize: (s) => ({
        view: s.view,
        params: s.params,
        sidebarCollapsed: s.sidebarCollapsed,
        density: s.density,
        envFilter: s.envFilter,
        reducedMotion: s.reducedMotion,
      }),
    },
  ),
)
