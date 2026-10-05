import { NextRequest } from 'next/server'
import { currentSnapshot, startSimulation } from '@/server/deploy-engine'

export const dynamic = 'force-dynamic'

// SSE stream of live deployment state (ADR-004). Falls back to polling in the client.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params
  const dep = await import('@/lib/db').then(({ db }) => db.deployment.findUnique({ where: { ref } }))
  if (!dep) return new Response('not found', { status: 404 })
  startSimulation(dep.id)

  const encoder = new TextEncoder()
  let closed = false
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        if (closed) return
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`))
      }
      let ticks = 0
      const timer = setInterval(async () => {
        if (closed) return
        try {
          const snap = await currentSnapshot(dep.id)
          if (!snap) { send('error', { message: 'deployment vanished' }); return cleanup() }
          send('tick', snap)
          if (snap.done || ++ticks > 90) { send('end', snap); cleanup() }
        } catch {
          send('error', { message: 'stream error' })
          cleanup()
        }
      }, 1200)
      const cleanup = () => {
        if (closed) return
        closed = true
        clearInterval(timer)
        try { controller.close() } catch { /* already closed */ }
      }
      // abort on client disconnect
      _req.signal.addEventListener('abort', cleanup)
    },
  })
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  })
}
