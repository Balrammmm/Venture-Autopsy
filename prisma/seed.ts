import { PrismaClient } from '@prisma/client'
import { DEMO_ATLAS, DEMO_IDEA, DEMO_SOURCES } from '../src/lib/demo-atlas'

const db = new PrismaClient()

async function main() {
  const email = 'founder@demo.local'

  // Idempotent: re-running the seed refreshes the demo venture rather than duplicating it.
  const user = await db.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      name: 'Demo Founder',
      role: 'Technical founder, first venture',
      strengths: JSON.stringify(['Software', 'Product', 'Ops']),
      capital: 'Under £10k, self-funded',
      timeframe: 'Evenings and weekends for 6 months',
      riskAppetite: 'Cautious — will not quit the day job without evidence',
      onboarded: true,
    },
  })

  await db.venture.deleteMany({ where: { userId: user.id, title: DEMO_ATLAS.title } })

  const venture = await db.venture.create({
    data: {
      userId: user.id,
      title: DEMO_ATLAS.title,
      rawIdea: DEMO_IDEA,
      stage: 'analysed',
      verdict: DEMO_ATLAS.verdict.verdict,
      confidence: DEMO_ATLAS.verdict.confidence,
      healthScore: DEMO_ATLAS.verdict.healthScore,
      accent: DEMO_ATLAS.verdict.verdict === 'High Risk' ? 'ember' : 'lime',
      ideaInputs: { create: { kind: 'idea', content: DEMO_IDEA } },
    },
  })

  const sections = ['genome', 'market', 'failures', 'pivots', 'model', 'scenarios', 'launch', 'verdict'] as const
  for (const section of sections) {
    await db.analysis.create({
      data: {
        ventureId: venture.id,
        section,
        data: JSON.stringify(DEMO_ATLAS[section]),
        evidence: 'user_provided',
        model: 'seed',
      },
    })
  }

  for (const s of DEMO_SOURCES) {
    await db.researchSource.create({ data: { ...s, ventureId: venture.id } })
  }

  const created: Record<string, string> = {}
  for (const [i, a] of DEMO_ATLAS.assumptions.entries()) {
    const row = await db.assumption.create({
      data: {
        ventureId: venture.id,
        claim: a.claim,
        category: a.category,
        impact: a.impact,
        uncertainty: a.uncertainty,
        breaksIfFalse: a.breaksIfFalse,
        proofNeeded: a.proofNeeded,
        cheapestTest: a.cheapestTest,
        testCost: a.testCost,
        testDuration: a.testDuration,
        status: i === 0 ? 'testing' : i === 3 ? 'supported' : 'untested',
        // Deterministic scatter so the minefield layout is stable between visits.
        x: 0.12 + ((a.uncertainty - 1) / 4) * 0.76,
        y: 0.12 + ((5 - a.impact) / 4) * 0.76,
      },
    })
    created[a.claim] = row.id
  }

  for (const e of DEMO_ATLAS.experiments) {
    await db.experiment.create({
      data: {
        ventureId: venture.id,
        assumptionId: created[e.assumptionClaim] ?? null,
        name: e.name,
        kind: e.kind,
        hypothesis: e.hypothesis,
        method: e.method,
        script: JSON.stringify(e.script),
        successThreshold: e.successThreshold,
        failThreshold: e.failThreshold,
        sampleSize: e.sampleSize,
        duration: e.duration,
        cost: e.cost,
        status: 'planned',
      },
    })
  }

  console.log(`Seeded ${user.email} with venture "${venture.title}" (${venture.id})`)
}

export const seedPromise = main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
