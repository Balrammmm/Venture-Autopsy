import { z } from 'zod'
import { db } from '@/lib/db'
import { requireVenture } from '@/lib/auth'
import { handle, ok, fail, parseData } from '@/lib/api'
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
    const body = Body.parse(await req.json().catch(() => ({})))

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

    await db.analysis.updateMany({ where: { ventureId: id, section, isCurrent: true }, data: { isCurrent: false } })
    const created = await db.analysis.create({
      data: {
        ventureId: id,
        section,
        data: JSON.stringify(data),
        evidence,
        version: (current?.version ?? 0) + 1,
        isCurrent: true,
        model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
      },
    })

    // The verdict drives the venture headline state everywhere else in the app.
    if (section === 'verdict') {
      const v = data as { verdict?: string; confidence?: string; healthScore?: number }
      await db.venture.update({
        where: { id },
        data: {
          verdict: v.verdict,
          confidence: v.confidence,
          healthScore: Math.min(100, Math.max(0, v.healthScore ?? venture.healthScore)),
          accent: v.verdict === 'High Risk' ? 'ember' : 'lime',
        },
      })
    }

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
    const { data } = Put.parse(await req.json())
    if (data === null || data === undefined) return fail('No section data supplied.', 422)

    const current = await db.analysis.findFirst({ where: { ventureId: id, section, isCurrent: true } })
    await db.analysis.updateMany({ where: { ventureId: id, section, isCurrent: true }, data: { isCurrent: false } })
    const created = await db.analysis.create({
      data: {
        ventureId: id,
        section,
        data: JSON.stringify(data),
        evidence: current?.evidence ?? 'hypothesis',
        version: (current?.version ?? 0) + 1,
        isCurrent: true,
        model: 'founder-edit',
      },
    })
    return ok({ section, data, version: created.version })
  } catch (err) {
    return handle(err)
  }
}
