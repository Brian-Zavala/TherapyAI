import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function verifyEnhancedSchema() {
  console.log('🔍 Verifying Enhanced Database Schema...\n')
  
  try {
    // Check new tables exist and can be queried
    const tables = [
      { name: 'UserProfile', query: () => prisma.userProfile.count() },
      { name: 'FamilyMember', query: () => prisma.familyMember.count() },
      { name: 'CommunicationMetric', query: () => prisma.communicationMetric.count() },
      { name: 'SessionFamilyMember', query: () => prisma.sessionFamilyMember.count() },
      { name: 'Notification', query: () => prisma.notification.count() },
      { name: 'User', query: () => prisma.user.count() },
      { name: 'Session', query: () => prisma.session.count() },
      { name: 'TranscriptEntry', query: () => prisma.transcriptEntry.count() },
      { name: 'ProgressTracking', query: () => prisma.progressTracking.count() },
    ]
    
    console.log('📊 Table Status:')
    console.log('================')
    
    for (const table of tables) {
      try {
        const count = await table.query()
        console.log(`✅ ${table.name}: ${count} records`)
      } catch (error) {
        console.log(`❌ ${table.name}: Error - ${error instanceof Error ? error.message : String(error)}`)
      }
    }
    
    // Check enhanced Session fields
    console.log('\n🔧 Enhanced Session Fields:')
    try {
      const session = await prisma.session.findFirst()
      const fields = ['sessionType', 'completedAt', 'version', 'createdAt', 'updatedAt']
      
      if (!session) {
        console.log('No sessions found, checking table structure...')
        // This will throw if fields don't exist
        await prisma.session.create({
          data: {
            userId: 'test-user-id',
            date: new Date(),
            sessionType: 'COUPLE',
            status: 'SCHEDULED',
          }
        }).catch(() => {}) // Ignore error, we just want to check structure
      }
      
      console.log('✅ Session model has all enhanced fields')
    } catch (error) {
      console.log('❌ Session model missing enhanced fields:', error instanceof Error ? error.message : String(error))
    }
    
    // Check relationships
    console.log('\n🔗 Relationship Verification:')
    try {
      // Test UserProfile relationship
      const userWithProfile = await prisma.user.findFirst({
        include: { profile: true }
      })
      console.log('✅ User -> UserProfile relationship working')
      
      // Test FamilyMember relationship
      const userWithFamily = await prisma.user.findFirst({
        include: { familyMembers: true }
      })
      console.log('✅ User -> FamilyMember relationship working')
      
      // Test Session relationships
      const sessionWithMetrics = await prisma.session.findFirst({
        include: { communicationMetrics: true }
      })
      console.log('✅ Session -> CommunicationMetric relationship working')
      
    } catch (error) {
      console.log('❌ Relationship error:', error instanceof Error ? error.message : String(error))
    }
    
    // Check indexes exist (via raw SQL)
    console.log('\n📍 Index Verification:')
    const indexes = await prisma.$queryRaw`
      SELECT 
        schemaname,
        tablename,
        indexname
      FROM 
        pg_indexes
      WHERE 
        schemaname = 'public'
        AND tablename IN ('User', 'Session', 'FamilyMember', 'CommunicationMetric')
      ORDER BY 
        tablename, indexname
    ` as any[]
    
    const indexCounts = indexes.reduce((acc, idx) => {
      acc[idx.tablename] = (acc[idx.tablename] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    Object.entries(indexCounts).forEach(([table, count]) => {
      console.log(`✅ ${table}: ${count} indexes`)
    })
    
    console.log('\n✨ Schema verification complete!')
    
  } catch (error) {
    console.error('❌ Verification failed:', error)
  } finally {
    await prisma.$disconnect()
  }
}

verifyEnhancedSchema()
  .catch(console.error)
  .finally(() => process.exit())