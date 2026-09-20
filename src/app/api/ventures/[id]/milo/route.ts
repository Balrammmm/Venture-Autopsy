import { z } from 'zod'
import { db } from '@/lib/db'
import { requireVenture } from '@/lib/auth'
import { handle, ok, fail, parseData } from '@/lib/api'
import { BURST, burst, readJson, spendModelCall } from '@/lib/limits'
import { MILO_ACTIONS, askMilo, evidenceBlock, founderBlock, hasKey } from '@/lib/gemini'
import type { Verdict, MarketTerrain, Genome } from '@/lib/atlas-types'

export const maxDuration = 60
const Body = z.object({
  action: z.string().max(80).optional(),
  prompt: z.string().max(2000).optional(),
  context: z.string().max(200).optional(),
  view: z.object({ page: z.string().max(300), section: z.string().max(100), targetId: z.string().max(180).optional(), title: z.string().max(250).optional(), visibleText: z.string().max(7000).optional() }).optional(),
})

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params
    await requireVenture(id)
    const messages = await db.chatMessage.findMany({ where: { ventureId: id }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 80 })
    return ok({ messages: messages.reverse() })
  } catch (err) { return handle(err) }
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params
    const { user, venture } = await requireVenture(id)
    const body = Body.parse(await readJson(req))
    const preset = body.action ? MILO_ACTIONS[body.action as keyof typeof MILO_ACTIONS] : undefined
    const prompt = preset || body.prompt?.trim()
    if (!prompt) return fail('Nothing to ask.', 422)
    burst(`milo:${user.id}`, BURST.model)

    const [analyses, assumptions, experiments, sources, recent] = await Promise.all([
      db.analysis.findMany({ where: { ventureId: id, isCurrent: true } }),
      db.assumption.findMany({ where: { ventureId: id }, orderBy: [{ impact: 'desc' }, { uncertainty: 'desc' }], take: 40 }),
      db.experiment.findMany({ where: { ventureId: id }, take: 30 }),
      db.researchSource.findMany({ where: { ventureId: id }, orderBy: { createdAt: 'desc' }, take: 20 }),
      db.chatMessage.findMany({ where: { ventureId: id }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 10 }),
    ])
    const sections: Record<string, unknown> = {}
    for (const a of analyses) sections[a.section] = parseData(a.data, null)
    const aliases: Record<string, string> = { research: 'market', observatory: 'market', competition: 'market', anatomy: 'genome', readiness: 'verdict', diagnosis: 'verdict', machine: 'model', report: 'verdict' }
    let section = aliases[body.view?.section ?? body.context ?? ''] ?? body.view?.section ?? body.context ?? 'verdict'
    if (/\b(tam|sam|som|market siz|competitor)/i.test(prompt)) section = 'market'
    if (/\b(score|readiness)\b/i.test(prompt)) section = 'verdict'
    const atlas = {
      title: venture.title, idea: venture.rawIdea, isIllustrativeDemo: analyses.some(a => a.model === 'seed'),
      currentSection: section, currentAnalysis: sections[section],
      verdict: sections.verdict,
      assumptions: assumptions.map(a => ({ claim: a.claim, category: a.category, impact: a.impact, uncertainty: a.uncertainty, status: a.status, breaksIfFalse: a.breaksIfFalse, proofNeeded: a.proofNeeded, cheapestTest: a.cheapestTest, notes: a.notes })),
      experiments: experiments.map(e => ({ name: e.name, linkedAssumption: assumptions.find(a => a.id === e.assumptionId)?.claim, status: e.status, result: e.result, method: e.method, successThreshold: e.successThreshold, failThreshold: e.failThreshold })),
      remainingSections: Object.fromEntries(Object.entries(sections).filter(([k]) => k !== section && k !== 'verdict')),
    }
    let answer: string
    let saved = false
    if (!hasKey()) {
      // A transparent record reader; never pretend a canned fallback is a live model answer.
      saved = true
      const verdict = sections.verdict as Verdict | undefined
      const market = sections.market as MarketTerrain | undefined
      const genome = sections.genome as Genome | undefined
      const risk = [...assumptions].filter(a => a.status !== 'supported').sort((a, b) => b.impact * b.uncertainty - a.impact * a.uncertainty)[0]
      const intro = 'Saved-analysis guide — live AI is not configured. '
      if (/\b(tam|sam|som|sizing)\b/i.test(prompt) && market) answer = intro + 'TAM means total addressable market: the annual revenue available if every eligible customer bought. It is not your forecast. For this venture, the saved analysis recommends: ' + market.sizingMethod.approach + '\n\nInputs still needed: ' + market.sizingMethod.inputsNeeded.join('; ') + '.'
      else if (section === 'verdict' && verdict) answer = intro + `The saved readiness assessment is ${verdict.healthScore}/100, with ${verdict.confidence} confidence. It is a model judgment, not a probability or an average of the charts.\n\n${verdict.reasoning}\n\nWhat would change it: ${verdict.whatWouldChangeThis}`
      else if (/risk|assumption|test|weakest/i.test(prompt) && risk) answer = intro + `The highest-priority unsupported assumption by impact × uncertainty is: ${risk.claim}\n\nImpact ${risk.impact}/5; uncertainty ${risk.uncertainty}/5. ${risk.breaksIfFalse}\n\nThe saved next test: ${risk.cheapestTest}`
      else if (section === 'genome' && genome) answer = intro + 'The anatomy chart plots each part’s saved strength from 1 to 5. Farther from the centre means stronger; it does not mean independently verified.\n\n' + genome.nodes.map(n => `${n.kind}: ${n.strength}/5 — ${n.label}`).join('\n') + '\n\n' + genome.summary
      else return fail('Live conversation needs a Gemini API key.', 503, 'Configure the existing server key in .env.local, then restart. Saved score, anatomy, risk and TAM explanations remain available.')
    } else {
      await spendModelCall(user.id)
      answer = await askMilo({
        prompt, founder: founderBlock(user),
        evidence: evidenceBlock(sources.map(s => ({ id: s.id.slice(-6), kind: s.kind, title: s.title, url: s.url, snippet: s.snippet, evidence: s.evidence }))),
        atlas: JSON.stringify(atlas), context: section,
        view: body.view ? JSON.stringify(body.view) : undefined,
        history: recent.reverse().map(m => ({ role: m.role, content: m.content })),
      })
    }
    const [, message] = await db.$transaction([
      db.chatMessage.create({ data: { ventureId: id, role: 'founder', content: body.prompt?.trim() || prompt, context: section, action: body.action } }),
      db.chatMessage.create({ data: { ventureId: id, role: 'milo', content: answer, context: section, action: saved ? 'saved-analysis' : body.action } }),
    ])
    return ok({ message, context: section, mode: saved ? 'saved-analysis' : 'live' })
  } catch (err) { return handle(err) }
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params
    await requireVenture(id)
    await db.chatMessage.deleteMany({ where: { ventureId: id } })
    return ok({ cleared: true })
  } catch (err) { return handle(err) }
}
