import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'
import { v4 as uuidv4 } from 'uuid'

const prisma = new PrismaClient()

async function main() {
  // Create test user
  const password = await bcrypt.hash('password123', 10)
  
  const user = await prisma.user.upsert({
    where: { email: 'test@example.com' },
    update: {
      name: 'Test User',
      partnerName: 'Partner Name',
      relationshipStatus: 'Married'
    },
    create: {
      email: 'test@example.com',
      name: 'Test User',
      password,
      partnerName: 'Partner Name',
      relationshipStatus: 'Married'
    }
  })
  
  console.log('Test user created:', { id: user.id, email: user.email })
  
  // Create past sessions
  const today = new Date()
  
  // Clear existing data for clean seed
  await prisma.session.deleteMany({ where: { userId: user.id } })
  await prisma.progressTracking.deleteMany({ where: { userId: user.id } })
  await prisma.communicationMetrics.deleteMany({ where: { userId: user.id } })
  
  // Create one session per month for the last 6 months
  for (let i = 0; i < 6; i++) {
    const sessionDate = new Date()
    sessionDate.setMonth(today.getMonth() - i)
    sessionDate.setDate(15) // Middle of the month
    
    await prisma.session.create({
      data: {
        id: uuidv4(),
        userId: user.id,
        date: sessionDate,
        duration: 60 + (i * 10), // Increasing duration each month
        theme: `Communication Strategies ${i + 1}`,
        notes: `Notes for session ${i + 1}. Discussed relationship dynamics and communication patterns.`,
        status: 'completed'
      }
    })
    
    console.log(`Created past session for ${sessionDate.toISOString().split('T')[0]}`)
  }
  
  // Create upcoming sessions
  for (let i = 1; i <= 3; i++) {
    const futureDate = new Date()
    futureDate.setDate(today.getDate() + (i * 7)) // Weekly sessions
    
    await prisma.session.create({
      data: {
        id: uuidv4(),
        userId: user.id,
        date: futureDate,
        duration: 60,
        theme: `Upcoming Session: ${['Trust Building', 'Conflict Resolution', 'Enhancing Intimacy'][i-1]}`,
        status: 'scheduled'
      }
    })
    
    console.log(`Created upcoming session for ${futureDate.toISOString().split('T')[0]}`)
  }
  
  // Create progress tracking data
  for (let i = 0; i < 6; i++) {
    const trackingDate = new Date()
    trackingDate.setDate(today.getDate() - (i * 7)) // Weekly data points
    
    await prisma.progressTracking.create({
      data: {
        id: uuidv4(),
        userId: user.id,
        date: trackingDate,
        closenessScore: Math.min(60 + (i * 5), 95), // Improving scores over time, max 95
        communicationScore: Math.min(65 + (i * 5), 95) // Improving scores over time, max 95
      }
    })
    
    console.log(`Created progress tracking for ${trackingDate.toISOString().split('T')[0]}`)
  }
  
  // Create communication metrics
  await prisma.communicationMetrics.create({
    data: {
      id: uuidv4(),
      userId: user.id,
      date: today,
      activeListeningScore: 75,
      expressingNeedsScore: 65,
      conflictResolutionScore: 60,
      emotionalSupportScore: 80
    }
  })
  
  console.log('Created communication metrics')
  
  console.log('Seed data created successfully')
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })