import { saveAnalysisVersion } from '@/lib/save-analysis'
import { validatedSections } from '@/lib/validate-analysis'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireVenture } from '@/lib/auth'
import { handle, ok, fail, parseData } from '@/lib/api'
import { BURST, burst, readJson, spendModelCall } from '@/lib/limits'
import { evidenceBlock, founderBlock, regenerateSection } from '@/lib/gemini'
import { SECTION_KEYS } from '@/lib/atlas-types'

export const maxDuration = 90

const Body = z.object({ instruction: z.string().max(2000).optional() })
const Put = z.object({ data: z.unknown() })

function assertSection(section: string) {
  if (!(SECTION_KEYS as readonly string[]).includes(section)) {
    const e = new Error('Unknown section')
    e.name = 'NotFound'
    throw e
  }
}

function sourcesFor(sources: { id: string; kind: string; title: string; url: string | null; snippet: string; evidence: string }[]) {
  return evidenceBlock(
    sources.map((s) => ({
      id: s.id.slice(-6),
      kind: s.kind,
      title: s.title,
      url: s.url,
      snippet: s.snippet,
      evidence: s.evidence,
    })),
  )
}

/** Regenerate one section. Earlier versions are retained, never overwritten. */
export async function POST(req: Request, ctx: { params: Promise<{ id: string; section: string }> }) {
  try {
    const { id, section } = await ctx.params
    assertSection(section)
    const { user, venture } = await requireVenture(id)
    const body = Body.parse(await readJson(req))

    // Regenerating one section is a model call like any other.
    burst(`section:${user.id}`, BURST.model)
    await spendModelCall(user.id)

    const [sources, current, genome, verdictRow] = await Promise.all([
      db.researchSource.findMany({ where: { ventureId: id } }),
      db.analysis.findFirst({ where: { ventureId: id, section, isCurrent: true } }),
      db.analysis.findFirst({ where: { ventureId: id, section: 'genome', isCurrent: true } }),
      db.analysis.findFirst({ where: { ventureId: id, section: 'verdict', isCurrent: true } }),
    ])

    const context = JSON.stringify({
      genome: genome ? parseData(genome.data, null) : null,
      verdict: verdictRow ? parseData(verdictRow.data, null) : null,
    })

    const data = await regenerateSection({
      section,
      idea: venture.rawIdea,
      founder: founderBlock(user),
      evidence: sourcesFor(sources),
      context,
      instruction: body.instruction,
    })

    const evidence = sources.some((s) => s.evidence === 'sourced')
      ? 'sourced'
      : sources.length
        ? 'user_provided'
        : 'hypothesis'

    const created = await saveAnalysisVersion(id, section, data, evidence, process.env.GEMINI_MODEL || 'gemini-2.5-flash')

    return ok({ section, data, version: created.version, evidence })
  } catch (err) {
    return handle(err)
  }
}

/** Save a hand edit of a section as a new version. */
export async function PUT(req: Request, ctx: { params: Promise<{ id: string; section: string }> }) {
  try {
    const { id, section } = await ctx.params
    assertSection(section)
    await requireVenture(id)
    const supplied = Put.parse(await readJson(req))
    const data = validatedSections[section].parse(supplied.data)
    if (data === null || data === undefined) return fail('No section data supplied.', 422)

    const current = await db.analysis.findFirst({ where: { ventureId: id, section, isCurrent: true } })
    const created = await saveAnalysisVersion(id, section, data, current?.evidence ?? 'hypothesis', 'founder-edit')
    return ok({ section, data, version: created.version })
  } catch (err) {
    return handle(err)
  }
}
