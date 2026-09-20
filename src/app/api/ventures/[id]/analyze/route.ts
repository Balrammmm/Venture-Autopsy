import { z } from 'zod'
import { db } from '@/lib/db'
import { requireVenture } from '@/lib/auth'
import { handle, ok, fail } from '@/lib/api'
import { BURST, burst, readJson, spendModelCall } from '@/lib/limits'
import { evidenceBlock, founderBlock, generateAtlas, runResearchPass } from '@/lib/gemini'
import { SECTION_KEYS } from '@/lib/atlas-types'
import type { AtlasPayload } from '@/lib/atlas-types'

const Body = z.object({ research: z.boolean().optional() })

export const maxDuration = 120

/**
 * Full analysis. Optionally runs a grounded research pass first (grounding and
 * responseSchema cannot be combined in one Gemini call), stores any real sources
 * it returns, then writes every atlas section, assumption and experiment.
 */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  // Only the failure path that actually moved the venture into "analysing" is
  // allowed to move it back; a rate-limited call must not downgrade a venture
  // that is already analysed.
  let marked = false
  let previousStage = "captured"
  try {
    const { user, venture } = await requireVenture(id)
    const body = Body.parse(await readJson(req))
    previousStage = venture.stage
    if (venture.stage === 'analysing') return fail('An investigation is already running.', 409, 'Wait for the current analysis to finish.')
    if (await db.analysis.count({ where: { ventureId: id, isCurrent: true } })) return fail('This venture already has an analysis.', 409, 'Regenerate individual modules to preserve your experiment results and working assumptions.')

    // Burst first, then the daily allowance. Both are charged before the model
    // is called, so a failed generation cannot be used to farm free retries.
    burst(`analyze:${user.id}`, BURST.model)
    await spendModelCall(user.id)
    if (body.research) await spendModelCall(user.id)

    const lock = await db.venture.updateMany({ where: { id, stage: { not: 'analysing' } }, data: { stage: 'analysing' } })
    if (!lock.count) return fail('An investigation is already running.', 409)
    marked = true

    let researchSummary: string | undefined
    let groundedCount = 0

    if (body.research) {
      const { summary, findings } = await runResearchPass(venture.rawIdea)
      researchSummary = summary
      groundedCount = findings.length
      for (const f of findings) {
        // Skip anything already stored for this venture.
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
      }
    }

    const sources = await db.researchSource.findMany({ where: { ventureId: id } })
    const atlas: AtlasPayload = await generateAtlas({
      idea: venture.rawIdea,
      founder: founderBlock(user),
      evidence: evidenceBlock(
        sources.map((s) => ({
          id: s.id.slice(-6),
          kind: s.kind,
          title: s.title,
          url: s.url,
          snippet: s.snippet,
          evidence: s.evidence,
        })),
      ),
      researchSummary,
    })

    const evidenceLabel = sources.some((s) => s.evidence === 'sourced')
      ? 'sourced'
      : sources.length
        ? 'user_provided'
        : 'hypothesis'

    // Replace the previous atlas atomically rather than leaving a half-written one.
    await db.$transaction(async (tx) => {
      await tx.analysis.updateMany({ where: { ventureId: id, isCurrent: true }, data: { isCurrent: false } })
      // Keep any founder-authored working records captured before the first analysis.

      for (const key of SECTION_KEYS) {
        const prior = await tx.analysis.findFirst({
          where: { ventureId: id, section: key },
          orderBy: { version: 'desc' },
        })
        await tx.analysis.create({
          data: {
            ventureId: id,
            section: key,
            data: JSON.stringify(atlas[key]),
            evidence: evidenceLabel,
            version: (prior?.version ?? 0) + 1,
            isCurrent: true,
            model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
          },
        })
      }

      const byClaim: Record<string, string> = {}
      for (const a of atlas.assumptions) {
        const existing = await tx.assumption.findFirst({ where: { ventureId: id, claim: a.claim } })
        if (existing) { byClaim[a.claim] = existing.id; continue }
        const row = await tx.assumption.create({
          data: {
            ventureId: id,
            claim: a.claim,
            category: a.category,
            impact: Math.min(5, Math.max(1, a.impact)),
            uncertainty: Math.min(5, Math.max(1, a.uncertainty)),
            breaksIfFalse: a.breaksIfFalse,
            proofNeeded: a.proofNeeded,
            cheapestTest: a.cheapestTest,
            testCost: a.testCost,
            testDuration: a.testDuration,
            // Deterministic terrain position, stable across visits.
            x: 0.12 + ((a.uncertainty - 1) / 4) * 0.76,
            y: 0.12 + ((5 - a.impact) / 4) * 0.76,
          },
        })
        byClaim[a.claim] = row.id
      }

      for (const e of atlas.experiments) {
        if (await tx.experiment.findFirst({ where: { ventureId: id, name: e.name } })) continue
        await tx.experiment.create({
          data: {
            ventureId: id,
            assumptionId: byClaim[e.assumptionClaim] ?? null,
            name: e.name,
            kind: e.kind,
            hypothesis: e.hypothesis,
            method: e.method,
            script: JSON.stringify(e.script ?? []),
            successThreshold: e.successThreshold,
            failThreshold: e.failThreshold,
            sampleSize: e.sampleSize,
            duration: e.duration,
            cost: e.cost,
          },
        })
      }

      await tx.venture.update({
        where: { id },
        data: {
          title: atlas.title || venture.title,
          stage: 'analysed',
          verdict: atlas.verdict.verdict,
          confidence: atlas.verdict.confidence,
          healthScore: Math.min(100, Math.max(0, atlas.verdict.healthScore)),
          accent: atlas.verdict.verdict === 'High Risk' ? 'ember' : 'lime',
        },
      })
    })

    return ok({ ok: true, ventureId: id, grounded: groundedCount, researched: body.research === true })
  } catch (err) {
    // Never strand a venture in "analysing" — the library would show a spinner forever.
    if (marked) await db.venture.update({ where: { id }, data: { stage: previousStage } }).catch(() => {})
    return handle(err)
  }
}
