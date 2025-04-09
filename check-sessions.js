const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Get distinct theme values
  const themes = await prisma.$queryRaw`SELECT DISTINCT theme FROM "Session"`;
  console.log('Available themes:', themes);
  
  // Count by theme
  const themeCount = await prisma.$queryRaw`SELECT theme, COUNT(*) FROM "Session" GROUP BY theme`;
  console.log('Theme distribution:', themeCount);
  
  // Check for completed sessions
  const completedCount = await prisma.$queryRaw`SELECT theme, COUNT(*) FROM "Session" WHERE status = 'completed' GROUP BY theme`;
  console.log('Completed sessions by theme:', completedCount);

  await prisma.$disconnect();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
