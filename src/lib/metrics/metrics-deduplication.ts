import { prisma } from '@/lib/prisma-optimized';
import { redis } from '@/lib/cache/redis-client';
import { logger } from '@/lib/logger';
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

  // Calculate basic metrics
  const duration = session.completedAt && session.startedAt
    ? Math.floor((session.completedAt.getTime() - session.startedAt.getTime()) / 1000)
    : 0;

  const messages = session.transcriptEntries || [];
  const totalMessages = messages.length;
  const userMessages = messages.filter(m => m.role === 'user').length;
  const assistantMessages = messages.filter(m => m.role === 'assistant' || m.role === 'vapi').length;

  // Calculate engagement metrics
  const engagementScore = calculateEngagementScore(messages);
  const sentimentTrend = calculateSentimentTrend(messages);
  
  // Calculate topic metrics
  const topicDistribution = calculateTopicDistribution(messages);
  const emotionalTopics = identifyEmotionalTopics(messages);

  // Create metrics record
  const metrics = await prisma.sessionMetrics.create({
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
    if (message.role === 'user') {
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
    } else if ((message.role === 'assistant' || message.role === 'vapi') && lastSpeaker === 'user') {
      // Good back-and-forth conversation
      score += 1.5;
    }
    
    lastSpeaker = message.role;
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