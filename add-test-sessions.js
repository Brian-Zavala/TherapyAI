const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Add test sessions for solo and family therapy
  const userId = await prisma.user.findFirst().then(user => user.id);
  
  if (\!userId) {
    console.log('No users found, cannot create test sessions');
    return;
  }
  
  console.log(`Using user ID: ${userId}`);
  
  // Create a solo therapy session
  const soloSession = await prisma.session.create({
    data: {
      userId,
      date: new Date(),
      duration: 45,
      theme: 'Individual Therapy',
      status: 'completed',
      notes: 'Test solo therapy session'
    }
  });
  
  console.log('Created solo therapy session:', soloSession);
  
  // Create a family therapy session
  const familySession = await prisma.session.create({
    data: {
      userId,
      date: new Date(),
      duration: 60,
      theme: 'Family Therapy',
      status: 'completed',
      notes: 'Test family therapy session'
    }
  });
  
  console.log('Created family therapy session:', familySession);

  await prisma.$disconnect();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
