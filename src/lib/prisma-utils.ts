// Temporary utility for excluding phone field from User queries
// This is a workaround for the missing phone column issue

export const userSelectWithoutPhone = {
  id: true,
  email: true,
  emailVerified: true,
  name: true,
  password: true,
  partnerName: true,
  relationshipStatus: true,
  assistantId: true,
  familyMember1: true,
  familyMember2: true,
  familyMember3: true,
  familyMember4: true,
  pronouns: true,
  therapyType: true,
  currentConcerns: true,
  emergencyContact: true,
  sessionPreference: true,
  communicationStyle: true,
  additionalNotes: true,
  image: true,
  onboardingCompleted: true,
  onboardingData: true,
  notificationPrefs: true,
  // Excluding phone field intentionally
  // phone: true,
  
  // Include relations
  accounts: true,
  authSessions: true,
  communicationMetrics: true,
  progressTracking: true,
  sessions: true,
  therapySessions: true,
}

// Helper function to find user without phone field
export async function findUserWithoutPhone(prisma: any, where: any) {
  return await prisma.user.findUnique({
    where,
    select: userSelectWithoutPhone
  })
}

// Helper function to find many users without phone field
export async function findManyUsersWithoutPhone(prisma: any, where?: any) {
  return await prisma.user.findMany({
    where,
    select: userSelectWithoutPhone
  })
}