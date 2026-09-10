import { z } from 'zod'
import { db } from '@/lib/db'
import { requireUser } from '@/lib/auth'
import { handle, ok } from '@/lib/api'

const Create = z.object({
  rawIdea: z.string().min(40, 'Give the idea at least 40 characters — a fragment produces a generic autopsy.').max(6000),
  title: z.string().max(120).optional(),
})

export async function GET(req: Request) {
  try {
    const user = await requireUser()
    const url = new URL(req.url)
    const status = url.searchParams.get('status') === 'archived' ? 'archived' : 'active'

    const ventures = await db.venture.findMany({
      where: { userId: user.id, status },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        title: true,
        rawIdea: true,
        stage: true,
        status: true,
        verdict: true,
        confidence: true,
        healthScore: true,
        accent: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { assumptions: true, experiments: true, sources: true } },
      },
    })
    return ok({ ventures })
  } catch (err) {
    return handle(err)
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireUser()
    const body = Create.parse(await req.json())

    // A working title until the analysis names it properly.
    const provisional =
      body.title?.trim() ||
      body.rawIdea.trim().split(/\s+/).slice(0, 6).join(' ').replace(/[.,;:]$/, '') ||
      'Untitled venture'

    const venture = await db.venture.create({
      data: {
        userId: user.id,
        title: provisional,
        rawIdea: body.rawIdea.trim(),
        stage: 'captured',
        ideaInputs: { create: { kind: 'idea', content: body.rawIdea.trim() } },
      },
    })
    return ok({ venture }, 201)
  } catch (err) {
    return handle(err)
  }
}
