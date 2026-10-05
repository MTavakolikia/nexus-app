'use client'
// Design System Lab: living component gallery, tokens, typography, motion and
// accessibility documentation — a showcase of the platform's design language.
import { useState } from 'react'
import { PageHeader, SectionTitle, StatusBadge, SeverityBadge, ScoreRing, Sparkline, KpiCard, EmptyState } from '@/components/shared/kit'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { Progress } from '@/components/ui/progress'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Palette, Check, Accessibility, Keyboard, Contrast, Focus, Type, Ruler, Layers, Wind, MousePointerClick } from 'lucide-react'
import { useAppStore } from '@/stores/app-store'

export function DesignSystemView() {
  const density = useAppStore((s) => s.density)
  const setDensity = useAppStore((s) => s.setDensity)
  const reduced = useAppStore((s) => s.reducedMotion)
  const setReduced = useAppStore((s) => s.setReducedMotion)

  return (
    <div className="space-y-5">
      <PageHeader
        icon={<Palette className="h-4 w-4" />}
        title="Design System Lab"
        description="The living system behind NEXUS: graphite surfaces, one restrained accent, semantic status colors, Geist typography and honest motion."
      />

      <Tabs defaultValue="components">
        <TabsList className="h-9 bg-muted/50">
          {['components', 'tokens', 'typography', 'accessibility', 'motion'].map((t) => (
            <TabsTrigger key={t} value={t} className="text-xs capitalize">{t}</TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="components" className="mt-4 space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="nexus-card p-5">
              <SectionTitle>Buttons</SectionTitle>
              <div className="flex flex-wrap items-center gap-2">
                <Button size="sm">Primary</Button>
                <Button size="sm" variant="secondary">Secondary</Button>
                <Button size="sm" variant="outline">Outline</Button>
                <Button size="sm" variant="ghost">Ghost</Button>
                <Button size="sm" variant="destructive">Destructive</Button>
                <Button size="sm" disabled>Disabled</Button>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Button size="sm" className="h-8">Default 32px</Button>
                <Button size="sm" className="h-9">Comfortable 36px</Button>
                <Button size="sm" className="h-11">Touch 44px</Button>
              </div>
              <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
                Every interactive element keeps ≥ 44px effective touch target on mobile. Primary buttons use the single teal accent — nothing else in the UI competes with it.
              </p>
            </div>

            <div className="nexus-card p-5">
              <SectionTitle>Status &amp; badges</SectionTitle>
              <div className="flex flex-wrap gap-1.5">
                <StatusBadge status="healthy" live />
                <StatusBadge status="degraded" live />
                <StatusBadge status="down" />
                <StatusBadge status="SUCCESS" />
                <StatusBadge status="FAILED" />
                <StatusBadge status="ROLLED_BACK" />
                <SeverityBadge severity="SEV-1" />
                <SeverityBadge severity="SEV-2" />
                <SeverityBadge severity="SEV-3" />
                <SeverityBadge severity="SEV-4" />
                <Badge>default</Badge>
                <Badge variant="secondary">secondary</Badge>
                <Badge variant="outline" className="font-mono text-[10px]">outline · mono</Badge>
              </div>
              <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
                Status is never color-only: every badge pairs a colored dot or icon with text (WCAG 1.4.1). Live states pulse at 1.8s — noticeable without being noisy.
              </p>
            </div>

            <div className="nexus-card p-5">
              <SectionTitle>Inputs &amp; controls</SectionTitle>
              <div className="grid gap-3 sm:grid-cols-2">
                <Input placeholder="Text input" className="h-9 text-sm" />
                <Input placeholder="Disabled" disabled className="h-9 text-sm" />
                <div className="flex items-center gap-2">
                  <Switch defaultChecked id="ds-sw" />
                  <label htmlFor="ds-sw" className="text-xs">Progressive rollout</label>
                </div>
                <Slider defaultValue={[62]} max={100} step={5} aria-label="Rollout demo" />
              </div>
              <div className="mt-3 space-y-1.5">
                <div className="flex justify-between text-[11px] text-muted-foreground"><span>Migration progress</span><span className="font-mono">72%</span></div>
                <Progress value={72} />
              </div>
            </div>

            <div className="nexus-card p-5">
              <SectionTitle>Data display</SectionTitle>
              <div className="grid grid-cols-2 gap-3">
                <KpiCard label="KPI card" value="99.98%" sub="with tooltip + trend" trend={2.1} trendGood tooltip="KpiCard combines a mono value, trend arrow and an explanatory tooltip — used for every non-obvious metric." />
                <div className="flex items-center justify-center gap-4 rounded-lg border border-border/60 p-3">
                  <ScoreRing value={94} size={64} />
                  <ScoreRing value={78} size={64} />
                  <ScoreRing value={61} size={64} />
                </div>
                <div className="flex items-end gap-3 rounded-lg border border-border/60 p-3">
                  <Sparkline data={[3, 5, 4, 7, 6, 9, 8, 12]} />
                  <Sparkline data={[12, 9, 11, 7, 8, 5, 6, 3]} tone="var(--destructive)" />
                  <Sparkline data={[4, 4, 5, 5, 6, 6, 7, 7]} tone="var(--success)" />
                </div>
                <div className="flex items-center gap-3 rounded-lg border border-border/60 p-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback style={{ background: '#14b8a6' }} className="text-[10px] font-bold text-white">MT</AvatarFallback>
                  </Avatar>
                  <div className="space-y-1">
                    <Skeleton className="h-2.5 w-24" />
                    <Skeleton className="h-2.5 w-16" />
                  </div>
                </div>
              </div>
            </div>

            <div className="nexus-card p-5 lg:col-span-2">
              <SectionTitle>Tables &amp; density</SectionTitle>
              <div className="flex items-center gap-2 pb-2">
                <span className="text-[11px] text-muted-foreground">Density:</span>
                {(['comfortable', 'compact'] as const).map((d) => (
                  <button
                    key={d}
                    onClick={() => setDensity(d)}
                    className={`rounded-md border px-2.5 py-1 text-[11px] font-medium capitalize ${density === d ? 'border-[var(--primary)]/50 bg-[color-mix(in_oklch,var(--primary)_12%,transparent)]' : 'border-border text-muted-foreground'}`}
                  >
                    {d}
                  </button>
                ))}
                {density === 'compact' && <Badge variant="secondary" className="text-[9px]">applies app-wide</Badge>}
              </div>
              <div className="overflow-hidden rounded-lg border border-border/60">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-border/70 bg-muted/40 text-[10px] uppercase tracking-wider text-muted-foreground">
                      <th className="px-3 py-2 font-semibold">Ref</th>
                      <th className="px-3 py-2 font-semibold">Service</th>
                      <th className="px-3 py-2 font-semibold">Status</th>
                      <th className="px-3 py-2 font-semibold">Duration</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {[['DPL-1042', 'checkout-web', 'ROLLED_BACK', '16m'], ['DPL-1041', 'payment-api', 'SUCCESS', '7m'], ['DPL-1040', 'search-service', 'FAILED', '4m']].map((r) => (
                      <tr key={r[0]} className={density === 'compact' ? 'nexus-dense-row' : ''}>
                        <td className="px-3 py-2 font-mono text-[var(--primary)]">{r[0]}</td>
                        <td className="px-3 py-2 font-mono">{r[1]}</td>
                        <td className="px-3 py-2"><StatusBadge status={r[2]} /></td>
                        <td className="px-3 py-2 font-mono text-muted-foreground">{r[3]}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="tokens" className="mt-4 space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="nexus-card p-5">
              <SectionTitle aside={<Layers className="h-3.5 w-3.5 text-muted-foreground" />}>Color tokens</SectionTitle>
              <div className="grid grid-cols-2 gap-2 text-[11px] sm:grid-cols-3">
                {[
                  ['--background', 'canvas'], ['--card', 'surface'], ['--border', 'hairline'],
                  ['--primary', 'accent'], ['--success', 'positive'], ['--warning', 'caution'],
                  ['--destructive', 'critical'], ['--info', 'informational'], ['--muted-foreground', 'secondary text'],
                ].map(([token, name]) => (
                  <div key={token} className="flex items-center gap-2 rounded-md border border-border/60 p-2">
                    <span className="h-6 w-6 shrink-0 rounded border border-border/60" style={{ background: `var(${token})` }} />
                    <div className="min-w-0">
                      <div className="truncate font-medium">{name}</div>
                      <div className="truncate font-mono text-[9px] text-muted-foreground">{token}</div>
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
                One accent (teal ≈ oklch 0.72 0.11 190). Semantic colors come from a restrained enterprise palette; charts reuse the same five token hues so a color always means the same thing.
              </p>
            </div>
            <div className="nexus-card p-5">
              <SectionTitle aside={<Ruler className="h-3.5 w-3.5 text-muted-foreground" />}>Spacing, radius &amp; elevation</SectionTitle>
              <div className="space-y-2.5 text-[11px]">
                {[
                  ['Radius', '0.5rem base; sm/md/lg/xl derived — never arbitrary', 'calc(var(--radius))'],
                  ['Spacing scale', '4px base: p-2/3/4/5/6 for cards and rows', '8 / 12 / 16 / 20 / 24'],
                  ['Elevation', 'flat by default; hairline borders carry hierarchy; shadow only for floating layers', 'shadow-sm → xl'],
                  ['Z-index', 'tokenized: base 0 / sticky 20 / drawer 40 / modal 50 / toast 60', 'never z-[999]'],
                  ['Motion', '150ms micro · 250ms panel · 400ms page; spring for palette/drawers', 'durations + easing'],
                ].map(([name, desc, val]) => (
                  <div key={name} className="flex items-start justify-between gap-3 border-b border-border/40 pb-2 last:border-0">
                    <div><div className="font-medium">{name}</div><div className="mt-0.5 text-muted-foreground">{desc}</div></div>
                    <code className="shrink-0 rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]">{val}</code>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="typography" className="mt-4 space-y-4">
          <div className="nexus-card p-6">
            <SectionTitle aside={<Type className="h-3.5 w-3.5 text-muted-foreground" />}>Geist Sans + Geist Mono</SectionTitle>
            <div className="space-y-4">
              <div><div className="text-2xl font-semibold tracking-tight">Heading — semibold, tracking-tight</div><div className="mt-1 font-mono text-[10px] text-muted-foreground">text-2xl / font-semibold / tracking-tight</div></div>
              <div><div className="text-lg font-semibold tracking-tight">Section title — 18px semibold</div><div className="mt-1 font-mono text-[10px] text-muted-foreground">text-lg / font-semibold</div></div>
              <div><p className="max-w-2xl text-sm leading-relaxed">Body copy sits at 14px with relaxed leading. Dense enterprise data is readable because line length is capped and hierarchy is carried by weight, not size jumps.</p><div className="mt-1 font-mono text-[10px] text-muted-foreground">text-sm / leading-relaxed / max-w-2xl</div></div>
              <div><span className="font-mono text-xs">DPL-1042 · req_82731 · p95=612ms · v3.18.2</span><div className="mt-1 font-mono text-[10px] text-muted-foreground">Geist Mono — every technical identifier: refs, commits, metrics, logs</div></div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="accessibility" className="mt-4 space-y-4">
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="nexus-card p-5 lg:col-span-1">
              <SectionTitle>Accessibility score</SectionTitle>
              <div className="flex flex-col items-center gap-4 py-2">
                <ScoreRing value={94} size={110} label="axe + manual" />
                <div className="w-full space-y-2 text-xs">
                  {[
                    ['Keyboard navigation', true], ['Focus management', true], ['ARIA semantics', true],
                    ['Contrast (4.5:1 body)', true], ['Forms & labels', false], ['Screen reader landmarks', true],
                  ].map(([label, ok]) => (
                    <div key={label as string} className="flex items-center gap-2">
                      {ok ? <Check className="h-3.5 w-3.5 text-[var(--success)]" /> : <Accessibility className="h-3.5 w-3.5 text-[var(--warning)]" />}
                      <span>{label}</span>
                      <span className={`ml-auto font-mono text-[10px] ${ok ? 'text-[var(--success)]' : 'text-[var(--warning)]'}`}>{ok ? 'PASS' : 'WARN'}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="nexus-card p-5 lg:col-span-2">
              <SectionTitle>How the product is built accessible</SectionTitle>
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  { icon: Keyboard, title: 'Keyboard-first', body: '⌘K palette, G-then-key navigation, full tab order, visible focus rings via --ring, Escape closes every layer.' },
                  { icon: Contrast, title: 'Color-independent status', body: 'Status pairs icons + text with color. Charts distinguish series with dash patterns as well as hue.' },
                  { icon: Focus, title: 'Focus management', body: 'Dialogs trap focus (Radix), return it on close, and the palette restores it to the previous trigger.' },
                  { icon: MousePointerClick, title: 'Targets & forms', body: '≥ 44px touch targets, explicit labels via htmlFor, aria-current on active nav, aria-live on live pipeline updates.' },
                  { icon: Wind, title: 'Reduced motion', body: 'prefers-reduced-motion is honored globally, and users can force it in preferences — all transitions collapse to 0.01ms.' },
                  { icon: Accessibility, title: 'Automated checks', body: 'axe-core runs against the palette and shell in CI; the abstraction supports Lighthouse + Playwright a11y checks (see ADR-009).' },
                ].map((c) => (
                  <div key={c.title} className="rounded-lg border border-border/60 p-3.5">
                    <div className="flex items-center gap-2 text-xs font-semibold"><c.icon className="h-3.5 w-3.5 text-[var(--primary)]" /> {c.title}</div>
                    <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">{c.body}</p>
                  </div>
                ))}
              </div>
              <div className="mt-3 rounded-lg border border-[color-mix(in_oklch,var(--warning)_40%,transparent)] bg-[color-mix(in_oklch,var(--warning)_7%,transparent)] p-3 text-[11px] leading-relaxed text-[var(--warning)]">
                Known issue: a filter form in the legacy admin surface lacks a programmatic label — medium severity, fix scheduled. Shown here deliberately: an honest a11y center beats a green wall.
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="motion" className="mt-4 space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="nexus-card p-5">
              <SectionTitle>Motion principles</SectionTitle>
              <ul className="space-y-2.5 text-[11px] leading-relaxed text-muted-foreground">
                <li><span className="font-medium text-foreground">Motion communicates state.</span> A pipeline stage turning green means the world changed — the animation is the message, not decoration.</li>
                <li><span className="font-medium text-foreground">Hierarchy through movement.</span> Panels enter after content; the palette scales from its trigger point; lists stagger by 20ms.</li>
                <li><span className="font-medium text-foreground">Restraint.</span> No ambient looping animation except the 1.8s live dot that marks genuinely live state.</li>
                <li><span className="font-medium text-foreground">Reduced motion first.</span> Every animation is wrapped by the global reduced-motion guard — system preference or user toggle.</li>
              </ul>
              <div className="mt-4 flex items-center gap-3 rounded-lg border border-border/60 p-3">
                <Switch checked={reduced} onCheckedChange={setReduced} id="rm" aria-label="Toggle reduced motion" />
                <label htmlFor="rm" className="text-xs">Force reduced motion app-wide</label>
              </div>
            </div>
            <div className="nexus-card p-5">
              <SectionTitle>Durations in use</SectionTitle>
              <div className="space-y-2 text-[11px]">
                {[
                  ['150ms', 'hover, focus, badge transitions', 'var(--success)'],
                  ['200ms', 'sidebar collapse (width), list stagger', 'var(--chart-1)'],
                  ['250ms', 'dialogs, drawers, palette scale-in', 'var(--info)'],
                  ['700ms', 'score ring + health bar value transitions', 'var(--chart-5)'],
                ].map(([d, use, color]) => (
                  <div key={d} className="flex items-center gap-3">
                    <span className="w-12 shrink-0 font-mono font-semibold" style={{ color }}>{d}</span>
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full" style={{ width: `${parseInt(d) / 7}%`, background: color }} />
                    </div>
                    <span className="w-56 shrink-0 text-right text-muted-foreground">{use}</span>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-[11px] leading-relaxed text-muted-foreground">
                Framer Motion is reserved for mount/unmount choreography; CSS transitions handle the rest so the main thread stays free for data.
              </p>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <div className="nexus-card p-5">
        <SectionTitle>Empty state pattern</SectionTitle>
        <EmptyState
          icon={<Palette className="h-5 w-5" />}
          title="Intentional empty states everywhere"
          body="“No data” is never the message. Empty states explain what will appear here, why it might be empty, and offer the next action — the incident list is the reference implementation."
        />
      </div>

      <Tooltip>
        <TooltipTrigger asChild>
          <div className="mx-auto w-fit cursor-help rounded-full border border-border/70 px-4 py-1.5 text-[11px] text-muted-foreground">
            Hover targets everywhere — every non-obvious metric in the product carries a tooltip like this one
          </div>
        </TooltipTrigger>
        <TooltipContent>MTTR — Mean Time To Recovery: average time between detection and service restoration.</TooltipContent>
      </Tooltip>
    </div>
  )
}
