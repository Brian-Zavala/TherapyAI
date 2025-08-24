// Database helper functions for the new enhanced schema
import { prisma } from '@/lib/database/prisma-optimized'
import { Prisma } from '@prisma/client'

export async function getUserWithProfile(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    include: {
      profile: true,
      familyMembers: {
        where: { isActive: true },
        orderBy: { order: 'asc' }
      }
    }
  })
}

export async function getUserByEmail(email: string) {
  return prisma.user.findUnique({
    where: { email },
    include: {
      profile: true,
      familyMembers: {
        where: { isActive: true },
        orderBy: { order: 'asc' }
      }
    }
  })
}

export async function createOrUpdateUserProfile(userId: string, data: any) {
  return prisma.userProfile.upsert({
    where: { userId },
    create: {
      userId,
      sessionPreference: data.sessionPreference,
      communicationStyle: data.communicationStyle,
      notificationPrefs: data.notificationPrefs || 'email',
      sessionFrequency: data.sessionFrequency,
      preferredDays: data.preferredDays,
      recurringSession: data.recurringSession,
      reminderTiming: data.reminderTiming,
      partnerName: data.partnerName,
      partnerAge: data.partnerAge,
      relationshipStatus: data.relationshipStatus || null,
      currentConcerns: data.currentConcerns,
      additionalNotes: data.additionalNotes,
      assistantId: data.assistantId,
      pronouns: data.pronouns,
      age: data.age,
      phone: data.phone,
      emergencyContact: data.emergencyContact
    },
    update: {
      sessionPreference: data.sessionPreference,
      communicationStyle: data.communicationStyle,
      notificationPrefs: data.notificationPrefs,
      sessionFrequency: data.sessionFrequency,
      preferredDays: data.preferredDays,
      recurringSession: data.recurringSession,
      reminderTiming: data.reminderTiming,
      partnerName: data.partnerName,
      partnerAge: data.partnerAge,
      relationshipStatus: data.relationshipStatus,
      currentConcerns: data.currentConcerns,
      additionalNotes: data.additionalNotes,
      assistantId: data.assistantId,
      pronouns: data.pronouns,
      age: data.age,
      phone: data.phone,
      emergencyContact: data.emergencyContact
    }
  })
}

export async function createFamilyMembers(userId: string, familyData: any[]) {
  // Delete existing family members
  await prisma.familyMember.deleteMany({
    where: { userId }
  })
  
  // Create normalized family members
  const familyMembers = familyData
    .filter(member => member.name)
    .map((member, index) => ({
      userId,
      name: member.name,
      age: member.age ? parseInt(member.age) : null,
      relationship: member.relationship || 'Family Member',
      order: index + 1,
      isActive: true
    }))
  
  if (familyMembers.length > 0) {
    return prisma.familyMember.createMany({
      data: familyMembers
    })
  }
  
  return { count: 0 }
}

export async function createSessionWithType(data: Prisma.SessionCreateInput & { sessionType?: string }) {
  return prisma.session.create({
    data: {
      ...data,
      sessionType: data.sessionType || 'COUPLE'
    }
  })
}

export async function createSessionMetrics(
  sessionId: string,
  userId: string,
  metrics: {
    clarity?: number
    empathy?: number
    respect?: number
    overall?: number
    listening?: number
    expression?: number
    confidence?: number
    // Legacy field mapping
    activeListening?: number
    emotionalSupport?: number
    conflictResolution?: number
    expressingNeeds?: number
  },
  metricType: 'real-time' | 'final' | 'manual' = 'final'
) {
  return prisma.communicationMetric.create({
    data: {
      sessionId,
      userId,
      clarity: metrics.clarity || metrics.activeListening || 50,
      empathy: metrics.empathy || metrics.emotionalSupport || 50,
      respect: metrics.respect || metrics.conflictResolution || 50,
      overall: metrics.overall || 50,
      listening: metrics.listening || metrics.activeListening || 50,
      expression: metrics.expression || metrics.expressingNeeds || 50,
      metricType,
      calculatedAt: new Date(),
      confidence: metrics.confidence
    }
  })
}

// Helper to get family members in old format (for backward compatibility)
export function getFamilyMembersAsLegacy(familyMembers: any[]) {
  const legacy: any = {}
  
  familyMembers.forEach((member, index) => {
    const num = index + 1
    legacy[`familyMember${num}`] = member.name
    legacy[`familyMember${num}Age`] = member.age
    legacy[`familyMember${num}Relation`] = member.relationship
  })
  
  return legacy
}
