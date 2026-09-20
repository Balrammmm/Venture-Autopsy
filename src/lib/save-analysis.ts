import 'server-only'
import { db } from './db'
import type { Verdict } from './atlas-types'

export async function saveAnalysisVersion(ventureId: string, section: string, data: unknown, evidence: string, model: string) {
  return db.$transaction(async tx => {
    const prior = await tx.analysis.findFirst({ where: { ventureId, section }, orderBy: { version: 'desc' } })
    await tx.analysis.updateMany({ where: { ventureId, section, isCurrent: true }, data: { isCurrent: false } })
    const created = await tx.analysis.create({ data: { ventureId, section, data: JSON.stringify(data), evidence, version: (prior?.version ?? 0) + 1, isCurrent: true, model } })
    if (section === 'verdict') {
      const verdict = data as Verdict
      await tx.venture.update({ where: { id: ventureId }, data: { verdict: verdict.verdict, confidence: verdict.confidence, healthScore: Math.min(100, Math.max(0, verdict.healthScore)), accent: verdict.verdict === 'High Risk' ? 'ember' : 'lime' } })
    }
    return created
  })
}
