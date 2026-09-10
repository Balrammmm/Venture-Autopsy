import type { Slide } from './Presentation'
import type { Sections, AssumptionRow, ExperimentRow, SourceRow, VentureRow } from '../useVenture'

/**
 * The venture, told as a story someone can sit through.
 *
 * Slides are built from rows that exist. A section with no data produces no
 * slide rather than an empty one, so a thin venture yields a short honest deck
 * instead of a padded one. Nothing here is generated at present time — it is a
 * re-arrangement of the analysis already stored.
 */
export function buildSlides({
  venture,
  sections,
  assumptions,
  experiments,
  sources,
}: {
  venture: VentureRow
  sections: Sections
  assumptions: AssumptionRow[]
  experiments: ExperimentRow[]
  sources: SourceRow[]
}): Slide[] {
  const slides: Slide[] = []
  const { genome, verdict, market, model, launch, failures, scenarios } = sections

  const grounded = sources.filter((s) => s.evidence === 'sourced').length
  const supported = assumptions.filter((a) => a.status === 'supported').length
  const critical = assumptions.filter((a) => a.impact >= 4 && a.status !== 'supported')
  const passed = experiments.filter((e) => e.status === 'passed').length

  /* ---- the opening ------------------------------------------------- */
  slides.push({
    eyebrow: 'Venture dossier',
    headline: venture.title,
    body: genome?.summary ?? venture.rawIdea,
    stats: [
      { label: 'Readiness', value: String(venture.healthScore), note: 'out of 100' },
      { label: 'Verdict', value: verdict?.verdict ?? 'Not analysed' },
      { label: 'Confidence', value: verdict?.confidence ?? '—' },
      { label: 'Sourced evidence', value: String(grounded), note: `${sources.length} total attached` },
    ],
  })

  /* ---- who it is for ------------------------------------------------ */
  const persona = market?.personas?.[0]
  if (persona) {
    slides.push({
      eyebrow: 'The customer',
      headline: persona.name,
      body: `${persona.role}. ${persona.context}`,
      points: [
        `Trying to: ${persona.jobToBeDone}`,
        `Today they: ${persona.currentWorkaround}`,
        `They would buy when: ${persona.buyingTrigger}`,
        `They would object: ${persona.objection}`,
      ],
    })
  }

  /* ---- why now ------------------------------------------------------ */
  if (genome?.whyNow) {
    slides.push({ eyebrow: 'Why now', headline: 'The window', body: genome.whyNow, tone: 'signal' })
  }

  /* ---- how it holds together ---------------------------------------- */
  if (genome?.nodes?.length) {
    const weak = [...genome.nodes].sort((a, b) => a.strength - b.strength).slice(0, 3)
    slides.push({
      eyebrow: 'The idea',
      headline: 'What holds, and what does not',
      body: 'Each part of the chain, scored on how well established it is. The weakest links are where the work is.',
      points: weak.map((n) => `${n.label} — strength ${n.strength}/5. ${n.detail}`),
    })
  }

  /* ---- the money ---------------------------------------------------- */
  if (model?.revenueStreams?.length) {
    slides.push({
      eyebrow: 'The model',
      headline: 'Where money arrives',
      body: model.note,
      points: model.revenueStreams
        .slice(0, 4)
        .map((r) => `${r.name} at ${r.pricePoint} — ${r.model}. Test: ${r.testMethod}`),
    })
  }

  /* ---- what would kill it ------------------------------------------- */
  if (critical.length) {
    slides.push({
      eyebrow: 'The risk',
      headline: 'What has to be true',
      body: 'These are unresolved and high-impact. If any one of them is wrong, the venture is wrong.',
      tone: 'risk',
      points: critical.slice(0, 5).map((a) => `${a.claim} — breaks: ${a.breaksIfFalse}`),
    })
  }

  const worst = failures?.[0]
  if (worst) {
    slides.push({
      eyebrow: 'The post-mortem',
      headline: worst.title,
      body: worst.narrative,
      tone: 'risk',
      points: worst.warningSignals?.slice(0, 3).map((w) => `Early tell: ${w}`),
    })
  }

  /* ---- how it gets proved -------------------------------------------- */
  if (experiments.length) {
    slides.push({
      eyebrow: 'The plan to find out',
      headline: 'Cheapest proof first',
      stats: [
        { label: 'Experiments', value: String(experiments.length) },
        { label: 'Passed', value: String(passed) },
        { label: 'Assumptions supported', value: `${supported}/${assumptions.length}` },
        { label: 'Still critical', value: String(critical.length) },
      ],
      points: experiments
        .filter((e) => e.status === 'planned' || e.status === 'running')
        .slice(0, 4)
        .map((e) => `${e.name} — passes if ${e.successThreshold}`),
    })
  }

  /* ---- the routes ----------------------------------------------------- */
  const route = scenarios?.paths?.find((p) => p.kind === 'expected') ?? scenarios?.paths?.[0]
  if (route) {
    slides.push({
      eyebrow: 'One route, conditional',
      headline: route.title,
      body: `${route.narrative} This is a dependency map, not a forecast — it breaks if ${route.breaksIf}`,
      points: route.beats?.slice(0, 5).map((b) => `${b.label} — ${b.detail}`),
    })
  }

  /* ---- next seven days ------------------------------------------------ */
  if (launch?.sevenDays?.length) {
    slides.push({
      eyebrow: 'Next seven days',
      headline: 'What happens on Monday',
      points: launch.sevenDays.slice(0, 5).map((d) => `Day ${d.day}: ${d.action} → ${d.output}`),
      tone: 'signal',
    })
  }

  /* ---- the honest close ------------------------------------------------ */
  if (verdict) {
    slides.push({
      eyebrow: 'The candid read',
      headline: verdict.verdict,
      body: verdict.reasoning,
      tone: verdict.verdict === 'High Risk' ? 'risk' : 'signal',
      points: [
        verdict.strongestSignal ? `Strongest signal: ${verdict.strongestSignal}` : '',
        verdict.fatalFlawRisk ? `Biggest risk: ${verdict.fatalFlawRisk}` : '',
        verdict.whatWouldChangeThis ? `What would change this: ${verdict.whatWouldChangeThis}` : '',
      ].filter(Boolean),
    })
  }

  /* ---- integrity ------------------------------------------------------- */
  slides.push({
    eyebrow: 'Standing of this analysis',
    headline: grounded ? 'Partly sourced' : 'Hypothesis throughout',
    body: grounded
      ? `${grounded} claim${grounded === 1 ? '' : 's'} trace to a real link with a timestamp. Everything else is reasoning from the description and is written to be tested, not believed.`
      : 'Nothing here has been verified against an external source. Every figure and competitor named is a hypothesis for you to check before acting on it.',
    stats: [
      { label: 'Sourced', value: String(grounded) },
      { label: 'You provided', value: String(sources.length - grounded) },
      { label: 'Assumptions', value: String(assumptions.length) },
      { label: 'Proven', value: String(supported) },
    ],
  })

  return slides
}
