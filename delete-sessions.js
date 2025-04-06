// delete-sessions.js
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function deleteAllSessions() {
  try {
    // Delete all sessions
    const result = await prisma.session.deleteMany({});
    
    console.log(`Deleted ${result.count} sessions`);
    
    // Verify no sessions remain
    const remaining = await prisma.session.count();
    console.log(`Remaining sessions: ${remaining}`);
    
    return result;
  } catch (error) {
    console.error('Error deleting sessions:', error);
  } finally {
    await prisma.$disconnect();
  }
}

deleteAllSessions();