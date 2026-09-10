import { z } from 'zod'
import { db } from '@/lib/db'
import { requireVenture } from '@/lib/auth'
import { handle, ok } from '@/lib/api'
import { readJson } from '@/lib/limits'

const Patch = z.object({
  claim: z.string().min(5).max(600).optional(),
  category: z.string().max(60).optional(),
  impact: z.number().int().min(1).max(5).optional(),
  uncertainty: z.number().int().min(1).max(5).optional(),
  breaksIfFalse: z.string().max(1200).optional(),
  proofNeeded: z.string().max(1200).optional(),
  cheapestTest: z.string().max(1200).optional(),
  testCost: z.string().max(80).optional(),
  testDuration: z.string().max(80).optional(),
  status: z.enum(['untested', 'testing', 'supported', 'refuted']).optional(),
  notes: z.string().max(4000).optional(),
})

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string; assumptionId: string }> }) {
  try {
    const { id, assumptionId } = await ctx.params
    await requireVenture(id)
    const body = Patch.parse(await readJson(req))

    const existing = await db.assumption.findFirst({ where: { id: assumptionId, ventureId: id } })
    if (!existing) {
      const e = new Error('Assumption not found')
      e.name = 'NotFound'
      throw e
    }

    // Keep the terrain position in step when impact or uncertainty change.
    const impact = body.impact ?? existing.impact
    const uncertainty = body.uncertainty ?? existing.uncertainty

    const assumption = await db.assumption.update({
      where: { id: assumptionId },
      data: {
        ...body,
        x: 0.12 + ((uncertainty - 1) / 4) * 0.76,
        y: 0.12 + ((5 - impact) / 4) * 0.76,
      },
    })
    return ok({ assumption })
  } catch (err) {
    return handle(err)
  }
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string; assumptionId: string }> }) {
  try {
    const { id, assumptionId } = await ctx.params
    await requireVenture(id)
    await db.assumption.deleteMany({ where: { id: assumptionId, ventureId: id } })
    return ok({ deleted: assumptionId })
  } catch (err) {
    return handle(err)
  }
}
