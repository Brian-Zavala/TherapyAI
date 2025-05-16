const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function migrateOnboardingData() {
  try {
    console.log('Starting onboarding data migration...');
    
    // Fetch all users with onboardingData
    const users = await prisma.user.findMany({
      where: {
        onboardingData: { not: null }
      }
    });
    
    console.log(`Found ${users.length} users with onboarding data`);
    
    for (const user of users) {
      const data = user.onboardingData;
      
      if (!data) continue;
      
      console.log(`Migrating data for user: ${user.email}`);
      
      try {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            pronouns: data.pronouns || null,
            therapyType: data.therapyType || null,
            currentConcerns: data.goals || null,
            emergencyContact: data.emergencyContact || null,
            sessionPreference: data.sessionTime || null,
            communicationStyle: data.communicationStyle || null,
            additionalNotes: data.additionalNotes || null
          }
        });
        
        console.log(`Successfully migrated user: ${user.email}`);
      } catch (error) {
        console.error(`Error migrating user ${user.email}:`, error);
      }
    }
    
    console.log('Migration completed');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

migrateOnboardingData();