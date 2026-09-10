import { db } from '@/lib/db'
import { requireVenture } from '@/lib/auth'
import { handle, ok } from '@/lib/api'

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string; sourceId: string }> }) {
  try {
    const { id, sourceId } = await ctx.params
    await requireVenture(id)
    await db.researchSource.deleteMany({ where: { id: sourceId, ventureId: id } })
    return ok({ deleted: sourceId })
  } catch (err) {
    return handle(err)
  }
}
