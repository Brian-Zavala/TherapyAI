// create-sessions.js
const { PrismaClient } = require('@prisma/client');
const { v4: uuidv4 } = require('uuid');

const prisma = new PrismaClient();

async function createSessionsForUser(userEmail) {
  try {
    // Find the user
    const user = await prisma.user.findUnique({
      where: { email: userEmail }
    });

    if (!user) {
      console.error('User not found:', userEmail);
      return;
    }

    console.log('Creating sessions for user:', user.id);
    
    // Delete existing sessions for this user
    await prisma.session.deleteMany({
      where: { userId: user.id }
    });
    
    // Create past sessions
    const today = new Date();
    
    // Create one session per month for the last 4 months
    for (let i = 0; i < 4; i++) {
      const sessionDate = new Date();
      sessionDate.setMonth(today.getMonth() - i);
      sessionDate.setDate(15); // Middle of the month
      
      await prisma.session.create({
        data: {
          id: uuidv4(),
          userId: user.id,
          date: sessionDate,
          duration: 60 + (i * 10), // Increasing duration each month
          theme: `Communication Strategies ${i + 1}`,
          notes: `Notes for session ${i + 1}. Discussed relationship dynamics and communication patterns.`,
          status: 'completed',
          transcript: `USER: Hello, I'm having communication issues with my partner.\nTHERAPIST: I understand that can be frustrating. Can you tell me more about what's happening?\nUSER: We often talk past each other and don't really listen.\nTHERAPIST: That's a common challenge. Let's explore some active listening techniques that might help both of you feel more heard.`,
          reminderSent: false
        }
      });
      
      console.log(`Created past session for ${sessionDate.toISOString().split('T')[0]}`);
    }
    
    // Create upcoming sessions
    for (let i = 1; i <= 2; i++) {
      const futureDate = new Date();
      futureDate.setDate(today.getDate() + (i * 7)); // Weekly sessions
      
      await prisma.session.create({
        data: {
          id: uuidv4(),
          userId: user.id,
          date: futureDate,
          duration: 60,
          theme: `Upcoming Session: ${['Trust Building', 'Conflict Resolution'][i-1]}`,
          status: 'scheduled',
          reminderSent: false
        }
      });
      
      console.log(`Created upcoming session for ${futureDate.toISOString().split('T')[0]}`);
    }
    
    console.log('Sessions created successfully');
    
  } catch (error) {
    console.error('Error creating sessions:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the function with the user's email
createSessionsForUser('brian.zavala25@proton.me');