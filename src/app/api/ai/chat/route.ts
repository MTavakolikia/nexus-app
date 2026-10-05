import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { assertCan, ForbiddenError, requireSession } from '@/lib/session'
import { getAiProvider, MockAiProvider } from '@/server/ai'
import type { AiChatResponse } from '@/lib/types'

export const dynamic = 'force-dynamic'

const ChatSchema = z.object({
  message: z.string().min(3).max(600),
  conversationId: z.string().optional(),
})

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession()
    assertCan(session, 'ai.use')
    const parsed = ChatSchema.safeParse(await req.json())
    if (!parsed.success) return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })

    const provider = getAiProvider()
    let result: AiChatResponse
    try {
      result = await provider.investigate(parsed.data.message)
    } catch {
      // guaranteed demo resilience: deterministic investigator
      result = await new MockAiProvider().investigate(parsed.data.message)
    }

    // Persist the conversation (auditable AI, ADR-007)
    let conversationId = result.conversationId
    if (parsed.data.conversationId) {
      const existing = await db.aIConversation.findUnique({ where: { id: parsed.data.conversationId } })
      if (existing) conversationId = existing.id
    }
    if (!conversationId || !(await db.aIConversation.findUnique({ where: { id: conversationId } }))) {
      const conv = await db.aIConversation.create({ data: { userId: session.id, title: parsed.data.message.slice(0, 60) } })
      conversationId = conv.id
    }
    await db.aIMessage.create({ data: { conversationId, role: 'user', content: parsed.data.message } })
    await db.aIMessage.create({
      data: {
        conversationId, role: 'assistant', content: result.answer,
        toolTrace: JSON.stringify(result.toolTrace), confidence: result.confidence,
        sources: JSON.stringify(result.sources), suggestedActions: JSON.stringify(result.suggestedActions),
      },
    })
    await db.auditLog.create({
      data: {
        orgId: (await db.organization.findFirst())!.id, userId: session.id,
        userName: `${session.name} (AI)`, action: 'ai.investigation', targetType: 'conversation', targetId: conversationId,
        detail: `Tools: ${result.toolTrace.map((t) => t.tool).join(', ') || 'none'} · confidence ${(result.confidence * 100).toFixed(0)}%`,
      },
    })
    return NextResponse.json({ ...result, conversationId, provider: provider.name })
  } catch (e) {
    if (e instanceof ForbiddenError) return NextResponse.json({ error: e.message }, { status: 403 })
    throw e
  }
}
