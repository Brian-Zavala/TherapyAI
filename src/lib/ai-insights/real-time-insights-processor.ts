/**
 * Real-Time Insights Processor
 * Generates dynamic AI insights based on live session data from VAPI
 * Updates insights in real-time as session metrics change
 */

import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma-optimized';
import { createClient } from '@/utils/supabase/client';
import { broadcastToChannel } from '@/lib/metrics-broadcaster';
import { IncrementalMetrics } from '@/lib/real-time-metrics-optimized';
import { ProcessedSessionData } from './session-data-processor';
import { DynamicInsight } from './ai-insight-generator';

interface RealTimeSessionData {
  sessionId: string;
  userId: string;
  therapyType: 'solo' | 'couple' | 'family';
  currentMetrics: IncrementalMetrics;
  transcriptBuffer: TranscriptSegment[];
  emotionalState: EmotionalStateTracker;
  stressPatterns: StressPatternAnalysis;
  communicationFlow: CommunicationFlowAnalysis;
}

interface TranscriptSegment {
  speaker: string;
  text: string;
  timestamp: Date;
  sentiment: number;
  emotions: string[];
  stressIndicators: string[];
}

interface EmotionalStateTracker {
  currentMood: 'positive' | 'neutral' | 'negative' | 'mixed';
  emotionalTrajectory: 'improving' | 'stable' | 'declining';
  significantShifts: EmotionalShift[];
  dominantEmotions: Map<string, number>;
}

interface EmotionalShift {
  timestamp: Date;
  fromState: string;
  toState: string;
  trigger?: string;
  intensity: number;
}

interface StressPatternAnalysis {
  currentStressLevel: number; // 0-100
  peakStressTimes: TimePattern[];
  stressTriggers: Map<string, number>;
  copingMechanisms: CopingPattern[];
  stressTrajectory: 'increasing' | 'stable' | 'decreasing';
}

interface TimePattern {
  hour: number;
  dayOfWeek: number;
  frequency: number;
  averageStressLevel: number;
}

interface CopingPattern {
  type: 'avoidance' | 'healthy' | 'confrontational' | 'collaborative';
  frequency: number;
  effectiveness: number;
  examples: string[];
}

interface CommunicationFlowAnalysis {
  turnTakingBalance: number; // 0-1, 0.5 = perfect balance
  interruptionRate: number; // per minute
  responseLatency: number; // average seconds
  validationFrequency: number; // per conversation
  listeningQuality: number; // 0-100
}

export class RealTimeInsightsProcessor {
  private sessionData: Map<string, RealTimeSessionData> = new Map();
  private insightCache: Map<string, DynamicInsight[]> = new Map();
  private updateThreshold = 5; // Update insights every N metrics updates
  private updateCounter: Map<string, number> = new Map();

  constructor() {
    this.initializeRealtimeSubscriptions();
  }

  private initializeRealtimeSubscriptions() {
    const supabase = createClient();
    
    // Subscribe to real-time metrics updates
    supabase
      .channel('metrics-updates')
      .on('broadcast', { event: 'metrics-update' }, async (payload) => {
        await this.handleMetricsUpdate(payload.payload);
      })
      .subscribe();

    // Subscribe to transcript updates
    supabase
      .channel('transcript-updates')
      .on('broadcast', { event: 'transcript-update' }, async (payload) => {
        await this.handleTranscriptUpdate(payload.payload);
      })
      .subscribe();
  }

  async handleMetricsUpdate(data: any) {
    const { sessionId, metrics, userId, therapyType } = data;
    
    // Update or create session data
    let sessionData = this.sessionData.get(sessionId);
    if (!sessionData) {
      sessionData = await this.initializeSessionData(sessionId, userId, therapyType);
    }

    // Update metrics
    sessionData.currentMetrics = metrics;

    // Update counters
    const count = (this.updateCounter.get(sessionId) || 0) + 1;
    this.updateCounter.set(sessionId, count);

    // Generate insights if threshold reached
    if (count >= this.updateThreshold) {
      await this.generateDynamicInsights(sessionData);
      this.updateCounter.set(sessionId, 0);
    }
  }

  private async handleTranscriptUpdate(data: any) {
    const { sessionId, transcript } = data;
    const sessionData = this.sessionData.get(sessionId);
    
    if (!sessionData) return;

    // Process transcript for real-time analysis
    const segment = await this.processTranscriptSegment(transcript);
    sessionData.transcriptBuffer.push(segment);

    // Update emotional state
    this.updateEmotionalState(sessionData, segment);

    // Update stress patterns
    this.updateStressPatterns(sessionData, segment);

    // Update communication flow
    this.updateCommunicationFlow(sessionData, segment);

    // Trigger insight generation if significant change detected
    if (this.detectSignificantChange(sessionData)) {
      await this.generateDynamicInsights(sessionData);
    }
  }

  private async initializeSessionData(
    sessionId: string, 
    userId: string, 
    therapyType: 'solo' | 'couple' | 'family'
  ): Promise<RealTimeSessionData> {
    const sessionData: RealTimeSessionData = {
      sessionId,
      userId,
      therapyType,
      currentMetrics: {
        activeListeningScore: 50,
        expressingNeedsScore: 50,
        conflictResolutionScore: 50,
        emotionalSupportScore: 50,
        communicationScore: 50,
        closenessScore: 50,
        confidence: 0,
        entryCount: 0,
        sessionProgress: 0
      },
      transcriptBuffer: [],
      emotionalState: {
        currentMood: 'neutral',
        emotionalTrajectory: 'stable',
        significantShifts: [],
        dominantEmotions: new Map()
      },
      stressPatterns: {
        currentStressLevel: 50,
        peakStressTimes: [],
        stressTriggers: new Map(),
        copingMechanisms: [],
        stressTrajectory: 'stable'
      },
      communicationFlow: {
        turnTakingBalance: 0.5,
        interruptionRate: 0,
        responseLatency: 0,
        validationFrequency: 0,
        listeningQuality: 50
      }
    };

    this.sessionData.set(sessionId, sessionData);
    return sessionData;
  }

  private async processTranscriptSegment(transcript: any): Promise<TranscriptSegment> {
    // Extract emotions and stress indicators from text
    const emotions = this.extractEmotions(transcript.text);
    const stressIndicators = this.extractStressIndicators(transcript.text);
    const sentiment = this.analyzeSentiment(transcript.text);

    return {
      speaker: transcript.speaker,
      text: transcript.text,
      timestamp: new Date(transcript.timestamp),
      sentiment,
      emotions,
      stressIndicators
    };
  }

  private updateEmotionalState(sessionData: RealTimeSessionData, segment: TranscriptSegment) {
    const { emotionalState } = sessionData;

    // Update dominant emotions
    segment.emotions.forEach(emotion => {
      const count = emotionalState.dominantEmotions.get(emotion) || 0;
      emotionalState.dominantEmotions.set(emotion, count + 1);
    });

    // Determine current mood based on recent segments
    const recentSegments = sessionData.transcriptBuffer.slice(-10);
    const avgSentiment = recentSegments.reduce((sum, s) => sum + s.sentiment, 0) / recentSegments.length;

    if (avgSentiment > 0.3) emotionalState.currentMood = 'positive';
    else if (avgSentiment < -0.3) emotionalState.currentMood = 'negative';
    else emotionalState.currentMood = 'neutral';

    // Detect emotional shifts
    if (sessionData.transcriptBuffer.length > 5) {
      const prevMood = this.getPreviousMood(sessionData.transcriptBuffer.slice(-6, -1));
      if (prevMood !== emotionalState.currentMood) {
        emotionalState.significantShifts.push({
          timestamp: segment.timestamp,
          fromState: prevMood,
          toState: emotionalState.currentMood,
          trigger: this.identifyTrigger(segment.text),
          intensity: Math.abs(avgSentiment)
        });
      }
    }

    // Update trajectory
    if (recentSegments.length >= 5) {
      const trend = this.calculateEmotionalTrend(recentSegments);
      if (trend > 0.1) emotionalState.emotionalTrajectory = 'improving';
      else if (trend < -0.1) emotionalState.emotionalTrajectory = 'declining';
      else emotionalState.emotionalTrajectory = 'stable';
    }
  }

  private updateStressPatterns(sessionData: RealTimeSessionData, segment: TranscriptSegment) {
    const { stressPatterns } = sessionData;
    const now = new Date();

    // Update current stress level based on indicators
    const stressScore = segment.stressIndicators.length * 10 + (1 - segment.sentiment) * 30;
    stressPatterns.currentStressLevel = Math.min(100, Math.max(0, 
      stressPatterns.currentStressLevel * 0.8 + stressScore * 0.2
    ));

    // Track stress triggers
    segment.stressIndicators.forEach(indicator => {
      const count = stressPatterns.stressTriggers.get(indicator) || 0;
      stressPatterns.stressTriggers.set(indicator, count + 1);
    });

    // Update peak stress times
    const hour = now.getHours();
    const dayOfWeek = now.getDay();
    const timePattern = stressPatterns.peakStressTimes.find(
      p => p.hour === hour && p.dayOfWeek === dayOfWeek
    );

    if (timePattern) {
      timePattern.frequency++;
      timePattern.averageStressLevel = 
        (timePattern.averageStressLevel * (timePattern.frequency - 1) + stressPatterns.currentStressLevel) / 
        timePattern.frequency;
    } else if (stressPatterns.currentStressLevel > 60) {
      stressPatterns.peakStressTimes.push({
        hour,
        dayOfWeek,
        frequency: 1,
        averageStressLevel: stressPatterns.currentStressLevel
      });
    }

    // Identify coping mechanisms
    const copingType = this.identifyCopingMechanism(segment.text, segment.sentiment);
    if (copingType) {
      const existing = stressPatterns.copingMechanisms.find(c => c.type === copingType);
      if (existing) {
        existing.frequency++;
        existing.examples.push(segment.text.substring(0, 100));
        existing.effectiveness = this.calculateCopingEffectiveness(sessionData);
      } else {
        stressPatterns.copingMechanisms.push({
          type: copingType,
          frequency: 1,
          effectiveness: 50,
          examples: [segment.text.substring(0, 100)]
        });
      }
    }

    // Update stress trajectory
    const recentStress = sessionData.transcriptBuffer
      .slice(-10)
      .map(s => s.stressIndicators.length);
    
    if (recentStress.length >= 5) {
      const trend = this.calculateTrend(recentStress);
      if (trend > 0.1) stressPatterns.stressTrajectory = 'increasing';
      else if (trend < -0.1) stressPatterns.stressTrajectory = 'decreasing';
      else stressPatterns.stressTrajectory = 'stable';
    }
  }

  private updateCommunicationFlow(sessionData: RealTimeSessionData, segment: TranscriptSegment) {
    const { communicationFlow, transcriptBuffer } = sessionData;

    // Calculate turn-taking balance
    const speakerCounts = new Map<string, number>();
    transcriptBuffer.forEach(seg => {
      const count = speakerCounts.get(seg.speaker) || 0;
      speakerCounts.set(seg.speaker, count + 1);
    });

    const counts = Array.from(speakerCounts.values());
    if (counts.length >= 2) {
      const max = Math.max(...counts);
      const min = Math.min(...counts);
      communicationFlow.turnTakingBalance = min / max;
    }

    // Calculate interruption rate
    if (transcriptBuffer.length > 1) {
      const lastSegment = transcriptBuffer[transcriptBuffer.length - 2];
      const timeDiff = (segment.timestamp.getTime() - lastSegment.timestamp.getTime()) / 1000;
      
      if (timeDiff < 2 && segment.speaker !== lastSegment.speaker) {
        // Likely interruption
        const totalMinutes = (segment.timestamp.getTime() - transcriptBuffer[0].timestamp.getTime()) / 60000;
        const interruptions = transcriptBuffer.filter((s, i) => {
          if (i === 0) return false;
          const prev = transcriptBuffer[i - 1];
          const diff = (s.timestamp.getTime() - prev.timestamp.getTime()) / 1000;
          return diff < 2 && s.speaker !== prev.speaker;
        }).length;
        
        communicationFlow.interruptionRate = interruptions / Math.max(1, totalMinutes);
      }
    }

    // Calculate validation frequency
    const validationPhrases = [
      'i understand', 'i hear you', 'that makes sense', 'i see',
      'you\'re right', 'i appreciate', 'thank you for sharing'
    ];
    
    const validations = transcriptBuffer.filter(seg => 
      validationPhrases.some(phrase => seg.text.toLowerCase().includes(phrase))
    ).length;
    
    communicationFlow.validationFrequency = validations / Math.max(1, transcriptBuffer.length) * 100;

    // Update listening quality based on metrics
    communicationFlow.listeningQuality = 
      sessionData.currentMetrics.activeListeningScore * 0.4 +
      communicationFlow.validationFrequency * 0.3 +
      (100 - communicationFlow.interruptionRate * 10) * 0.3;
  }

  private detectSignificantChange(sessionData: RealTimeSessionData): boolean {
    // Detect if there's been a significant change warranting immediate insight update
    const { emotionalState, stressPatterns, currentMetrics } = sessionData;

    // Check for emotional shifts
    if (emotionalState.significantShifts.length > 0) {
      const lastShift = emotionalState.significantShifts[emotionalState.significantShifts.length - 1];
      const timeSinceShift = Date.now() - lastShift.timestamp.getTime();
      if (timeSinceShift < 60000) return true; // Shift within last minute
    }

    // Check for stress spikes
    if (stressPatterns.currentStressLevel > 80 || stressPatterns.currentStressLevel < 20) {
      return true;
    }

    // Check for metric changes
    const significantMetricChange = 
      Math.abs(currentMetrics.communicationScore - 50) > 30 ||
      Math.abs(currentMetrics.emotionalSupportScore - 50) > 30;

    return significantMetricChange;
  }

  async generateDynamicInsights(sessionData: RealTimeSessionData): Promise<DynamicInsight[]> {
    const insights: DynamicInsight[] = [];
    const { emotionalState, stressPatterns, communicationFlow, currentMetrics, therapyType } = sessionData;

    // Generate stress pattern insight
    if (stressPatterns.peakStressTimes.length > 0) {
      const peakTimes = stressPatterns.peakStressTimes
        .sort((a, b) => b.averageStressLevel - a.averageStressLevel)
        .slice(0, 3);
      
      const timeDescriptions = peakTimes.map(t => {
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const hour = t.hour > 12 ? `${t.hour - 12} PM` : `${t.hour} AM`;
        return `${days[t.dayOfWeek]} ${hour}`;
      });

      const healthyCoping = stressPatterns.copingMechanisms.find(c => c.type === 'healthy');
      const avoidanceCoping = stressPatterns.copingMechanisms.find(c => c.type === 'avoidance');
      
      insights.push({
        id: `stress-pattern-${sessionData.sessionId}`,
        category: 'behavioral',
        title: `Stress Response Pattern: ${stressPatterns.stressTrajectory === 'decreasing' ? 'Improving ✓' : stressPatterns.stressTrajectory === 'increasing' ? 'Needs Attention' : 'Stable'}`,
        description: `Analysis shows you're ${
          (healthyCoping?.frequency || 0) > (avoidanceCoping?.frequency || 0) ? 
          'transitioning from avoidance to healthy coping' : 
          'still developing healthy coping mechanisms'
        }. Peak stress times: ${timeDescriptions.join(', ')}.`,
        priority: stressPatterns.currentStressLevel > 70 ? 'high' : 'medium',
        confidence: Math.round(currentMetrics.confidence),
        evidence: [
          `Current stress level: ${Math.round(stressPatterns.currentStressLevel)}%`,
          `Trajectory: ${stressPatterns.stressTrajectory}`,
          `Most effective coping: ${stressPatterns.copingMechanisms
            .sort((a, b) => b.effectiveness - a.effectiveness)[0]?.type || 'Still identifying'}`
        ],
        basedOn: [`Session ${sessionData.sessionId}`],
        actionItems: [],
        timeframe: 'immediate',
        recommendations: this.generateStressRecommendations(stressPatterns)
      });
    }

    // Generate communication insight
    insights.push({
      id: `communication-${sessionData.sessionId}`,
      category: 'communication',
      title: `Communication Health: ${Math.round(currentMetrics.communicationScore)}% ${
        currentMetrics.communicationScore > 70 ? '🌟' : 
        currentMetrics.communicationScore > 50 ? '📈' : '⚠️'
      }`,
      description: `Real-time analysis shows ${
        communicationFlow.listeningQuality > 70 ? 'excellent active listening' :
        communicationFlow.listeningQuality > 50 ? 'good listening with room for improvement' :
        'listening skills need attention'
      } (${Math.round(communicationFlow.listeningQuality)}%). ${
        communicationFlow.validationFrequency > 10 ? 'Strong emotional validation present.' :
        'Consider adding more validation phrases.'
      } Turn-taking balance: ${Math.round(communicationFlow.turnTakingBalance * 100)}%.`,
      priority: currentMetrics.communicationScore < 50 ? 'high' : 'medium',
      confidence: Math.round(currentMetrics.confidence),
      evidence: [
        `Active listening: ${Math.round(currentMetrics.activeListeningScore)}%`,
        `Validation frequency: ${Math.round(communicationFlow.validationFrequency)}%`,
        `Interruption rate: ${communicationFlow.interruptionRate.toFixed(1)}/min`
      ],
      basedOn: [`Session ${sessionData.sessionId}`],
      actionItems: [],
      timeframe: 'immediate',
      recommendations: this.generateCommunicationRecommendations(communicationFlow, currentMetrics)
    });

    // Generate emotional state insight
    if (emotionalState.significantShifts.length > 0 || emotionalState.emotionalTrajectory !== 'stable') {
      const dominantEmotion = Array.from(emotionalState.dominantEmotions.entries())
        .sort((a, b) => b[1] - a[1])[0];

      insights.push({
        id: `emotional-${sessionData.sessionId}`,
        category: 'emotional',
        title: `Emotional Intelligence: ${
          emotionalState.emotionalTrajectory === 'improving' ? 'Growing 🌱' :
          emotionalState.emotionalTrajectory === 'declining' ? 'Needs Support 💛' :
          'Stable ⚖️'
        }`,
        description: `Your emotional awareness is ${
          emotionalState.significantShifts.length > 2 ? 'highly active' : 'developing'
        }. Current state: ${emotionalState.currentMood}. ${
          dominantEmotion ? `Predominantly expressing ${dominantEmotion[0]}.` : ''
        } ${
          emotionalState.emotionalTrajectory === 'improving' ? 
          'Positive emotional growth detected in this session.' : ''
        }`,
        priority: emotionalState.emotionalTrajectory === 'declining' ? 'high' : 'medium',
        confidence: Math.round(currentMetrics.confidence),
        evidence: [
          `Emotional shifts: ${emotionalState.significantShifts.length}`,
          `Current trajectory: ${emotionalState.emotionalTrajectory}`,
          `Mood: ${emotionalState.currentMood}`
        ],
        basedOn: [`Session ${sessionData.sessionId}`],
        actionItems: [],
        timeframe: emotionalState.emotionalTrajectory === 'declining' ? 'immediate' : 'this-week',
        recommendations: this.generateEmotionalRecommendations(emotionalState)
      });
    }

    // Generate therapy-specific insights
    const therapySpecificInsights = await this.generateTherapySpecificInsights(sessionData);
    insights.push(...therapySpecificInsights);

    // Cache and broadcast insights
    this.insightCache.set(sessionData.sessionId, insights);
    await this.broadcastInsights(sessionData.sessionId, insights);

    return insights;
  }

  private async generateTherapySpecificInsights(sessionData: RealTimeSessionData): Promise<DynamicInsight[]> {
    const insights: DynamicInsight[] = [];
    const { therapyType, currentMetrics, communicationFlow } = sessionData;

    switch (therapyType) {
      case 'couple':
        // Attachment style insight
        if (communicationFlow.interruptionRate > 0.5 || currentMetrics.expressingNeedsScore > 70) {
          insights.push({
            id: `attachment-${sessionData.sessionId}`,
            category: 'relationship',
            title: 'Attachment Dynamics: Active',
            description: `Partner showing ${
              communicationFlow.interruptionRate > 0.5 ? 'anxious' : 'secure'
            } attachment patterns. ${
              communicationFlow.interruptionRate > 0.5 ? 
              'High engagement with frequent interruptions suggests anxiety about being heard.' :
              'Balanced expression of needs indicates secure attachment.'
            }`,
            priority: 'medium',
            confidence: Math.round(currentMetrics.confidence * 0.8),
            evidence: [
              `Interruption rate: ${communicationFlow.interruptionRate.toFixed(1)}/min`,
              `Expressing needs: ${Math.round(currentMetrics.expressingNeedsScore)}%`
            ],
            basedOn: [`Session ${sessionData.sessionId}`],
            actionItems: [],
            timeframe: 'this-week',
            recommendations: [
              'Practice the "Attachment Pause" when feeling triggered',
              'Use reassuring language to address anxious patterns'
            ]
          });
        }
        break;

      case 'solo':
        // Self-awareness insight
        insights.push({
          id: `self-awareness-${sessionData.sessionId}`,
          category: 'mental-health',
          title: `Self-Awareness Level: ${
            currentMetrics.confidence > 60 ? 'High' : 'Developing'
          }`,
          description: `Your ability to articulate thoughts and feelings is ${
            currentMetrics.expressingNeedsScore > 70 ? 'excellent' :
            currentMetrics.expressingNeedsScore > 50 ? 'good' : 'developing'
          }. ${
            sessionData.emotionalState.dominantEmotions.size > 3 ?
            'Rich emotional vocabulary detected.' : 
            'Consider expanding emotional vocabulary.'
          }`,
          priority: 'medium',
          confidence: Math.round(currentMetrics.confidence),
          evidence: [
            `Expression clarity: ${Math.round(currentMetrics.expressingNeedsScore)}%`,
            `Emotional range: ${sessionData.emotionalState.dominantEmotions.size} emotions`
          ],
          basedOn: [`Session ${sessionData.sessionId}`],
          actionItems: [],
          timeframe: 'this-week',
          recommendations: [
            'Continue daily emotion journaling',
            'Practice naming specific emotions as they arise'
          ]
        });
        break;

      case 'family':
        // Family dynamics insight
        if (communicationFlow.turnTakingBalance < 0.7) {
          insights.push({
            id: `family-dynamics-${sessionData.sessionId}`,
            category: 'relationship',
            title: 'Family Communication Balance',
            description: `Some family members are dominating conversation (balance: ${
              Math.round(communicationFlow.turnTakingBalance * 100)
            }%). ${
              communicationFlow.turnTakingBalance < 0.5 ?
              'Consider using a talking stick or timer to ensure everyone is heard.' :
              'Slight imbalance detected - encourage quieter members to share.'
            }`,
            priority: communicationFlow.turnTakingBalance < 0.5 ? 'high' : 'medium',
            confidence: Math.round(currentMetrics.confidence),
            evidence: [
              `Turn-taking balance: ${Math.round(communicationFlow.turnTakingBalance * 100)}%`,
              `Participation rate: Varies significantly`
            ],
            basedOn: [`Session ${sessionData.sessionId}`],
            actionItems: [],
            timeframe: 'immediate',
            recommendations: [
              'Implement structured sharing rounds',
              'Create safe space for all voices'
            ]
          });
        }
        break;
    }

    return insights;
  }

  // Helper methods for analysis
  private extractEmotions(text: string): string[] {
    const emotionKeywords = {
      happy: ['happy', 'joy', 'excited', 'glad', 'pleased'],
      sad: ['sad', 'down', 'depressed', 'unhappy', 'blue'],
      angry: ['angry', 'mad', 'furious', 'irritated', 'annoyed'],
      anxious: ['anxious', 'worried', 'nervous', 'stressed', 'tense'],
      fearful: ['scared', 'afraid', 'frightened', 'terrified'],
      grateful: ['grateful', 'thankful', 'appreciative'],
      loving: ['love', 'care', 'affection', 'fond']
    };

    const emotions: string[] = [];
    const lowerText = text.toLowerCase();

    for (const [emotion, keywords] of Object.entries(emotionKeywords)) {
      if (keywords.some(keyword => lowerText.includes(keyword))) {
        emotions.push(emotion);
      }
    }

    return emotions;
  }

  private extractStressIndicators(text: string): string[] {
    const stressKeywords = [
      'overwhelmed', 'stressed', 'pressure', 'can\'t cope',
      'too much', 'exhausted', 'burned out', 'anxious',
      'worried', 'tense', 'frustrated', 'stuck'
    ];

    return stressKeywords.filter(keyword => 
      text.toLowerCase().includes(keyword)
    );
  }

  private analyzeSentiment(text: string): number {
    // Simple sentiment analysis (-1 to 1)
    const positiveWords = ['good', 'great', 'happy', 'love', 'wonderful', 'amazing', 'better', 'improving'];
    const negativeWords = ['bad', 'terrible', 'hate', 'awful', 'worse', 'angry', 'sad', 'frustrated'];

    const lowerText = text.toLowerCase();
    let score = 0;

    positiveWords.forEach(word => {
      if (lowerText.includes(word)) score += 0.2;
    });

    negativeWords.forEach(word => {
      if (lowerText.includes(word)) score -= 0.2;
    });

    return Math.max(-1, Math.min(1, score));
  }

  private identifyCopingMechanism(text: string, sentiment: number): CopingPattern['type'] | null {
    const lowerText = text.toLowerCase();

    if (lowerText.includes('avoid') || lowerText.includes('don\'t want to talk')) {
      return 'avoidance';
    } else if (lowerText.includes('let\'s work') || lowerText.includes('together')) {
      return 'collaborative';
    } else if (sentiment > 0.3 && (lowerText.includes('understand') || lowerText.includes('breathe'))) {
      return 'healthy';
    } else if (sentiment < -0.3 && (lowerText.includes('fault') || lowerText.includes('blame'))) {
      return 'confrontational';
    }

    return null;
  }

  private calculateCopingEffectiveness(sessionData: RealTimeSessionData): number {
    // Calculate based on stress reduction after coping mechanism use
    const recentStress = sessionData.transcriptBuffer.slice(-5)
      .map(s => s.stressIndicators.length);
    
    if (recentStress.length < 2) return 50;

    const before = recentStress.slice(0, 2).reduce((a, b) => a + b, 0) / 2;
    const after = recentStress.slice(-2).reduce((a, b) => a + b, 0) / 2;

    const reduction = (before - after) / Math.max(1, before) * 100;
    return Math.max(0, Math.min(100, 50 + reduction));
  }

  private calculateTrend(values: number[]): number {
    if (values.length < 2) return 0;

    let trend = 0;
    for (let i = 1; i < values.length; i++) {
      trend += values[i] - values[i - 1];
    }

    return trend / (values.length - 1);
  }

  private calculateEmotionalTrend(segments: TranscriptSegment[]): number {
    const sentiments = segments.map(s => s.sentiment);
    return this.calculateTrend(sentiments);
  }

  private getPreviousMood(segments: TranscriptSegment[]): string {
    const avgSentiment = segments.reduce((sum, s) => sum + s.sentiment, 0) / segments.length;
    
    if (avgSentiment > 0.3) return 'positive';
    else if (avgSentiment < -0.3) return 'negative';
    else return 'neutral';
  }

  private identifyTrigger(text: string): string | undefined {
    const triggers = [
      { pattern: /money|finance|bills/i, trigger: 'financial discussion' },
      { pattern: /family|parents|kids/i, trigger: 'family matters' },
      { pattern: /work|job|career/i, trigger: 'work-related stress' },
      { pattern: /health|sick|doctor/i, trigger: 'health concerns' }
    ];

    for (const { pattern, trigger } of triggers) {
      if (pattern.test(text)) return trigger;
    }

    return undefined;
  }

  private generateStressRecommendations(patterns: StressPatternAnalysis): string[] {
    const recommendations: string[] = [];

    if (patterns.currentStressLevel > 70) {
      recommendations.push('Take a 5-minute breathing break before continuing');
      recommendations.push('Consider scheduling sessions outside peak stress times');
    }

    const avoidanceCoping = patterns.copingMechanisms.find(c => c.type === 'avoidance');
    if (avoidanceCoping && avoidanceCoping.frequency > 3) {
      recommendations.push('Practice gradual exposure to difficult topics');
      recommendations.push('Use the "Brave Conversation" framework');
    }

    const healthyCoping = patterns.copingMechanisms.find(c => c.type === 'healthy');
    if (healthyCoping && healthyCoping.effectiveness > 70 && healthyCoping.examples.length > 0) {
      recommendations.push(`Continue using ${healthyCoping.examples[0]} - it's working well`);
    }

    return recommendations;
  }

  private generateCommunicationRecommendations(
    flow: CommunicationFlowAnalysis, 
    metrics: IncrementalMetrics
  ): string[] {
    const recommendations: string[] = [];

    if (flow.interruptionRate > 0.5) {
      recommendations.push('Practice the 2-minute rule: speak uninterrupted for 2 minutes');
    }

    if (flow.validationFrequency < 10) {
      recommendations.push('Add validation phrases: "I hear you", "That makes sense"');
    }

    if (metrics.activeListeningScore < 60) {
      recommendations.push('Reflect back what you heard before responding');
    }

    return recommendations;
  }

  private generateEmotionalRecommendations(state: EmotionalStateTracker): string[] {
    const recommendations: string[] = [];

    if (state.emotionalTrajectory === 'declining') {
      recommendations.push('Take a moment to identify and name your emotions');
      recommendations.push('Consider what support you need right now');
    }

    if (state.significantShifts.length > 3) {
      recommendations.push('Notice patterns in your emotional triggers');
      recommendations.push('Practice grounding techniques between shifts');
    }

    return recommendations;
  }

  private async broadcastInsights(sessionId: string, insights: DynamicInsight[]) {
    try {
      await broadcastToChannel(
        `insights-${sessionId}`,
        'insights-update',
        {
          sessionId,
          insights,
          timestamp: new Date().toISOString()
        }
      );

      logger.info('Broadcasted real-time insights', {
        sessionId,
        insightCount: insights.length
      });
    } catch (error) {
      logger.error('Failed to broadcast insights', { error, sessionId });
    }
  }

  // Public methods for API access
  async getCurrentInsights(sessionId: string): Promise<DynamicInsight[]> {
    return this.insightCache.get(sessionId) || [];
  }

  async getSessionAnalysis(sessionId: string): Promise<RealTimeSessionData | undefined> {
    return this.sessionData.get(sessionId);
  }
}

// Export singleton instance
export const realTimeInsightsProcessor = new RealTimeInsightsProcessor();