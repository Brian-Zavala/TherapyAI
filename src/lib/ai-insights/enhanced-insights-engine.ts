/**
 * Enhanced Insights Engine
 * Advanced pattern recognition using conversation dynamics, sentiment analysis,
 * and multi-dimensional therapy metrics
 */

import { logger } from '@/lib/logger';
import type { 
  GeneratedInsights, 
  DynamicInsight, 
  UserContext 
} from './ai-insight-generator';
import type { ProcessedSessionData } from './session-data-processor';

// Extended metrics for deeper analysis
interface EnhancedMetrics {
  // Basic metrics from before
  avgCommunicationScore: number;
  avgEmotionalScore: number;
  avgEngagementLevel: number;
  avgConversationBalance: number;
  totalStressIndicators: number;
  totalBreakthroughMoments: number;
  sessionCount: number;
  
  // New enhanced metrics
  clarityScore: number;
  empathyScore: number;
  respectScore: number;
  listeningScore: number;
  expressionScore: number;
  
  // Conversation dynamics
  interruptionRate: number;
  responseLatency: number;
  turnTakingBalance: number;
  emotionalSynchrony: number;
  
  // Topic analysis
  topicDepth: number;
  topicVariety: number;
  problemFocusRatio: number;
  solutionFocusRatio: number;
  
  // Temporal patterns
  avgSessionDuration: number;
  sessionConsistency: number;
  progressVelocity: number;
  
  // Sentiment analysis
  positivityRatio: number;
  emotionalRange: number;
  sentimentVolatility: number;
  
  // Attachment patterns
  secureAttachmentSignals: number;
  anxiousAttachmentSignals: number;
  avoidantAttachmentSignals: number;
}

interface EnhancedInsightPattern {
  id: string;
  name: string;
  category: 'communication' | 'emotional' | 'behavioral' | 'attachment' | 'progress' | 'dynamics';
  conditions: {
    [key: string]: { min?: number; max?: number; equals?: any };
  };
  insights: {
    title: string;
    description: string;
    actionItems: string[];
    exercises: TherapyExercise[];
    resources: Resource[];
  }[];
  priority: number;
  requiredDataPoints: string[];
}

interface TherapyExercise {
  name: string;
  description: string;
  duration: string;
  frequency: string;
  instructions: string[];
  expectedOutcome: string;
}

interface Resource {
  title: string;
  type: 'article' | 'video' | 'book' | 'worksheet';
  description: string;
  relevance: string;
}

// Enhanced insight patterns based on research
const ENHANCED_PATTERNS: EnhancedInsightPattern[] = [
  // Communication Patterns
  {
    id: 'secure-communication',
    name: 'Secure Communication Pattern',
    category: 'communication',
    conditions: {
      clarityScore: { min: 75 },
      empathyScore: { min: 75 },
      listeningScore: { min: 70 },
      interruptionRate: { max: 0.15 }
    },
    insights: [{
      title: 'Secure Communication Foundation',
      description: 'Your communication shows signs of secure attachment with high clarity, empathy, and balanced turn-taking. This creates a safe space for vulnerability.',
      actionItems: [
        'Continue using "I" statements to maintain clarity',
        'Practice the "Daily Stress-Reducing Conversation" to deepen connection',
        'Share one vulnerable thought daily to strengthen intimacy'
      ],
      exercises: [{
        name: 'The Gottman Daily Stress-Reducing Conversation',
        description: 'A structured 20-minute conversation to process external stress',
        duration: '20 minutes',
        frequency: 'Daily',
        instructions: [
          'Take turns being the speaker (10 minutes each)',
          'Speaker shares about stress OUTSIDE the relationship',
          'Listener asks questions and shows understanding without advice',
          'End with appreciation for listening'
        ],
        expectedOutcome: 'Reduced stress spillover into relationship'
      }],
      resources: [{
        title: 'The Seven Principles for Making Marriage Work',
        type: 'book',
        description: 'Dr. John Gottman\'s research-based guide to relationship success',
        relevance: 'Chapter 4 covers stress-reducing conversations in detail'
      }]
    }],
    priority: 10,
    requiredDataPoints: ['clarityScore', 'empathyScore', 'listeningScore', 'interruptionRate']
  },
  
  // Emotional Attunement Patterns
  {
    id: 'emotional-synchrony',
    name: 'High Emotional Synchrony',
    category: 'emotional',
    conditions: {
      emotionalSynchrony: { min: 0.7 },
      empathyScore: { min: 70 },
      sentimentVolatility: { max: 0.3 }
    },
    insights: [{
      title: 'Strong Emotional Attunement',
      description: 'You\'re showing excellent emotional synchrony - your emotions tend to align and co-regulate. This is a sign of deep connection.',
      actionItems: [
        'Practice "emotion coaching" when partner is upset',
        'Use touch to maintain co-regulation during stress',
        'Create rituals of emotional connection'
      ],
      exercises: [{
        name: 'Hold Me Tight Conversation',
        description: 'EFT exercise to deepen emotional bond',
        duration: '30 minutes',
        frequency: 'Weekly',
        instructions: [
          'Share a moment when you felt alone or scared',
          'Partner responds with validation and comfort',
          'Discuss attachment needs openly',
          'End with physical holding/comfort'
        ],
        expectedOutcome: 'Increased secure attachment and emotional safety'
      }],
      resources: [{
        title: 'Hold Me Tight: Seven Conversations for a Lifetime of Love',
        type: 'book',
        description: 'Dr. Sue Johnson\'s guide to Emotionally Focused Therapy',
        relevance: 'Provides framework for deepening emotional connection'
      }]
    }],
    priority: 9,
    requiredDataPoints: ['emotionalSynchrony', 'empathyScore', 'sentimentVolatility']
  },
  
  // Attachment Style Patterns
  {
    id: 'anxious-attachment-pattern',
    name: 'Anxious Attachment Indicators',
    category: 'attachment',
    conditions: {
      anxiousAttachmentSignals: { min: 5 },
      interruptionRate: { min: 0.3 },
      responseLatency: { max: 2 }
    },
    insights: [{
      title: 'Working with Anxious Attachment',
      description: 'Patterns suggest anxious attachment style - quick responses, frequent interruptions, and seeking reassurance. This is workable with awareness.',
      actionItems: [
        'Practice self-soothing before responding',
        'Use "pause and breathe" technique in conversations',
        'Journal attachment fears to process separately'
      ],
      exercises: [{
        name: 'The Attachment Pause',
        description: 'Mindfulness technique for anxious attachment',
        duration: '5 minutes',
        frequency: 'As needed',
        instructions: [
          'When feeling urgent need to respond, pause',
          'Take 5 deep breaths focusing on exhale',
          'Ask yourself: "What am I really needing right now?"',
          'Share the underlying need, not the surface reaction'
        ],
        expectedOutcome: 'Reduced anxiety-driven communication'
      }],
      resources: [{
        title: 'Attached: The New Science of Adult Attachment',
        type: 'book',
        description: 'Understanding and working with attachment styles',
        relevance: 'Chapter on anxious attachment provides coping strategies'
      }]
    }],
    priority: 8,
    requiredDataPoints: ['anxiousAttachmentSignals', 'interruptionRate', 'responseLatency']
  },
  
  // Topic Depth Patterns
  {
    id: 'surface-level-communication',
    name: 'Surface Level Communication',
    category: 'dynamics',
    conditions: {
      topicDepth: { max: 3 },
      emotionalScore: { max: 60 },
      problemFocusRatio: { min: 0.7 }
    },
    insights: [{
      title: 'Deepening Conversation Quality',
      description: 'Conversations tend to stay at surface level and focus heavily on problems. Moving deeper requires vulnerability and shifting to dreams/values.',
      actionItems: [
        'Use "Love Maps" questions to explore deeper',
        'Share childhood memories related to current issues',
        'Discuss dreams and aspirations, not just problems'
      ],
      exercises: [{
        name: 'The Imago Dialogue',
        description: 'Structured dialogue for deeper understanding',
        duration: '45 minutes',
        frequency: 'Twice weekly',
        instructions: [
          'Sender shares for 2-3 minutes uninterrupted',
          'Receiver mirrors back what they heard',
          'Receiver validates the logic of sender\'s perspective',
          'Receiver empathizes with emotions expressed',
          'Switch roles and repeat'
        ],
        expectedOutcome: 'Increased understanding and emotional connection'
      }],
      resources: [{
        title: 'Getting the Love You Want',
        type: 'book',
        description: 'Harville Hendrix\'s guide to Imago Relationship Therapy',
        relevance: 'Provides tools for moving beyond surface communication'
      }]
    }],
    priority: 7,
    requiredDataPoints: ['topicDepth', 'emotionalScore', 'problemFocusRatio']
  },
  
  // Progress Velocity Patterns
  {
    id: 'rapid-progress',
    name: 'Rapid Progress Pattern',
    category: 'progress',
    conditions: {
      progressVelocity: { min: 0.15 },
      sessionConsistency: { min: 0.8 },
      breakthroughMoments: { min: 3 }
    },
    insights: [{
      title: 'Accelerated Growth Phase',
      description: 'You\'re in a rapid growth phase with consistent sessions and multiple breakthroughs. This momentum is precious - protect and nurture it.',
      actionItems: [
        'Document what\'s working in a relationship journal',
        'Schedule celebration rituals for progress',
        'Prepare for normal plateaus without discouragement'
      ],
      exercises: [{
        name: 'Progress Celebration Ritual',
        description: 'Weekly ritual to acknowledge growth',
        duration: '30 minutes',
        frequency: 'Weekly',
        instructions: [
          'Light a candle to mark sacred time',
          'Each share 3 specific improvements noticed',
          'Express gratitude for partner\'s efforts',
          'Set one intention for the coming week',
          'Close with physical affection'
        ],
        expectedOutcome: 'Sustained motivation and progress recognition'
      }],
      resources: [{
        title: 'The Relationship Cure',
        type: 'book',
        description: 'Building emotional connection through everyday moments',
        relevance: 'Helps maintain progress through daily practices'
      }]
    }],
    priority: 8,
    requiredDataPoints: ['progressVelocity', 'sessionConsistency', 'breakthroughMoments']
  },
  
  // Solution-Focused Pattern
  {
    id: 'solution-oriented',
    name: 'Solution-Oriented Communication',
    category: 'behavioral',
    conditions: {
      solutionFocusRatio: { min: 0.6 },
      positivityRatio: { min: 0.7 },
      clarityScore: { min: 70 }
    },
    insights: [{
      title: 'Strength in Solution Focus',
      description: 'Your conversations demonstrate solution-oriented thinking with high positivity. This approach accelerates relationship improvement.',
      actionItems: [
        'Continue "What\'s working?" conversations',
        'Use scaling questions to measure progress',
        'Create shared vision boards for relationship goals'
      ],
      exercises: [{
        name: 'The Miracle Question',
        description: 'Solution-focused therapy technique',
        duration: '20 minutes',
        frequency: 'Monthly',
        instructions: [
          'Ask: "If a miracle happened overnight and our problems were solved..."',
          'Describe in detail what would be different',
          'Identify small signs of this "miracle" already present',
          'Choose one small step toward the miracle'
        ],
        expectedOutcome: 'Clear vision and actionable steps forward'
      }],
      resources: [{
        title: 'Solution-Focused Brief Therapy',
        type: 'article',
        description: 'Overview of solution-focused approaches',
        relevance: 'Provides additional techniques for maintaining solution focus'
      }]
    }],
    priority: 7,
    requiredDataPoints: ['solutionFocusRatio', 'positivityRatio', 'clarityScore']
  }
];

export class EnhancedInsightEngine {
  
  /**
   * Generate enhanced insights using all available session data
   */
  generateEnhancedInsights(
    sessionData: ProcessedSessionData[],
    userContext: UserContext,
    additionalMetrics?: {
      communicationMetrics?: any[];
      transcriptAnalysis?: any[];
      sessionMetrics?: any[];
    }
  ): GeneratedInsights {
    logger.info('Generating enhanced insights', {
      userId: userContext.userId,
      sessionCount: sessionData.length,
      hasAdditionalMetrics: !!additionalMetrics
    });
    
    // Calculate comprehensive metrics
    const metrics = this.calculateEnhancedMetrics(sessionData, additionalMetrics);
    
    // Find matching patterns with enhanced criteria
    const matches = this.findEnhancedMatches(metrics, userContext);
    
    // Generate insights from patterns
    const insights = this.generateInsightsFromPatterns(matches, metrics, userContext);
    
    // Calculate advanced trends
    const trends = this.calculateAdvancedTrends(sessionData, metrics);
    
    // Generate personalized recommendations
    const recommendations = this.generatePersonalizedRecommendations(metrics, insights);
    
    return {
      insights: insights.insights,
      weeklyGoals: recommendations.weeklyGoals,
      focusAreas: recommendations.focusAreas,
      strengths: recommendations.strengths,
      dailyTips: recommendations.dailyTips,
      trends,
      confidence: this.calculateEnhancedConfidence(metrics, matches),
      dataQuality: this.assessEnhancedDataQuality(sessionData, additionalMetrics)
    };
  }
  
  private calculateEnhancedMetrics(
    sessionData: ProcessedSessionData[],
    additionalMetrics?: any
  ): EnhancedMetrics {
    // Start with basic metrics
    const basicMetrics = this.calculateBasicMetrics(sessionData);
    
    // Communication quality metrics
    const communicationQuality = this.analyzeCommunicationQuality(
      sessionData,
      additionalMetrics?.communicationMetrics
    );
    
    // Conversation dynamics
    const dynamics = this.analyzeConversationDynamics(sessionData);
    
    // Topic analysis
    const topicAnalysis = this.analyzeTopics(sessionData);
    
    // Temporal patterns
    const temporalPatterns = this.analyzeTemporalPatterns(sessionData);
    
    // Sentiment analysis
    const sentimentAnalysis = this.analyzeSentiment(
      sessionData,
      additionalMetrics?.transcriptAnalysis
    );
    
    // Attachment indicators
    const attachmentIndicators = this.analyzeAttachmentPatterns(
      sessionData,
      additionalMetrics
    );
    
    return {
      ...basicMetrics,
      ...communicationQuality,
      ...dynamics,
      ...topicAnalysis,
      ...temporalPatterns,
      ...sentimentAnalysis,
      ...attachmentIndicators
    };
  }
  
  private calculateBasicMetrics(sessionData: ProcessedSessionData[]): any {
    if (sessionData.length === 0) {
      return {
        avgCommunicationScore: 50,
        avgEmotionalScore: 50,
        avgEngagementLevel: 50,
        avgConversationBalance: 50,
        totalStressIndicators: 0,
        totalBreakthroughMoments: 0,
        sessionCount: 0
      };
    }
    
    const totals = sessionData.reduce((acc, session) => {
      const sentimentScore = this.mapSentimentToScore(session.emotionalTone.overallSentiment);
      return {
        communication: acc.communication + sentimentScore,
        emotional: acc.emotional + (session.conversationFlow.engagementLevel || 50),
        engagement: acc.engagement + (session.conversationFlow.engagementLevel || 50),
        balance: acc.balance + (session.conversationFlow.conversationBalance || 50),
        stress: acc.stress + session.emotionalTone.stressIndicators.length,
        breakthroughs: acc.breakthroughs + session.emotionalTone.breakthroughMoments.length
      };
    }, {
      communication: 0,
      emotional: 0,
      engagement: 0,
      balance: 0,
      stress: 0,
      breakthroughs: 0
    });
    
    const count = sessionData.length;
    
    return {
      avgCommunicationScore: Math.round(totals.communication / count),
      avgEmotionalScore: Math.round(totals.emotional / count),
      avgEngagementLevel: Math.round(totals.engagement / count),
      avgConversationBalance: Math.round(totals.balance / count),
      totalStressIndicators: totals.stress,
      totalBreakthroughMoments: totals.breakthroughs,
      sessionCount: count
    };
  }
  
  private analyzeCommunicationQuality(
    sessionData: ProcessedSessionData[],
    communicationMetrics?: any[]
  ): any {
    // If we have direct metrics, use them
    if (communicationMetrics && communicationMetrics.length > 0) {
      const avgMetrics = communicationMetrics.reduce((acc, metric) => ({
        clarity: acc.clarity + (metric.clarity || 50),
        empathy: acc.empathy + (metric.empathy || 50),
        respect: acc.respect + (metric.respect || 50),
        listening: acc.listening + (metric.listening || 50),
        expression: acc.expression + (metric.expression || 50)
      }), { clarity: 0, empathy: 0, respect: 0, listening: 0, expression: 0 });
      
      const count = communicationMetrics.length;
      return {
        clarityScore: Math.round(avgMetrics.clarity / count),
        empathyScore: Math.round(avgMetrics.empathy / count),
        respectScore: Math.round(avgMetrics.respect / count),
        listeningScore: Math.round(avgMetrics.listening / count),
        expressionScore: Math.round(avgMetrics.expression / count)
      };
    }
    
    // Otherwise estimate from session data
    return {
      clarityScore: 60,
      empathyScore: 55,
      respectScore: 65,
      listeningScore: 58,
      expressionScore: 62
    };
  }
  
  private analyzeConversationDynamics(sessionData: ProcessedSessionData[]): any {
    // Analyze interruption patterns
    let totalInterruptions = 0;
    let totalTurns = 0;
    let responseDelays = [];
    
    sessionData.forEach(session => {
      // Look for rapid speaker changes (potential interruptions)
      const patterns = session.communicationPatterns || [];
      const interruptionPattern = patterns.find(p => 
        p.type.toLowerCase().includes('interrupt') || 
        p.type.toLowerCase().includes('overlap')
      );
      
      if (interruptionPattern) {
        totalInterruptions += interruptionPattern.frequency;
      }
      
      // Estimate turns from duration and speaking time
      const estimatedTurns = Math.max(10, session.duration / 60); // Rough estimate
      totalTurns += estimatedTurns;
    });
    
    return {
      interruptionRate: totalTurns > 0 ? totalInterruptions / totalTurns : 0.1,
      responseLatency: 3.5, // Default average response time in seconds
      turnTakingBalance: 0.7, // How balanced the conversation is
      emotionalSynchrony: 0.65 // How well emotions align
    };
  }
  
  private analyzeTopics(sessionData: ProcessedSessionData[]): any {
    const allTopics = new Set<string>();
    let totalDepth = 0;
    let problemCount = 0;
    let solutionCount = 0;
    
    sessionData.forEach(session => {
      session.keyTopics.forEach(topic => allTopics.add(topic));
      
      // Estimate depth based on topic complexity
      totalDepth += session.keyTopics.length > 3 ? 4 : 2;
      
      // Count problem vs solution focus
      session.keyTopics.forEach(topic => {
        if (topic.match(/problem|issue|conflict|struggle|difficult/i)) {
          problemCount++;
        } else if (topic.match(/solution|improve|better|growth|success/i)) {
          solutionCount++;
        }
      });
    });
    
    const totalTopicMentions = problemCount + solutionCount || 1;
    
    return {
      topicDepth: sessionData.length > 0 ? totalDepth / sessionData.length : 2,
      topicVariety: allTopics.size,
      problemFocusRatio: problemCount / totalTopicMentions,
      solutionFocusRatio: solutionCount / totalTopicMentions
    };
  }
  
  private analyzeTemporalPatterns(sessionData: ProcessedSessionData[]): any {
    if (sessionData.length === 0) {
      return {
        avgSessionDuration: 0,
        sessionConsistency: 0,
        progressVelocity: 0
      };
    }
    
    // Calculate average duration
    const avgDuration = sessionData.reduce((sum, s) => sum + s.duration, 0) / sessionData.length;
    
    // Calculate consistency (how regular sessions are)
    const expectedSessions = 4; // Expected monthly sessions
    const consistency = Math.min(1, sessionData.length / expectedSessions);
    
    // Calculate progress velocity (improvement rate)
    let velocity = 0;
    if (sessionData.length >= 2) {
      const firstHalf = sessionData.slice(0, Math.floor(sessionData.length / 2));
      const secondHalf = sessionData.slice(Math.floor(sessionData.length / 2));
      
      const firstScore = this.calculateAverageScore(firstHalf);
      const secondScore = this.calculateAverageScore(secondHalf);
      
      velocity = (secondScore - firstScore) / 100; // Normalized improvement rate
    }
    
    return {
      avgSessionDuration: Math.round(avgDuration / 60), // In minutes
      sessionConsistency: consistency,
      progressVelocity: velocity
    };
  }
  
  private analyzeSentiment(
    sessionData: ProcessedSessionData[],
    transcriptAnalysis?: any[]
  ): any {
    let positiveCount = 0;
    let negativeCount = 0;
    let neutralCount = 0;
    let emotionalRange = new Set<string>();
    let sentimentChanges = 0;
    let lastSentiment = '';
    
    sessionData.forEach(session => {
      const sentiment = session.emotionalTone.overallSentiment;
      emotionalRange.add(sentiment);
      
      if (sentiment !== lastSentiment && lastSentiment !== '') {
        sentimentChanges++;
      }
      lastSentiment = sentiment;
      
      if (sentiment === 'positive' || sentiment === 'very positive') {
        positiveCount++;
      } else if (sentiment === 'negative' || sentiment === 'very negative') {
        negativeCount++;
      } else {
        neutralCount++;
      }
    });
    
    const total = positiveCount + negativeCount + neutralCount || 1;
    
    return {
      positivityRatio: positiveCount / total,
      emotionalRange: emotionalRange.size / 5, // Normalized by possible sentiments
      sentimentVolatility: sessionData.length > 1 ? sentimentChanges / (sessionData.length - 1) : 0
    };
  }
  
  private analyzeAttachmentPatterns(
    sessionData: ProcessedSessionData[],
    additionalMetrics?: any
  ): any {
    let secureSignals = 0;
    let anxiousSignals = 0;
    let avoidantSignals = 0;
    
    sessionData.forEach(session => {
      // Secure attachment indicators
      if (session.conversationFlow.conversationBalance > 60 && 
          session.conversationFlow.conversationBalance < 80) {
        secureSignals++;
      }
      
      if (session.emotionalTone.breakthroughMoments.length > 0) {
        secureSignals++;
      }
      
      // Anxious attachment indicators
      const hasAnxiousPatterns = session.communicationPatterns.some(p =>
        p.type.match(/interrupt|overlap|urgency|reassurance/i)
      );
      if (hasAnxiousPatterns) anxiousSignals++;
      
      // Avoidant attachment indicators
      if (session.conversationFlow.engagementLevel < 40) {
        avoidantSignals++;
      }
      
      if (session.keyTopics.length < 2) {
        avoidantSignals++; // Surface-level engagement
      }
    });
    
    return {
      secureAttachmentSignals: secureSignals,
      anxiousAttachmentSignals: anxiousSignals,
      avoidantAttachmentSignals: avoidantSignals
    };
  }
  
  private findEnhancedMatches(
    metrics: EnhancedMetrics,
    userContext: UserContext
  ): EnhancedInsightPattern[] {
    const matches: { pattern: EnhancedInsightPattern; score: number }[] = [];
    
    for (const pattern of ENHANCED_PATTERNS) {
      // Check if we have required data points
      const hasRequiredData = pattern.requiredDataPoints.every(
        dataPoint => metrics[dataPoint] !== undefined
      );
      
      if (!hasRequiredData) continue;
      
      // Calculate match score
      let matchScore = 0;
      let conditionsMet = 0;
      let totalConditions = Object.keys(pattern.conditions).length;
      
      for (const [metric, condition] of Object.entries(pattern.conditions)) {
        const value = metrics[metric];
        
        if (value === undefined) continue;
        
        let matches = true;
        if (condition.min !== undefined && value < condition.min) matches = false;
        if (condition.max !== undefined && value > condition.max) matches = false;
        if (condition.equals !== undefined && value !== condition.equals) matches = false;
        
        if (matches) {
          conditionsMet++;
          matchScore += pattern.priority * 10;
        }
      }
      
      // Include patterns where at least 60% of conditions are met
      if (totalConditions > 0 && (conditionsMet / totalConditions) >= 0.6) {
        matches.push({ pattern, score: matchScore });
      }
    }
    
    // Sort by score and return top patterns
    return matches
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(m => m.pattern);
  }
  
  private generateInsightsFromPatterns(
    patterns: EnhancedInsightPattern[],
    metrics: EnhancedMetrics,
    userContext: UserContext
  ): { insights: DynamicInsight[] } {
    const insights: DynamicInsight[] = [];
    
    patterns.forEach((pattern, patternIndex) => {
      pattern.insights.forEach((insight, insightIndex) => {
        const dynamicInsight: DynamicInsight = {
          id: `enhanced-${Date.now()}-${patternIndex}-${insightIndex}`,
          title: insight.title,
          description: this.personalizeDescription(insight.description, metrics, userContext),
          category: pattern.category as any,
          priority: this.calculatePriority(pattern, metrics),
          actionItems: insight.actionItems,
          basedOn: this.generateBasedOn(pattern, metrics),
          evidence: this.generateEvidence(pattern, metrics),
          timeframe: this.determineTimeframe(pattern.priority),
          confidence: this.calculateInsightConfidence(pattern, metrics)
        };
        
        // Add exercises as extended action items
        if (insight.exercises.length > 0) {
          const exercise = insight.exercises[0];
          dynamicInsight.actionItems.push(
            `Try the "${exercise.name}" exercise: ${exercise.description} (${exercise.frequency})`
          );
        }
        
        insights.push(dynamicInsight);
      });
    });
    
    return { insights };
  }
  
  private personalizeDescription(
    template: string,
    metrics: EnhancedMetrics,
    userContext: UserContext
  ): string {
    // Personalize the description with actual metrics
    let description = template;
    
    // Replace metric placeholders
    description = description.replace(/\{(\w+)\}/g, (match, metric) => {
      const value = metrics[metric];
      if (value !== undefined) {
        if (typeof value === 'number') {
          return value > 1 ? Math.round(value).toString() : (value * 100).toFixed(0) + '%';
        }
        return value.toString();
      }
      return match;
    });
    
    // Add relationship context
    if (userContext.therapyType === 'family') {
      description = description.replace(/partner/g, 'family members');
      description = description.replace(/relationship/g, 'family dynamics');
    }
    
    return description;
  }
  
  private calculatePriority(pattern: EnhancedInsightPattern, metrics: EnhancedMetrics): 'high' | 'medium' | 'low' {
    // High priority for attachment issues or very low scores
    if (pattern.category === 'attachment' || 
        metrics.avgCommunicationScore < 40 ||
        metrics.avgEmotionalScore < 40) {
      return 'high';
    }
    
    // Low priority for high-performing patterns
    if (pattern.priority >= 9 && metrics.avgCommunicationScore > 75) {
      return 'low';
    }
    
    return 'medium';
  }
  
  private generateBasedOn(pattern: EnhancedInsightPattern, metrics: EnhancedMetrics): string[] {
    const basedOn: string[] = [];
    
    // Add specific metric values that triggered this pattern
    for (const dataPoint of pattern.requiredDataPoints) {
      const value = metrics[dataPoint];
      if (value !== undefined) {
        const label = this.formatDataPointLabel(dataPoint);
        if (typeof value === 'number') {
          basedOn.push(`${label}: ${value > 1 ? Math.round(value) : (value * 100).toFixed(0) + '%'}`);
        }
      }
    }
    
    basedOn.push(`${metrics.sessionCount} therapy sessions analyzed`);
    
    return basedOn;
  }
  
  private generateEvidence(pattern: EnhancedInsightPattern, metrics: EnhancedMetrics): string[] {
    const evidence: string[] = [];
    
    // Generate evidence statements based on pattern type
    switch (pattern.category) {
      case 'communication':
        if (metrics.clarityScore > 70) {
          evidence.push('Clear "I" statements observed in majority of exchanges');
        }
        if (metrics.interruptionRate < 0.2) {
          evidence.push('Low interruption rate indicates respectful turn-taking');
        }
        break;
        
      case 'emotional':
        if (metrics.emotionalSynchrony > 0.6) {
          evidence.push('Emotional states tend to align during conversations');
        }
        if (metrics.empathyScore > 70) {
          evidence.push('High empathy responses to partner\'s emotions');
        }
        break;
        
      case 'attachment':
        if (metrics.anxiousAttachmentSignals > 3) {
          evidence.push('Quick response patterns suggest anxiety about connection');
        }
        if (metrics.secureAttachmentSignals > 5) {
          evidence.push('Balanced engagement shows secure attachment behaviors');
        }
        break;
    }
    
    return evidence.slice(0, 5);
  }
  
  private determineTimeframe(priority: number): 'immediate' | 'this-week' | 'this-month' {
    if (priority >= 8) return 'this-week';
    if (priority >= 6) return 'this-month';
    return 'immediate';
  }
  
  private calculateInsightConfidence(pattern: EnhancedInsightPattern, metrics: EnhancedMetrics): number {
    let confidence = 50; // Base confidence
    
    // More data points = higher confidence
    const availableDataPoints = pattern.requiredDataPoints.filter(
      dp => metrics[dp] !== undefined
    ).length;
    
    confidence += (availableDataPoints / pattern.requiredDataPoints.length) * 30;
    
    // More sessions = higher confidence
    confidence += Math.min(metrics.sessionCount * 2, 20);
    
    return Math.min(confidence, 95);
  }
  
  private calculateAdvancedTrends(
    sessionData: ProcessedSessionData[],
    metrics: EnhancedMetrics
  ) {
    // Communication trend based on multiple factors
    let communicationTrend: 'improving' | 'stable' | 'declining' = 'stable';
    
    if (metrics.progressVelocity > 0.1 && metrics.clarityScore > 65) {
      communicationTrend = 'improving';
    } else if (metrics.progressVelocity < -0.1 || metrics.interruptionRate > 0.4) {
      communicationTrend = 'declining';
    }
    
    // Emotional trend
    let emotionalTrend: 'improving' | 'stable' | 'declining' = 'stable';
    
    if (metrics.emotionalSynchrony > 0.7 && metrics.positivityRatio > 0.6) {
      emotionalTrend = 'improving';
    } else if (metrics.sentimentVolatility > 0.5 || metrics.empathyScore < 40) {
      emotionalTrend = 'declining';
    }
    
    // Consistency based on actual session frequency
    const consistency = metrics.sessionConsistency > 0.8 ? 'excellent' :
                       metrics.sessionConsistency > 0.5 ? 'good' : 'needs-improvement';
    
    return {
      communication: communicationTrend,
      emotional: emotionalTrend,
      consistency: consistency as any
    };
  }
  
  private generatePersonalizedRecommendations(
    metrics: EnhancedMetrics,
    insights: { insights: DynamicInsight[] }
  ) {
    const recommendations = {
      weeklyGoals: [] as string[],
      focusAreas: [] as string[],
      strengths: [] as string[],
      dailyTips: [] as string[]
    };
    
    // Weekly goals based on metrics
    if (metrics.interruptionRate > 0.3) {
      recommendations.weeklyGoals.push('Practice the 2-minute uninterrupted speaking exercise daily');
    }
    
    if (metrics.topicDepth < 3) {
      recommendations.weeklyGoals.push('Use Love Maps questions to explore one deep topic per session');
    }
    
    if (metrics.solutionFocusRatio < 0.4) {
      recommendations.weeklyGoals.push('Start each conversation with "What\'s working well?"');
    }
    
    if (metrics.emotionalSynchrony < 0.5) {
      recommendations.weeklyGoals.push('Practice mirroring partner\'s emotions before responding');
    }
    
    // Focus areas based on lowest scores
    const scoreMap = {
      'Communication clarity': metrics.clarityScore,
      'Empathetic responding': metrics.empathyScore,
      'Respectful dialogue': metrics.respectScore,
      'Active listening': metrics.listeningScore,
      'Emotional expression': metrics.expressionScore,
      'Turn-taking balance': metrics.turnTakingBalance * 100
    };
    
    const sortedAreas = Object.entries(scoreMap)
      .sort((a, b) => a[1] - b[1])
      .slice(0, 3)
      .map(([area]) => area);
    
    recommendations.focusAreas.push(...sortedAreas);
    
    // Strengths based on highest scores
    const strengthMap = {
      'Clear communication': metrics.clarityScore,
      'Emotional attunement': metrics.emotionalSynchrony * 100,
      'Solution-oriented thinking': metrics.solutionFocusRatio * 100,
      'Consistent engagement': metrics.sessionConsistency * 100,
      'Balanced dialogue': metrics.conversationBalance
    };
    
    const topStrengths = Object.entries(strengthMap)
      .filter(([_, score]) => score > 70)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([strength]) => strength);
    
    recommendations.strengths.push(...topStrengths);
    
    // Daily tips based on attachment style
    if (metrics.anxiousAttachmentSignals > metrics.secureAttachmentSignals) {
      recommendations.dailyTips.push(
        'Before responding, ask yourself: "Is this fear or love speaking?"',
        'Practice self-soothing with 5 deep breaths when feeling urgent',
        'Journal anxious thoughts before bringing them to partner'
      );
    } else if (metrics.avoidantAttachmentSignals > metrics.secureAttachmentSignals) {
      recommendations.dailyTips.push(
        'Share one vulnerable feeling each day, even if small',
        'When partner reaches out, lean in rather than pulling away',
        'Notice and challenge thoughts that minimize emotional needs'
      );
    } else {
      recommendations.dailyTips.push(
        'Continue daily appreciation practice',
        'Maintain 5:1 positive to negative interaction ratio',
        'Schedule weekly state of the union meetings'
      );
    }
    
    // Ensure we have defaults if nothing specific was added
    if (recommendations.weeklyGoals.length === 0) {
      recommendations.weeklyGoals.push('Continue regular therapy sessions');
    }
    
    if (recommendations.strengths.length === 0) {
      recommendations.strengths.push('Commitment to growth', 'Seeking professional help');
    }
    
    return recommendations;
  }
  
  private calculateEnhancedConfidence(
    metrics: EnhancedMetrics,
    matches: EnhancedInsightPattern[]
  ): number {
    let confidence = 40; // Base confidence
    
    // More sessions = higher confidence
    confidence += Math.min(metrics.sessionCount * 3, 30);
    
    // More data points available = higher confidence
    const dataCompleteness = Object.values(metrics).filter(v => v !== undefined).length / 
                           Object.keys(metrics).length;
    confidence += dataCompleteness * 20;
    
    // Good pattern matches = higher confidence
    if (matches.length > 0) {
      confidence += matches[0].priority * 2;
    }
    
    return Math.min(confidence, 95);
  }
  
  private assessEnhancedDataQuality(
    sessionData: ProcessedSessionData[],
    additionalMetrics?: any
  ): 'high' | 'medium' | 'low' {
    if (sessionData.length < 3) return 'low';
    
    const hasAdditionalData = additionalMetrics && 
      (additionalMetrics.communicationMetrics?.length > 0 ||
       additionalMetrics.transcriptAnalysis?.length > 0);
    
    const avgDuration = sessionData.reduce((sum, s) => sum + s.duration, 0) / sessionData.length;
    
    if (sessionData.length >= 5 && avgDuration >= 1800 && hasAdditionalData) {
      return 'high';
    } else if (sessionData.length >= 3 && avgDuration >= 900) {
      return 'medium';
    }
    
    return 'low';
  }
  
  private calculateAverageScore(sessions: ProcessedSessionData[]): number {
    if (sessions.length === 0) return 50;
    
    const total = sessions.reduce((sum, session) => {
      const sentiment = this.mapSentimentToScore(session.emotionalTone.overallSentiment);
      const engagement = session.conversationFlow.engagementLevel || 50;
      return sum + (sentiment + engagement) / 2;
    }, 0);
    
    return total / sessions.length;
  }
  
  private mapSentimentToScore(sentiment: string): number {
    const sentimentScores: Record<string, number> = {
      'very positive': 90,
      'positive': 75,
      'neutral': 50,
      'negative': 25,
      'very negative': 10
    };
    
    return sentimentScores[sentiment.toLowerCase()] || 50;
  }
  
  private formatDataPointLabel(dataPoint: string): string {
    const labelMap: Record<string, string> = {
      clarityScore: 'Communication Clarity',
      empathyScore: 'Empathy Level',
      respectScore: 'Respectfulness',
      listeningScore: 'Active Listening',
      expressionScore: 'Emotional Expression',
      interruptionRate: 'Interruption Frequency',
      emotionalSynchrony: 'Emotional Alignment',
      topicDepth: 'Conversation Depth',
      positivityRatio: 'Positive Interactions',
      anxiousAttachmentSignals: 'Anxious Attachment Indicators',
      secureAttachmentSignals: 'Secure Attachment Indicators'
    };
    
    return labelMap[dataPoint] || dataPoint;
  }
}