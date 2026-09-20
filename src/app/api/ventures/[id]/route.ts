import { z } from 'zod'
import { db } from '@/lib/db'
import { requireVenture } from '@/lib/auth'
import { handle, ok, parseData } from '@/lib/api'
import { readJson } from '@/lib/limits'
import type { SectionKey } from '@/lib/atlas-types'

const Patch = z.object({
  title: z.string().min(1).max(120).optional(),
  rawIdea: z.string().min(10).max(6000).optional(),
  status: z.enum(['active', 'archived']).optional(),
})

/** The full atlas for one venture: sections, assumptions, experiments, sources. */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params
    const { venture } = await requireVenture(id)

    const [analyses, assumptions, experiments, sources, inputs] = await Promise.all([
      db.analysis.findMany({ where: { ventureId: id, isCurrent: true } }),
      db.assumption.findMany({ where: { ventureId: id }, orderBy: [{ impact: 'desc' }, { uncertainty: 'desc' }] }),
      db.experiment.findMany({ where: { ventureId: id }, orderBy: { createdAt: 'asc' } }),
      db.researchSource.findMany({ where: { ventureId: id }, orderBy: { createdAt: 'desc' } }),
      db.ideaInput.findMany({ where: { ventureId: id }, orderBy: { createdAt: 'asc' } }),
    ])

    const sections: Partial<Record<SectionKey, unknown>> = {}
    const sectionMeta: Record<string, { version: number; evidence: string; model: string; updatedAt: Date }> = {}
    for (const a of analyses) {
      sections[a.section as SectionKey] = parseData(a.data, null)
      sectionMeta[a.section] = { version: a.version, evidence: a.evidence, model: a.model ?? 'unknown', updatedAt: a.createdAt }
    }

    return ok({
      venture,
      sections,
      sectionMeta,
      assumptions,
      experiments: experiments.map((e) => ({ ...e, script: parseData<string[]>(e.script ?? '[]', []) })),
      sources,
      inputs,
    })
  } catch (err) {
    return handle(err)
  }
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params
    await requireVenture(id)
    const body = Patch.parse(await readJson(req))

    const venture = await db.venture.update({ where: { id }, data: body })
    // A rewritten idea is a new input, not an overwrite of history.
    if (body.rawIdea) {
      await db.ideaInput.create({ data: { ventureId: id, kind: 'refinement', content: body.rawIdea } })
    }
    return ok({ venture })
  } catch (err) {
    return handle(err)
  }
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params
    await requireVenture(id)
    // Cascades to analyses, assumptions, experiments, sources and messages.
    await db.venture.delete({ where: { id } })
    return ok({ deleted: id })
  } catch (err) {
    return handle(err)
  }
}
