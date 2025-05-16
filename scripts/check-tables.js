const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkTables() {
  try {
    // Check if Account table exists
    const accountCount = await prisma.account.count().catch(() => null);
    console.log('Account table exists:', accountCount !== null);
    
    // Check if AuthSession table exists
    const authSessionCount = await prisma.authSession.count().catch(() => null);
    console.log('AuthSession table exists:', authSessionCount !== null);
    
    // Check if Session table exists (therapy sessions)
    const sessionCount = await prisma.session.count().catch(() => null);
    console.log('Session table exists:', sessionCount !== null);
    
    // Check User table columns
    const users = await prisma.user.findFirst();
    console.log('User table has image column:', users ? 'image' in users : false);
    console.log('User table has emailVerified column:', users ? 'emailVerified' in users : false);
    
  } catch (error) {
    console.error('Error checking tables:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkTables();