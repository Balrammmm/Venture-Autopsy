import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

async function main() {
  const demo = await db.venture.findFirst({
    where: {
      user: { email: 'founder@demo.local' },
      title: 'Repair Desk for Small Landlords',
      stage: 'analysed',
    },
    select: { id: true },
  })

  if (demo) {
    console.log(`Demo fixture already present (${demo.id})`)
    return
  }

  const { seedPromise } = await import('./seed')
  await seedPromise
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
