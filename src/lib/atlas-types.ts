/**
 * The Venture Atlas. Each section backs one visual module and is stored as a
 * versioned Analysis row, so regenerating one module never touches the others.
 */

export type Evidence = 'hypothesis' | 'user_provided' | 'sourced'
export type VerdictLabel = 'Promising' | 'Needs Validation' | 'High Risk'
export type Confidence = 'low' | 'moderate' | 'high'
export type Likelihood = 'low' | 'moderate' | 'high'

export const SECTION_KEYS = [
  'genome',
  'market',
  'failures',
  'pivots',
  'model',
  'scenarios',
  'launch',
  'verdict',
] as const

export type SectionKey = (typeof SECTION_KEYS)[number]

/* ---------------- Idea Genome ---------------- */

export interface GenomeNode {
  id: string
  /** customer | pain | solution | revenue | distribution | advantage */
  kind: string
  label: string
  detail: string
  /** 1–5. Drives orbit radius: weaker links sit further out. */
  strength: number
  unknowns: string[]
}

export interface Genome {
  summary: string
  whyNow: string
  nodes: GenomeNode[]
  /** Pairs of node ids that depend on each other. Drawn as signal paths. */
  links: { from: string; to: string; note: string }[]
  missingInformation: string[]
}

/* ---------------- Market Terrain ---------------- */

export interface Persona {
  id: string
  name: string
  role: string
  context: string
  jobToBeDone: string
  currentWorkaround: string
  buyingTrigger: string
  objection: string
  /** 0–1 terrain coordinates, so the landscape layout is stable. */
  x: number
  y: number
}

export interface MarketTerrain {
  personas: Persona[]
  alternatives: { name: string; why: string; evidence: Evidence; sourceIds: string[] }[]
  positioningGaps: { gap: string; whyItExists: string; risk: string }[]
  researchGaps: { question: string; howToAnswer: string; blocksWhat: string }[]
  sizingMethod: { approach: string; inputsNeeded: string[]; evidence: Evidence }
  note: string
}

/* ---------------- Failure Museum ---------------- */

export interface FailureExhibit {
  id: string
  title: string
  narrative: string
  warningSignals: string[]
  mitigation: string
  likelihood: Likelihood
  /** Which part of the venture it destroys. Used for the exhibit's plate. */
  killZone: string
}

/* ---------------- Pivot Prism ---------------- */

export interface Pivot {
  id: string
  kind: 'safer' | 'sharper' | 'bolder'
  title: string
  description: string
  whatChanges: string
  whoItServes: string
  tradeoff: string
  /** 1–5 each, drawn as the prism face's profile. */
  effort: number
  ceiling: number
  speedToProof: number
}

/* ---------------- Business Model Blueprint ---------------- */

export interface BusinessModel {
  valueFlows: { id: string; from: string; to: string; what: string; kind: 'value' | 'money' | 'data' }[]
  revenueStreams: {
    id: string
    name: string
    model: string
    pricePoint: string
    rationale: string
    testMethod: string
    risk: string
    evidence: Evidence
  }[]
  costDrivers: { id: string; name: string; kind: 'fixed' | 'variable'; note: string }[]
  unitEconomics: { metric: string; hypothesis: string; howToMeasure: string }[]
  mvpScope: { inScope: string[]; outOfScope: string[]; successCriteria: string }
  note: string
}

/* ---------------- Future Scope Simulator ---------------- */

export interface ScenarioPath {
  kind: 'conservative' | 'expected' | 'ambitious'
  title: string
  narrative: string
  /** Milestone points along the path, 0–1 on the time axis. */
  beats: { t: number; label: string; detail: string }[]
  /** The assumptions that must hold for this route. */
  dependsOn: string[]
  breaksIf: string
}

export interface Scenarios {
  disclaimer: string
  paths: ScenarioPath[]
}

/* ---------------- Launch Flight Plan ---------------- */

export interface LaunchPlan {
  milestones: {
    id: string
    name: string
    outcome: string
    owner: string
    risk: string
    week: number
  }[]
  sevenDays: { day: number; action: string; output: string }[]
  kpis: { name: string; definition: string; target: string; failureThreshold: string }[]
  readinessNote: string
}

/* ---------------- Verdict ---------------- */

export interface Verdict {
  verdict: VerdictLabel
  confidence: Confidence
  reasoning: string
  strongestSignal: string
  fatalFlawRisk: string
  whatWouldChangeThis: string
  healthScore: number
}

/* ---------------- Seeds written into their own tables ---------------- */

export interface AssumptionSeed {
  claim: string
  category: string
  impact: number
  uncertainty: number
  breaksIfFalse: string
  proofNeeded: string
  cheapestTest: string
  testCost: string
  testDuration: string
}

export interface ExperimentSeed {
  name: string
  kind: string
  hypothesis: string
  method: string
  script: string[]
  successThreshold: string
  failThreshold: string
  sampleSize: string
  duration: string
  cost: string
  assumptionClaim: string
}

export interface AtlasPayload {
  title: string
  genome: Genome
  market: MarketTerrain
  failures: FailureExhibit[]
  pivots: Pivot[]
  model: BusinessModel
  scenarios: Scenarios
  launch: LaunchPlan
  verdict: Verdict
  assumptions: AssumptionSeed[]
  experiments: ExperimentSeed[]
}

export type SectionData = {
  genome: Genome
  market: MarketTerrain
  failures: FailureExhibit[]
  pivots: Pivot[]
  model: BusinessModel
  scenarios: Scenarios
  launch: LaunchPlan
  verdict: Verdict
}

export const SECTION_META: Record<SectionKey, { name: string; blurb: string; href: string }> = {
  genome: { name: 'Idea Genome', blurb: 'The parts of the idea and how they hold together.', href: '' },
  market: { name: 'Market Terrain', blurb: 'Who is out there, and what you have not checked.', href: '/research' },
  failures: { name: 'Failure Museum', blurb: 'How this dies, and the tell that came first.', href: '' },
  pivots: { name: 'Pivot Prism', blurb: 'Safer, sharper, bolder — each with a cost.', href: '' },
  model: { name: 'Business Model', blurb: 'Where value and money actually move.', href: '/strategy' },
  scenarios: { name: 'Future Scope', blurb: 'Three routes, and what each one depends on.', href: '/strategy' },
  launch: { name: 'Flight Plan', blurb: 'Milestones, KPIs and the next seven days.', href: '/strategy' },
  verdict: { name: 'Verdict', blurb: 'The candid read.', href: '/report' },
}
