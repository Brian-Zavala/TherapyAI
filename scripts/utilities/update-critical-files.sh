#!/bin/bash

# Update critical files to use new enhanced schema

echo "🔧 Updating critical files to use enhanced schema..."

# 1. Update API routes for CommunicationMetric
echo "Updating communication metrics routes..."

# Update the route file
if [ -f "src/app/api/dashboard/communication-metrics/route.ts" ]; then
  sed -i 's/prisma\.communicationMetrics/prisma.communicationMetric/g' src/app/api/dashboard/communication-metrics/route.ts
  sed -i 's/activeListeningScore/listening/g' src/app/api/dashboard/communication-metrics/route.ts
  sed -i 's/expressingNeedsScore/expression/g' src/app/api/dashboard/communication-metrics/route.ts
  sed -i 's/conflictResolutionScore/respect/g' src/app/api/dashboard/communication-metrics/route.ts
  sed -i 's/emotionalSupportScore/empathy/g' src/app/api/dashboard/communication-metrics/route.ts
  echo "✅ Updated communication-metrics route"
fi

# 2. Update save assessment route
if [ -f "src/app/api/dashboard/save-assessment/route.ts" ]; then
  sed -i 's/prisma\.communicationMetrics\.create/prisma.communicationMetric.create/g' src/app/api/dashboard/save-assessment/route.ts
  echo "✅ Updated save-assessment route"
fi

# 3. Update session complete route
if [ -f "src/app/api/sessions/[id]/complete/route.ts" ]; then
  sed -i 's/prisma\.communicationMetrics/prisma.communicationMetric/g' "src/app/api/sessions/[id]/complete/route.ts"
  echo "✅ Updated session complete route"
fi

# 4. Update imports
echo "Updating imports..."
find src -name "*.ts" -o -name "*.tsx" | xargs grep -l "CommunicationMetrics" | while read file; do
  sed -i 's/CommunicationMetrics/CommunicationMetric/g' "$file"
  echo "✅ Updated imports in $file"
done

# 5. Create database helpers
echo "Creating database helper functions..."
cat > src/lib/database-helpers.ts << 'EOF'
// Database helper functions for the new enhanced schema
import { prisma } from '@/lib/prisma'
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
      therapyType: data.therapyType || 'couple',
      sessionPreference: data.sessionPreference,
      communicationStyle: data.communicationStyle,
      notificationPrefs: data.notificationPrefs || 'email',
      sessionFrequency: data.sessionFrequency,
      preferredDays: data.preferredDays,
      recurringSession: data.recurringSession,
      reminderTiming: data.reminderTiming,
      partnerName: data.partnerName,
      partnerAge: data.partnerAge,
      relationshipStatus: data.relationshipStatus || 'Married',
      currentConcerns: data.currentConcerns,
      additionalNotes: data.additionalNotes,
      assistantId: data.assistantId,
      pronouns: data.pronouns,
      age: data.age,
      phone: data.phone,
      emergencyContact: data.emergencyContact
    },
    update: {
      therapyType: data.therapyType,
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
      sessionType: data.sessionType || 'couple'
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
EOF

echo "✅ Created database helper functions"

# 6. Update critical components
echo "Updating critical components..."

# Find and update files using old family member pattern
find src -name "*.tsx" -o -name "*.ts" | xargs grep -l "familyMember[1-7]" | while read file; do
  echo "⚠️  Manual update needed in: $file (uses old family member pattern)"
done

# Find and update files using old user fields
find src -name "*.tsx" -o -name "*.ts" | xargs grep -l "user\.therapyType\|user\.partnerName\|user\.sessionPreference" | while read file; do
  echo "⚠️  Manual update needed in: $file (uses old user fields that moved to profile)"
done

echo "
✨ Update complete!

📋 Next steps:
1. Run 'npm run typecheck' to find TypeScript errors
2. Update the following files manually:
   - Files using familyMember1-7 pattern
   - Files accessing user.therapyType, user.partnerName, etc (now in user.profile)
3. Test critical flows:
   - User registration/onboarding
   - Session creation
   - Metrics tracking
   - Dashboard display

🔍 Key changes made:
- CommunicationMetrics → CommunicationMetric
- activeListeningScore → listening
- expressingNeedsScore → expression
- conflictResolutionScore → respect
- emotionalSupportScore → empathy
- Created database helper functions in src/lib/database-helpers.ts
"