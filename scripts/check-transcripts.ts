import { prisma } from '../src/lib/prisma-optimized'

async function checkTranscripts() {
  try {
    console.log('🔍 Checking transcript entries in database...\n')
    
    // Count total transcript entries
    const totalCount = await prisma.transcriptEntry.count()
    console.log(`📊 Total transcript entries: ${totalCount}`)
    
    if (totalCount === 0) {
      console.log('\n❌ No transcript entries found in the database!')
      console.log('This means transcripts are not being saved during sessions.\n')
    } else {
      // Get some sample entries
      const sampleEntries = await prisma.transcriptEntry.findMany({
        take: 5,
        orderBy: { timestamp: 'desc' },
        include: {
          session: {
            select: {
              id: true,
              date: true,
              status: true
            }
          }
        }
      })
      
      console.log('\n📝 Sample transcript entries:')
      sampleEntries.forEach((entry, index) => {
        console.log(`\n${index + 1}. Entry ID: ${entry.id}`)
        console.log(`   Session: ${entry.sessionId}`)
        console.log(`   Speaker: ${entry.speaker}`)
        console.log(`   Text: "${entry.text.substring(0, 50)}${entry.text.length > 50 ? '...' : ''}"`)
        console.log(`   Timestamp: ${entry.timestamp}`)
        console.log(`   Session Status: ${entry.session.status}`)
      })
      
      // Count by session
      const sessionCounts = await prisma.transcriptEntry.groupBy({
        by: ['sessionId'],
        _count: {
          id: true
        },
        orderBy: {
          _count: {
            id: 'desc'
          }
        },
        take: 5
      })
      
      console.log('\n📊 Transcript counts by session:')
      for (const session of sessionCounts) {
        console.log(`   Session ${session.sessionId}: ${session._count.id} entries`)
      }
      
      // Check for recent entries (last 24 hours)
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      
      const recentCount = await prisma.transcriptEntry.count({
        where: {
          timestamp: {
            gte: yesterday
          }
        }
      })
      
      console.log(`\n⏰ Entries created in last 24 hours: ${recentCount}`)
    }
    
    // Check sessions without transcripts
    const sessionsWithoutTranscripts = await prisma.session.findMany({
      where: {
        transcriptEntries: {
          none: {}
        }
      },
      select: {
        id: true,
        date: true,
        status: true
      },
      orderBy: {
        date: 'desc'
      },
      take: 10
    })
    
    if (sessionsWithoutTranscripts.length > 0) {
      console.log(`\n⚠️  Found ${sessionsWithoutTranscripts.length} sessions without any transcripts:`)
      sessionsWithoutTranscripts.forEach((session, index) => {
        console.log(`   ${index + 1}. Session ${session.id} - ${session.date} (${session.status})`)
      })
    }
    
  } catch (error) {
    console.error('❌ Error checking transcripts:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the check
checkTranscripts()
  .then(() => console.log('\n✅ Check complete'))
  .catch(console.error)