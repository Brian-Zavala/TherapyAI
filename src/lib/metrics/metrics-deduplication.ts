import { prisma } from '@/lib/database/prisma-optimized';
import { redis } from '@/lib/cache/redis-client';
import { logger } from '@/lib/utils/logger';
import { SessionMetrics } from '@prisma/client';

const METRICS_LOCK_PREFIX = 'metrics:lock:';
const METRICS_PROCESSED_PREFIX = 'metrics:processed:';
const LOCK_TTL = 30; // 30 seconds
const PROCESSED_TTL = 86400; // 24 hours

export interface MetricsCalculationResult {
  metrics: SessionMetrics | null;
  alreadyCalculated: boolean;
  error?: Error;
}

/**
 * Calculate metrics for a session with deduplication
 */
export async function calculateMetrics(
  sessionId: string,
  userId: string
): Promise<MetricsCalculationResult> {
  const lockKey = `${METRICS_LOCK_PREFIX}${sessionId}`;
  const processedKey = `${METRICS_PROCESSED_PREFIX}${sessionId}`;

  try {
    // Check if metrics already calculated
    const alreadyProcessed = await redis.get(processedKey);
    if (alreadyProcessed) {
      logger.info('Metrics already calculated for session', { sessionId });
      
      const existingMetrics = await prisma.sessionMetrics.findUnique({
        where: { sessionId }
      });
      
      return {
        metrics: existingMetrics,
        alreadyCalculated: true
      };
    }

    // Try to acquire lock
    const lockAcquired = await redis.set(
      lockKey,
      '1',
      'EX',
      LOCK_TTL,
      'NX'
    );

    if (!lockAcquired) {
      logger.warn('Could not acquire metrics lock', { sessionId });
      
      // Wait for other process to complete
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      const metrics = await prisma.sessionMetrics.findUnique({
        where: { sessionId }
      });
      
      return {
        metrics,
        alreadyCalculated: true
      };
    }

    // Check again after acquiring lock (double-check pattern)
    const existingMetrics = await prisma.sessionMetrics.findUnique({
      where: { sessionId }
    });

    if (existingMetrics) {
      await redis.set(processedKey, '1', 'EX', PROCESSED_TTL);
      return {
        metrics: existingMetrics,
        alreadyCalculated: true
      };
    }

    // Calculate metrics
    logger.info('Calculating metrics for session', { sessionId });
    
    const metrics = await performMetricsCalculation(sessionId, userId);
    
    // Mark as processed
    await redis.set(processedKey, '1', 'EX', PROCESSED_TTL);
    
    return {
      metrics,
      alreadyCalculated: false
    };
    
  } catch (error) {
    logger.error('Error calculating metrics', {
      sessionId,
      error
    });
    
    return {
      metrics: null,
      alreadyCalculated: false,
      error: error as Error
    };
  } finally {
    // Always release lock
    await redis.del(lockKey);
  }
}

/**
 * Perform the actual metrics calculation
 */
async function performMetricsCalculation(
  sessionId: string,
  userId: string
): Promise<SessionMetrics> {
  // Get session data
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: {
      transcriptEntries: {
        orderBy: { timestamp: 'asc' }
      }
    }
  });

  if (!session) {
    throw new Error(`Session ${sessionId} not found`);
  }

  // Calculate basic metrics - use conversationTimeSeconds if available
  const duration = session.conversationTimeSeconds || 
    (session.completedAt && session.createdAt
      ? Math.floor((session.completedAt.getTime() - session.createdAt.getTime()) / 1000)
      : 0);

  const messages = session.transcriptEntries || [];
  const totalMessages = messages.length;
  // Use speaker field instead of role for transcript entries
  const userMessages = messages.filter(m => m.speaker === 'user').length;
  const assistantMessages = messages.filter(m => m.speaker === 'assistant' || m.speaker === 'vapi').length;

  // Calculate engagement metrics
  const engagementScore = calculateEngagementScore(messages);
  const sentimentTrend = calculateSentimentTrend(messages);
  
  // Calculate topic metrics
  const topicDistribution = calculateTopicDistribution(messages);
  const emotionalTopics = identifyEmotionalTopics(messages);

  // CRITICAL FIX: Create all metrics in a single transaction to prevent partial failures
  // If any metric creation fails, all are rolled back to maintain consistency
  const metrics = await prisma.$transaction(async (tx) => {
    // Calculate dashboard scores once for consistency
    const communicationScore = Math.round((engagementScore + (sentimentTrend.average || 50)) / 2);
    const closenessScore = Math.round(sentimentTrend.average || 50);
    
    // 1. Create SessionMetrics (detailed analytics)
    const sessionMetrics = await tx.sessionMetrics.create({
      data: {
        sessionId,
        userId,
        duration,
        totalMessages,
        userMessages,
        assistantMessages,
        engagementScore,
        sentimentScore: isNaN(sentimentTrend.average) ? 0 : sentimentTrend.average,
        sentimentTrend: sentimentTrend.trend,
        topicsCovered: topicDistribution.topics,
        emotionalInsights: {
          primaryEmotions: emotionalTopics.primary,
          emotionalProgression: emotionalTopics.progression,
          breakthroughMoments: emotionalTopics.breakthroughs
        },
        completionRate: 1.0, // Session was completed
        qualityScore: calculateQualityScore({
          duration,
          totalMessages,
          engagementScore,
          sentimentScore: isNaN(sentimentTrend.average) ? 0 : sentimentTrend.average
        })
      }
    });

    // 2. Create ProgressTracking (required for relationship progress dashboard)
    const progressTracking = await tx.progressTracking.create({
      data: {
        userId,
        sessionId,
        assistantId: session.assistantId,
        closenessScore: Math.max(0, Math.min(100, closenessScore)),
        communicationScore: Math.max(0, Math.min(100, communicationScore)),
        date: new Date(),
        notes: `Session completed with ${totalMessages} messages. Engagement: ${engagementScore}%, Sentiment: ${sentimentTrend.trend}`
      }
    });

    // 3. Create CommunicationMetric (required for communication metrics dashboard)
    const communicationMetrics = await tx.communicationMetric.create({
      data: {
        userId,
        sessionId,
        clarity: Math.max(0, Math.min(100, engagementScore)),
        empathy: Math.max(0, Math.min(100, sentimentTrend.average || 50)),
        respect: Math.max(0, Math.min(100, Math.round(engagementScore * 0.9))),
        overall: Math.max(0, Math.min(100, communicationScore)),
        listening: Math.max(0, Math.min(100, Math.round(engagementScore * 0.85))),
        expression: Math.max(0, Math.min(100, Math.round(engagementScore * 0.95))),
        metricType: 'final',
        calculatedAt: new Date(),
        confidence: totalMessages > 20 ? 0.8 : 0.6
      }
    });

    logger.info('All metrics created in transaction', {
      sessionId,
      communicationScore,
      closenessScore,
      hasSessionMetrics: !!sessionMetrics,
      hasProgressTracking: !!progressTracking,
      hasCommunicationMetrics: !!communicationMetrics
    });

    return sessionMetrics;
  }, {
    // Transaction options for better reliability
    maxWait: 10000, // 10 seconds max wait for transaction
    timeout: 30000, // 30 seconds timeout
    isolationLevel: 'ReadCommitted' // Prevent phantom reads
  });

  // CRITICAL FIX: Invalidate dashboard cache when new metrics are created
  // This ensures fresh data is returned to dashboard APIs instead of cached empty results
  try {
    const { dashboardCache } = await import('@/lib/cache/dashboard-cache');
    
    // Get session details for cache invalidation
    const sessionForCache = await prisma.session.findUnique({
      where: { id: sessionId },
      select: { theme: true, sessionType: true }
    });
    
    if (sessionForCache) {
      await dashboardCache.invalidateOnSessionComplete(
        userId, 
        sessionForCache.theme || '', 
        sessionForCache.sessionType || 'SOLO'
      );
      
      logger.info('Dashboard cache invalidated after metrics creation', {
        sessionId,
        userId,
        sessionType: sessionForCache.sessionType,
        theme: sessionForCache.theme
      });
    }
  } catch (cacheError) {
    logger.error('Failed to invalidate dashboard cache after metrics creation', {
      sessionId,
      userId,
      error: cacheError
    });
  }

  logger.info('Metrics calculated successfully', {
    sessionId,
    duration,
    totalMessages,
    engagementScore
  });

  return metrics;
}

/**
 * Calculate engagement score based on message patterns
 */
function calculateEngagementScore(messages: any[]): number {
  if (messages.length === 0) return 0;

  let score = 0;
  let consecutiveUserMessages = 0;
  let lastSpeaker = '';

  for (const message of messages) {
    // Track conversation flow
    if (message.speaker === 'user') {
      if (lastSpeaker === 'user') {
        consecutiveUserMessages++;
      } else {
        consecutiveUserMessages = 1;
      }
      
      // Bonus for user engagement
      score += 2;
      
      // Bonus for message length (indicating thoughtful responses)
      if (message.text && message.text.length > 100) score += 1;
      if (message.text && message.text.length > 200) score += 2;
    } else if ((message.speaker === 'assistant' || message.speaker === 'vapi') && lastSpeaker === 'user') {
      // Good back-and-forth conversation
      score += 1.5;
    }
    
    lastSpeaker = message.speaker;
  }

  // Normalize score to 0-100
  const maxPossibleScore = messages.length * 3;
  return Math.min(100, Math.round((score / maxPossibleScore) * 100));
}

/**
 * Calculate sentiment trend throughout the session
 */
function calculateSentimentTrend(messages: any[]): {
  average: number;
  trend: 'improving' | 'declining' | 'stable';
} {
  // Simple sentiment analysis based on keywords
  // In production, use a proper NLP service
  const sentiments = messages.map(m => {
    const content = (m.text || '').toLowerCase();
    let score = 50; // Neutral baseline
    
    // Positive indicators
    const positiveWords = ['good', 'better', 'happy', 'grateful', 'love', 'appreciate', 'understand'];
    const negativeWords = ['angry', 'frustrated', 'sad', 'hurt', 'difficult', 'hard', 'upset'];
    
    positiveWords.forEach(word => {
      if (content.includes(word)) score += 10;
    });
    
    negativeWords.forEach(word => {
      if (content.includes(word)) score -= 10;
    });
    
    return Math.max(0, Math.min(100, score));
  });

  const average = sentiments.length > 0 
    ? sentiments.reduce((a, b) => a + b, 0) / sentiments.length 
    : 0;
  
  // Calculate trend
  const firstHalf = sentiments.slice(0, Math.floor(sentiments.length / 2));
  const secondHalf = sentiments.slice(Math.floor(sentiments.length / 2));
  
  const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length || 0;
  const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length || 0;
  
  let trend: 'improving' | 'declining' | 'stable' = 'stable';
  if (secondAvg > firstAvg + 10) trend = 'improving';
  else if (secondAvg < firstAvg - 10) trend = 'declining';
  
  return { average, trend };
}

/**
 * Calculate topic distribution from messages
 */
function calculateTopicDistribution(messages: any[]): {
  topics: string[];
} {
  // Simple topic extraction based on keywords
  // In production, use proper NLP/topic modeling
  const topicKeywords = {
    communication: ['talk', 'listen', 'understand', 'express', 'say'],
    trust: ['trust', 'honest', 'truth', 'believe', 'faith'],
    intimacy: ['close', 'intimate', 'connection', 'touch', 'affection'],
    conflict: ['argue', 'fight', 'disagree', 'conflict', 'dispute'],
    emotions: ['feel', 'emotion', 'angry', 'sad', 'happy', 'hurt']
  };

  const topicCounts: Record<string, number> = {};
  
  messages.forEach(message => {
    const content = (message.text || '').toLowerCase();
    
    Object.entries(topicKeywords).forEach(([topic, keywords]) => {
      keywords.forEach(keyword => {
        if (content.includes(keyword)) {
          topicCounts[topic] = (topicCounts[topic] || 0) + 1;
        }
      });
    });
  });

  // Get top topics
  const topics = Object.entries(topicCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([topic]) => topic);

  return { topics };
}

/**
 * Identify emotional topics and breakthrough moments
 */
function identifyEmotionalTopics(messages: any[]): {
  primary: string[];
  progression: string;
  breakthroughs: number;
} {
  // Simplified emotional analysis
  const emotions = ['happy', 'sad', 'angry', 'fearful', 'surprised', 'disgusted'];
  const emotionCounts: Record<string, number> = {};
  let breakthroughs = 0;

  messages.forEach((message, index) => {
    const content = (message.text || '').toLowerCase();
    
    // Count emotions
    emotions.forEach(emotion => {
      if (content.includes(emotion)) {
        emotionCounts[emotion] = (emotionCounts[emotion] || 0) + 1;
      }
    });
    
    // Detect breakthrough moments (simplified)
    if (
      content.includes('realize') ||
      content.includes('understand now') ||
      content.includes('see what you mean') ||
      content.includes('never thought of it that way')
    ) {
      breakthroughs++;
    }
  });

  const primary = Object.entries(emotionCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([emotion]) => emotion);

  return {
    primary,
    progression: 'Processing emotions constructively',
    breakthroughs
  };
}

/**
 * Calculate overall quality score
 */
function calculateQualityScore(metrics: {
  duration: number;
  totalMessages: number;
  engagementScore: number;
  sentimentScore: number;
}): number {
  let score = 0;
  
  // Duration scoring (optimal: 30-60 minutes)
  if (metrics.duration >= 1800 && metrics.duration <= 3600) {
    score += 25;
  } else if (metrics.duration >= 900 && metrics.duration <= 5400) {
    score += 15;
  }
  
  // Message count scoring (optimal: 20-50 messages)
  if (metrics.totalMessages >= 20 && metrics.totalMessages <= 50) {
    score += 25;
  } else if (metrics.totalMessages >= 10 && metrics.totalMessages <= 70) {
    score += 15;
  }
  
  // Engagement score contribution
  score += (metrics.engagementScore / 100) * 25;
  
  // Sentiment score contribution
  score += (metrics.sentimentScore / 100) * 25;
  
  return Math.round(score);
}

/**
 * Check if metrics exist for a session
 */
export async function hasMetrics(sessionId: string): Promise<boolean> {
  const processedKey = `${METRICS_PROCESSED_PREFIX}${sessionId}`;
  const cached = await redis.get(processedKey);
  
  if (cached) return true;
  
  const metrics = await prisma.sessionMetrics.findUnique({
    where: { sessionId }
  });
  
  if (metrics) {
    // Update cache
    await redis.set(processedKey, '1', 'EX', PROCESSED_TTL);
    return true;
  }
  
  return false;
}