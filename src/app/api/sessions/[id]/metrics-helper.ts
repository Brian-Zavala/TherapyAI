// metrics-helper.ts
import { prisma } from '@/lib/prisma'

// Helper function to generate metrics from the session
export async function generateMetricsFromSession(userId: string, duration: number, transcript?: string) {
  // Validate the userId exists first
  try {
    const userExists = await prisma.user.findUnique({
      where: { id: userId }
    });
    
    if (!userExists) {
      console.error(`Cannot generate metrics: User with ID ${userId} does not exist`);
      return;
    }
    
    // Base calculation using duration
    const baseScore = Math.min(85, 50 + Math.floor(duration / 5));
    const variability = 10; // Add some randomness to scores
    
    // Calculate enhanced metrics if transcript is available
    const metrics = analyzeTranscriptForMetrics(transcript, baseScore, variability);
    
    // Create progress tracking data
    await prisma.progressTracking.create({
      data: {
        userId,
        closenessScore: metrics.closenessScore,
        communicationScore: metrics.communicationScore
      }
    });
    
    // Create communication metrics data
    await prisma.communicationMetrics.create({
      data: {
        userId,
        activeListeningScore: metrics.activeListeningScore,
        expressingNeedsScore: metrics.expressingNeedsScore,
        conflictResolutionScore: metrics.conflictResolutionScore,
        emotionalSupportScore: metrics.emotionalSupportScore
      }
    });
    
    console.log(`Successfully generated metrics for user ${userId} based on session transcript analysis`);
  } catch (error) {
    console.error('Error in generateMetricsFromSession:', error);
    throw error; // Re-throw to be caught by the caller
  }
}

// Helper function to analyze transcript and extract metrics
export function analyzeTranscriptForMetrics(transcript?: string, baseScore = 60, variability = 10) {
  // Default metrics if no transcript
  if (!transcript) {
    return {
      closenessScore: baseScore + Math.floor(Math.random() * variability),
      communicationScore: baseScore + Math.floor(Math.random() * variability),
      activeListeningScore: baseScore + Math.floor(Math.random() * variability),
      expressingNeedsScore: baseScore + Math.floor(Math.random() * variability),
      conflictResolutionScore: baseScore + Math.floor(Math.random() * variability),
      emotionalSupportScore: baseScore + Math.floor(Math.random() * variability)
    };
  }
  
  // Initialize scores
  let activeListeningScore = baseScore;
  let expressingNeedsScore = baseScore;
  let conflictResolutionScore = baseScore;
  let emotionalSupportScore = baseScore;
  
  // Process transcript to find indicators of different communication qualities
  const transcriptLower = transcript.toLowerCase();
  
  // Check for active listening indicators
  const activeListeningPhrases = [
    'i understand', 'i hear you', 'what i\'m hearing is', 'it sounds like', 
    'you feel', 'you\'re saying', 'let me understand', 'tell me more',
    'from your perspective', 'sounds like you feel', 'if i understand correctly',
    'what i\'m understanding is', 'so you\'re feeling', 'you mentioned that',
    'correct me if i\'m wrong', 'help me understand', 'it seems that you', 
    'in other words', 'let me see if i understand', 'I\'m following you',
    'you\'re describing', 'what I\'m gathering', 'that makes sense', 'I see what you mean'
  ];
  
  // Check for expressing needs indicators
  const expressingNeedsPhrases = [
    'i need', 'i want', 'i feel', 'i would like', 'from my perspective', 
    'my concern is', 'it\'s important to me', 'i wish', 'i prefer',
    'i value', 'i\'d appreciate', 'what matters to me', 'i hope',
    'i expect', 'i deserve', 'i require', 'i\'m asking for',
    'i desire', 'my priority is', 'what works for me', 'i\'m looking for',
    'i need you to understand', 'it would help me if', 'i feel strongly about'
  ];
  
  // Check for conflict resolution indicators
  const conflictResolutionPhrases = [
    'let\'s find a solution', 'we can compromise', 'middle ground', 'agree to', 
    'resolve this', 'work together', 'common goal', 'both of us',
    'find a way forward', 'what if we', 'another option could be', 'meet halfway',
    'how about we try', 'win-win', 'mutual benefit', 'we both want',
    'let\'s try to understand', 'can we agree that', 'what matters most is',
    'let\'s focus on', 'i\'m willing to', 'we could both', 'fair solution',
    'agreeable to both', 'let\'s brainstorm', 'we can work through this'
  ];
  
  // Check for emotional support indicators
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
  
  // Calculate aggregate scores
  const communicationScore = Math.min(100, Math.floor(
    (activeListeningScore + expressingNeedsScore + conflictResolutionScore) / 3
  ));
  
  const closenessScore = Math.min(100, Math.floor(
    (emotionalSupportScore + activeListeningScore) / 2
  ));
  
  return {
    closenessScore,
    communicationScore,
    activeListeningScore,
    expressingNeedsScore,
    conflictResolutionScore,
    emotionalSupportScore
  };
}