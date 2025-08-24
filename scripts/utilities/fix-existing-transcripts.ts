import { prisma } from '@/lib/prisma-optimized'

/**
 * Script to fix speaker identification in existing transcripts
 * Run with: npx tsx scripts/fix-existing-transcripts.ts [sessionId]
 * 
 * This script analyzes message content to determine the correct speaker
 */

// Common AI therapist phrases and patterns
const AI_PATTERNS = [
  // Therapeutic language
  /\b(I understand|I hear|I see|I notice|I appreciate|I'm here)\b/i,
  /\b(It sounds like|It seems|It appears|It feels)\b/i,
  /\b(Can you tell me|Could you share|Would you like|May I ask)\b/i,
  /\b(How are you feeling|How do you feel|What do you think)\b/i,
  /\b(Let's explore|Let's discuss|Let's talk about)\b/i,
  
  // Empathetic responses
  /\b(That must be|That sounds|That seems) (difficult|challenging|hard|tough|overwhelming)\b/i,
  /\b(Thank you for sharing|I appreciate you telling me)\b/i,
  /\b(Your feelings are valid|It's understandable)\b/i,
  
  // Therapeutic questions
  /\b(What brings you|What's on your mind|What would you like to focus on)\b/i,
  /\b(How long have you been|When did you first notice)\b/i,
  /\b(What helps you|What makes it better|What makes it worse)\b/i,
  
  // Professional language
  /\b(therapy|session|therapeutic|coping|strategies|techniques)\b/i,
  /\b(emotions|emotional|mental health|wellbeing|self-care)\b/i,
  
  // AI-specific patterns
  /\b(As an AI therapist|As your therapist|In our session)\b/i,
  /^(Yes,|No,|Absolutely,|Certainly,|Of course,)/i,
  
  // Reflection patterns
  /\b(What I'm hearing is|If I understand correctly)\b/i,
  /\b(You mentioned|You said|You expressed)\b/i,
]

// User speech patterns (often fragmented from speech-to-text)
const USER_PATTERNS = [
  // Personal pronouns about self
  /^(I|I'm|I've|I'd|I'll|My|Mine)\b/i,
  /\b(my husband|my wife|my partner|my kids|my family|my job|my work)\b/i,
  
  // Informal/conversational
  /\b(yeah|yep|nope|gonna|wanna|kinda|sorta)\b/i,
  /\b(um|uh|like|you know)\b/i,
  
  // Emotional expressions
  /^(Stressed|Tired|Frustrated|Angry|Sad|Happy|Worried)\b/i,
  
  // Short fragments (common in speech-to-text)
  /^[A-Za-z\s]{1,15}[\.!?]?$/,  // Very short sentences
  /^(Yes|No|Maybe|Okay|Sure|Right)\.?$/i,
  
  // Personal experiences
  /\b(I work|I live|I have|I need|I want|I feel)\b/i,
]

function analyzeMessage(text: string): 'user' | 'assistant' | 'unknown' {
  // Clean the text
  const cleanText = text.trim()
  
  // Check message length and structure
  const wordCount = cleanText.split(/\s+/).length
  const hasQuestionMark = cleanText.includes('?')
  const sentenceCount = cleanText.split(/[.!?]+/).filter(s => s.trim()).length
  
  // Score for each speaker
  let aiScore = 0
  let userScore = 0
  
  // Check AI patterns
  for (const pattern of AI_PATTERNS) {
    if (pattern.test(cleanText)) {
      aiScore += 2
    }
  }
  
  // Check user patterns
  for (const pattern of USER_PATTERNS) {
    if (pattern.test(cleanText)) {
      userScore += 2
    }
  }
  
  // Additional heuristics
  
  // Long, well-structured messages are more likely AI
  if (wordCount > 30 && sentenceCount > 1) {
    aiScore += 1
  }
  
  // Questions with therapeutic language
  if (hasQuestionMark && wordCount > 10) {
    aiScore += 1
  }
  
  // Very short fragments are more likely user
  if (wordCount < 5) {
    userScore += 2
  }
  
  // Messages starting with "I" but short are likely user
  if (/^I\b/i.test(cleanText) && wordCount < 15) {
    userScore += 1
  }
  
  // Professional, complete sentences
  if (sentenceCount >= 2 && /[.!?]$/.test(cleanText)) {
    aiScore += 1
  }
  
  // Determine speaker
  if (aiScore > userScore && aiScore >= 2) {
    return 'assistant'
  } else if (userScore > aiScore && userScore >= 2) {
    return 'user'
  }
  
  // Default based on message characteristics
  if (wordCount > 20 && sentenceCount > 1) {
    return 'assistant'
  } else if (wordCount < 10) {
    return 'user'
  }
  
  return 'unknown'
}

async function fixTranscriptsForSession(sessionId: string, dryRun: boolean = true) {
  console.log(`\n🔧 Analyzing session: ${sessionId}`)
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'APPLYING FIXES'}\n`)
  
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: {
      transcriptEntries: {
        orderBy: { timestamp: 'asc' }
      }
    }
  })
  
  if (!session) {
    console.error('❌ Session not found')
    return
  }
  
  console.log(`Found ${session.transcriptEntries.length} transcript entries\n`)
  
  let fixCount = 0
  const changes: Array<{ id: string, text: string, oldSpeaker: string, newSpeaker: string }> = []
  
  for (const entry of session.transcriptEntries) {
    const suggestedSpeaker = analyzeMessage(entry.text)
    
    if (suggestedSpeaker !== 'unknown' && suggestedSpeaker !== entry.speaker) {
      fixCount++
      changes.push({
        id: entry.id,
        text: entry.text.substring(0, 100) + (entry.text.length > 100 ? '...' : ''),
        oldSpeaker: entry.speaker,
        newSpeaker: suggestedSpeaker
      })
      
      if (!dryRun) {
        await prisma.transcriptEntry.update({
          where: { id: entry.id },
          data: { speaker: suggestedSpeaker }
        })
      }
    }
  }
  
  // Display results
  console.log('📊 Analysis Results:')
  console.log(`- Total entries: ${session.transcriptEntries.length}`)
  console.log(`- Suggested fixes: ${fixCount}`)
  console.log(`- Fix rate: ${((fixCount / session.transcriptEntries.length) * 100).toFixed(1)}%\n`)
  
  if (changes.length > 0) {
    console.log('📝 Suggested Changes:')
    changes.slice(0, 10).forEach((change, index) => {
      console.log(`\n[${index + 1}] ${change.oldSpeaker} → ${change.newSpeaker}`)
      console.log(`   "${change.text}"`)
    })
    
    if (changes.length > 10) {
      console.log(`\n... and ${changes.length - 10} more changes`)
    }
  }
  
  if (dryRun && fixCount > 0) {
    console.log('\n💡 To apply these fixes, run:')
    console.log(`npx tsx scripts/fix-existing-transcripts.ts ${sessionId} --apply`)
  } else if (!dryRun) {
    console.log('\n✅ Fixes applied successfully!')
  }
  
  return { fixCount, totalCount: session.transcriptEntries.length }
}

async function fixAllRecentSessions(daysBack: number = 30, dryRun: boolean = true) {
  console.log(`\n🔧 Fixing transcripts for sessions from last ${daysBack} days`)
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'APPLYING FIXES'}\n`)
  
  const sessions = await prisma.session.findMany({
    where: {
      createdAt: {
        gte: new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000)
      }
    },
    select: {
      id: true,
      createdAt: true,
      user: {
        select: { email: true }
      },
      _count: {
        select: { transcriptEntries: true }
      }
    },
    orderBy: { createdAt: 'desc' }
  })
  
  console.log(`Found ${sessions.length} sessions to analyze\n`)
  
  let totalFixed = 0
  let totalEntries = 0
  
  for (const session of sessions) {
    if (session._count.transcriptEntries === 0) continue
    
    console.log(`\n--- Session ${session.id} (${session.user.email}) ---`)
    const result = await fixTranscriptsForSession(session.id, dryRun)
    
    if (result) {
      totalFixed += result.fixCount
      totalEntries += result.totalCount
    }
  }
  
  console.log('\n📊 Overall Summary:')
  console.log(`- Sessions processed: ${sessions.length}`)
  console.log(`- Total entries: ${totalEntries}`)
  console.log(`- Total fixes: ${totalFixed}`)
  console.log(`- Overall fix rate: ${totalEntries > 0 ? ((totalFixed / totalEntries) * 100).toFixed(1) : 0}%`)
  
  if (dryRun && totalFixed > 0) {
    console.log('\n💡 To apply all fixes, run:')
    console.log(`npx tsx scripts/fix-existing-transcripts.ts --all --apply`)
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2)
  const sessionId = args[0]
  const shouldApply = args.includes('--apply')
  const fixAll = args.includes('--all')
  
  try {
    if (fixAll) {
      const daysBack = parseInt(args.find(arg => arg.startsWith('--days='))?.split('=')[1] || '30')
      await fixAllRecentSessions(daysBack, !shouldApply)
    } else if (sessionId && !sessionId.startsWith('--')) {
      await fixTranscriptsForSession(sessionId, !shouldApply)
    } else {
      console.log('🔧 Transcript Speaker Fix Tool\n')
      console.log('Usage:')
      console.log('  Fix specific session (dry run):')
      console.log('    npx tsx scripts/fix-existing-transcripts.ts [sessionId]')
      console.log('')
      console.log('  Fix specific session (apply):')
      console.log('    npx tsx scripts/fix-existing-transcripts.ts [sessionId] --apply')
      console.log('')
      console.log('  Fix all recent sessions (dry run):')
      console.log('    npx tsx scripts/fix-existing-transcripts.ts --all')
      console.log('')
      console.log('  Fix all recent sessions (apply):')
      console.log('    npx tsx scripts/fix-existing-transcripts.ts --all --apply')
      console.log('')
      console.log('  Fix sessions from last N days:')
      console.log('    npx tsx scripts/fix-existing-transcripts.ts --all --days=7 --apply')
      console.log('')
      console.log('The tool analyzes message content to determine correct speaker (user vs assistant)')
    }
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main().catch(console.error)