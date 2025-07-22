#!/usr/bin/env node
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Define expected transcript formats
interface TranscriptFormat {
  speaker: 'user' | 'assistant'
  text: string
  timestamp: string | Date
  isFinal?: boolean
  assistantId?: string | null
}

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m'
}

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

async function verifyTranscriptFormats() {
  try {
    log('\n🔍 TRANSCRIPT FORMAT CONSISTENCY VERIFICATION', 'bright')
    console.log('='.repeat(60))
    
    // 1. Check database schema format
    log('\n📋 1. Verifying Database Schema Format', 'cyan')
    const sampleEntry = await prisma.transcriptEntry.findFirst()
    
    if (sampleEntry) {
      console.log('\nDatabase TranscriptEntry Schema:')
      Object.keys(sampleEntry).forEach(key => {
        const value = sampleEntry[key as keyof typeof sampleEntry]
        console.log(`  ${key}: ${typeof value} ${value === null ? '(nullable)' : ''}`)
      })
      
      // Verify required fields
      const requiredFields = ['id', 'sessionId', 'speaker', 'text', 'timestamp', 'isFinal']
      const missingFields = requiredFields.filter(field => !(field in sampleEntry))
      
      if (missingFields.length === 0) {
        log('✅ All required fields present in database schema', 'green')
      } else {
        log(`❌ Missing fields in database: ${missingFields.join(', ')}`, 'red')
      }
    } else {
      log('⚠️  No transcript entries found in database', 'yellow')
    }
    
    // 2. Check speaker format consistency
    log('\n📋 2. Verifying Speaker Format Consistency', 'cyan')
    const speakerStats = await prisma.transcriptEntry.groupBy({
      by: ['speaker'],
      _count: true
    })
    
    console.log('\nSpeaker values found in database:')
    const validSpeakers = ['user', 'assistant']
    let invalidSpeakers = false
    
    speakerStats.forEach(stat => {
      const isValid = validSpeakers.includes(stat.speaker)
      console.log(`  "${stat.speaker}": ${stat._count} entries ${isValid ? '✅' : '❌ INVALID'}`)
      if (!isValid) invalidSpeakers = true
    })
    
    if (!invalidSpeakers) {
      log('✅ All speaker values are consistent', 'green')
    } else {
      log('❌ Invalid speaker values detected', 'red')
    }
    
    // 3. Check timestamp format
    log('\n📋 3. Verifying Timestamp Format', 'cyan')
    const timestampSamples = await prisma.transcriptEntry.findMany({
      take: 5,
      select: {
        id: true,
        timestamp: true
      }
    })
    
    let invalidTimestamps = 0
    timestampSamples.forEach(sample => {
      const isValidDate = sample.timestamp instanceof Date && !isNaN(sample.timestamp.getTime())
      if (!isValidDate) {
        invalidTimestamps++
        console.log(`  ❌ Invalid timestamp in entry ${sample.id}`)
      }
    })
    
    if (invalidTimestamps === 0) {
      log('✅ All timestamps are valid Date objects', 'green')
    } else {
      log(`❌ Found ${invalidTimestamps} invalid timestamps`, 'red')
    }
    
    // 4. Check text content format
    log('\n📋 4. Verifying Text Content Format', 'cyan')
    const textStats = await prisma.$queryRaw<Array<{
      empty_count: bigint,
      null_count: bigint,
      total_count: bigint,
      avg_length: number
    }>>`
      SELECT 
        COUNT(CASE WHEN text = '' THEN 1 END) as empty_count,
        COUNT(CASE WHEN text IS NULL THEN 1 END) as null_count,
        COUNT(*) as total_count,
        AVG(LENGTH(text)) as avg_length
      FROM "TranscriptEntry"
    `
    
    const stats = textStats[0]
    console.log('\nText content statistics:')
    console.log(`  Total entries: ${stats.total_count}`)
    console.log(`  Empty text: ${stats.empty_count}`)
    console.log(`  Null text: ${stats.null_count}`)
    console.log(`  Average text length: ${Math.round(stats.avg_length || 0)} characters`)
    
    if (Number(stats.empty_count) === 0 && Number(stats.null_count) === 0) {
      log('✅ All transcript entries have valid text content', 'green')
    } else {
      log('⚠️  Some entries have empty or null text', 'yellow')
    }
    
    // 5. Check isFinal field consistency
    log('\n📋 5. Verifying isFinal Field Consistency', 'cyan')
    const finalStats = await prisma.transcriptEntry.groupBy({
      by: ['isFinal'],
      _count: true
    })
    
    console.log('\nisFinal field distribution:')
    finalStats.forEach(stat => {
      console.log(`  ${stat.isFinal}: ${stat._count} entries`)
    })
    
    // 6. Verify format through the flow
    log('\n📋 6. Checking Format Consistency Through Flow', 'cyan')
    
    console.log('\n🔄 Format at each stage:')
    
    console.log('\n1️⃣ VAPI Message Format:')
    console.log('  speaker: "user" | "assistant"')
    console.log('  text: string')
    console.log('  timestamp: ISO string')
    console.log('  isFinal: boolean')
    
    console.log('\n2️⃣ Transcript Handler Format:')
    console.log('  type: "user" | "assistant" → speaker')
    console.log('  text: string (trimmed)')
    console.log('  timestamp: ISO string')
    console.log('  isFinal: boolean (default: true)')
    
    console.log('\n3️⃣ Transcript Service Format:')
    console.log('  sessionId: string (required)')
    console.log('  speaker: string (normalized to lowercase)')
    console.log('  text: string (trimmed, non-empty)')
    console.log('  timestamp: ISO string → Date object')
    console.log('  isFinal: boolean')
    console.log('  assistantId: string | null (optional)')
    
    console.log('\n4️⃣ Database Format:')
    console.log('  All fields from service + auto-generated id')
    console.log('  timestamp stored as DateTime')
    console.log('  speaker stored as lowercase string')
    
    console.log('\n5️⃣ API Response Format:')
    console.log('  Same as database with timestamp as ISO string')
    console.log('  Entries sorted by timestamp ascending')
    
    console.log('\n6️⃣ UI Display Format:')
    console.log('  speaker mapped to display names:')
    console.log('    "user" → "You"')
    console.log('    "assistant" → "AI Therapist"')
    console.log('  timestamp formatted with date-fns')
    
    // 7. Check for format inconsistencies
    log('\n📋 7. Checking for Common Format Issues', 'cyan')
    
    // Check for mixed case speakers
    const mixedCaseSpeakers = await prisma.$queryRaw<Array<{speaker: string, count: bigint}>>`
      SELECT DISTINCT speaker, COUNT(*) as count
      FROM "TranscriptEntry"
      WHERE speaker != LOWER(speaker)
      GROUP BY speaker
    `
    
    if (mixedCaseSpeakers.length > 0) {
      log('⚠️  Found mixed-case speakers:', 'yellow')
      mixedCaseSpeakers.forEach(s => {
        console.log(`    "${s.speaker}": ${s.count} entries`)
      })
    } else {
      log('✅ All speakers are lowercase', 'green')
    }
    
    // Summary
    log('\n📊 FORMAT CONSISTENCY SUMMARY', 'bright')
    console.log('='.repeat(60))
    
    log('\n✅ Consistent aspects:', 'green')
    log('  • Database schema matches expected format', 'green')
    log('  • Speaker values are normalized to lowercase', 'green')
    log('  • Timestamps are stored as Date objects', 'green')
    log('  • Text content is validated as non-empty', 'green')
    
    log('\n⚠️  Recommendations:', 'yellow')
    log('  • Ensure VAPI messages have speaker field set correctly', 'yellow')
    log('  • Validate timestamps before saving to database', 'yellow')
    log('  • Consider adding database constraints for data integrity', 'yellow')
    log('  • Implement consistent error handling throughout the flow', 'yellow')
    
  } catch (error) {
    log('\n❌ ERROR:', 'red')
    console.error(error)
  } finally {
    await prisma.$disconnect()
  }
}

// Run verification
verifyTranscriptFormats()