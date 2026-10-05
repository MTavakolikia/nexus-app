'use client'
// Architecture Explorer: interactive service topology with health, focus and blast radius.
import { useEffect, useMemo, useState } from 'react'
import { ReactFlow, Background, Controls, MarkerType, type Edge, type Node, useEdgesState, useNodesState, Handle, Position } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useArchitecture } from '@/features/use-platform'
import { useAppStore } from '@/stores/app-store'
import { PageHeader, SectionTitle, StatusBadge } from '@/components/shared/kit'
import { Skeleton } from '@/components/ui/skeleton'
import { Network, Layers } from 'lucide-react'
import { cn } from '@/lib/utils'


const KIND_STYLES: Record<string, { bg: string; border: string; icon: string }> = {
  frontend: { bg: 'color-mix(in oklch, var(--chart-1) 16%, var(--card))', border: 'var(--chart-1)', icon: '▲' },
  gateway: { bg: 'color-mix(in oklch, var(--chart-5) 16%, var(--card))', border: 'var(--chart-5)', icon: '⇄' },
  service: { bg: 'color-mix(in oklch, var(--chart-2) 14%, var(--card))', border: 'var(--chart-2)', icon: '⚙' },
  data: { bg: 'color-mix(in oklch, var(--chart-3) 14%, var(--card))', border: 'var(--chart-3)', icon: '▤' },
  external: { bg: 'color-mix(in oklch, var(--muted-foreground) 12%, var(--card))', border: 'var(--muted-foreground)', icon: '◈' },
  infra: { bg: 'color-mix(in oklch, var(--info) 14%, var(--card))', border: 'var(--info)', icon: '☁' },
}

type FlowNodeData = { label: string; kind: string; tech?: string | null; status?: string; serviceSlug?: string | null; dim: boolean; focused: boolean }
function NexusNode({ data }: { data: FlowNodeData }) {
  const style = KIND_STYLES[data.kind] ?? KIND_STYLES.service
  const navigate = useAppStore.getState().navigate
  return (
    <button
      onClick={() => data.serviceSlug && navigate('service', { slug: data.serviceSlug })}
      className={cn('h-auto w-36 cursor-pointer rounded-lg border-2 p-2.5 text-left transition-all duration-300',
        data.dim && 'opacity-25 saturate-0', data.focused && 'ring-2 ring-[var(--primary)] ring-offset-2 ring-offset-[var(--background)]')}
      style={{ background: style.bg, borderColor: style.border }}
      aria-label={`${data.label} — open service`}
    >
      <Handle type="target" position={Position.Left} className="!border-none !bg-transparent" />
      <div className="flex items-center gap-1.5">
        <span className="text-[10px]" style={{ color: style.border }}>{style.icon}</span>
        <span className="truncate font-mono text-[11px] font-semibold leading-tight">{data.label}</span>
      </div>
      {data.tech && <div className="mt-1 truncate text-[9px] leading-tight text-muted-foreground">{data.tech}</div>}
      {data.status && data.status !== 'unknown' && (
        <div className="mt-1.5">
          <StatusBadge status={data.status} live className="!px-1.5 !py-0 !text-[9px]" />
        </div>
      )}
      <Handle type="source" position={Position.Right} className="!border-none !bg-transparent" />
    </button>
  )
}

const nodeTypes = { nexus: NexusNode }

export function ArchitectureView() {
  const { data, isLoading } = useArchitecture()
  const [focus, setFocus] = useState<string | null>(null)
  const [kindFilter, setKindFilter] = useState<string>('')

  const { initialNodes, initialEdges } = useMemo(() => {
    if (!data) return { initialNodes: [] as Node[], initialEdges: [] as Edge[] }
    const nodes: Node[] = data.nodes.map((n) => ({
      id: n.key,
      type: 'nexus',
      position: { x: n.x, y: n.y },
      data: { label: n.label, kind: n.kind, tech: n.tech, status: n.status, serviceSlug: n.serviceSlug, dim: false, focused: false } as FlowNodeData,
    }))
    const edges: Edge[] = data.edges.map((e, i) => ({
      id: `e-${i}`, source: e.fromKey, target: e.toKey,
      label: e.label ?? undefined,
      animated: e.kind === 'async',
      style: { stroke: e.kind === 'async' ? 'var(--chart-3)' : 'var(--border)', strokeWidth: 1.5 },
      labelStyle: { fontSize: 9, fill: 'var(--muted-foreground)', backgroundColor: 'var(--card)', padding: 2 },
      labelBgStyle: { fill: 'var(--card)' },
      markerEnd: { type: MarkerType.ArrowClosed, color: e.kind === 'async' ? 'var(--chart-3)' : 'var(--muted-foreground)', width: 14, height: 14 },
    }))
    return { initialNodes: nodes, initialEdges: edges }
  }, [data])

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])

  // Sync graph state when data arrives (useNodesState only initializes once)
  useEffect(() => {
    if (!data) return
    setNodes(initialNodes)
    setEdges(initialEdges)
  }, [data, initialNodes, initialEdges, setNodes, setEdges])

  // Focus highlighting — dim everything outside the blast radius
  useEffect(() => {
    if (!data) return
    const connectedKeys = new Set<string>()
    if (focus) {
      connectedKeys.add(focus)
      for (const e of data.edges) {
        if (e.fromKey === focus) connectedKeys.add(e.toKey)
        if (e.toKey === focus) connectedKeys.add(e.fromKey)
      }
    }
    setNodes((cur) => cur.map((n) => ({
      ...n,
      data: { ...n.data, dim: !!focus && !connectedKeys.has(n.id), focused: n.id === focus },
    })))
    setEdges((cur) => cur.map((e) => ({
      ...e,
      style: { ...e.style, opacity: focus && !(connectedKeys.has(e.source) && connectedKeys.has(e.target)) ? 0.08 : 1, strokeWidth: (e.source === focus || e.target === focus) ? 2.5 : 1.5 },
    })))
  }, [focus, data, setNodes, setEdges])

  if (isLoading || !data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-80" />
        <Skeleton className="h-[540px]" />
      </div>
    )
  }

  const kinds = ['frontend', 'gateway', 'service', 'data', 'external', 'infra']
  const focusNode = data.nodes.find((n) => n.key === focus)
  const neighbours = focus ? data.edges.filter((e) => e.fromKey === focus || e.toKey === focus).map((e) => {
    const other = data.nodes.find((n) => n.key === (e.fromKey === focus ? e.toKey : e.fromKey))
    return { label: e.label ?? 'connects', node: other, dir: e.fromKey === focus ? '→' : '←' }
  }) : []

  return (
    <div className="space-y-4">
      <PageHeader
        icon={<Network className="h-4 w-4" />}
        title="Architecture Explorer"
        description="Live service topology. Click a node to highlight its blast radius — dependencies light up, everything else recedes."
      />

      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-1 flex items-center gap-1 text-[11px] text-muted-foreground"><Layers className="h-3 w-3" /> Layers:</span>
        <button
          onClick={() => setKindFilter('')}
          className={cn('rounded-md border px-2.5 py-1 text-[11px] font-medium capitalize', !kindFilter ? 'border-[var(--primary)]/50 bg-[color-mix(in_oklch,var(--primary)_12%,transparent)]' : 'border-border text-muted-foreground')}
        >
          All
        </button>
        {kinds.map((k) => (
          <button
            key={k}
            onClick={() => setKindFilter(k === kindFilter ? '' : k)}
            className={cn('rounded-md border px-2.5 py-1 text-[11px] font-medium capitalize', kindFilter === k ? 'border-[var(--primary)]/50 bg-[color-mix(in_oklch,var(--primary)_12%,transparent)]' : 'border-border text-muted-foreground')}
          >
            {k}
          </button>
        ))}
        {focus && (
          <button onClick={() => setFocus(null)} className="ml-auto rounded-md border border-border px-2.5 py-1 text-[11px] text-muted-foreground hover:text-foreground">
            Clear focus
          </button>
        )}
      </div>

      <div className="grid gap-4 xl:grid-cols-4">
        <div className="nexus-card relative h-[520px] overflow-hidden xl:col-span-3">
          <style>{`.react-flow__attribution { display: none; }`}</style>
          <ReactFlow
            nodes={nodes.filter((n) => !kindFilter || (n.data as FlowNodeData).kind === kindFilter)}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            nodeTypes={nodeTypes}
            onNodeClick={(_, n) => setFocus(focus === n.id ? null : n.id)}
            onPaneClick={() => setFocus(null)}
            fitView
            minZoom={0.35}
            maxZoom={1.6}
            proOptions={{ hideAttribution: true }}
          >
            <Background color="var(--border)" gap={22} size={1} />
            <Controls showInteractive={false} className="!border-border !bg-card [&>button]:!border-border [&>button]:!bg-card [&>button]:!fill-foreground" />
          </ReactFlow>
        </div>

        <div className="nexus-card h-fit p-4">
          <SectionTitle>{focusNode ? focusNode.label : 'System view'}</SectionTitle>
          {focusNode ? (
            <div className="space-y-3 text-xs">
              <div className="flex items-center gap-2">
                <StatusBadge status={focusNode.status ?? 'unknown'} live />
                <span className="text-muted-foreground">{focusNode.kind}</span>
              </div>
              {focusNode.tech && <div className="font-mono text-[11px] text-muted-foreground">{focusNode.tech}</div>}
              <div>
                <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Connections</div>
                <div className="space-y-1">
                  {neighbours.map((n, i) => (
                    <button
                      key={i}
                      onClick={() => n.node && setFocus(n.node.key)}
                      className="flex w-full items-center gap-2 rounded border border-border/60 px-2 py-1.5 text-left transition-colors hover:border-ring/40"
                    >
                      <span className="font-mono text-[10px] text-[var(--primary)]">{n.dir}</span>
                      <span className="min-w-0 flex-1 truncate">{n.node?.label}</span>
                      <span className="text-[9px] text-muted-foreground">{n.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              {focusNode.serviceSlug && (
                <button
                  onClick={() => useAppStore.getState().navigate('service', { slug: focusNode.serviceSlug! })}
                  className="w-full rounded-md bg-[var(--primary)] py-1.5 text-[11px] font-medium text-[var(--primary-foreground)]"
                >
                  Open service details
                </button>
              )}
            </div>
          ) : (
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              Traffic flows from customers through the edge CDN into the Next.js frontends, then via the Rust API gateway to Go/Kotlin services. Solid edges are synchronous calls; dashed edges are async (analytics beacons, queues). Click any node to inspect its dependency neighbourhood — brown/amber health badges on checkout-web and checkout-api reflect the ongoing incident follow-up.
            </p>
          )}
          <div className="mt-4 border-t border-border/60 pt-3">
            <div className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Legend</div>
            <div className="grid grid-cols-2 gap-1.5 text-[10px] text-muted-foreground">
              {Object.entries(KIND_STYLES).map(([k, v]) => (
                <div key={k} className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-sm" style={{ background: v.bg, border: `1.5px solid ${v.border}` }} />
                  <span className="capitalize">{k}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

