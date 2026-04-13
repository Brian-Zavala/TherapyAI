// Helper function to analyze transcript and extract communication metrics
export function analyzeTranscriptForMetrics(transcript?: string, baseScore = 60, variability = 10, therapyType: string = 'couple') {
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
    activeListeningScore += matches * 3;
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
    activeListeningScore = Math.min(100, activeListeningScore + 5);
    conflictResolutionScore = Math.min(100, conflictResolutionScore + 3);
  } else {
    emotionalSupportScore = Math.min(100, emotionalSupportScore + 5);
    expressingNeedsScore = Math.min(100, expressingNeedsScore + 3);
  }

  // Calculate aggregate scores
  let communicationScore, closenessScore;

  if (therapyType === 'family') {
    communicationScore = Math.min(100, Math.floor(
      (activeListeningScore * 0.4 + expressingNeedsScore * 0.3 + conflictResolutionScore * 0.3)
    ));
    closenessScore = Math.min(100, Math.floor(
      (emotionalSupportScore * 0.6 + activeListeningScore * 0.4)
    ));
  } else {
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
