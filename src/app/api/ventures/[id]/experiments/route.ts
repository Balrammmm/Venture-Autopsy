import { z } from 'zod'
import { db } from '@/lib/db'
import { requireVenture } from '@/lib/auth'
import { handle, ok, fail, parseData } from '@/lib/api'
import { readJson } from '@/lib/limits'

const Create = z.object({
  name: z.string().min(2, 'Name the experiment.').max(160),
  kind: z.enum(['interview', 'fake_door', 'landing_page', 'concierge', 'survey', 'prototype']).default('interview'),
  hypothesis: z.string().min(5, 'State what you expect to happen.').max(1200),
  method: z.string().max(4000).default(''),
  script: z.array(z.string()).max(30).default([]),
  successThreshold: z.string().max(600).default(''),
  failThreshold: z.string().max(600).default(''),
  sampleSize: z.string().max(80).optional(),
  duration: z.string().max(80).optional(),
  cost: z.string().max(80).optional(),
  assumptionId: z.string().optional().nullable(),
})

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params
    await requireVenture(id)
    const rows = await db.experiment.findMany({ where: { ventureId: id }, orderBy: { createdAt: 'asc' } })
    return ok({ experiments: rows.map((e) => ({ ...e, script: parseData<string[]>(e.script ?? '[]', []) })) })
  } catch (err) {
    return handle(err)
  }
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params
    await requireVenture(id)
    const body = Create.parse(await readJson(req))
    if (body.assumptionId && !await db.assumption.findFirst({ where: { id: body.assumptionId, ventureId: id } })) return fail('The linked assumption does not belong to this venture.', 422)
    const created = await db.experiment.create({
      data: { ...body, ventureId: id, script: JSON.stringify(body.script), assumptionId: body.assumptionId || null },
    })
    return ok({ experiment: { ...created, script: body.script } }, 201)
  } catch (err) {
    return handle(err)
  }
}
