import { z } from 'zod'
import { db } from '@/lib/db'
import { requireVenture } from '@/lib/auth'
import { handle, ok } from '@/lib/api'
import { readJson } from '@/lib/limits'

const Create = z.object({
  claim: z.string().min(5, 'State the belief as one falsifiable sentence.').max(600),
  category: z.string().max(60).default('Demand'),
  impact: z.number().int().min(1).max(5).default(3),
  uncertainty: z.number().int().min(1).max(5).default(3),
  breaksIfFalse: z.string().max(1200).default(''),
  proofNeeded: z.string().max(1200).default(''),
  cheapestTest: z.string().max(1200).default(''),
  testCost: z.string().max(80).optional(),
  testDuration: z.string().max(80).optional(),
})

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params
    await requireVenture(id)
    const assumptions = await db.assumption.findMany({
      where: { ventureId: id },
      orderBy: [{ impact: 'desc' }, { uncertainty: 'desc' }],
    })
    return ok({ assumptions })
  } catch (err) {
    return handle(err)
  }
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params
    await requireVenture(id)
    const body = Create.parse(await readJson(req))
    const assumption = await db.assumption.create({
      data: {
        ...body,
        ventureId: id,
        x: 0.12 + ((body.uncertainty - 1) / 4) * 0.76,
        y: 0.12 + ((5 - body.impact) / 4) * 0.76,
      },
    })
    return ok({ assumption }, 201)
  } catch (err) {
    return handle(err)
  }
}
