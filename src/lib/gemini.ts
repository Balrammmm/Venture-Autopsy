import 'server-only'
import { GoogleGenAI } from '@google/genai'
import { atlasSchema, sectionSchemas } from './gemini-schemas'
import type { AtlasPayload } from './atlas-types'

const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash'
const RESEARCH_MODEL = process.env.GEMINI_RESEARCH_MODEL || MODEL

export class GeminiError extends Error {
  status: number
  hint?: string
  constructor(message: string, status = 500, hint?: string) {
    super(message)
    this.name = 'GeminiError'
    this.status = status
    this.hint = hint
  }
}

export function hasKey() {
  return Boolean(process.env.GEMINI_API_KEY)
}

export function modelInfo() {
  return { model: MODEL, researchModel: RESEARCH_MODEL, configured: hasKey() }
}

function client() {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new GeminiError(
      'No Gemini API key configured on the server.',
      503,
      'Add GEMINI_API_KEY to .env.local and restart the dev server.',
    )
  }
  return new GoogleGenAI({ apiKey })
}

/* ------------------------------------------------------------------ *
 * The integrity contract. Repeated on every call, not just the first.
 * ------------------------------------------------------------------ */

export const INTEGRITY = [
  'EVIDENCE RULES — non-negotiable:',
  '- You have no market data, no competitor database and no pricing data beyond SUPPLIED EVIDENCE below.',
  '- Never state a market size, growth rate, competitor fact, price or feasibility claim as established fact.',
  '- Anything derived from the idea description alone is a HYPOTHESIS. Write it as one.',
  '- Never invent sources, citations, statistics, survey results, or companies presented as verified.',
  '- For market sizing give a bottom-up METHOD the founder can run, never a number.',
  '- Alternatives and competitors you name are candidates to verify. evidence = "hypothesis" unless a supplied source names them.',
  '- evidence = "sourced" only when a SUPPLIED SOURCE with a real URL supports the claim.',
  '- evidence = "user_provided" when the founder pasted the supporting material themselves.',
  '- Scenarios are conditional routes, never predictions. Say so.',
  '',
  'VOICE:',
  '- Brutally useful, specific, unsentimental. A sharp operator, not a cheerleader.',
  '- No congratulation, no "great idea", no hedge-everything mush. If it is weak, say why.',
  '- Concrete nouns. Never: leverage, seamless, revolutionize, game-changing, empower, unlock, supercharge.',
  '- Prefer talking to five humans over building anything.',
].join('\n')

export interface EvidenceItem {
  id: string
  kind: string
  title: string
  url?: string | null
  snippet: string
  evidence: string
}

export function evidenceBlock(sources: EvidenceItem[]) {
  if (!sources.length) {
    return '\nSUPPLIED EVIDENCE: none. Every claim you make is a hypothesis and must be marked as one.\n'
  }
  const lines = sources.map((s) => {
    const head = `[${s.id}] (${s.kind}${s.evidence === 'sourced' ? ', has URL' : ', pasted by founder'}) ${s.title}`
    const url = s.url ? `\nURL: ${s.url}` : ''
    return `${head}${url}\n${s.snippet.slice(0, 2000)}`
  })
  return (
    '\nSUPPLIED EVIDENCE — the only material you may treat as more than a guess:\n' +
    lines.join('\n\n') +
    '\n\nCite these by id in sourceIds. Claims they support may be "sourced" (if the item has a URL) or "user_provided". Nothing else may be.\n'
  )
}

export function founderBlock(user: {
  name: string
  role?: string | null
  strengths?: string | null
  capital?: string | null
  timeframe?: string | null
  riskAppetite?: string | null
}) {
  const bits = [
    user.role && `Role: ${user.role}`,
    user.strengths && `Strengths: ${user.strengths}`,
    user.capital && `Capital available: ${user.capital}`,
    user.timeframe && `Timeframe: ${user.timeframe}`,
    user.riskAppetite && `Risk appetite: ${user.riskAppetite}`,
  ].filter(Boolean)
  if (!bits.length) return ''
  return `\nTHE FOUNDER — weigh feasibility against this specific person, not a generic team:\n${bits.join('\n')}\n`
}

/* ------------------------------------------------------------------ */

function friendly(err: unknown): never {
  if (err instanceof GeminiError) throw err
  const raw = err instanceof Error ? err.message : String(err)
  const l = raw.toLowerCase()
  if (l.includes('api key') || l.includes('api_key') || l.includes('401') || l.includes('403')) {
    throw new GeminiError('The Gemini API key was rejected.', 401, 'Check GEMINI_API_KEY in .env.local.')
  }
  if (l.includes('429') || l.includes('quota') || l.includes('resource_exhausted')) {
    throw new GeminiError('Gemini rate limit reached.', 429, 'Free-tier keys are limited per minute. Wait a moment and retry.')
  }
  if (l.includes('safety') || l.includes('blocked')) {
    throw new GeminiError('The model declined to answer this one.', 422, 'Try rephrasing the idea in plainer terms.')
  }
  if (l.includes('404') || l.includes('not found')) {
    throw new GeminiError(`Model "${MODEL}" is unavailable for this key.`, 404, 'Set GEMINI_MODEL to a model your key can access.')
  }
  if (l.includes('fetch') || l.includes('network') || l.includes('econn')) {
    throw new GeminiError('Could not reach the Gemini API.', 502, 'Check the server\'s network connection.')
  }
  throw new GeminiError('The analysis failed.', 500, raw.slice(0, 200))
}

function parseJson<T>(text: string | undefined): T {
  if (!text) throw new GeminiError('The model returned an empty response.', 502, 'Retry — this is usually transient.')
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
  try {
    return JSON.parse(cleaned) as T
  } catch {
    const o = cleaned.indexOf('{')
    const a = cleaned.indexOf('[')
    const from = o === -1 ? a : a === -1 ? o : Math.min(o, a)
    const end = Math.max(cleaned.lastIndexOf('}'), cleaned.lastIndexOf(']'))
    if (from !== -1 && end > from) {
      try {
        return JSON.parse(cleaned.slice(from, end + 1)) as T
      } catch {
        /* fall through */
      }
    }
    throw new GeminiError('The model returned malformed JSON.', 502, 'Retry — this is usually transient.')
  }
}

/* ------------------------------------------------------------------ *
 * Research Mode. Grounding and responseSchema cannot be combined in one
 * call, so this runs first as prose and its real source URIs are then fed
 * into the structured pass.
 * ------------------------------------------------------------------ */

export interface GroundedFinding {
  title: string
  url: string
  snippet: string
  retrievedAt: string
}

export async function runResearchPass(
  idea: string,
): Promise<{ summary: string; findings: GroundedFinding[]; grounded: boolean }> {
  const prompt = [
    'Research this business idea using web search. Report ONLY what you actually found, attributing every claim.',
    'If you cannot find something, write "not found" rather than estimating.',
    '',
    'Look for, only where real sources exist:',
    '1. Products or companies already doing something close to this, by name.',
    '2. Published pricing for those products.',
    '3. Evidence the problem exists — complaints, reviews, forum threads, reports.',
    '4. Regulatory or structural constraints.',
    '5. Anything suggesting the timing is good or bad right now.',
    '',
    'IDEA:',
    idea,
    '',
    'Write compact bullets. Never fill a gap with an estimate.',
  ].join('\n')

  try {
    const res = await client().models.generateContent({
      model: RESEARCH_MODEL,
      contents: prompt,
      config: { tools: [{ googleSearch: {} }], temperature: 0.3 },
    })

    const summary = res.text || ''
    const meta = res.candidates?.[0]?.groundingMetadata
    const chunks = meta?.groundingChunks || []
    const supports = meta?.groundingSupports || []
    const retrievedAt = new Date().toISOString()

    // Map each source to the text it actually supported, so we store a real snippet.
    const snippetFor = (index: number) => {
      const hit = supports.find((s) => s.groundingChunkIndices?.includes(index))
      return hit?.segment?.text?.trim() || ''
    }

    const seen = new Set<string>()
    const findings: GroundedFinding[] = []
    chunks.forEach((c, i) => {
      const url = c.web?.uri
      if (!url || seen.has(url)) return
      seen.add(url)
      findings.push({
        title: c.web?.title || url,
        url,
        snippet: snippetFor(i) || 'Retrieved during grounded research; see the source for detail.',
        retrievedAt,
      })
    })

    return { summary, findings, grounded: findings.length > 0 }
  } catch (err) {
    friendly(err)
  }
}

/* ------------------------------------------------------------------ */

export async function generateAtlas(input: {
  idea: string
  founder: string
  evidence: string
  researchSummary?: string
}): Promise<AtlasPayload> {
  const prompt = [
    'You are running a venture autopsy on an idea that has not launched. Find what would kill it, and the cheapest way to find out before it does.',
    'Produce a complete structured atlas. Every section must be specific to THIS idea — generic startup advice is a failure.',
    INTEGRITY,
    input.founder,
    input.evidence,
    input.researchSummary ? `\nGROUNDED RESEARCH FINDINGS:\n${input.researchSummary}\n` : '',
    'THE IDEA:',
    input.idea,
  ].join('\n')

  try {
    const res = await client().models.generateContent({
      model: MODEL,
      contents: prompt,
      config: { responseMimeType: 'application/json', responseSchema: atlasSchema, temperature: 0.85 },
    })
    return parseJson<AtlasPayload>(res.text)
  } catch (err) {
    friendly(err)
  }
}

export async function regenerateSection<T>(input: {
  section: string
  idea: string
  founder: string
  evidence: string
  context: string
  instruction?: string
}): Promise<T> {
  const schema = sectionSchemas[input.section]
  if (!schema) throw new GeminiError(`Unknown section "${input.section}".`, 400)

  const prompt = [
    `Regenerate ONE section of an existing venture atlas: "${input.section}". Return only that section, matching the schema exactly.`,
    INTEGRITY,
    input.founder,
    input.evidence,
    'THE IDEA:',
    input.idea,
    '',
    'EXISTING ATLAS CONTEXT — stay consistent with this:',
    input.context.slice(0, 4000),
    '',
    input.instruction
      ? `FOUNDER'S INSTRUCTION — follow it precisely:\n${input.instruction}`
      : 'Produce a genuinely sharper take. Do not restate the previous version.',
  ].join('\n')

  try {
    const res = await client().models.generateContent({
      model: MODEL,
      contents: prompt,
      config: { responseMimeType: 'application/json', responseSchema: schema, temperature: 0.95 },
    })
    return parseJson<T>(res.text)
  } catch (err) {
    friendly(err)
  }
}

/* ------------------------------------------------------------------ */

export const MILO_ACTIONS = {
  challenge: 'Take my riskiest assumption and argue hard against it. What would a sceptical investor say? End with the one question that would settle it.',
  cheapest: 'Design the cheapest possible experiment to validate my riskiest assumption. If it costs money, find the free version. Be specific about what I do tomorrow morning.',
  interviews: 'Give me five customer interview questions about past behaviour, never hypotheticals. For each, say in one line what a useless polite answer sounds like.',
  pricing: 'Stress-test my pricing. Where does it break, who walks away, and what is the cheapest way to find out what people actually pay today?',
  pivots: 'Compare my pivot options directly. Which is cheapest to prove, which has the highest ceiling, and which would you start this week? Commit to one and say why.',
  pitch: 'Write a one-page pitch: problem, who has it, the wedge, why now, how money arrives, and the biggest open question. Stay honest about what is unproven.',
  explain: 'Explain what this visual is showing me and what I should actually do about it. Two short paragraphs.',
  sevendays: 'Build my next seven days. One outcome per day, not a task list. Say what I stop doing if day three fails.',
  research:
    'Summarise the research gathered for this venture. Separate what a real source actually supports from what is still assumption, name the single biggest unknown, and say what to go and find next.',
  launch:
    'Build a launch plan to first paying customer. Milestones with owners and dates, the one gate that must pass before each, and what gets cut first if time runs short.',
} as const

export type MiloAction = keyof typeof MILO_ACTIONS

export async function askMilo(input: {
  prompt: string
  founder: string
  evidence: string
  atlas: string
  context?: string
  history: { role: string; content: string }[]
}): Promise<string> {
  const body = [
    'You are Milo, a small mechanical fox who works alongside a founder inside a venture-validation workspace. You help them think and act.',
    INTEGRITY,
    '',
    'FORMAT — strict:',
    '- Under 160 words. Short paragraphs or a tight list. No preamble, no sign-off, no headers.',
    '- Substance they can act on today. Never generic startup advice.',
    '- If you need something you do not have, ask exactly one specific question instead of guessing.',
    '- Plain text. A leading "-" for list items is fine. No markdown headers or bold.',
    '',
    'SCOPE:',
    '- Ordinary questions are fine. Answer them plainly, then get back to the work.',
    '- You have no live search in this conversation and no knowledge of today\'s events.',
    '- For anything time-sensitive — current news, prices, funding rounds, who runs a company now,',
    '  whether something still exists — say you cannot verify current information from here and',
    '  point at Research Mode, which does use grounded search. Never guess a current fact.',
    '- Never present a statistic, company, or citation you were not given as verified.',
    input.founder,
    '',
    'THE VENTURE:',
    input.atlas.slice(0, 7000),
    input.evidence.slice(0, 3000),
    input.context ? `\nTHE FOUNDER IS LOOKING AT: ${input.context}` : '',
    input.history.length
      ? '\nEARLIER IN THIS CONVERSATION:\n' +
        input.history.slice(-6).map((m) => `${m.role === 'milo' ? 'You' : 'Founder'}: ${m.content}`).join('\n')
      : '',
    '',
    'FOUNDER ASKS:',
    input.prompt,
  ].join('\n')

  try {
    const res = await client().models.generateContent({
      model: MODEL,
      contents: body,
      config: { temperature: 0.8, maxOutputTokens: 1600 },
    })
    return res.text?.trim() || 'I came back empty on that. Try asking it a different way.'
  } catch (err) {
    friendly(err)
  }
}
