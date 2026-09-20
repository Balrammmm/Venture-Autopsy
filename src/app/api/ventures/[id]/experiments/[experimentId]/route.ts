import { z } from 'zod'
import { db } from '@/lib/db'
import { requireVenture } from '@/lib/auth'
import { handle, ok, fail, parseData } from '@/lib/api'
import { readJson } from '@/lib/limits'

const Patch = z.object({
  name: z.string().min(2).max(160).optional(),
  kind: z.enum(['interview', 'fake_door', 'landing_page', 'concierge', 'survey', 'prototype']).optional(),
  hypothesis: z.string().max(1200).optional(),
  method: z.string().max(4000).optional(),
  script: z.array(z.string()).max(30).optional(),
  successThreshold: z.string().max(600).optional(),
  failThreshold: z.string().max(600).optional(),
  sampleSize: z.string().max(80).optional(),
  duration: z.string().max(80).optional(),
  cost: z.string().max(80).optional(),
  status: z.enum(['planned', 'running', 'passed', 'failed', 'inconclusive']).optional(),
  result: z.string().max(8000).optional(),
  evidenceUrl: z.string().url('That does not look like a URL.').optional().or(z.literal('')),
  assumptionId: z.string().nullable().optional(),
})

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string; experimentId: string }> }) {
  try {
    const { id, experimentId } = await ctx.params
    await requireVenture(id)
    const body = Patch.parse(await readJson(req))

    const existing = await db.experiment.findFirst({ where: { id: experimentId, ventureId: id } })
    if (!existing) {
      const e = new Error('Experiment not found')
      e.name = 'NotFound'
      throw e
    }

    const assumptionId = body.assumptionId !== undefined ? body.assumptionId : existing.assumptionId
    if (assumptionId && !await db.assumption.findFirst({ where: { id: assumptionId, ventureId: id } })) return fail('The linked assumption does not belong to this venture.', 422)
    const updated = await db.$transaction(async tx => {
      const row = await tx.experiment.update({ where: { id: experimentId }, data: { ...body, script: body.script ? JSON.stringify(body.script) : undefined, evidenceUrl: body.evidenceUrl === '' ? null : body.evidenceUrl } })
      if (body.status && assumptionId) {
        const status: Record<string, string> = { passed: 'supported', failed: 'refuted', running: 'testing', inconclusive: 'testing', planned: 'untested' }
        await tx.assumption.update({ where: { id: assumptionId }, data: { status: status[body.status] } })
      }
      return row
    })

    return ok({ experiment: { ...updated, script: parseData<string[]>(updated.script ?? '[]', []) } })
  } catch (err) {
    return handle(err)
  }
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string; experimentId: string }> }) {
  try {
    const { id, experimentId } = await ctx.params
    await requireVenture(id)
    await db.experiment.deleteMany({ where: { id: experimentId, ventureId: id } })
    return ok({ deleted: experimentId })
  } catch (err) {
    return handle(err)
  }
}
