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
    'you feel', 'you\'re saying', 'let me understand', 'tell me more'
  ];
  
  // Check for expressing needs indicators
  const expressingNeedsPhrases = [
    'i need', 'i want', 'i feel', 'i would like', 'from my perspective', 
    'my concern is', 'it\'s important to me', 'i wish'
  ];
  
  // Check for conflict resolution indicators
  const conflictResolutionPhrases = [
    'let\'s find a solution', 'we can compromise', 'middle ground', 'agree to', 
    'resolve this', 'work together', 'common goal', 'both of us'
  ];
  
  // Check for emotional support indicators
  const emotionalSupportPhrases = [
    'i\'m here for you', 'i support you', 'thank you for sharing', 'i appreciate', 
    'that must be difficult', 'i care about', 'your feelings matter', 'i\'m sorry'
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