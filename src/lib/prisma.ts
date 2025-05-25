// src/lib/prisma.ts
import { PrismaClient } from '@prisma/client'

const globalForPrisma = global as unknown as { prisma: PrismaClient }

// Log DATABASE_URL status (not the actual URL for security)
if (process.env.NODE_ENV === 'development') {
  console.log('DATABASE_URL defined:', !!process.env.DATABASE_URL)
  console.log('DATABASE_URL length:', process.env.DATABASE_URL?.length || 0)
  // Check for common issues
  if (process.env.DATABASE_URL) {
    const hasSpecialChars = /[<>'"{}|\\^`\[\]]/g.test(process.env.DATABASE_URL)
    if (hasSpecialChars) {
      console.warn('DATABASE_URL contains special characters that may need escaping')
    }
  }
}

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma