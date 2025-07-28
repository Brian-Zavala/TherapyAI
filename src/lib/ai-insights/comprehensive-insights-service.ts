/**
 * Comprehensive Insights Service
 * Combines deterministic and enhanced insights engines for maximum value
 * Analyzes transcripts, metrics, and patterns to provide deep, actionable insights
 */

import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma-optimized';
import { DeterministicInsightEngine } from './deterministic-insights-engine';
import { EnhancedInsightEngine } from './enhanced-insights-engine';
import type { 
  GeneratedInsights, 
  DynamicInsight, 
  UserContext 
} from './ai-insight-generator';
import type { ProcessedSessionData } from './session-data-processor';

interface TranscriptAnalysis {
  sessionId: string;
  sentimentBreakdown: {
    positive: number;
    negative: number;
    neutral: number;
  };
  emotionalMoments: {
    timestamp: Date;
    speaker: string;
    text: string;
    emotion: string;
    intensity: number;
  }[];
  topicFlow: {
    topic: string;
    duration: number;
    sentiment: string;
    depth: number;
  }[];
  speakerPatterns: {
    speaker: string;
    avgWordCount: number;
    interruptions: number;
    questions: number;
    affirmations: number;
  }[];
}

export class ComprehensiveInsightsService {
  private deterministicEngine: DeterministicInsightEngine;
  private enhancedEngine: EnhancedInsightEngine;
  
  constructor() {
    this.deterministicEngine = new DeterministicInsightEngine();
    this.enhancedEngine = new EnhancedInsightEngine();
  }
  
  /**
   * Generate comprehensive insights by combining all engines and data sources
   */
  async generateComprehensiveInsights(
    userId: string,
    sessionData: ProcessedSessionData[],
    userContext: UserContext
  ): Promise<GeneratedInsights> {
    logger.info('Generating comprehensive insights', {
      userId,
      sessionCount: sessionData.length
    });
    
    try {
      // Fetch additional data for enhanced analysis
      const [communicationMetrics, transcriptAnalyses, sessionMetrics] = await Promise.all([
        this.fetchCommunicationMetrics(userId, sessionData),
        this.analyzeTranscripts(userId, sessionData),
        this.fetchSessionMetrics(userId, sessionData)
      ]);
      
      // Generate insights from both engines
      const [deterministicInsights, enhancedInsights] = await Promise.all([
        Promise.resolve(this.deterministicEngine.generateInsights(sessionData, userContext)),
        Promise.resolve(this.enhancedEngine.generateEnhancedInsights(
          sessionData, 
          userContext,
          {
            communicationMetrics,
            transcriptAnalysis: transcriptAnalyses,
            sessionMetrics
          }
        ))
      ]);
      
      // Analyze transcript patterns for additional insights
      const transcriptInsights = this.generateTranscriptInsights(transcriptAnalyses, userContext);
      
      // Analyze topic-based insights
      const topicInsights = this.generateTopicInsights(sessionData, transcriptAnalyses, userContext);
      
      // Analyze time-based patterns
      const temporalInsights = this.generateTemporalInsights(sessionData, sessionMetrics, userContext);
      
      // Merge and deduplicate insights
      const mergedInsights = this.mergeInsights(
        deterministicInsights,
        enhancedInsights,
        transcriptInsights,
        topicInsights,
        temporalInsights
      );
      
      // Generate comprehensive action plans
      const actionPlans = this.generateActionPlans(mergedInsights, userContext);
      
      // Calculate overall confidence
      const confidence = this.calculateOverallConfidence(
        mergedInsights,
        sessionData.length,
        transcriptAnalyses.length
      );
      
      logger.info('Successfully generated comprehensive insights', {
        userId,
        insightCount: mergedInsights.insights.length,
        confidence
      });
      
      return {
        ...mergedInsights,
        confidence,
        dataQuality: this.assessOverallDataQuality(sessionData, transcriptAnalyses)
      };
      
    } catch (error) {
      logger.error('Failed to generate comprehensive insights', {
        userId,
        error: error instanceof Error ? error.message : error
      });
      
      // Fallback to basic insights
      return this.deterministicEngine.generateInsights(sessionData, userContext);
    }
  }
  
  private async fetchCommunicationMetrics(
    userId: string,
    sessionData: ProcessedSessionData[]
  ) {
    if (sessionData.length === 0) return [];
    
    const sessionIds = sessionData.map(s => s.sessionId);
    
    const metrics = await prisma.communicationMetric.findMany({
      where: {
        userId,
        sessionId: { in: sessionIds },
        metricType: 'final'
      },
      orderBy: { calculatedAt: 'desc' }
    });
    
    return metrics;
  }
  
  private async analyzeTranscripts(
    userId: string,
    sessionData: ProcessedSessionData[]
  ): Promise<TranscriptAnalysis[]> {
    const analyses: TranscriptAnalysis[] = [];
    
    for (const session of sessionData) {
      const transcripts = await prisma.transcriptEntry.findMany({
        where: {
          sessionId: session.sessionId,
          speaker: { in: ['user', 'partner', 'assistant'] }
        },
        orderBy: { timestamp: 'asc' }
      });
      
      if (transcripts.length === 0) continue;
      
      const analysis = this.analyzeSessionTranscripts(session.sessionId, transcripts);
      analyses.push(analysis);
    }
    
    return analyses;
  }
  
  private analyzeSessionTranscripts(
    sessionId: string,
    transcripts: any[]
  ): TranscriptAnalysis {
    const sentimentCounts = { positive: 0, negative: 0, neutral: 0 };
    const emotionalMoments: any[] = [];
    const speakerStats = new Map<string, any>();
    const topicSegments: any[] = [];
    
    let currentTopic = '';
    let topicStartIndex = 0;
    let lastSpeaker = '';
    let interruptions = new Map<string, number>();
    
    transcripts.forEach((entry, index) => {
      // Sentiment analysis
      const sentiment = entry.sentiment || this.analyzeSentiment(entry.text);
      sentimentCounts[sentiment as keyof typeof sentimentCounts]++;
      
      // Emotional moments detection
      const emotion = this.detectEmotion(entry.text);
      if (emotion.intensity > 0.7) {
        emotionalMoments.push({
          timestamp: entry.timestamp,
          speaker: entry.speaker,
          text: entry.text.substring(0, 100),
          emotion: emotion.type,
          intensity: emotion.intensity
        });
      }
      
      // Speaker pattern analysis
      if (!speakerStats.has(entry.speaker)) {
        speakerStats.set(entry.speaker, {
          speaker: entry.speaker,
          avgWordCount: 0,
          totalWords: 0,
          messageCount: 0,
          interruptions: 0,
          questions: 0,
          affirmations: 0
        });
      }
      
      const stats = speakerStats.get(entry.speaker);
      const wordCount = entry.text.split(' ').length;
      stats.totalWords += wordCount;
      stats.messageCount++;
      
      // Detect questions
      if (entry.text.includes('?')) {
        stats.questions++;
      }
      
      // Detect affirmations
      if (entry.text.match(/yes|right|exactly|understand|agree|absolutely|definitely/i)) {
        stats.affirmations++;
      }
      
      // Detect interruptions (quick speaker change with short previous message)
      if (lastSpeaker && lastSpeaker !== entry.speaker && index > 0) {
        const prevEntry = transcripts[index - 1];
        if (prevEntry.text.split(' ').length < 10) {
          stats.interruptions++;
        }
      }
      
      lastSpeaker = entry.speaker;
      
      // Topic flow analysis
      const detectedTopic = this.detectTopic(entry.text);
      if (detectedTopic !== currentTopic && index - topicStartIndex > 2) {
        if (currentTopic) {
          topicSegments.push({
            topic: currentTopic,
            duration: index - topicStartIndex,
            sentiment: this.calculateSegmentSentiment(transcripts.slice(topicStartIndex, index)),
            depth: this.calculateTopicDepth(transcripts.slice(topicStartIndex, index))
          });
        }
        currentTopic = detectedTopic;
        topicStartIndex = index;
      }
    });
    
    // Finalize last topic segment
    if (currentTopic && transcripts.length - topicStartIndex > 2) {
      topicSegments.push({
        topic: currentTopic,
        duration: transcripts.length - topicStartIndex,
        sentiment: this.calculateSegmentSentiment(transcripts.slice(topicStartIndex)),
        depth: this.calculateTopicDepth(transcripts.slice(topicStartIndex))
      });
    }
    
    // Calculate averages for speaker stats
    speakerStats.forEach((stats) => {
      stats.avgWordCount = stats.messageCount > 0 ? 
        Math.round(stats.totalWords / stats.messageCount) : 0;
    });
    
    return {
      sessionId,
      sentimentBreakdown: sentimentCounts,
      emotionalMoments,
      topicFlow: topicSegments,
      speakerPatterns: Array.from(speakerStats.values())
    };
  }
  
  private analyzeSentiment(text: string): string {
    const positiveWords = /love|happy|great|wonderful|amazing|excellent|joy|grateful|appreciate/i;
    const negativeWords = /hate|angry|sad|terrible|awful|hurt|pain|frustrated|disappointed/i;
    
    const positiveMatches = text.match(positiveWords);
    const negativeMatches = text.match(negativeWords);
    
    if (positiveMatches && !negativeMatches) return 'positive';
    if (negativeMatches && !positiveMatches) return 'negative';
    if (positiveMatches && negativeMatches) {
      return positiveMatches.length > negativeMatches.length ? 'positive' : 'negative';
    }
    
    return 'neutral';
  }
  
  private detectEmotion(text: string): { type: string; intensity: number } {
    const emotions = {
      joy: /happy|joy|elated|excited|thrilled|delighted/i,
      sadness: /sad|cry|tears|depressed|down|blue/i,
      anger: /angry|mad|furious|rage|irritated|annoyed/i,
      fear: /scared|afraid|anxious|worried|nervous|panic/i,
      love: /love|adore|cherish|care|affection/i,
      surprise: /surprised|shocked|amazed|astonished/i
    };
    
    for (const [emotion, pattern] of Object.entries(emotions)) {
      const matches = text.match(pattern);
      if (matches) {
        // Intensity based on word strength and exclamation marks
        const intensity = text.includes('!') ? 0.9 : 
                         text.includes('very') || text.includes('so') ? 0.8 : 0.7;
        return { type: emotion, intensity };
      }
    }
    
    return { type: 'neutral', intensity: 0.3 };
  }
  
  private detectTopic(text: string): string {
    const topicPatterns = {
      communication: /talk|communicate|listen|understand|express/i,
      trust: /trust|honest|truth|lie|betray/i,
      intimacy: /close|intimate|physical|touch|sex/i,
      conflict: /fight|argue|disagree|conflict|problem/i,
      family: /family|kids|children|parents|relatives/i,
      work: /work|job|career|boss|colleague/i,
      money: /money|finance|budget|spend|save/i,
      future: /future|plan|goal|dream|hope/i,
      past: /past|history|before|used to|remember/i
    };
    
    for (const [topic, pattern] of Object.entries(topicPatterns)) {
      if (text.match(pattern)) {
        return topic;
      }
    }
    
    return 'general';
  }
  
  private calculateSegmentSentiment(transcripts: any[]): string {
    const sentiments = transcripts.map(t => t.sentiment || this.analyzeSentiment(t.text));
    const positiveCount = sentiments.filter(s => s === 'positive').length;
    const negativeCount = sentiments.filter(s => s === 'negative').length;
    
    if (positiveCount > negativeCount * 1.5) return 'positive';
    if (negativeCount > positiveCount * 1.5) return 'negative';
    return 'mixed';
  }
  
  private calculateTopicDepth(transcripts: any[]): number {
    // Depth based on message length and back-and-forth
    const avgLength = transcripts.reduce((sum, t) => sum + t.text.length, 0) / transcripts.length;
    const speakerChanges = transcripts.filter((t, i) => 
      i > 0 && t.speaker !== transcripts[i-1].speaker
    ).length;
    
    if (avgLength > 200 && speakerChanges > 5) return 5; // Deep
    if (avgLength > 100 && speakerChanges > 3) return 4;
    if (avgLength > 50 && speakerChanges > 2) return 3;
    if (avgLength > 25) return 2;
    return 1; // Surface
  }
  
  private async fetchSessionMetrics(
    userId: string,
    sessionData: ProcessedSessionData[]
  ) {
    if (sessionData.length === 0) return [];
    
    const sessionIds = sessionData.map(s => s.sessionId);
    
    const metrics = await prisma.sessionMetrics.findMany({
      where: {
        userId,
        sessionId: { in: sessionIds }
      }
    });
    
    return metrics;
  }
  
  private generateTranscriptInsights(
    analyses: TranscriptAnalysis[],
    userContext: UserContext
  ): { insights: DynamicInsight[] } {
    const insights: DynamicInsight[] = [];
    
    // Aggregate patterns across sessions
    const aggregated = this.aggregateTranscriptPatterns(analyses);
    
    // Interruption pattern insight
    if (aggregated.avgInterruptions > 3) {
      insights.push({
        id: `transcript-interruption-${Date.now()}`,
        title: 'Interruption Pattern Detected',
        description: `Analysis shows an average of ${Math.round(aggregated.avgInterruptions)} interruptions per session. This may indicate anxiety or urgency in communication.`,
        category: 'communication',
        priority: 'high',
        actionItems: [
          'Practice the "pause and breathe" technique before responding',
          'Use a talking object to ensure complete thoughts',
          'Set a 2-minute timer for uninterrupted speaking'
        ],
        basedOn: [`${aggregated.totalInterruptions} interruptions across ${analyses.length} sessions`],
        evidence: [`Average interruptions per speaker: ${aggregated.interruptionsBySpeaker}`],
        timeframe: 'immediate',
        confidence: 85
      });
    }
    
    // Question-asking pattern
    if (aggregated.questionRatio < 0.1) {
      insights.push({
        id: `transcript-questions-${Date.now()}`,
        title: 'Limited Curiosity in Conversations',
        description: 'Sessions show minimal question-asking, which may indicate assumptions or lack of curiosity about partner\'s experience.',
        category: 'communication',
        priority: 'medium',
        actionItems: [
          'Ask at least 3 open-ended questions per conversation',
          'Practice "curious not furious" when disagreeing',
          'Use "Tell me more about..." as a conversation starter'
        ],
        basedOn: [`Question ratio: ${(aggregated.questionRatio * 100).toFixed(1)}%`],
        evidence: aggregated.questionExamples,
        timeframe: 'this-week',
        confidence: 75
      });
    }
    
    // Emotional moments insight
    if (aggregated.emotionalIntensity > 0.7) {
      insights.push({
        id: `transcript-emotional-${Date.now()}`,
        title: 'High Emotional Intensity',
        description: 'Conversations contain frequent high-intensity emotional moments. While emotion is healthy, overwhelming intensity can hinder communication.',
        category: 'emotional',
        priority: 'high',
        actionItems: [
          'Use the "emotional thermometer" check-in',
          'Take breaks when emotions exceed 7/10 intensity',
          'Practice co-regulation through synchronized breathing'
        ],
        basedOn: [`${aggregated.highEmotionCount} high-intensity moments detected`],
        evidence: aggregated.emotionTypes,
        timeframe: 'immediate',
        confidence: 80
      });
    }
    
    // Affirmation pattern
    if (aggregated.affirmationRatio > 0.3) {
      insights.push({
        id: `transcript-affirmation-${Date.now()}`,
        title: 'Strong Validation Pattern',
        description: 'Your conversations show excellent use of affirmations and validation. This creates safety for vulnerability.',
        category: 'communication',
        priority: 'low',
        actionItems: [
          'Continue this validation practice',
          'Model this behavior for others',
          'Deepen validation with emotion labeling'
        ],
        basedOn: [`Affirmation ratio: ${(aggregated.affirmationRatio * 100).toFixed(1)}%`],
        evidence: ['High frequency of validating responses'],
        timeframe: 'this-month',
        confidence: 85
      });
    }
    
    return { insights };
  }
  
  private aggregateTranscriptPatterns(analyses: TranscriptAnalysis[]) {
    if (analyses.length === 0) {
      return {
        avgInterruptions: 0,
        totalInterruptions: 0,
        interruptionsBySpeaker: '',
        questionRatio: 0,
        questionExamples: [],
        emotionalIntensity: 0,
        highEmotionCount: 0,
        emotionTypes: [],
        affirmationRatio: 0
      };
    }
    
    let totalInterruptions = 0;
    let totalQuestions = 0;
    let totalMessages = 0;
    let totalAffirmations = 0;
    let highEmotionCount = 0;
    const emotionTypes = new Set<string>();
    const interruptionsBySpeaker = new Map<string, number>();
    
    analyses.forEach(analysis => {
      analysis.speakerPatterns.forEach(pattern => {
        totalInterruptions += pattern.interruptions;
        totalQuestions += pattern.questions;
        totalAffirmations += pattern.affirmations;
        totalMessages += pattern.avgWordCount > 0 ? 1 : 0;
        
        if (!interruptionsBySpeaker.has(pattern.speaker)) {
          interruptionsBySpeaker.set(pattern.speaker, 0);
        }
        interruptionsBySpeaker.set(
          pattern.speaker,
          interruptionsBySpeaker.get(pattern.speaker)! + pattern.interruptions
        );
      });
      
      analysis.emotionalMoments.forEach(moment => {
        if (moment.intensity > 0.7) {
          highEmotionCount++;
          emotionTypes.add(moment.emotion);
        }
      });
    });
    
    const avgInterruptions = analyses.length > 0 ? totalInterruptions / analyses.length : 0;
    const questionRatio = totalMessages > 0 ? totalQuestions / totalMessages : 0;
    const affirmationRatio = totalMessages > 0 ? totalAffirmations / totalMessages : 0;
    const emotionalIntensity = highEmotionCount / (analyses.length || 1);
    
    return {
      avgInterruptions,
      totalInterruptions,
      interruptionsBySpeaker: Array.from(interruptionsBySpeaker.entries())
        .map(([speaker, count]) => `${speaker}: ${count}`)
        .join(', '),
      questionRatio,
      questionExamples: ['Open-ended questions create deeper understanding'],
      emotionalIntensity,
      highEmotionCount,
      emotionTypes: Array.from(emotionTypes),
      affirmationRatio
    };
  }
  
  private generateTopicInsights(
    sessionData: ProcessedSessionData[],
    transcriptAnalyses: TranscriptAnalysis[],
    userContext: UserContext
  ): { insights: DynamicInsight[] } {
    const insights: DynamicInsight[] = [];
    
    // Aggregate topic patterns
    const topicStats = this.analyzeTopicPatterns(sessionData, transcriptAnalyses);
    
    // Problem-focused pattern
    if (topicStats.problemFocusRatio > 0.7) {
      insights.push({
        id: `topic-problem-focus-${Date.now()}`,
        title: 'Excessive Problem Focus',
        description: `${Math.round(topicStats.problemFocusRatio * 100)}% of conversation time focuses on problems. Balance is needed with dreams, appreciation, and positive experiences.`,
        category: 'behavioral',
        priority: 'high',
        actionItems: [
          'Start sessions with "What went well this week?"',
          'Schedule "dream sessions" to discuss hopes and aspirations',
          'Use the 5:1 ratio - 5 positive interactions per negative'
        ],
        basedOn: [`Problem-focused time: ${topicStats.problemFocusedTime} minutes`],
        evidence: [`Most discussed problems: ${topicStats.topProblems.join(', ')}`],
        timeframe: 'this-week',
        confidence: 80
      });
    }
    
    // Topic avoidance pattern
    if (topicStats.avoidedTopics.length > 0) {
      insights.push({
        id: `topic-avoidance-${Date.now()}`,
        title: 'Important Topics Being Avoided',
        description: `Analysis suggests avoidance of important topics like ${topicStats.avoidedTopics.join(', ')}. Gentle exploration may be beneficial.`,
        category: 'behavioral',
        priority: 'medium',
        actionItems: [
          'Use "soft startup" to introduce sensitive topics',
          'Create safety agreements before difficult conversations',
          'Consider therapist support for avoided topics'
        ],
        basedOn: [`Topics rarely discussed: ${topicStats.avoidedTopics.join(', ')}`],
        evidence: ['Low frequency of core relationship topics'],
        timeframe: 'this-month',
        confidence: 70
      });
    }
    
    // Topic depth insight
    if (topicStats.avgTopicDepth < 2.5) {
      insights.push({
        id: `topic-depth-${Date.now()}`,
        title: 'Surface-Level Conversations',
        description: 'Most topics are discussed briefly without deep exploration. This may prevent true understanding and connection.',
        category: 'communication',
        priority: 'medium',
        actionItems: [
          'Use "peeling the onion" technique to go deeper',
          'Ask "What does this mean to you?" for important topics',
          'Schedule weekly deep-dive conversations'
        ],
        basedOn: [`Average topic depth: ${topicStats.avgTopicDepth.toFixed(1)}/5`],
        evidence: [`${topicStats.shallowTopicCount} topics discussed superficially`],
        timeframe: 'this-week',
        confidence: 75
      });
    }
    
    // Positive topic celebration
    if (topicStats.positiveTopicRatio > 0.4) {
      insights.push({
        id: `topic-positive-${Date.now()}`,
        title: 'Healthy Positive Focus',
        description: 'Your conversations include good balance of positive topics like appreciation, future plans, and shared interests.',
        category: 'progress',
        priority: 'low',
        actionItems: [
          'Continue sharing positive experiences',
          'Document what creates these positive conversations',
          'Expand on topics that bring joy'
        ],
        basedOn: [`Positive topic ratio: ${(topicStats.positiveTopicRatio * 100).toFixed(1)}%`],
        evidence: [`Positive topics discussed: ${topicStats.positiveTopics.join(', ')}`],
        timeframe: 'this-month',
        confidence: 85
      });
    }
    
    return { insights };
  }
  
  private analyzeTopicPatterns(
    sessionData: ProcessedSessionData[],
    transcriptAnalyses: TranscriptAnalysis[]
  ) {
    const allTopics = new Map<string, { count: number; sentiment: string; depth: number }>();
    let problemFocusedTime = 0;
    let totalTime = 0;
    let shallowTopicCount = 0;
    let totalDepth = 0;
    let topicCount = 0;
    
    // Expected relationship topics
    const coreTopics = ['intimacy', 'trust', 'future', 'family', 'communication'];
    const discussedCoreTopics = new Set<string>();
    
    // Analyze from session data
    sessionData.forEach(session => {
      session.keyTopics.forEach(topic => {
        if (!allTopics.has(topic)) {
          allTopics.set(topic, { count: 0, sentiment: 'neutral', depth: 3 });
        }
        const topicData = allTopics.get(topic)!;
        topicData.count++;
        
        if (topic.match(/problem|issue|conflict|difficult/i)) {
          problemFocusedTime += 10; // Estimate 10 minutes per problem topic
        }
        totalTime += 10;
      });
    });
    
    // Enhance with transcript analysis
    transcriptAnalyses.forEach(analysis => {
      analysis.topicFlow.forEach(segment => {
        if (!allTopics.has(segment.topic)) {
          allTopics.set(segment.topic, { count: 0, sentiment: 'neutral', depth: 0 });
        }
        
        const topicData = allTopics.get(segment.topic)!;
        topicData.count++;
        topicData.sentiment = segment.sentiment;
        topicData.depth = Math.max(topicData.depth, segment.depth);
        
        totalDepth += segment.depth;
        topicCount++;
        
        if (segment.depth < 3) {
          shallowTopicCount++;
        }
        
        if (coreTopics.includes(segment.topic)) {
          discussedCoreTopics.add(segment.topic);
        }
        
        if (segment.topic.match(/problem|conflict|issue/i)) {
          problemFocusedTime += segment.duration * 2; // Convert to minutes estimate
        }
        totalTime += segment.duration * 2;
      });
    });
    
    // Find avoided topics
    const avoidedTopics = coreTopics.filter(topic => !discussedCoreTopics.has(topic));
    
    // Get top problems and positive topics
    const topicList = Array.from(allTopics.entries());
    const problemTopics = topicList
      .filter(([topic]) => topic.match(/problem|issue|conflict/i))
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 3)
      .map(([topic]) => topic);
    
    const positiveTopics = topicList
      .filter(([_, data]) => data.sentiment === 'positive')
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 3)
      .map(([topic]) => topic);
    
    return {
      problemFocusRatio: totalTime > 0 ? problemFocusedTime / totalTime : 0,
      problemFocusedTime: Math.round(problemFocusedTime),
      topProblems: problemTopics,
      avoidedTopics,
      avgTopicDepth: topicCount > 0 ? totalDepth / topicCount : 2,
      shallowTopicCount,
      positiveTopicRatio: topicList.filter(([_, data]) => data.sentiment === 'positive').length / topicList.length,
      positiveTopics
    };
  }
  
  private generateTemporalInsights(
    sessionData: ProcessedSessionData[],
    sessionMetrics: any[],
    userContext: UserContext
  ): { insights: DynamicInsight[] } {
    const insights: DynamicInsight[] = [];
    
    // Analyze temporal patterns
    const temporalStats = this.analyzeTemporalPatterns(sessionData, sessionMetrics);
    
    // Session duration insight
    if (temporalStats.avgDuration < 20) {
      insights.push({
        id: `temporal-short-sessions-${Date.now()}`,
        title: 'Sessions Ending Prematurely',
        description: `Average session duration is only ${temporalStats.avgDuration} minutes. Deeper work requires more time investment.`,
        category: 'behavioral',
        priority: 'high',
        actionItems: [
          'Schedule 45-60 minute uninterrupted sessions',
          'Address what causes early session endings',
          'Create ritual to settle into conversation'
        ],
        basedOn: [`Average duration: ${temporalStats.avgDuration} minutes`],
        evidence: [`${temporalStats.shortSessionCount} sessions under 20 minutes`],
        timeframe: 'immediate',
        confidence: 85
      });
    }
    
    // Consistency pattern
    if (temporalStats.consistency < 0.5) {
      insights.push({
        id: `temporal-inconsistent-${Date.now()}`,
        title: 'Inconsistent Session Schedule',
        description: 'Irregular session timing may be impacting progress. Consistency is key for relationship transformation.',
        category: 'behavioral',
        priority: 'medium',
        actionItems: [
          'Set recurring weekly session time',
          'Treat sessions as unmovable appointments',
          'Create backup times for missed sessions'
        ],
        basedOn: [`Session consistency: ${(temporalStats.consistency * 100).toFixed(0)}%`],
        evidence: [`Longest gap: ${temporalStats.longestGap} days`],
        timeframe: 'this-week',
        confidence: 80
      });
    }
    
    // Progress acceleration
    if (temporalStats.recentImprovement > 15) {
      insights.push({
        id: `temporal-acceleration-${Date.now()}`,
        title: 'Accelerating Progress Detected',
        description: 'Recent sessions show significant improvement in metrics. You\'re in a growth phase - maximize this momentum.',
        category: 'progress',
        priority: 'low',
        actionItems: [
          'Increase session frequency temporarily',
          'Document what\'s working in a success journal',
          'Share breakthroughs with support network'
        ],
        basedOn: [`${temporalStats.recentImprovement}% improvement in last month`],
        evidence: ['Metrics trending upward across multiple dimensions'],
        timeframe: 'this-week',
        confidence: 90
      });
    }
    
    // Time of day pattern
    if (temporalStats.bestTimeOfDay) {
      insights.push({
        id: `temporal-timing-${Date.now()}`,
        title: 'Optimal Session Timing Identified',
        description: `Your best sessions occur during ${temporalStats.bestTimeOfDay}. Energy and emotional availability matter.`,
        category: 'behavioral',
        priority: 'low',
        actionItems: [
          `Schedule future sessions during ${temporalStats.bestTimeOfDay}`,
          'Protect this time from other commitments',
          'Prepare mindfully before optimal session times'
        ],
        basedOn: ['Session quality analysis by time of day'],
        evidence: [`${temporalStats.successfulTimeSlots}% success rate at optimal times`],
        timeframe: 'this-week',
        confidence: 75
      });
    }
    
    return { insights };
  }
  
  private analyzeTemporalPatterns(
    sessionData: ProcessedSessionData[],
    sessionMetrics: any[]
  ) {
    if (sessionData.length === 0) {
      return {
        avgDuration: 0,
        shortSessionCount: 0,
        consistency: 0,
        longestGap: 0,
        recentImprovement: 0,
        bestTimeOfDay: null,
        successfulTimeSlots: 0
      };
    }
    
    // Duration analysis
    const durations = sessionData.map(s => s.duration / 60); // Convert to minutes
    const avgDuration = durations.reduce((sum, d) => sum + d, 0) / durations.length;
    const shortSessionCount = durations.filter(d => d < 20).length;
    
    // Consistency analysis
    const sessionDates = sessionData.map(s => new Date(s.startTime)).sort((a, b) => a.getTime() - b.getTime());
    const gaps: number[] = [];
    
    for (let i = 1; i < sessionDates.length; i++) {
      const gap = (sessionDates[i].getTime() - sessionDates[i-1].getTime()) / (1000 * 60 * 60 * 24);
      gaps.push(gap);
    }
    
    const avgGap = gaps.length > 0 ? gaps.reduce((sum, g) => sum + g, 0) / gaps.length : 14;
    const consistency = Math.max(0, Math.min(1, 7 / avgGap)); // Weekly sessions = 100%
    const longestGap = gaps.length > 0 ? Math.max(...gaps) : 0;
    
    // Progress analysis
    let recentImprovement = 0;
    if (sessionMetrics.length >= 4) {
      const oldMetrics = sessionMetrics.slice(0, Math.floor(sessionMetrics.length / 2));
      const newMetrics = sessionMetrics.slice(Math.floor(sessionMetrics.length / 2));
      
      const oldAvg = oldMetrics.reduce((sum, m) => sum + (m.engagementScore || 50), 0) / oldMetrics.length;
      const newAvg = newMetrics.reduce((sum, m) => sum + (m.engagementScore || 50), 0) / newMetrics.length;
      
      recentImprovement = ((newAvg - oldAvg) / oldAvg) * 100;
    }
    
    // Time of day analysis
    const timeSlots = new Map<string, { count: number; successCount: number }>();
    
    sessionData.forEach((session, index) => {
      const hour = new Date(session.startTime).getHours();
      const timeSlot = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
      
      if (!timeSlots.has(timeSlot)) {
        timeSlots.set(timeSlot, { count: 0, successCount: 0 });
      }
      
      const slot = timeSlots.get(timeSlot)!;
      slot.count++;
      
      // Consider successful if engagement > 70 or positive sentiment
      if (session.conversationFlow.engagementLevel > 70 || 
          session.emotionalTone.overallSentiment === 'positive') {
        slot.successCount++;
      }
    });
    
    // Find best time of day
    let bestTimeOfDay = null;
    let bestSuccessRate = 0;
    
    timeSlots.forEach((stats, timeSlot) => {
      const successRate = stats.count > 0 ? (stats.successCount / stats.count) * 100 : 0;
      if (successRate > bestSuccessRate) {
        bestSuccessRate = successRate;
        bestTimeOfDay = timeSlot;
      }
    });
    
    return {
      avgDuration: Math.round(avgDuration),
      shortSessionCount,
      consistency,
      longestGap: Math.round(longestGap),
      recentImprovement: Math.round(recentImprovement),
      bestTimeOfDay,
      successfulTimeSlots: Math.round(bestSuccessRate)
    };
  }
  
  private mergeInsights(
    deterministicInsights: GeneratedInsights,
    enhancedInsights: GeneratedInsights,
    transcriptInsights: { insights: DynamicInsight[] },
    topicInsights: { insights: DynamicInsight[] },
    temporalInsights: { insights: DynamicInsight[] }
  ): GeneratedInsights {
    // Combine all insights
    const allInsights = [
      ...deterministicInsights.insights,
      ...enhancedInsights.insights,
      ...transcriptInsights.insights,
      ...topicInsights.insights,
      ...temporalInsights.insights
    ];
    
    // Deduplicate by category and similarity
    const deduplicatedInsights = this.deduplicateInsights(allInsights);
    
    // Sort by priority and confidence
    const sortedInsights = deduplicatedInsights.sort((a, b) => {
      const priorityScore = { high: 3, medium: 2, low: 1 };
      const aPriority = priorityScore[a.priority];
      const bPriority = priorityScore[b.priority];
      
      if (aPriority !== bPriority) {
        return bPriority - aPriority;
      }
      
      return b.confidence - a.confidence;
    });
    
    // Take top insights
    const topInsights = sortedInsights.slice(0, 8);
    
    // Merge other recommendations
    const mergedGoals = this.mergeStringArrays([
      deterministicInsights.weeklyGoals,
      enhancedInsights.weeklyGoals
    ]).slice(0, 6);
    
    const mergedFocusAreas = this.mergeStringArrays([
      deterministicInsights.focusAreas,
      enhancedInsights.focusAreas
    ]).slice(0, 4);
    
    const mergedStrengths = this.mergeStringArrays([
      deterministicInsights.strengths,
      enhancedInsights.strengths
    ]).slice(0, 5);
    
    const mergedDailyTips = this.mergeStringArrays([
      deterministicInsights.dailyTips,
      enhancedInsights.dailyTips
    ]).slice(0, 5);
    
    // Use enhanced trends if available
    const trends = enhancedInsights.trends || deterministicInsights.trends;
    
    return {
      insights: topInsights,
      weeklyGoals: mergedGoals,
      focusAreas: mergedFocusAreas,
      strengths: mergedStrengths,
      dailyTips: mergedDailyTips,
      trends,
      confidence: 0, // Will be calculated separately
      dataQuality: 'high' as const // Will be assessed separately
    };
  }
  
  private deduplicateInsights(insights: DynamicInsight[]): DynamicInsight[] {
    const seen = new Map<string, DynamicInsight>();
    
    insights.forEach(insight => {
      const key = `${insight.category}-${insight.priority}`;
      
      if (!seen.has(key)) {
        seen.set(key, insight);
      } else {
        // Keep the one with higher confidence
        const existing = seen.get(key)!;
        if (insight.confidence > existing.confidence) {
          seen.set(key, insight);
        }
      }
    });
    
    return Array.from(seen.values());
  }
  
  private mergeStringArrays(arrays: string[][]): string[] {
    const merged = new Set<string>();
    
    arrays.forEach(array => {
      array.forEach(item => {
        if (item && item.trim()) {
          merged.add(item.trim());
        }
      });
    });
    
    return Array.from(merged);
  }
  
  private generateActionPlans(
    insights: GeneratedInsights,
    userContext: UserContext
  ): void {
    // Action plans are already embedded in insights
    // This method could be expanded to create more comprehensive plans
    
    // Group insights by timeframe
    const immediate = insights.insights.filter(i => i.timeframe === 'immediate');
    const weekly = insights.insights.filter(i => i.timeframe === 'this-week');
    const monthly = insights.insights.filter(i => i.timeframe === 'this-month');
    
    // Log action plan summary
    logger.info('Generated action plans', {
      userId: userContext.userId,
      immediate: immediate.length,
      weekly: weekly.length,
      monthly: monthly.length
    });
  }
  
  private calculateOverallConfidence(
    insights: GeneratedInsights,
    sessionCount: number,
    transcriptCount: number
  ): number {
    let confidence = 50; // Base confidence
    
    // More sessions = higher confidence
    confidence += Math.min(sessionCount * 3, 20);
    
    // Transcript data = higher confidence
    confidence += Math.min(transcriptCount * 2, 15);
    
    // Insight quality
    const avgInsightConfidence = insights.insights.length > 0
      ? insights.insights.reduce((sum, i) => sum + i.confidence, 0) / insights.insights.length
      : 50;
    
    confidence += (avgInsightConfidence - 50) * 0.3;
    
    // Data quality bonus
    if (insights.dataQuality === 'high') confidence += 10;
    else if (insights.dataQuality === 'medium') confidence += 5;
    
    return Math.min(Math.round(confidence), 95);
  }
  
  private assessOverallDataQuality(
    sessionData: ProcessedSessionData[],
    transcriptAnalyses: TranscriptAnalysis[]
  ): 'high' | 'medium' | 'low' {
    if (sessionData.length < 3) return 'low';
    
    const hasTranscripts = transcriptAnalyses.length > 0;
    const avgDuration = sessionData.reduce((sum, s) => sum + s.duration, 0) / sessionData.length;
    const hasMetrics = sessionData.every(s => 
      s.conversationFlow.totalSpeakingTime > 0 &&
      s.keyTopics.length > 0
    );
    
    if (sessionData.length >= 5 && avgDuration >= 1800 && hasTranscripts && hasMetrics) {
      return 'high';
    } else if (sessionData.length >= 3 && avgDuration >= 900 && (hasTranscripts || hasMetrics)) {
      return 'medium';
    }
    
    return 'low';
  }
}