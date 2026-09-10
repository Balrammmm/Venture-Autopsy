import { db } from '@/lib/db'
import { requireVenture } from '@/lib/auth'
import { handle, ok } from '@/lib/api'
import { BURST, burst, spendModelCall } from '@/lib/limits'
import { runResearchPass } from '@/lib/gemini'

export const maxDuration = 90

/** Grounded research on demand. Stores only sources that came back with a real URL. */
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params
    const { user, venture } = await requireVenture(id)

    // Grounded search is the most expensive call the product makes.
    burst(`research:${user.id}`, BURST.model)
    await spendModelCall(user.id)

    const { findings, summary, grounded } = await runResearchPass(venture.rawIdea)

    let added = 0
    for (const f of findings) {
      const existing = await db.researchSource.findFirst({ where: { ventureId: id, url: f.url } })
      if (existing) continue
      await db.researchSource.create({
        data: {
          ventureId: id,
          kind: 'grounded',
          title: f.title,
          url: f.url,
          snippet: f.snippet,
          evidence: 'sourced',
          retrievedAt: new Date(f.retrievedAt),
        },
      })
      added += 1
    }

    const sources = await db.researchSource.findMany({ where: { ventureId: id }, orderBy: { createdAt: 'desc' } })
    return ok({ added, grounded, summary, sources })
  } catch (err) {
    return handle(err)
  }
}
