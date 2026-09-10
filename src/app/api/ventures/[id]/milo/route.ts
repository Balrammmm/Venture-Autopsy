import { z } from 'zod'
import { db } from '@/lib/db'
import { requireVenture } from '@/lib/auth'
import { handle, ok, fail, parseData } from '@/lib/api'
import { BURST, burst, readJson, spendModelCall } from '@/lib/limits'
import { MILO_ACTIONS, askMilo, evidenceBlock, founderBlock } from '@/lib/gemini'

export const maxDuration = 60

const Body = z.object({
  action: z.string().optional(),
  prompt: z.string().max(2000).optional(),
  context: z.string().max(200).optional(),
})

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params
    await requireVenture(id)
    const messages = await db.chatMessage.findMany({ where: { ventureId: id }, orderBy: { createdAt: 'asc' } })
    return ok({ messages })
  } catch (err) {
    return handle(err)
  }
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params
    const { user, venture } = await requireVenture(id)
    const body = Body.parse(await readJson(req))

    // Milo calls the model on every turn.
    burst(`milo:${user.id}`, BURST.model)
    await spendModelCall(user.id)

    const preset = body.action ? MILO_ACTIONS[body.action as keyof typeof MILO_ACTIONS] : undefined
    const prompt = preset || body.prompt?.trim()
    if (!prompt) return fail('Nothing to ask.', 422)

    const [analyses, assumptions, sources, recent] = await Promise.all([
      db.analysis.findMany({ where: { ventureId: id, isCurrent: true } }),
      db.assumption.findMany({
        where: { ventureId: id },
        orderBy: [{ impact: 'desc' }, { uncertainty: 'desc' }],
        take: 6,
      }),
      db.researchSource.findMany({ where: { ventureId: id }, take: 8 }),
      db.chatMessage.findMany({ where: { ventureId: id }, orderBy: { createdAt: 'desc' }, take: 6 }),
    ])

    const atlas: Record<string, unknown> = { idea: venture.rawIdea, title: venture.title }
    for (const a of analyses) atlas[a.section] = parseData(a.data, null)
    atlas.assumptions = assumptions.map((a) => ({
      claim: a.claim,
      impact: a.impact,
      uncertainty: a.uncertainty,
      status: a.status,
      cheapestTest: a.cheapestTest,
    }))

    const answer = await askMilo({
      prompt,
      founder: founderBlock(user),
      evidence: evidenceBlock(
        sources.map((s) => ({
          id: s.id.slice(-6),
          kind: s.kind,
          title: s.title,
          url: s.url,
          snippet: s.snippet,
          evidence: s.evidence,
        })),
      ),
      atlas: JSON.stringify(atlas),
      context: body.context,
      history: recent.reverse().map((m) => ({ role: m.role, content: m.content })),
    })

    // Store both sides so the Founder Room survives a reload.
    const label = body.action ? body.action : prompt
    await db.chatMessage.create({
      data: { ventureId: id, role: 'founder', content: label, context: body.context, action: body.action },
    })
    const message = await db.chatMessage.create({
      data: { ventureId: id, role: 'milo', content: answer, context: body.context, action: body.action },
    })

    return ok({ message })
  } catch (err) {
    return handle(err)
  }
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params
    await requireVenture(id)
    await db.chatMessage.deleteMany({ where: { ventureId: id } })
    return ok({ cleared: true })
  } catch (err) {
    return handle(err)
  }
}
