// Live deployment simulation engine (MockDeploymentProvider).
// Drives a deployment through its pipeline stages on a timer, persisting each
// transition, so the SSE stream (and poll fallback) emit real state changes.
import { db } from '@/lib/db'

const RUNNING = new Map<string, { timer: NodeJS.Timeout; stageIdx: number }>()
const STAGE_MS = 1700

export interface DeploymentTick {
  ref: string; status: string; stageIdx: number
  stages: { name: string; status: string; durationMs: number | null; position: number }[]
  done: boolean
}

async function snapshot(deploymentId: string): Promise<DeploymentTick | null> {
  const dep = await db.deployment.findUnique({ where: { id: deploymentId }, include: { stages: { orderBy: { position: 'asc' } } } })
  if (!dep) return null
  return {
    ref: dep.ref, status: dep.status, stageIdx: RUNNING.get(deploymentId)?.stageIdx ?? dep.stages.length,
    stages: dep.stages.map((s) => ({ name: s.name, status: s.status, durationMs: s.durationMs, position: s.position })),
    done: !RUNNING.has(deploymentId),
  }
}

/** Advance a deployment by one stage. Returns false when finished. */
async function tick(deploymentId: string): Promise<boolean> {
  const state = RUNNING.get(deploymentId)
  if (!state) return false
  const stages = await db.pipelineStage.findMany({ where: { deploymentId }, orderBy: { position: 'asc' } })
  const next = stages[state.stageIdx]
  if (!next) return finish(deploymentId, 'SUCCESS')

  const now = new Date()
  const dur = 900 + Math.floor(Math.random() * 1400)
  await db.pipelineStage.update({
    where: { id: next.id },
    data: { status: 'PASSED', startedAt: now, finishedAt: new Date(now.getTime() + dur), durationMs: dur },
  })
  state.stageIdx++
  const statusByStage: Record<string, string> = {
    'Install': 'BUILDING', 'Lint': 'BUILDING', 'Typecheck': 'BUILDING',
    'Unit Tests': 'TESTING', 'Integration Tests': 'TESTING', 'E2E Tests': 'TESTING', 'Security Scan': 'TESTING',
    'Build': 'DEPLOYING', 'Deploy': 'DEPLOYING',
  }
  await db.deployment.update({ where: { id: deploymentId }, data: { status: statusByStage[next.name] ?? 'DEPLOYING' } })
  if (state.stageIdx >= stages.length) return finish(deploymentId, 'SUCCESS')
  // mark next as RUNNING
  const upcoming = stages[state.stageIdx]
  if (upcoming) {
    await db.pipelineStage.update({ where: { id: upcoming.id }, data: { status: 'RUNNING', startedAt: new Date() } })
  }
  return true
}

async function finish(deploymentId: string, status: 'SUCCESS' | 'FAILED') {
  clearInterval(RUNNING.get(deploymentId)?.timer)
  RUNNING.delete(deploymentId)
  await db.deployment.update({
    where: { id: deploymentId },
    data: { status, finishedAt: new Date(), durationMs: status === 'SUCCESS' ? 12000 + Math.floor(Math.random() * 6000) : undefined },
  })
  return false
}

export function startSimulation(deploymentId: string): void {
  if (RUNNING.has(deploymentId)) return
  const state = { stageIdx: 0, timer: null as unknown as NodeJS.Timeout }
  RUNNING.set(deploymentId, state)
  const step = async () => {
    try {
      const more = await tick(deploymentId)
      if (!more) return
    } catch {
      await finish(deploymentId, 'FAILED').catch(() => {})
      return
    }
  }
  state.timer = setInterval(step, STAGE_MS)
}

export async function currentSnapshot(deploymentId: string): Promise<DeploymentTick | null> {
  return snapshot(deploymentId)
}

/** Kick a stage to FAILED deterministically (used by failure injection in the demo). */
export function failNextOf(deploymentId: string): void {
  const state = RUNNING.get(deploymentId)
  if (state) state.stageIdx = 999 // finish() on next tick
}
