// Test if the Google OAuth setup is working correctly
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testGoogleAuth() {
  try {
    // Check if we can access the account table
    const accounts = await prisma.account.findMany({
      take: 1
    });
    console.log('Account table is accessible:', accounts);
    
    // Check user table structure
    const firstUser = await prisma.user.findFirst();
    console.log('User structure:', firstUser ? Object.keys(firstUser) : 'No users');
    
    // Test if we can create a test account
    const randomEmail = `test-${Date.now()}@example.com`;
    const testUser = await prisma.user.create({
      data: {
        email: randomEmail,
        name: 'Test User',
        password: null
      }
    });
    
    const testAccount = await prisma.account.create({
      data: {
        userId: testUser.id,
        type: 'oauth',
        provider: 'google',
        providerAccountId: 'test123',
        access_token: 'test',
        token_type: 'Bearer'
      }
    });
    
    console.log('Test account created:', testAccount);
    
    // Clean up
    await prisma.account.delete({ where: { id: testAccount.id } });
    await prisma.user.delete({ where: { id: testUser.id } });
    
    console.log('Test successful!');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testGoogleAuth();