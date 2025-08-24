/**
 * VAPI Session Data Processor
 * Extracts and preprocesses session data for AI analysis
 */

import { prisma } from '@/lib/database/prisma-optimized';
import { logger } from '@/lib/utils/logger';

export interface ProcessedSessionData {
  sessionId: string;
  userId: string;
  duration: number;
  startTime: Date;
  endTime: Date;
  participants: string[];
  conversationFlow: ConversationAnalysis;
  emotionalTone: EmotionalAnalysis;
  communicationPatterns: CommunicationPattern[];
  keyTopics: string[];
  therapistObservations: string[];
}

export interface ConversationAnalysis {
  totalSpeakingTime: Record<string, number>; // seconds per speaker
  interruptionCount: number;
  silencePeriods: number;
  conversationBalance: number; // 0-100, how balanced the conversation was
  engagementLevel: number; // 0-100
}

export interface EmotionalAnalysis {
  overallSentiment: 'positive' | 'neutral' | 'negative' | 'mixed';
  emotionalArc: EmotionalMoment[];
  stressIndicators: string[];
  breakthroughMoments: string[];
}

export interface EmotionalMoment {
  timestamp: number;
  sentiment: number; // -1 to 1
  emotion: string;
  speaker: string;
  trigger?: string;
}

export interface CommunicationPattern {
  type: 'defensive' | 'supportive' | 'collaborative' | 'confrontational' | 'avoidant';
  frequency: number;
  examples: string[];
  improvement: boolean;
}

export class SessionDataProcessor {
  private userId: string;

  constructor(userId: string) {
    this.userId = userId;
  }

  /**
   * Process recent sessions for AI analysis
   */
  async processRecentSessions(limit: number = 10): Promise<ProcessedSessionData[]> {
    logger.info('Processing recent sessions for AI insights', { userId: this.userId, limit });

    const sessions = await prisma.session.findMany({
      where: {
        userId: this.userId,
        status: 'COMPLETED',
        // Only process sessions with actual conversation time
        conversationTimeSeconds: { gt: 60 } // At least 1 minute of conversation
      },
      orderBy: { startTime: 'desc' },
      take: limit,
      include: {
        transcriptEntries: {
          orderBy: { timestamp: 'asc' },
          select: {
            id: true,
            speaker: true,
            text: true,
            timestamp: true,
            sentiment: true,
            topics: true,
            confidence: true
          }
        },
        communicationMetrics: {
          where: { metricType: 'final' },
          select: {
            clarity: true,
            empathy: true,
            respect: true,
            confidence: true,
            engagement: true
          }
        },
        sessionFamilyMembers: {
          include: {
            familyMember: {
              select: { name: true, relationship: true }
            }
          }
        }
      }
    });

    const processedData: ProcessedSessionData[] = [];

    for (const session of sessions) {
      try {
        const processed = await this.processSession(session);
        processedData.push(processed);
      } catch (error) {
        logger.error('Failed to process session', { 
          sessionId: session.id, 
          error: error instanceof Error ? error.message : error 
        });
      }
    }

    return processedData;
  }

  /**
   * Process a single session's data
   */
  private async processSession(session: any): Promise<ProcessedSessionData> {
    const transcripts = session.transcriptEntries || [];
    const participants = this.extractParticipants(transcripts, session.sessionFamilyMembers);
    
    return {
      sessionId: session.id,
      userId: session.userId,
      duration: session.conversationTimeSeconds || 0,
      startTime: session.startTime,
      endTime: session.endTime || session.startTime,
      participants,
      conversationFlow: this.analyzeConversationFlow(transcripts, participants),
      emotionalTone: this.analyzeEmotionalTone(transcripts),
      communicationPatterns: this.identifyCommunicationPatterns(transcripts),
      keyTopics: this.extractKeyTopics(transcripts),
      therapistObservations: this.extractTherapistObservations(transcripts)
    };
  }

  /**
   * Extract participant names and roles
   */
  private extractParticipants(transcripts: any[], familyMembers: any[]): string[] {
    const speakers = new Set<string>();
    
    // Add speakers from transcripts
    transcripts.forEach(t => {
      if (t.speaker && t.speaker !== 'assistant') {
        speakers.add(t.speaker);
      }
    });

    // Add family members
    familyMembers.forEach(fm => {
      if (fm.familyMember?.name) {
        speakers.add(fm.familyMember.name);
      }
    });

    return Array.from(speakers);
  }

  /**
   * Analyze conversation flow patterns
   */
  private analyzeConversationFlow(transcripts: any[], participants: string[]): ConversationAnalysis {
    const speakingTime: Record<string, number> = {};
    let interruptionCount = 0;
    let silencePeriods = 0;
    
    // Initialize speaking time
    participants.forEach(p => speakingTime[p] = 0);

    let lastSpeaker = '';
    let lastTimestamp = 0;

    transcripts.forEach((t, index) => {
      if (t.speaker === 'assistant') return;

      // Estimate speaking time based on word count (average 150 words per minute)
      const wordCount = t.text.split(' ').length;
      const speakingTimeSeconds = (wordCount / 150) * 60;
      
      if (speakingTime[t.speaker] !== undefined) {
        speakingTime[t.speaker] += speakingTimeSeconds;
      }

      // Detect interruptions (same speaker consecutive, or very quick alternation)
      if (lastSpeaker && lastSpeaker !== t.speaker) {
        const timeDiff = t.timestamp - lastTimestamp;
        if (timeDiff < 2000) { // Less than 2 seconds
          interruptionCount++;
        }
      }

      // Detect silence periods (gaps > 10 seconds)
      if (lastTimestamp && (t.timestamp - lastTimestamp) > 10000) {
        silencePeriods++;
      }

      lastSpeaker = t.speaker;
      lastTimestamp = t.timestamp;
    });

    // Calculate conversation balance (how evenly distributed speaking time is)
    const totalSpeakingTime = Object.values(speakingTime).reduce((a, b) => a + b, 0);
    const expectedTimePerPerson = totalSpeakingTime / participants.length;
    const imbalance = Object.values(speakingTime).reduce((sum, time) => {
      return sum + Math.abs(time - expectedTimePerPerson);
    }, 0);
    const conversationBalance = Math.max(0, 100 - (imbalance / totalSpeakingTime) * 100);

    // Calculate engagement level based on participation and interaction
    const engagementLevel = Math.min(100, Math.max(0, 
      (100 - interruptionCount * 5) * (totalSpeakingTime > 60 ? 1 : totalSpeakingTime / 60)
    ));

    return {
      totalSpeakingTime,
      interruptionCount,
      silencePeriods,
      conversationBalance: Math.round(conversationBalance),
      engagementLevel: Math.round(engagementLevel)
    };
  }

  /**
   * Analyze emotional tone throughout the session
   */
  private analyzeEmotionalTone(transcripts: any[]): EmotionalAnalysis {
    const emotionalArc: EmotionalMoment[] = [];
    const stressIndicators: string[] = [];
    const breakthroughMoments: string[] = [];
    
    let sentimentSum = 0;
    let sentimentCount = 0;
    const sentiments: string[] = [];

    transcripts.forEach(t => {
      if (t.speaker === 'assistant') return;

      // Parse sentiment if available
      let sentiment = 0;
      if (t.sentiment) {
        if (typeof t.sentiment === 'number') {
          sentiment = t.sentiment;
        } else if (typeof t.sentiment === 'string') {
          // Convert string sentiment to number
          switch (t.sentiment.toLowerCase()) {
            case 'positive': sentiment = 0.5; break;
            case 'negative': sentiment = -0.5; break;
            case 'very positive': sentiment = 0.8; break;
            case 'very negative': sentiment = -0.8; break;
            default: sentiment = 0;
          }
        }
      }

      sentimentSum += sentiment;
      sentimentCount++;
      sentiments.push(sentiment > 0.2 ? 'positive' : sentiment < -0.2 ? 'negative' : 'neutral');

      // Detect stress indicators
      if (this.containsStressIndicators(t.text)) {
        stressIndicators.push(t.text.substring(0, 100) + '...');
      }

      // Detect breakthrough moments (positive shifts in tone)
      if (sentiment > 0.6) {
        breakthroughMoments.push(t.text.substring(0, 100) + '...');
      }

      emotionalArc.push({
        timestamp: t.timestamp,
        sentiment,
        emotion: this.classifyEmotion(t.text, sentiment),
        speaker: t.speaker
      });
    });

    // Determine overall sentiment
    const avgSentiment = sentimentCount > 0 ? sentimentSum / sentimentCount : 0;
    const positiveCount = sentiments.filter(s => s === 'positive').length;
    const negativeCount = sentiments.filter(s => s === 'negative').length;
    
    let overallSentiment: EmotionalAnalysis['overallSentiment'];
    if (Math.abs(positiveCount - negativeCount) < sentimentCount * 0.2) {
      overallSentiment = 'mixed';
    } else if (avgSentiment > 0.1) {
      overallSentiment = 'positive';
    } else if (avgSentiment < -0.1) {
      overallSentiment = 'negative';
    } else {
      overallSentiment = 'neutral';
    }

    return {
      overallSentiment,
      emotionalArc,
      stressIndicators: stressIndicators.slice(0, 5), // Top 5
      breakthroughMoments: breakthroughMoments.slice(0, 3) // Top 3
    };
  }

  /**
   * Identify communication patterns
   */
  private identifyCommunicationPatterns(transcripts: any[]): CommunicationPattern[] {
    const patterns: Record<string, { count: number; examples: string[] }> = {
      defensive: { count: 0, examples: [] },
      supportive: { count: 0, examples: [] },
      collaborative: { count: 0, examples: [] },
      confrontational: { count: 0, examples: [] },
      avoidant: { count: 0, examples: [] }
    };

    transcripts.forEach(t => {
      if (t.speaker === 'assistant') return;

      const text = t.text.toLowerCase();
      
      // Defensive patterns
      if (this.isDefensiveLanguage(text)) {
        patterns.defensive.count++;
        if (patterns.defensive.examples.length < 3) {
          patterns.defensive.examples.push(t.text.substring(0, 80) + '...');
        }
      }
      
      // Supportive patterns
      if (this.isSupportiveLanguage(text)) {
        patterns.supportive.count++;
        if (patterns.supportive.examples.length < 3) {
          patterns.supportive.examples.push(t.text.substring(0, 80) + '...');
        }
      }
      
      // Collaborative patterns
      if (this.isCollaborativeLanguage(text)) {
        patterns.collaborative.count++;
        if (patterns.collaborative.examples.length < 3) {
          patterns.collaborative.examples.push(t.text.substring(0, 80) + '...');
        }
      }
      
      // Confrontational patterns
      if (this.isConfrontationalLanguage(text)) {
        patterns.confrontational.count++;
        if (patterns.confrontational.examples.length < 3) {
          patterns.confrontational.examples.push(t.text.substring(0, 80) + '...');
        }
      }
      
      // Avoidant patterns
      if (this.isAvoidantLanguage(text)) {
        patterns.avoidant.count++;
        if (patterns.avoidant.examples.length < 3) {
          patterns.avoidant.examples.push(t.text.substring(0, 80) + '...');
        }
      }
    });

    // Convert to array and determine improvement
    return Object.entries(patterns).map(([type, data]) => ({
      type: type as CommunicationPattern['type'],
      frequency: data.count,
      examples: data.examples,
      improvement: this.assessPatternImprovement(type, data.count, transcripts.length)
    }));
  }

  /**
   * Extract key topics discussed
   */
  private extractKeyTopics(transcripts: any[]): string[] {
    const topicCounts: Record<string, number> = {};
    
    transcripts.forEach(t => {
      if (t.topics && Array.isArray(t.topics)) {
        t.topics.forEach((topic: string) => {
          topicCounts[topic] = (topicCounts[topic] || 0) + 1;
        });
      }
    });

    // Return top 10 topics by frequency
    return Object.entries(topicCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([topic]) => topic);
  }

  /**
   * Extract therapist observations and interventions
   */
  private extractTherapistObservations(transcripts: any[]): string[] {
    return transcripts
      .filter(t => t.speaker === 'assistant')
      .map(t => t.text)
      .filter(text => text.length > 50) // Meaningful observations
      .slice(0, 5); // Top 5 observations
  }

  // Helper methods for pattern recognition
  private containsStressIndicators(text: string): boolean {
    const stressKeywords = [
      'stressed', 'overwhelmed', 'anxious', 'worried', 'pressure', 
      'exhausted', 'burned out', 'can\'t handle', 'too much'
    ];
    return stressKeywords.some(keyword => text.toLowerCase().includes(keyword));
  }

  private classifyEmotion(text: string, sentiment: number): string {
    const lowerText = text.toLowerCase();
    
    if (sentiment > 0.5) {
      if (lowerText.includes('love') || lowerText.includes('grateful')) return 'love';
      if (lowerText.includes('happy') || lowerText.includes('joy')) return 'joy';
      return 'positive';
    } else if (sentiment < -0.5) {
      if (lowerText.includes('angry') || lowerText.includes('mad')) return 'anger';
      if (lowerText.includes('sad') || lowerText.includes('hurt')) return 'sadness';
      if (lowerText.includes('scared') || lowerText.includes('afraid')) return 'fear';
      return 'negative';
    }
    
    return 'neutral';
  }

  private isDefensiveLanguage(text: string): boolean {
    const defensivePatterns = [
      'that\'s not true', 'you always', 'you never', 'but you', 
      'it\'s not my fault', 'i didn\'t mean to', 'you\'re being'
    ];
    return defensivePatterns.some(pattern => text.includes(pattern));
  }

  private isSupportiveLanguage(text: string): boolean {
    const supportivePatterns = [
      'i understand', 'i hear you', 'that makes sense', 'i\'m here for you',
      'we can work through this', 'i appreciate', 'thank you for'
    ];
    return supportivePatterns.some(pattern => text.includes(pattern));
  }

  private isCollaborativeLanguage(text: string): boolean {
    const collaborativePatterns = [
      'let\'s try', 'we could', 'what if we', 'together we',
      'our relationship', 'we both', 'let\'s work on'
    ];
    return collaborativePatterns.some(pattern => text.includes(pattern));
  }

  private isConfrontationalLanguage(text: string): boolean {
    const confrontationalPatterns = [
      'you need to', 'you should', 'why don\'t you', 'you have to',
      'i\'m tired of', 'you make me', 'because of you'
    ];
    return confrontationalPatterns.some(pattern => text.includes(pattern));
  }

  private isAvoidantLanguage(text: string): boolean {
    const avoidantPatterns = [
      'i don\'t know', 'maybe', 'i guess', 'whatever',
      'it doesn\'t matter', 'let\'s not talk about', 'i don\'t want to'
    ];
    return avoidantPatterns.some(pattern => text.includes(pattern));
  }

  private assessPatternImprovement(patternType: string, count: number, totalTranscripts: number): boolean {
    const frequency = count / totalTranscripts;
    
    // Positive patterns should increase, negative patterns should decrease
    const positivePatterns = ['supportive', 'collaborative'];
    const negativePatterns = ['defensive', 'confrontational', 'avoidant'];
    
    if (positivePatterns.includes(patternType)) {
      return frequency > 0.1; // At least 10% of statements
    } else if (negativePatterns.includes(patternType)) {
      return frequency < 0.2; // Less than 20% of statements
    }
    
    return true;
  }
}