import { createHmac, randomBytes, timingSafeEqual } from 'crypto'
import { cookies } from 'next/headers'
import { db } from './db'
import { BURST, burst } from './limits'

const COOKIE = 'va_session'
const MAX_AGE_DAYS = 30

/**
 * Session signing key.
 *
 * In production a missing secret is fatal rather than defaulted: a known
 * fallback would let anyone forge a session cookie for any account. Locally it
 * falls back, so `npm run dev` works before the env file is filled in.
 */
function secret() {
  const value = process.env.SESSION_SECRET
  if (value && value.length >= 16) return value

  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'SESSION_SECRET is missing or too short. Set it to a long random string in the host environment.',
    )
  }
  return 'venture-autopsy-dev-secret'
}

/**
 * Demo auth: no password, no external provider — the brief calls for a simple
 * onboarding flow. Sessions are still real rows with a signed, httpOnly cookie,
 * so the token cannot be forged client-side and can be revoked server-side.
 */
function sign(token: string) {
  return createHmac('sha256', secret()).update(token).digest('hex')
}

function pack(token: string) {
  return `${token}.${sign(token)}`
}

function unpack(value: string | undefined): string | null {
  if (!value) return null
  const idx = value.lastIndexOf('.')
  if (idx < 1) return null
  const token = value.slice(0, idx)
  const mac = value.slice(idx + 1)
  const expected = sign(token)
  if (mac.length !== expected.length) return null
  try {
    if (!timingSafeEqual(Buffer.from(mac), Buffer.from(expected))) return null
  } catch {
    return null
  }
  return token
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + MAX_AGE_DAYS * 864e5)
  await db.session.create({ data: { token, userId, expiresAt } })

  const jar = await cookies()
  jar.set(COOKIE, pack(token), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: MAX_AGE_DAYS * 86400,
  })
  return token
}

export async function getCurrentUser() {
  const jar = await cookies()
  const token = unpack(jar.get(COOKIE)?.value)
  if (!token) return null

  const session = await db.session.findUnique({ where: { token }, include: { user: true } })
  if (!session) return null
  if (session.expiresAt < new Date()) {
    await db.session.delete({ where: { id: session.id } }).catch(() => {})
    return null
  }
  return session.user
}

export async function destroySession() {
  const jar = await cookies()
  const token = unpack(jar.get(COOKIE)?.value)
  if (token) await db.session.deleteMany({ where: { token } })
  jar.delete(COOKIE)
}

/** Throws a 401-shaped error for route handlers. */
export class Unauthorized extends Error {
  constructor() {
    super('Not signed in')
    this.name = 'Unauthorized'
  }
}

/**
 * Every authenticated route funnels through here, so the burst limit lives
 * here too — coverage by construction rather than by remembering to add a line
 * to each new route. Routes that call the model charge extra on top.
 */
export async function requireUser() {
  const user = await getCurrentUser()
  if (!user) throw new Unauthorized()
  burst(`user:${user.id}`, BURST.standard)
  return user
}

/** Ownership check — every venture route funnels through this. */
export async function requireVenture(ventureId: string) {
  const user = await requireUser()
  const venture = await db.venture.findFirst({ where: { id: ventureId, userId: user.id } })
  if (!venture) {
    const err = new Error('Venture not found')
    err.name = 'NotFound'
    throw err
  }
  return { user, venture }
}
