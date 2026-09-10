import { z } from 'zod'
import { db } from '@/lib/db'
import { requireVenture } from '@/lib/auth'
import { handle, ok } from '@/lib/api'

const Body = z.object({ archived: z.boolean() })

/** Archive is reversible; delete is not. The library offers both. */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params
    await requireVenture(id)
    const { archived } = Body.parse(await req.json())
    const venture = await db.venture.update({
      where: { id },
      data: { status: archived ? 'archived' : 'active' },
    })
    return ok({ venture })
  } catch (err) {
    return handle(err)
  }
}
