// metrics-helper.ts
import { prisma } from '@/lib/prisma-optimized'
import { analyzeTranscriptForMetrics } from '@/lib/transcript-analysis'

export { analyzeTranscriptForMetrics }

// Helper function to generate metrics from the session
export async function generateMetricsFromSession(userId: string, duration: number, sessionId?: string, transcript?: string, therapyType: string = 'couple', assistantId?: string) {
  // Normalize therapy type to lowercase so callers can pass DB enums like 'SOLO'/'COUPLE'/'FAMILY'
  therapyType = therapyType.toLowerCase();
  // Validate the userId exists first
  try {
    const userExists = await prisma.user.findUnique({
      where: { id: userId }
    });
    
    if (!userExists) {
      console.error(`Cannot generate metrics: User with ID ${userId} does not exist`);
      return;
    }
    
    // Check the session's theme and assistantId to determine therapy type if not provided
    if (sessionId && (!therapyType || !assistantId)) {
      const session = await prisma.session.findUnique({
        where: { id: sessionId },
        select: { theme: true, assistantId: true }
      });
      
      if (session) {
        // Get therapy type from theme if not provided
        if (!therapyType) {
          if (session.theme.toLowerCase().includes('family')) {
            therapyType = 'family';
          } else if (session.theme.toLowerCase().includes('individual') || session.theme.toLowerCase().includes('solo')) {
            therapyType = 'solo';
          } else if (session.theme.toLowerCase().includes('relationship') || session.theme.toLowerCase().includes('couple')) {
            therapyType = 'couple';
          }
        }
        
        // Get assistantId from session if not provided
        if (!assistantId && session.assistantId) {
          assistantId = session.assistantId;
        }
      }
    }

    // Base calculation using duration
    const baseScore = Math.min(85, 50 + Math.floor(duration / 5));
    const variability = 10; // Add some randomness to scores
    
    // Calculate enhanced metrics if transcript is available
    const metrics = analyzeTranscriptForMetrics(transcript, baseScore, variability, therapyType);
    
    // Extract notes from transcript for context
    let notes = "";
    if (transcript) {
      // Prioritize extracting insights from important sections
      // Look for a summary, conclusion, session notes or key insights section
      const summaryMatch = transcript.match(/summary|conclusion|progress|next steps|key points|key insights|session notes|impression|assessment|plan/i);
      if (summaryMatch) {
        // Found a potential summary section
        const startIndex = summaryMatch.index || 0;
        // Extract a larger portion (400 chars) to get more context
        let extractedText = transcript.substring(startIndex, Math.min(startIndex + 400, transcript.length));
        
        // Try to find the end of the summary section
        const nextSectionMatch = extractedText.match(/\n\n|\r\n\r\n|next session|homework|follow up/i);
        if (nextSectionMatch && nextSectionMatch.index && nextSectionMatch.index > 30) {
          // If we find a clear end to the section, trim to that
          extractedText = extractedText.substring(0, nextSectionMatch.index);
        }
        
        // Format and trim the notes
        notes = extractedText.trim();
        if (notes.length > 300) {
          notes = notes.substring(0, 297) + "...";
        }
      } else {
        // No clear summary section - try to identify therapeutic insights
        const lines = transcript.split('\n');
        const therapeuticLines = lines.filter(line => {
          // Look for lines with therapeutic language
          return /\b(progress|improve|goal|technique|skill|practice|homework|insight|pattern|relationship|feeling|emotion|thought|behavior|communication|understand|awareness)\b/i.test(line) &&
            // That aren't too short
            line.length > 30;
        });
        
        if (therapeuticLines.length > 0) {
          // Join the top 2-3 most valuable lines
          notes = therapeuticLines.slice(0, Math.min(3, therapeuticLines.length)).join(" ");
          if (notes.length > 300) {
            notes = notes.substring(0, 297) + "...";
          }
        } else {
          // Fallback to getting the last few meaningful exchanges
          const lastPortionSize = Math.min(transcript.length, 400);
          const lastPortion = transcript.substring(transcript.length - lastPortionSize);
          
          // Try to start at a clean line break for readability
          const firstLineBreak = lastPortion.match(/\n/);
          if (firstLineBreak && firstLineBreak.index && firstLineBreak.index > 20) {
            notes = "..." + lastPortion.substring(firstLineBreak.index);
          } else {
            notes = "..." + lastPortion;
          }
          
          // Trim to a reasonable size
          if (notes.length > 300) {
            notes = notes.substring(0, 297) + "...";
          }
        }
      }
    }
    
    // ─── ProgressTracking: upsert to avoid duplicates ───────────────────────
    if (sessionId) {
      const existingProgress = await prisma.progressTracking.findFirst({
        where: { sessionId }
      });
      if (existingProgress) {
        // Only overwrite if the existing record has all-zero scores (legacy bad data)
        if (!existingProgress.closenessScore && !existingProgress.communicationScore) {
          await prisma.progressTracking.update({
            where: { id: existingProgress.id },
            data: {
              closenessScore: metrics.closenessScore,
              communicationScore: metrics.communicationScore,
              notes,
              assistantId: assistantId || existingProgress.assistantId
            }
          });
        }
        // Otherwise keep the existing record (calculateMetrics ran first)
      } else {
        await prisma.progressTracking.create({
          data: { userId, closenessScore: metrics.closenessScore, communicationScore: metrics.communicationScore, notes, sessionId, assistantId }
        });
      }
    } else {
      await prisma.progressTracking.create({
        data: { userId, closenessScore: metrics.closenessScore, communicationScore: metrics.communicationScore, notes, sessionId: null, assistantId }
      });
    }

    // ─── CommunicationMetric: upsert to avoid duplicates ────────────────────
    const metricPayload = {
      clarity: metrics.activeListeningScore,
      empathy: metrics.emotionalSupportScore,
      respect: metrics.conflictResolutionScore,
      overall: Math.round((metrics.closenessScore + metrics.communicationScore) / 2),
      listening: metrics.activeListeningScore,
      expression: metrics.expressingNeedsScore,
      metricType: 'final' as const,
      calculatedAt: new Date()
    };

    if (sessionId) {
      const existingMetric = await prisma.communicationMetric.findFirst({
        where: { sessionId, metricType: 'final' }
      });
      if (existingMetric) {
        // Overwrite only if existing values are all zero (legacy bad data from therapyType bug)
        const allZero = !existingMetric.listening && !existingMetric.expression &&
          !existingMetric.respect && !existingMetric.empathy;
        if (allZero) {
          await prisma.communicationMetric.update({
            where: { id: existingMetric.id },
            data: metricPayload
          });
          console.log(`Repaired zero-value CommunicationMetric for session ${sessionId}`);
        }
        // Otherwise keep the existing record — calculateMetrics already ran
      } else {
        await prisma.communicationMetric.create({
          data: { userId, sessionId, ...metricPayload }
        });
      }
    } else {
      await prisma.communicationMetric.create({
        data: { userId, sessionId: null, ...metricPayload }
      });
    }

    console.log(`Successfully generated ${therapyType} metrics for user ${userId} based on session transcript analysis`);
  } catch (error) {
    console.error('Error in generateMetricsFromSession:', error);
    throw error; // Re-throw to be caught by the caller
  }
}

// analyzeTranscriptForMetrics is re-exported from @/lib/transcript-analysis (see top of file)
// Removed duplicate definition — use the import above
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function _unused(transcript?: string, baseScore = 60, variability = 10, therapyType: string = 'couple') {
  therapyType = therapyType.toLowerCase();
  // For solo therapy, generate minimal metrics even without transcript
  if (!transcript) {
    if (therapyType === 'solo') {
      // Provide baseline solo therapy metrics when no transcript is available
      return {
        closenessScore: 0, // Not applicable for solo therapy
        communicationScore: Math.floor(baseScore * 0.8), // Basic communication with therapist
        activeListeningScore: Math.floor(baseScore * 0.9), // Self-reflection and listening
        expressingNeedsScore: Math.floor(baseScore * 0.7), // Self-expression skills
        conflictResolutionScore: Math.floor(baseScore * 0.6), // Internal conflict resolution
        emotionalSupportScore: Math.floor(baseScore * 0.8) // Self-care and emotional awareness
      };
    }
    
    // For couple/family therapy, require transcript for meaningful metrics
    return {
      closenessScore: 0,
      communicationScore: 0,
      activeListeningScore: 0,
      expressingNeedsScore: 0,
      conflictResolutionScore: 0,
      emotionalSupportScore: 0
    };
  }
  
  // Initialize scores
  let activeListeningScore = baseScore;
  let expressingNeedsScore = baseScore;
  let conflictResolutionScore = baseScore;
  let emotionalSupportScore = baseScore;
  
  // Process transcript to find indicators of different communication qualities
  const transcriptLower = transcript.toLowerCase();
  
  // Common phrases for all therapy types
  const activeListeningPhrases = [
    'i understand', 'i hear you', 'what i\'m hearing is', 'it sounds like', 
    'you feel', 'you\'re saying', 'let me understand', 'tell me more',
    'from your perspective', 'sounds like you feel', 'if i understand correctly',
    'what i\'m understanding is', 'so you\'re feeling', 'you mentioned that',
    'correct me if i\'m wrong', 'help me understand', 'it seems that you', 
    'in other words', 'let me see if i understand', 'I\'m following you',
    'you\'re describing', 'what I\'m gathering', 'that makes sense', 'I see what you mean'
  ];
  
  const expressingNeedsPhrases = [
    'i need', 'i want', 'i feel', 'i would like', 'from my perspective', 
    'my concern is', 'it\'s important to me', 'i wish', 'i prefer',
    'i value', 'i\'d appreciate', 'what matters to me', 'i hope',
    'i expect', 'i deserve', 'i require', 'i\'m asking for',
    'i desire', 'my priority is', 'what works for me', 'i\'m looking for',
    'i need you to understand', 'it would help me if', 'i feel strongly about'
  ];
  
  const conflictResolutionPhrases = [
    'let\'s find a solution', 'we can compromise', 'middle ground', 'agree to', 
    'resolve this', 'work together', 'common goal', 'both of us',
    'find a way forward', 'what if we', 'another option could be', 'meet halfway',
    'how about we try', 'win-win', 'mutual benefit', 'we both want',
    'let\'s try to understand', 'can we agree that', 'what matters most is',
    'let\'s focus on', 'i\'m willing to', 'we could both', 'fair solution',
    'agreeable to both', 'let\'s brainstorm', 'we can work through this'
  ];
  
  const emotionalSupportPhrases = [
    'i\'m here for you', 'i support you', 'thank you for sharing', 'i appreciate', 
    'that must be difficult', 'i care about', 'your feelings matter', 'i\'m sorry',
    'i understand this is hard', 'i\'m listening', 'take your time',
    'it\'s okay to feel', 'you\'re not alone', 'i believe in you',
    'that sounds challenging', 'i can see why you\'d feel', 'i value your feelings',
    'i respect how you feel', 'it makes sense that you', 'i acknowledge your',
    'that\'s valid', 'you have every right to feel', 'i empathize with',
    'i\'m proud of you', 'you\'re handling this well', 'thank you for trusting me'
  ];
  
  // Add therapy type-specific phrases
  if (therapyType === 'family') {
    // Family therapy specific phrases
    activeListeningPhrases.push(...[
      'each family member', 'as a family', 'your role in the family', 
      'family dynamic', 'different perspectives in the family',
      'family system', 'each person\'s viewpoint'
    ]);
    
    expressingNeedsPhrases.push(...[
      'as a parent', 'as a child', 'in my role', 'my responsibility',
      'our family needs', 'our household', 'family rules', 'boundaries',
      'family expectations'
    ]);
    
    conflictResolutionPhrases.push(...[
      'family meeting', 'family discussion', 'family agreement',
      'respect each other\'s', 'family compromise', 'between family members',
      'across generations', 'among siblings'
    ]);
    
    emotionalSupportPhrases.push(...[
      'family bond', 'family connection', 'family support',
      'family tradition', 'family values', 'family love', 
      'family unity', 'family roles'
    ]);
  } else {
    // Couple therapy specific phrases
    activeListeningPhrases.push(...[
      'between you two', 'in your relationship', 'as a couple',
      'partner\'s perspective', 'your partner feels', 'in your marriage'
    ]);
    
    expressingNeedsPhrases.push(...[
      'in our relationship', 'as your partner', 'our connection',
      'our intimacy', 'romantic needs', 'quality time together',
      'shared responsibilities'
    ]);
    
    conflictResolutionPhrases.push(...[
      'as a couple', 'relationship compromise', 'relationship goals',
      'your partnership', 'your marriage', 'couple\'s agreement'
    ]);
    
    emotionalSupportPhrases.push(...[
      'partner support', 'relationship bond', 'love language',
      'intimate connection', 'romantic support', 'couple\'s trust'
    ]);
  }
  
  // Count phrase occurrences and adjust scores
  activeListeningPhrases.forEach(phrase => {
    const matches = (transcriptLower.match(new RegExp(phrase, 'g')) || []).length;
    activeListeningScore += matches * 3; // +3 points per match
  });
  
  expressingNeedsPhrases.forEach(phrase => {
    const matches = (transcriptLower.match(new RegExp(phrase, 'g')) || []).length;
    expressingNeedsScore += matches * 3;
  });
  
  conflictResolutionPhrases.forEach(phrase => {
    const matches = (transcriptLower.match(new RegExp(phrase, 'g')) || []).length;
    conflictResolutionScore += matches * 4;
  });
  
  emotionalSupportPhrases.forEach(phrase => {
    const matches = (transcriptLower.match(new RegExp(phrase, 'g')) || []).length;
    emotionalSupportScore += matches * 3;
  });
  
  // Normalize scores to max of 100
  activeListeningScore = Math.min(100, activeListeningScore);
  expressingNeedsScore = Math.min(100, expressingNeedsScore);
  conflictResolutionScore = Math.min(100, conflictResolutionScore);
  emotionalSupportScore = Math.min(100, emotionalSupportScore);
  
  // Apply therapy type specific adjustments
  if (therapyType === 'family') {
    // Family therapy places higher emphasis on clear communication
    activeListeningScore = Math.min(100, activeListeningScore + 5);
    conflictResolutionScore = Math.min(100, conflictResolutionScore + 3);
  } else {
    // Couple therapy places higher emphasis on emotional connection
    emotionalSupportScore = Math.min(100, emotionalSupportScore + 5);
    expressingNeedsScore = Math.min(100, expressingNeedsScore + 3);
  }
  
  // Calculate aggregate scores with adjustments based on therapy type
  let communicationScore, closenessScore;
  
  if (therapyType === 'family') {
    communicationScore = Math.min(100, Math.floor(
      (activeListeningScore * 0.4 + expressingNeedsScore * 0.3 + conflictResolutionScore * 0.3)
    ));
    
    closenessScore = Math.min(100, Math.floor(
      (emotionalSupportScore * 0.6 + activeListeningScore * 0.4)
    ));
  } else {
    // Default couple therapy calculations
    communicationScore = Math.min(100, Math.floor(
      (activeListeningScore * 0.35 + expressingNeedsScore * 0.35 + conflictResolutionScore * 0.3)
    ));
    
    closenessScore = Math.min(100, Math.floor(
      (emotionalSupportScore * 0.7 + activeListeningScore * 0.3)
    ));
  }
  
  return {
    closenessScore,
    communicationScore,
    activeListeningScore,
    expressingNeedsScore,
    conflictResolutionScore,
    emotionalSupportScore
  };
}