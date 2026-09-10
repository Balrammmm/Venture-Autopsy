import { z } from 'zod'
import { db } from '@/lib/db'
import { createSession } from '@/lib/auth'
import { handle, ok } from '@/lib/api'
import { BURST, burst, clientKey, readJson } from '@/lib/limits'

const Body = z.object({
  email: z.string().email('Enter a valid email address.'),
  name: z.string().min(1, 'Enter your name.').max(80),
})

/** Demo sign-in: no password by design. Creates the user on first use. */
export async function POST(req: Request) {
  try {
    // Unauthenticated, and it creates rows — so it is keyed by client address
    // rather than by user, and held tight.
    burst(`demo:${clientKey(req)}`, BURST.auth)

    const { email, name } = Body.parse(await readJson(req))
    const normalised = email.trim().toLowerCase()

    const user = await db.user.upsert({
      where: { email: normalised },
      update: { name },
      create: { email: normalised, name },
    })

    await createSession(user.id)
    return ok({ user: { id: user.id, email: user.email, name: user.name, onboarded: user.onboarded } })
  } catch (err) {
    return handle(err)
  }
}
