import { db } from '@/lib/db'
import { requireUser } from '@/lib/auth'
import { modelInfo } from '@/lib/gemini'
import { handle, ok } from '@/lib/api'

/** Reports whether the server has a key — never the key itself. */
export async function GET() {
  try {
    const user = await requireUser()
    const [ventures, archived, sources] = await Promise.all([
      db.venture.count({ where: { userId: user.id, status: 'active' } }),
      db.venture.count({ where: { userId: user.id, status: 'archived' } }),
      db.researchSource.count({ where: { venture: { userId: user.id } } }),
    ])
    return ok({
      gemini: modelInfo(),
      profile: {
        name: user.name,
        email: user.email,
        role: user.role,
        strengths: user.strengths,
        capital: user.capital,
        timeframe: user.timeframe,
        riskAppetite: user.riskAppetite,
      },
      counts: { ventures, archived, sources },
    })
  } catch (err) {
    return handle(err)
  }
}
