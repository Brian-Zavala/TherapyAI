import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

/**
 * Migration script to move family member data from User table to FamilyMember table
 * This script maintains backward compatibility during the transition period
 */
async function migrateFamilyMembers() {
  console.log('Starting family member migration...')
  
  try {
    // Get all users with family member data
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { familyMember1: { not: null } },
          { familyMember2: { not: null } },
          { familyMember3: { not: null } },
          { familyMember4: { not: null } },
          { familyMember5: { not: null } },
          { familyMember6: { not: null } },
          { familyMember7: { not: null } },
        ]
      }
    })
    
    console.log(`Found ${users.length} users with family member data`)
    
    let migrated = 0
    let errors = 0
    
    for (const user of users) {
      try {
        // Check if already migrated
        const existingMembers = await prisma.familyMember.count({
          where: { userId: user.id }
        })
        
        if (existingMembers > 0) {
          console.log(`User ${user.id} already migrated, skipping...`)
          continue
        }
        
        const familyMembers = []
        
        // Extract family member data
        for (let i = 1; i <= 7; i++) {
          const name = user[`familyMember${i}` as keyof typeof user] as string | null
          const age = user[`familyMemberAge${i}` as keyof typeof user] as number | null
          const relation = user[`familyMemberRelation${i}` as keyof typeof user] as string | null
          
          if (name) {
            familyMembers.push({
              userId: user.id,
              name,
              age: age || null,
              relation: relation || null,
              order: i - 1, // 0-indexed
              isActive: true
            })
          }
        }
        
        if (familyMembers.length > 0) {
          // Create family member records in a transaction
          await prisma.$transaction(async (tx) => {
            await tx.familyMember.createMany({
              data: familyMembers
            })
            
            // Log migration for audit
            console.log(`Migrated ${familyMembers.length} family members for user ${user.id}`)
          })
          
          migrated++
        }
      } catch (error) {
        console.error(`Error migrating user ${user.id}:`, error)
        errors++
      }
    }
    
    console.log(`Migration completed: ${migrated} users migrated, ${errors} errors`)
    
    // Verify migration
    const totalFamilyMembers = await prisma.familyMember.count()
    console.log(`Total family members in new table: ${totalFamilyMembers}`)
    
  } catch (error) {
    console.error('Migration failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Rollback function if needed
async function rollbackMigration() {
  console.log('Rolling back family member migration...')
  
  try {
    const deletedCount = await prisma.familyMember.deleteMany({})
    console.log(`Deleted ${deletedCount.count} family member records`)
  } catch (error) {
    console.error('Rollback failed:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Run migration
if (process.argv.includes('--rollback')) {
  rollbackMigration()
} else {
  migrateFamilyMembers()
}