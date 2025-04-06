// create-user.js
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function createUser() {
  try {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: 'brian.zavala25@proton.me' }
    });

    if (existingUser) {
      console.log('User already exists:', existingUser.id);
      return existingUser;
    }

    // Create new user with hashed password
    const password = await bcrypt.hash('your-password', 10); // Replace with actual password
    
    const user = await prisma.user.create({
      data: {
        email: 'brian.zavala25@proton.me',
        name: 'Brian Zavala',
        password,
        relationshipStatus: 'Married',
      }
    });
    
    console.log('User created successfully:', user.id);
    return user;
  } catch (error) {
    console.error('Error creating user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createUser();