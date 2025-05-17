// Clean seed data from database
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanSeedData() {
  try {
    console.log('Connecting to database...');
    
    // Delete test user data
    const testUser = await prisma.user.findUnique({
      where: { email: 'test@example.com' }
    });
    
    if (testUser) {
      console.log('Deleting test user data...');
      
      // Delete all related records first
      await prisma.transcriptEntry.deleteMany({ 
        where: { session: { userId: testUser.id } } 
      });
      console.log('Deleted transcript entries');
      
      await prisma.session.deleteMany({ 
        where: { userId: testUser.id } 
      });
      console.log('Deleted therapy sessions');
      
      await prisma.progressTracking.deleteMany({ 
        where: { userId: testUser.id } 
      });
      console.log('Deleted progress tracking data');
      
      await prisma.communicationMetrics.deleteMany({ 
        where: { userId: testUser.id } 
      });
      console.log('Deleted communication metrics');
      
      // Delete the test user
      await prisma.user.delete({
        where: { id: testUser.id }
      });
      console.log('Deleted test user');
    } else {
      console.log('No test user found');
    }
    
    console.log('Seed data cleanup completed successfully');
  } catch (error) {
    console.error('Error cleaning seed data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanSeedData();