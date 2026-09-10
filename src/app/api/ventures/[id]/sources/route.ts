import { z } from 'zod'
import { db } from '@/lib/db'
import { requireVenture } from '@/lib/auth'
import { handle, ok } from '@/lib/api'
import { readJson } from '@/lib/limits'

const Create = z.object({
  kind: z.enum(['url', 'competitor', 'review', 'interview', 'survey', 'note']),
  title: z.string().min(1, 'Give this a label.').max(200),
  url: z.string().url('That does not look like a URL.').optional().or(z.literal('')),
  snippet: z.string().min(1, 'Paste what you actually found.').max(20000),
})

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params
    await requireVenture(id)
    const sources = await db.researchSource.findMany({ where: { ventureId: id }, orderBy: { createdAt: 'desc' } })
    return ok({ sources })
  } catch (err) {
    return handle(err)
  }
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params
    await requireVenture(id)
    const body = Create.parse(await readJson(req))
    const source = await db.researchSource.create({
      data: {
        ventureId: id,
        kind: body.kind,
        title: body.title,
        url: body.url || null,
        snippet: body.snippet,
        // A pasted URL is still the founder's evidence, not a retrieved source.
        evidence: 'user_provided',
      },
    })
    return ok({ source }, 201)
  } catch (err) {
    return handle(err)
  }
}
