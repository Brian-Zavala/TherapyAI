// Clean migration database using Prisma Client
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanMigrationTable() {
  try {
    console.log('Connecting to database...');
    
    // Execute raw query to remove problematic migration
    console.log('Removing failed migration from _prisma_migrations table...');
    await prisma.$executeRawUnsafe(`
      DELETE FROM "_prisma_migrations" 
      WHERE migration_name = '20250515_add_nextauth_models'
    `);
    
    console.log('Migration record removed successfully');
    console.log('Now run: npx prisma migrate reset --force');
  } catch (error) {
    console.error('Error cleaning migration table:', error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanMigrationTable();