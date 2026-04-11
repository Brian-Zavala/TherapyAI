// src/lib/auth.ts
// Clerk auth helpers - drop-in replacement for NextAuth patterns
import { auth, currentUser } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma-optimized'
import { creditManager } from '@/lib/services/credit-manager.service'

/**
 * Get the current authenticated user's session info.
 * Drop-in replacement for `getServerSession(authOptions)`.
 * Returns a session-like object with `user.id`, `user.email`, `user.name`, `user.image`.
 */
export async function getAuthSession() {
  const { userId } = await auth()

  if (!userId) {
    return null
  }

  const clerkUser = await currentUser()
  if (!clerkUser) {
    return null
  }

  // Find or create the database user linked to this Clerk user
  const dbUser = await findOrCreateUser(clerkUser)

  return {
    user: {
      id: dbUser.id,
      email: dbUser.email,
      name: dbUser.name,
      image: dbUser.image,
    }
  }
}

/**
 * Find user by Clerk ID, or by email and link them, or create new user.
 */
async function findOrCreateUser(clerkUser: {
  id: string
  emailAddresses: { emailAddress: string }[]
  firstName: string | null
  lastName: string | null
  imageUrl: string
}) {
  const email = clerkUser.emailAddresses[0]?.emailAddress
  if (!email) {
    throw new Error('Clerk user has no email address')
  }

  const name = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ') || email.split('@')[0]

  // First try to find by clerkId
  let user = await prisma.user.findFirst({
    where: { clerkId: clerkUser.id }
  })

  if (user) {
    await ensureCreditsExist(user.id)
    return user
  }

  // Try to find by email (for existing users migrating from NextAuth)
  user = await prisma.user.findUnique({
    where: { email }
  })

  if (user) {
    // Link existing user to Clerk
    if (!user.clerkId) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { clerkId: clerkUser.id, image: clerkUser.imageUrl || user.image }
      })
    }

    // Ensure credits exist for migrated users
    await ensureCreditsExist(user.id)

    return user
  }

  // Create new user
  user = await prisma.user.create({
    data: {
      email,
      name,
      clerkId: clerkUser.id,
      image: clerkUser.imageUrl || null,
      emailVerified: new Date(),
    }
  })

  // Initialize free tier credits
  await ensureCreditsExist(user.id)

  return user
}

/**
 * Ensure a user has credits for the current billing period.
 * Creates free tier credits if none exist.
 */
async function ensureCreditsExist(userId: string) {
  try {
    const now = new Date()
    // Check if user has any active credits
    const existingCredits = await prisma.usageCredits.findFirst({
      where: {
        userId,
        billingPeriodStart: { lte: now },
        billingPeriodEnd: { gte: now },
      },
    })

    if (existingCredits && existingCredits.totalCredits > 0) return // Credits already exist

    const billingStart = new Date()
    const billingEnd = new Date()
    billingEnd.setMonth(billingEnd.getMonth() + 1)

    if (existingCredits && existingCredits.totalCredits === 0) {
      // Fix existing zero-credit row
      await prisma.usageCredits.update({
        where: { id: existingCredits.id },
        data: { totalCredits: 30, planType: 'free' },
      })
      console.log(`✓ Fixed zero-credit row for user: ${userId}`)
      return
    }

    // Try credit manager first
    try {
      await creditManager.initializeBillingPeriod(userId, 'free', billingStart, billingEnd)
      console.log(`✓ Initialized free tier (30 credits) for user: ${userId}`)
    } catch (cmError) {
      // Direct DB fallback if credit manager fails (e.g. Redis idempotency issues)
      console.warn(`CreditManager failed, using direct DB insert for user ${userId}:`, cmError)
      await prisma.usageCredits.create({
        data: {
          userId,
          totalCredits: 30,
          usedCredits: 0,
          bonusCredits: 0,
          billingPeriodStart: billingStart,
          billingPeriodEnd: billingEnd,
          planType: 'free',
        },
      })
      console.log(`✓ Direct DB: Initialized free tier (30 credits) for user: ${userId}`)
    }
  } catch (error) {
    console.error(`Failed to ensure credits for user ${userId}:`, error)
  }
}
