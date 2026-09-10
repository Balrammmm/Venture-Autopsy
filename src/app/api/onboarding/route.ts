import { z } from 'zod'
import { db } from '@/lib/db'
import { requireUser } from '@/lib/auth'
import { handle, ok } from '@/lib/api'

const Body = z.object({
  role: z.string().max(120).optional(),
  strengths: z.array(z.string()).max(12).optional(),
  capital: z.string().max(120).optional(),
  timeframe: z.string().max(120).optional(),
  riskAppetite: z.string().max(120).optional(),
})

export async function POST(req: Request) {
  try {
    const user = await requireUser()
    const body = Body.parse(await req.json())
    const updated = await db.user.update({
      where: { id: user.id },
      data: {
        role: body.role,
        strengths: body.strengths ? JSON.stringify(body.strengths) : undefined,
        capital: body.capital,
        timeframe: body.timeframe,
        riskAppetite: body.riskAppetite,
        onboarded: true,
      },
    })
    return ok({ user: { id: updated.id, onboarded: updated.onboarded } })
  } catch (err) {
    return handle(err)
  }
}
