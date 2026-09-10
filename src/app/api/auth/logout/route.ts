import { destroySession } from '@/lib/auth'
import { handle, ok } from '@/lib/api'

export async function POST() {
  try {
    await destroySession()
    return ok({ ok: true })
  } catch (err) {
    return handle(err)
  }
}
