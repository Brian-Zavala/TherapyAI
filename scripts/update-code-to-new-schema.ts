#!/usr/bin/env ts-node

import * as fs from 'fs'
import * as path from 'path'
import { glob } from 'glob'

/**
 * Ultra-comprehensive code migration script to update all database interactions
 * to use the new enhanced schema
 */

interface SchemaChange {
  pattern: RegExp
  replacement: string | ((match: string, ...args: any[]) => string)
  description: string
}

const schemaChanges: SchemaChange[] = [
  // 1. CommunicationMetrics -> CommunicationMetric
  {
    pattern: /prisma\.communicationMetrics/g,
    replacement: 'prisma.communicationMetric',
    description: 'Update table name: communicationMetrics -> communicationMetric'
  },
  {
    pattern: /from\s+['"]@prisma\/client['"].*CommunicationMetrics/g,
    replacement: (match) => match.replace('CommunicationMetrics', 'CommunicationMetric'),
    description: 'Update import: CommunicationMetrics -> CommunicationMetric'
  },
  {
    pattern: /:\s*CommunicationMetrics/g,
    replacement: ': CommunicationMetric',
    description: 'Update type annotations'
  },
  
  // 2. Old metric fields -> New metric fields
  {
    pattern: /activeListeningScore/g,
    replacement: 'listening',
    description: 'Update field: activeListeningScore -> listening'
  },
  {
    pattern: /expressingNeedsScore/g,
    replacement: 'expression',
    description: 'Update field: expressingNeedsScore -> expression'
  },
  {
    pattern: /conflictResolutionScore/g,
    replacement: 'respect',
    description: 'Update field: conflictResolutionScore -> respect'
  },
  {
    pattern: /emotionalSupportScore/g,
    replacement: 'empathy',
    description: 'Update field: emotionalSupportScore -> empathy'
  },
  
  // 3. Family member denormalized -> normalized
  {
    pattern: /user\.familyMember(\d+)(?!Relation|Age)/g,
    replacement: (match, num) => `familyMembers[${parseInt(num) - 1}]?.name`,
    description: 'Update family member access pattern'
  },
  {
    pattern: /familyMember(\d+)Age/g,
    replacement: (match, num) => `familyMembers[${parseInt(num) - 1}]?.age`,
    description: 'Update family member age access'
  },
  {
    pattern: /familyMember(\d+)Relation/g,
    replacement: (match, num) => `familyMembers[${parseInt(num) - 1}]?.relationship`,
    description: 'Update family member relationship access'
  },
  
  // 4. User profile fields migration
  {
    pattern: /user\.(therapyType|sessionPreference|communicationStyle|preferredDays|recurringSession|reminderTiming|partnerName|partnerAge|relationshipStatus|currentConcerns|additionalNotes)(?!\w)/g,
    replacement: (match, field) => `user.profile?.${field}`,
    description: 'Move user fields to profile'
  },
  
  // 5. Session enhancement fields
  {
    pattern: /session\.create\s*\(\s*\{/g,
    replacement: 'session.create({\n      data: {\n        ...data,\n        sessionType: data.sessionType || "couple",',
    description: 'Add sessionType to session creation'
  },
  
  // 6. Include patterns for queries
  {
    pattern: /include:\s*\{([^}]*familyMember[^}]*)\}/g,
    replacement: (match) => {
      if (!match.includes('familyMembers:')) {
        return match.replace(/\{/, '{\n        familyMembers: { orderBy: { order: "asc" } },')
      }
      return match
    },
    description: 'Update include patterns for family members'
  }
]

// Files to skip
const skipPatterns = [
  '**/node_modules/**',
  '**/dist/**',
  '**/.next/**',
  '**/migrations/**',
  '**/schema.prisma',
  '**/schema.*.prisma',
  '**/*.md',
  '**/update-code-to-new-schema.ts' // Skip this file
]

// Special handling for specific files
const fileSpecificChanges: Record<string, SchemaChange[]> = {
  'src/app/api/dashboard/communication-metrics/route.ts': [
    {
      pattern: /await prisma\.communicationMetrics\.findMany/g,
      replacement: 'await prisma.communicationMetric.findMany',
      description: 'Update findMany call'
    },
    {
      pattern: /await prisma\.communicationMetrics\.create/g,
      replacement: 'await prisma.communicationMetric.create',
      description: 'Update create call'
    }
  ],
  'src/lib/vapi.ts': [
    {
      pattern: /const familyMembers = \[([^\]]+)\]\.filter\(Boolean\)/g,
      replacement: `const familyMembers = await prisma.familyMember.findMany({
        where: { userId: user.id, isActive: true },
        orderBy: { order: 'asc' }
      })`,
      description: 'Replace denormalized family member array with query'
    }
  ]
}

async function updateFile(filePath: string): Promise<boolean> {
  try {
    let content = fs.readFileSync(filePath, 'utf8')
    const originalContent = content
    let changesMade = false
    const appliedChanges: string[] = []
    
    // Apply general changes
    for (const change of schemaChanges) {
      const before = content
      content = content.replace(change.pattern, change.replacement as any)
      if (before !== content) {
        changesMade = true
        appliedChanges.push(change.description)
      }
    }
    
    // Apply file-specific changes
    const relativePath = path.relative(process.cwd(), filePath)
    const specificChanges = Object.entries(fileSpecificChanges).find(([pattern]) => 
      relativePath.includes(pattern)
    )
    
    if (specificChanges) {
      for (const change of specificChanges[1]) {
        const before = content
        content = content.replace(change.pattern, change.replacement as any)
        if (before !== content) {
          changesMade = true
          appliedChanges.push(`[File-specific] ${change.description}`)
        }
      }
    }
    
    // Additional smart replacements based on context
    if (filePath.includes('route.ts') || filePath.includes('api/')) {
      // API routes need special handling for family members
      content = content.replace(
        /const\s+\{[^}]*familyMember\d+[^}]*\}\s*=\s*req\.body/g,
        (match) => {
          return match + '\n    // Note: Family members now handled via separate familyMembers array'
        }
      )
    }
    
    if (changesMade) {
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

async function main() {
  console.log('🔄 Starting comprehensive schema migration...\n')
  
  // Find all TypeScript files
  const files = await glob('src/**/*.{ts,tsx}', {
    ignore: skipPatterns
  })
  
  console.log(`Found ${files.length} files to check\n`)
  
  let updatedCount = 0
  const criticalFiles: string[] = []
  
  for (const file of files) {
    const updated = await updateFile(file)
    if (updated) {
      updatedCount++
      
      // Track critical files that were updated
      if (file.includes('api/') || file.includes('lib/') || file.includes('hooks/')) {
        criticalFiles.push(file)
      }
    }
  }
  
  console.log(`\n✨ Migration complete!`)
  console.log(`📊 Updated ${updatedCount} out of ${files.length} files`)
  
  if (criticalFiles.length > 0) {
    console.log(`\n⚠️  Critical files updated:`)
    criticalFiles.forEach(file => console.log(`   - ${file}`))
  }
  
  console.log(`\n📋 Next steps:`)
  console.log(`1. Run 'npm run typecheck' to check for TypeScript errors`)
  console.log(`2. Run 'npm run lint' to check for linting issues`)
  console.log(`3. Test critical functionality:`)
  console.log(`   - User onboarding with family members`)
  console.log(`   - Session creation and metrics tracking`)
  console.log(`   - Dashboard data display`)
  console.log(`   - Real-time updates`)
  
  // Generate a migration report
  const report = {
    timestamp: new Date().toISOString(),
    filesScanned: files.length,
    filesUpdated: updatedCount,
    criticalFiles,
    schemaChanges: schemaChanges.map(c => c.description)
  }
  
  fs.writeFileSync(
    'schema-migration-report.json',
    JSON.stringify(report, null, 2)
  )
  console.log(`\n📄 Migration report saved to schema-migration-report.json`)
}

main().catch(console.error)