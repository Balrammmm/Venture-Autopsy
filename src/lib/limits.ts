import 'server-only'
import { db } from './db'

/**
 * Abuse protection.
 *
 * Two independent layers, because they defend against different things:
 *
 *   1. A burst limiter, held in memory. Stops one user hammering a route in a
 *      loop. Cheap, immediate, and resets on deploy — which is fine, because
 *      a burst window is seconds long.
 *
 *   2. A daily quota, held in the database. Stops one user consuming the
 *      deployment's entire Gemini budget over a day. Survives restarts and is
 *      shared across instances, because it is a row rather than a variable.
 *
 * The in-memory layer is per-instance. On a single container that is exactly
 * right. If this is ever scaled horizontally, layer 1 should move to Redis;
 * layer 2 already works unchanged because it is in the database.
 */

export class RateLimited extends Error {
  status = 429
  hint: string
  retryAfter: number
  constructor(message: string, hint: string, retryAfter: number) {
    super(message)
    this.name = 'RateLimited'
    this.hint = hint
    this.retryAfter = retryAfter
  }
}

/* ------------------------------------------------------------------ *
 * Layer 1 — burst limiter
 * ------------------------------------------------------------------ */

type Bucket = { hits: number[]; }
const buckets = new Map<string, Bucket>()

// Bounded so a flood of distinct keys cannot grow the map without limit.
const MAX_KEYS = 5_000

function sweep(now: number) {
  if (buckets.size <= MAX_KEYS) return
  for (const [key, b] of buckets) {
    if (b.hits.length === 0 || now - b.hits[b.hits.length - 1] > 600_000) buckets.delete(key)
    if (buckets.size <= MAX_KEYS * 0.8) break
  }
}

export interface BurstRule {
  /** Requests allowed inside the window. */
  limit: number
  /** Window length in milliseconds. */
  windowMs: number
}

/** Named rules, so a route's cost is declared rather than guessed at. */
export const BURST = {
  /** Cheap reads and small writes. */
  standard: { limit: 60, windowMs: 60_000 },
  /** Anything that writes a lot or fans out. */
  write: { limit: 25, windowMs: 60_000 },
  /** Anything that calls Gemini. Deliberately tight. */
  model: { limit: 8, windowMs: 60_000 },
  /** Session creation, which is unauthenticated and therefore keyed by IP. */
  auth: { limit: 10, windowMs: 300_000 },
} as const satisfies Record<string, BurstRule>

export function burst(key: string, rule: BurstRule) {
  const now = Date.now()
  sweep(now)

  let b = buckets.get(key)
  if (!b) {
    b = { hits: [] }
    buckets.set(key, b)
  }

  const cutoff = now - rule.windowMs
  // The window is small and the limit is small, so a filter is cheaper than
  // anything cleverer would be.
  b.hits = b.hits.filter((t) => t > cutoff)

  if (b.hits.length >= rule.limit) {
    const retryAfter = Math.ceil((b.hits[0] + rule.windowMs - now) / 1000)
    throw new RateLimited(
      'Too many requests.',
      `Wait ${retryAfter} second${retryAfter === 1 ? '' : 's'} and try again.`,
      Math.max(1, retryAfter),
    )
  }

  b.hits.push(now)
}

/* ------------------------------------------------------------------ *
 * Layer 2 — daily model quota
 * ------------------------------------------------------------------ */

/**
 * Calls to Gemini allowed per user per UTC day. Override in the host
 * environment; the default is generous for one person and ruinous for nobody.
 */
export const DAILY_MODEL_CALLS = Number(process.env.DAILY_MODEL_CALLS ?? 120)

function today() {
  return new Date().toISOString().slice(0, 10)
}

/**
 * Records one model call against the user's daily allowance, and refuses when
 * it is spent. Call this *before* the model call, so a failure to respond
 * cannot be used to farm free retries.
 */
export async function spendModelCall(userId: string) {
  if (!Number.isFinite(DAILY_MODEL_CALLS) || DAILY_MODEL_CALLS <= 0) return

  const day = today()
  const row = await db.usage.upsert({
    where: { userId_day: { userId, day } },
    create: { userId, day, modelCalls: 1 },
    update: { modelCalls: { increment: 1 } },
    select: { modelCalls: true },
  })

  if (row.modelCalls > DAILY_MODEL_CALLS) {
    throw new RateLimited(
      'Daily analysis limit reached.',
      'The allowance resets at midnight UTC. Existing ventures stay readable in the meantime.',
      3600,
    )
  }
}

/** What is left today — for the settings page. */
export async function modelCallsLeft(userId: string) {
  const row = await db.usage.findUnique({
    where: { userId_day: { userId, day: today() } },
    select: { modelCalls: true },
  })
  const used = row?.modelCalls ?? 0
  return { used, limit: DAILY_MODEL_CALLS, left: Math.max(0, DAILY_MODEL_CALLS - used) }
}

/* ------------------------------------------------------------------ *
 * Request shape
 * ------------------------------------------------------------------ */

/** Bodies larger than this are refused before they are parsed. */
export const MAX_BODY_BYTES = 128 * 1024

export class PayloadTooLarge extends Error {
  status = 413
  hint = 'Shorten the text and try again.'
  constructor() {
    super('That request is too large.')
    this.name = 'PayloadTooLarge'
  }
}

/**
 * Reads a JSON body with a hard ceiling. `Content-Length` is a hint a client
 * controls, so the actual bytes are counted too.
 */
export async function readJson(req: Request): Promise<unknown> {
  const declared = Number(req.headers.get('content-length') ?? 0)
  if (declared > MAX_BODY_BYTES) throw new PayloadTooLarge()

  const text = await req.text()
  if (Buffer.byteLength(text, 'utf8') > MAX_BODY_BYTES) throw new PayloadTooLarge()
  if (!text) return {}

  try {
    return JSON.parse(text)
  } catch {
    const err = new Error('The request body was not valid JSON.')
    err.name = 'BadJson'
    throw err
  }
}

/** A stable key for unauthenticated routes. */
export function clientKey(req: Request) {
  const fwd = req.headers.get('x-forwarded-for')
  const ip = fwd ? fwd.split(',')[0].trim() : req.headers.get('x-real-ip')
  return ip || 'unknown'
}
