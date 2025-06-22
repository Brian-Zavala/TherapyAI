#!/usr/bin/env ts-node

/**
 * Ultra-comprehensive database call updates for the new schema
 * This script identifies and updates all database interactions
 */

import * as fs from 'fs'
import * as path from 'path'
import { glob } from 'glob'

// Critical files that MUST be updated
const criticalFiles = {
  // API Routes
  'src/app/api/dashboard/communication-metrics/route.ts': {
    changes: [
      {
        old: 'await prisma.communicationMetrics.findMany',
        new: 'await prisma.communicationMetric.findMany',
      },
      {
        old: 'await prisma.communicationMetrics.create',
        new: 'await prisma.communicationMetric.create',
      },
      {
        old: 'activeListeningScore',
        new: 'listening'
      },
      {
        old: 'expressingNeedsScore',
        new: 'expression'
      },
      {
        old: 'conflictResolutionScore',
        new: 'respect'
      },
      {
        old: 'emotionalSupportScore',
        new: 'empathy'
      }
    ]
  },
  
  'src/app/api/dashboard/save-assessment/route.ts': {
    changes: [
      {
        old: 'prisma.communicationMetrics.create',
        new: 'prisma.communicationMetric.create',
      },
      {
        old: `data: {
        userId: user.id,
        date: new Date(),
        activeListeningScore: parseInt(activeListening),
        expressingNeedsScore: parseInt(expressingNeeds),
        conflictResolutionScore: parseInt(conflictResolution),
        emotionalSupportScore: parseInt(emotionalSupport)`,
        new: `data: {
        sessionId: 'assessment-session', // TODO: Link to actual session
        userId: user.id,
        clarity: parseInt(activeListening), // Map old fields to new
        expression: parseInt(expressingNeeds),
        respect: parseInt(conflictResolution),
        empathy: parseInt(emotionalSupport),
        overall: Math.round((parseInt(activeListening) + parseInt(expressingNeeds) + parseInt(conflictResolution) + parseInt(emotionalSupport)) / 4),
        metricType: 'manual',
        calculatedAt: new Date()`
      }
    ]
  },
  
  'src/app/api/sessions/[id]/complete/route.ts': {
    changes: [
      {
        old: 'await prisma.communicationMetrics.create',
        new: 'await prisma.communicationMetric.create',
      },
      {
        old: 'activeListeningScore: metrics.listening || 50',
        new: 'listening: metrics.listening || 50'
      },
      {
        old: 'expressingNeedsScore: metrics.expression || 50',
        new: 'expression: metrics.expression || 50'
      },
      {
        old: 'conflictResolutionScore: metrics.respect || 50',
        new: 'respect: metrics.respect || 50'
      },
      {
        old: 'emotionalSupportScore: metrics.empathy || 50',
        new: 'empathy: metrics.empathy || 50'
      },
      {
        old: 'status: "completed"',
        new: `status: "completed",
        completedAt: new Date()`
      }
    ]
  },
  
  'src/app/api/user/profile/route.ts': {
    changes: [
      {
        // Update family member queries
        old: `select: {
        id: true,
        name: true,
        email: true,
        // ... other fields
        familyMember1: true,
        familyMember1Age: true,
        familyMember1Relation: true,`,
        new: `select: {
        id: true,
        name: true,
        email: true,
        // ... other fields
        familyMembers: {
          orderBy: { order: 'asc' },
          where: { isActive: true }
        },
        profile: true,`
      }
    ]
  },
  
  'src/lib/vapi.ts': {
    changes: [
      {
        // Replace family member collection
        old: `const familyMembers = [
        user.familyMember1,
        user.familyMember2,
        user.familyMember3,
        user.familyMember4,
        user.familyMember5,
        user.familyMember6,
        user.familyMember7
      ].filter(Boolean);`,
        new: `// Fetch normalized family members
      const familyMembers = await prisma.familyMember.findMany({
        where: { userId: user.id, isActive: true },
        orderBy: { order: 'asc' }
      });
      const familyMemberNames = familyMembers.map(fm => fm.name);`
      },
      {
        old: 'therapyType: user.therapyType',
        new: 'therapyType: user.profile?.therapyType || "couple"'
      }
    ]
  },
  
  'src/components/dashboard/CommunicationMetrics.tsx': {
    changes: [
      {
        old: 'CommunicationMetrics',
        new: 'CommunicationMetric'
      },
      {
        old: 'activeListeningScore',
        new: 'listening'
      },
      {
        old: 'expressingNeedsScore',
        new: 'expression'
      },
      {
        old: 'conflictResolutionScore',
        new: 'respect'
      },
      {
        old: 'emotionalSupportScore',
        new: 'empathy'
      }
    ]
  },
  
  'src/hooks/useDashboardRealTimeEnhanced.ts': {
    changes: [
      {
        old: 'communicationMetrics',
        new: 'communicationMetric'
      },
      {
        old: 'familyMember1',
        new: 'familyMembers[0]?.name'
      }
    ]
  },
  
  'src/app/api/sessions/route.ts': {
    changes: [
      {
        old: `await prisma.session.create({
        data: {
          userId: user.id,
          date: sessionDate,
          duration,
          theme,
          status: 'scheduled'`,
        new: `await prisma.session.create({
        data: {
          userId: user.id,
          date: sessionDate,
          duration,
          theme,
          status: 'scheduled',
          sessionType: therapyType || 'couple',`
      }
    ]
  }
}

// Generic patterns to apply to all files
const genericPatterns = [
  // Import updates
  {
    pattern: /import\s+(?:type\s+)?{\s*([^}]*)\s*}\s+from\s+['"]@prisma\/client['"]/g,
    replacement: (match: string, imports: string) => {
      return match.replace('CommunicationMetrics', 'CommunicationMetric')
    }
  },
  
  // Type annotations
  {
    pattern: /:\s*CommunicationMetrics(\[\])?/g,
    replacement: ': CommunicationMetric$1'
  },
  
  // Prisma client calls
  {
    pattern: /prisma\.communicationMetrics\./g,
    replacement: 'prisma.communicationMetric.'
  },
  
  // User profile fields
  {
    pattern: /user\.(therapyType|sessionPreference|communicationStyle|partnerName|partnerAge|relationshipStatus|currentConcerns|additionalNotes|preferredDays|recurringSession|reminderTiming)(?!\w)/g,
    replacement: 'user.profile?.$1'
  }
]

async function updateFile(filePath: string): Promise<boolean> {
  try {
    let content = fs.readFileSync(filePath, 'utf8')
    const originalContent = content
    let updated = false
    const appliedChanges: string[] = []
    
    // Apply specific changes for critical files
    const relativePath = path.relative(process.cwd(), filePath)
    const specificChanges = Object.entries(criticalFiles).find(([file]) => 
      relativePath.endsWith(file)
    )
    
    if (specificChanges) {
      const [fileName, config] = specificChanges
      console.log(`\n📝 Updating critical file: ${fileName}`)
      
      for (const change of config.changes) {
        if (content.includes(change.old)) {
          content = content.replace(
            new RegExp(change.old.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
            change.new
          )
          updated = true
          appliedChanges.push(`Replaced: ${change.old.substring(0, 50)}...`)
        }
      }
    }
    
    // Apply generic patterns
    for (const pattern of genericPatterns) {
      const before = content
      content = content.replace(pattern.pattern, pattern.replacement as any)
      if (before !== content) {
        updated = true
        appliedChanges.push(`Applied pattern: ${pattern.pattern.source.substring(0, 50)}...`)
      }
    }
    
    if (updated) {
      fs.writeFileSync(filePath, content, 'utf8')
      console.log(`✅ Updated: ${relativePath}`)
      appliedChanges.forEach(change => console.log(`   - ${change}`))
      return true
    }
    
    return false
  } catch (error) {
    console.error(`❌ Error updating ${filePath}:`, error)
    return false
  }
}

// Additional file: Create helper functions for common database operations
const helperContent = `// Database helper functions for the new schema
import { prisma } from '@/lib/prisma'

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

export async function createUserProfile(userId: string, data: any) {
  // Migrate old user fields to UserProfile
  return prisma.userProfile.create({
    data: {
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
    }
  })
}

export async function createFamilyMembers(userId: string, familyData: any[]) {
  // Create normalized family members
  const familyMembers = familyData
    .filter(member => member.name)
    .map((member, index) => ({
      userId,
      name: member.name,
      age: member.age,
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

export async function createSessionMetrics(
  sessionId: string,
  userId: string,
  metrics: any,
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
`

async function main() {
  console.log('🔧 Starting ultra-comprehensive database call updates...\n')
  
  // Create helper file
  const helperPath = path.join(process.cwd(), 'src/lib/database-helpers.ts')
  fs.writeFileSync(helperPath, helperContent)
  console.log('✅ Created database helper functions at src/lib/database-helpers.ts\n')
  
  // Find all TypeScript files
  const files = await glob('src/**/*.{ts,tsx}', {
    ignore: ['**/node_modules/**', '**/.next/**', '**/dist/**']
  })
  
  console.log(`Found ${files.length} files to check`)
  
  let updatedCount = 0
  const errors: string[] = []
  
  for (const file of files) {
    const updated = await updateFile(file)
    if (updated) {
      updatedCount++
    }
  }
  
  console.log(`\n✨ Update complete!`)
  console.log(`📊 Updated ${updatedCount} files`)
  
  console.log(`\n📋 Critical manual checks required:`)
  console.log(`1. Update all family member form components to use normalized structure`)
  console.log(`2. Update onboarding flow to create UserProfile and FamilyMember records`)
  console.log(`3. Test session creation with new sessionType field`)
  console.log(`4. Verify metrics calculations use new field names`)
  console.log(`5. Update dashboard queries to include profile and familyMembers`)
  
  console.log(`\n🧪 Testing checklist:`)
  console.log(`- [ ] User registration creates UserProfile`)
  console.log(`- [ ] Family member onboarding creates FamilyMember records`)
  console.log(`- [ ] Session creation includes sessionType`)
  console.log(`- [ ] Metrics are saved with new field names`)
  console.log(`- [ ] Dashboard displays data correctly`)
  console.log(`- [ ] Real-time updates work with new schema`)
  
  // Generate TypeScript check command
  console.log(`\n💻 Run these commands to verify:`)
  console.log(`npm run typecheck`)
  console.log(`npm run lint`)
  console.log(`npm run dev`)
}

main().catch(console.error)