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
  familyMember1Age: true,
  familyMember1Relation: true,
  familyMember2: true,
  familyMember2Age: true,
  familyMember2Relation: true,
  familyMember3: true,
  familyMember3Age: true,
  familyMember3Relation: true,
  familyMember4: true,
  familyMember4Age: true,
  familyMember4Relation: true,
  familyMember5: true,
  familyMember5Age: true,
  familyMember5Relation: true,
  familyMember6: true,
  familyMember6Age: true,
  familyMember6Relation: true,
  familyMember7: true,
  familyMember7Age: true,
  familyMember7Relation: true,
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