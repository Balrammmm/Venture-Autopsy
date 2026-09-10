import { getCurrentUser } from '@/lib/auth'
import { handle, ok } from '@/lib/api'

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) return ok({ user: null })
    return ok({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        onboarded: user.onboarded,
        role: user.role,
        strengths: user.strengths,
        capital: user.capital,
        timeframe: user.timeframe,
        riskAppetite: user.riskAppetite,
      },
    })
  } catch (err) {
    return handle(err)
  }
}
