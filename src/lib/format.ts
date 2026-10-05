// Presentation formatters (client-safe)
export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 30) return `${d}d ago`
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function clockTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export function shortSha(sha: string): string {
  return sha.slice(0, 7)
}

export function duration(ms?: number | null): string {
  if (ms == null) return '—'
  if (ms < 1000) return `${Math.round(ms)}ms`
  const s = ms / 1000
  if (s < 60) return `${s.toFixed(1)}s`
  const m = Math.floor(s / 60)
  return `${m}m ${Math.round(s % 60)}s`
}

export function kb(n?: number | null): string {
  if (n == null) return '—'
  if (Math.abs(n) >= 1024) return `${(n / 1024).toFixed(2)}MB`
  return `${Math.round(n)}KB`
}

export function deltaKb(n?: number | null): string {
  if (n == null) return '—'
  return `${n > 0 ? '+' : ''}${Math.round(n)}KB`
}

export function pct(n?: number | null, digits = 1): string {
  if (n == null) return '—'
  return `${n > 0 ? '+' : ''}${n.toFixed(digits)}%`
}

export function ms(n?: number | null): string {
  if (n == null) return '—'
  if (n >= 1000) return `${(n / 1000).toFixed(2)}s`
  return `${Math.round(n)}ms`
}

export function dateShort(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function titleCase(s: string): string {
  return s.replace(/(^|[\s-])\w/g, (c) => c.toUpperCase()).replace(/-/g, ' ')
}
