/**
 * Response schemas for Gemini structured output (an OpenAPI 3 subset).
 * A tiny DSL keeps the atlas schema readable rather than 900 lines of literals.
 */
type Sch = Record<string, unknown>

const str = (d?: string): Sch => ({ type: 'string', ...(d ? { description: d } : {}) })
const int = (d?: string): Sch => ({ type: 'integer', ...(d ? { description: d } : {}) })
const num = (d?: string): Sch => ({ type: 'number', ...(d ? { description: d } : {}) })
const enm = (values: string[], d?: string): Sch => ({
  type: 'string',
  enum: values,
  ...(d ? { description: d } : {}),
})
const arr = (items: Sch, d?: string): Sch => ({ type: 'array', items, ...(d ? { description: d } : {}) })
const obj = (properties: Record<string, Sch>, d?: string): Sch => ({
  type: 'object',
  properties,
  required: Object.keys(properties),
  propertyOrdering: Object.keys(properties),
  ...(d ? { description: d } : {}),
})

const evidence = enm(
  ['hypothesis', 'user_provided', 'sourced'],
  'Use "sourced" ONLY when a SUPPLIED SOURCE with a real URL supports this. Use "user_provided" when the founder pasted it. Otherwise "hypothesis".',
)
const likelihood = enm(['low', 'moderate', 'high'])
const score = (d: string) => int(d + ' Integer 1-5.')

/* ---------------------------------------------------------------- */

export const genomeSchema = obj({
  summary: str('One sentence naming what this venture actually is. No adjectives.'),
  whyNow: str('What changed recently that makes this possible. If nothing has, say so plainly.'),
  nodes: arr(
    obj({
      id: str('short kebab-case slug, unique'),
      kind: enm(['customer', 'pain', 'solution', 'revenue', 'distribution', 'advantage']),
      label: str('3-6 words'),
      detail: str('2-3 sentences, concrete and specific'),
      strength: score('How well-established this part is, 5 = the founder clearly knows it.'),
      unknowns: arr(str(), '1-3 things still unknown about this part.'),
    }),
    'Exactly 6 nodes, one per kind.',
  ),
  links: arr(
    obj({ from: str('node id'), to: str('node id'), note: str('Why one depends on the other.') }),
    '4-7 dependency links between node ids.',
  ),
  missingInformation: arr(str(), '3-6 things the founder did not specify that change the analysis.'),
})

export const marketSchema = obj({
  personas: arr(
    obj({
      id: str(),
      name: str('An archetype name, not a real person.'),
      role: str(),
      context: str(),
      jobToBeDone: str(),
      currentWorkaround: str('What they do today instead. There is always something.'),
      buyingTrigger: str(),
      objection: str(),
      x: num('0-1 terrain position, spread these out'),
      y: num('0-1 terrain position, spread these out'),
    }),
    '3 personas.',
  ),
  alternatives: arr(
    obj({
      name: str('A category or named product ONLY if a supplied source names it.'),
      why: str(),
      evidence,
      sourceIds: arr(str(), 'ids of supplied sources supporting this, or empty'),
    }),
    '3-5 alternatives, including the status quo.',
  ),
  positioningGaps: arr(obj({ gap: str(), whyItExists: str(), risk: str() }), '2-4 gaps.'),
  researchGaps: arr(
    obj({ question: str(), howToAnswer: str('A concrete way to find out this week.'), blocksWhat: str() }),
    '3-5 things that are not known and must be.',
  ),
  sizingMethod: obj({
    approach: str('A bottom-up METHOD the founder can run. Never assert a market size number.'),
    inputsNeeded: arr(str()),
    evidence,
  }),
  note: str('State plainly that alternatives are candidates to verify, not a researched list.'),
})

export const failuresSchema = arr(
  obj({
    id: str(),
    title: str('A memorable, specific name for this failure mode.'),
    narrative: str('3-4 sentences, past tense, as a post-mortem. Unsentimental and concrete.'),
    warningSignals: arr(str(), '2-4 early tells.'),
    mitigation: str(),
    likelihood,
    killZone: str('Which part it destroys: demand, channel, supply, retention, legal, economics.'),
  }),
  '4 exhibits.',
)

export const pivotsSchema = arr(
  obj({
    id: str(),
    kind: enm(['safer', 'sharper', 'bolder']),
    title: str(),
    description: str(),
    whatChanges: str(),
    whoItServes: str(),
    tradeoff: str('What you give up. Every pivot costs something.'),
    effort: score('How much work it is.'),
    ceiling: score('How big it could get.'),
    speedToProof: score('How fast you could prove it, 5 = this week.'),
  }),
  'Exactly 3: one safer, one sharper, one bolder.',
)

export const modelSchema = obj({
  valueFlows: arr(
    obj({
      id: str(),
      from: str('an actor: the founder, the customer, a supplier, a partner'),
      to: str('an actor'),
      what: str(),
      kind: enm(['value', 'money', 'data']),
    }),
    '4-7 flows forming a loop from customer to revenue.',
  ),
  revenueStreams: arr(
    obj({
      id: str(),
      name: str(),
      model: str('e.g. subscription, per-job margin, licence'),
      pricePoint: str('A range framed as untested, never a confident figure.'),
      rationale: str(),
      testMethod: str('How to find out if anyone pays it.'),
      risk: str('What breaks this pricing, stated plainly.'),
      evidence,
    }),
    '2-3 streams.',
  ),
  costDrivers: arr(obj({ id: str(), name: str(), kind: enm(['fixed', 'variable']), note: str() }), '3-5 drivers.'),
  unitEconomics: arr(
    obj({ metric: str(), hypothesis: str(), howToMeasure: str() }),
    '3-4 metrics that decide whether this works.',
  ),
  mvpScope: obj({
    inScope: arr(str(), 'The smallest thing that tests the riskiest assumption.'),
    outOfScope: arr(str(), 'Tempting things that must not be built yet.'),
    successCriteria: str(),
  }),
  note: str('One line on what is still entirely unproven here.'),
})

export const scenariosSchema = obj({
  disclaimer: str('State that these are scenarios conditional on assumptions, not predictions.'),
  paths: arr(
    obj({
      kind: enm(['conservative', 'expected', 'ambitious']),
      title: str(),
      narrative: str('2-3 sentences describing how this route unfolds.'),
      beats: arr(
        obj({ t: num('0-1 position along the path'), label: str('3-5 words'), detail: str() }),
        '3-4 beats, ascending t.',
      ),
      dependsOn: arr(str(), 'The assumptions that must hold for this route.'),
      breaksIf: str(),
    }),
    'Exactly 3 paths, one per kind.',
  ),
})

export const launchSchema = obj({
  milestones: arr(
    obj({
      id: str(),
      name: str(),
      outcome: str('An observable outcome, not a task.'),
      owner: str('A role: founder, a hire, a contractor.'),
      risk: str(),
      week: int('1-12'),
    }),
    '4-6 milestones.',
  ),
  sevenDays: arr(
    obj({ day: int('1-7'), action: str('One concrete action.'), output: str('What exists at the end of the day.') }),
    'Exactly 7 entries, day 1 through 7.',
  ),
  kpis: arr(
    obj({ name: str(), definition: str(), target: str(), failureThreshold: str() }),
    '4-6 KPIs with real failure thresholds.',
  ),
  readinessNote: str('One honest line on whether this is ready to launch at all.'),
})

export const verdictSchema = obj({
  verdict: enm(['Promising', 'Needs Validation', 'High Risk']),
  confidence: enm(['low', 'moderate', 'high'], 'Without sourced research this should rarely exceed "moderate".'),
  reasoning: str('3-5 sentences. Candid. Name the actual weak point.'),
  strongestSignal: str(),
  fatalFlawRisk: str(),
  whatWouldChangeThis: str('The specific evidence that would move the verdict.'),
  healthScore: int('0-100. How much of this is actually established rather than hoped.'),
})

export const assumptionsSchema = arr(
  obj({
    claim: str('The belief stated as one falsifiable sentence.'),
    category: str('Demand, Willingness to pay, Channel, Supply, Technical, Regulatory, Retention'),
    impact: score('Damage if this is false.'),
    uncertainty: score('How little is actually known today.'),
    breaksIfFalse: str(),
    proofNeeded: str('What evidence would settle it.'),
    cheapestTest: str('Prefer talking to humans over building anything.'),
    testCost: str('e.g. "$0", "under $200"'),
    testDuration: str('e.g. "2 days"'),
  }),
  '6-9 assumptions, highest impact x uncertainty first.',
)

export const experimentsSchema = arr(
  obj({
    name: str(),
    kind: enm(['interview', 'fake_door', 'landing_page', 'concierge', 'survey', 'prototype']),
    hypothesis: str(),
    method: str(),
    script: arr(str(), '4-6 interview questions about PAST BEHAVIOUR, or concrete test steps.'),
    successThreshold: str('A number or observable outcome.'),
    failThreshold: str('What result kills it.'),
    sampleSize: str(),
    duration: str(),
    cost: str(),
    assumptionClaim: str('The exact claim text of the assumption this tests.'),
  }),
  '3 experiments targeting the three riskiest assumptions.',
)

/** The full first-run payload. */
export const atlasSchema = obj({
  title: str('A short, sharp working name. Max 6 words. Not a tagline.'),
  genome: genomeSchema,
  market: marketSchema,
  failures: failuresSchema,
  pivots: pivotsSchema,
  model: modelSchema,
  scenarios: scenariosSchema,
  launch: launchSchema,
  verdict: verdictSchema,
  assumptions: assumptionsSchema,
  experiments: experimentsSchema,
})

export const sectionSchemas: Record<string, Sch> = {
  genome: genomeSchema,
  market: marketSchema,
  failures: failuresSchema,
  pivots: pivotsSchema,
  model: modelSchema,
  scenarios: scenariosSchema,
  launch: launchSchema,
  verdict: verdictSchema,
  assumptions: assumptionsSchema,
  experiments: experimentsSchema,
}
