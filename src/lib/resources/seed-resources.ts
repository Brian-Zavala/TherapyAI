// Run once to populate the Resource table:
//   npx ts-node --project tsconfig.json src/lib/resources/seed-resources.ts
// Or via the admin route: POST /api/admin/seed-resources

import { prisma } from '@/lib/prisma-optimized'
import { SEED_RESOURCES } from './resource-seed-data'

export async function seedResources() {
  // Wipe and re-seed so this is idempotent
  await prisma.resource.deleteMany()

  const created = await prisma.resource.createMany({
    data: SEED_RESOURCES.map(r => ({
      title: r.title,
      description: r.description,
      type: r.type,
      categories: r.categories,
      sessionTypes: r.sessionTypes,
      concerns: r.concerns,
      difficulty: r.difficulty,
      source: r.source,
      url: r.url ?? null,
      duration: r.duration ?? null,
      steps: r.steps ?? [],
      isExternal: false,
    })),
  })

  return created.count
}
