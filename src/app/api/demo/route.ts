import { db } from '@/lib/db'
import { createSession } from '@/lib/auth'
import { handle, ok, fail } from '@/lib/api'
import { BURST, burst, clientKey } from '@/lib/limits'

/** The existing worked example, opened without re-seeding or regenerating any data. */
export async function POST(req: Request) {
  try {
    burst(`demo:${clientKey(req)}`, BURST.auth)
    const venture = await db.venture.findFirst({
      where: { user: { email: 'founder@demo.local' }, analyses: { some: { model: 'seed' } } },
      orderBy: { createdAt: 'asc' }, select: { id: true, userId: true },
    })
    if (!venture) return fail('The worked example is not installed.', 404, 'Your own ventures are unchanged. Open the venture library or run the documented first-time setup.')
    await createSession(venture.userId)
    return ok({ ventureId: venture.id })
  } catch (err) { return handle(err) }
}
