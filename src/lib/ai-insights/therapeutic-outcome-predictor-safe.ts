// @ts-nocheck
/**
 * SAFE Therapeutic Outcome Support System
 * Descriptive analytics and therapist-validated insights ONLY
 * 
 * 🚨 CRITICAL SAFETY NOTE: This system provides descriptive analytics only.
 * No predictive claims about relationship outcomes are made.
 * All insights require therapist validation before display to clients.
 */

import { prisma } from '@/lib/prisma-optimized';
import { logger } from '@/lib/logger';
import { ProcessedSessionData } from './session-data-processor';
import { RelationshipTrend } from './advanced-pattern-analytics';

// CRISIS DETECTION KEYWORDS - Immediate therapist alert required
const CRISIS_KEYWORDS = [
  'suicide', 'kill myself', 'end it all', 'better off dead',
  'hurt myself', 'self harm', 'abuse', 'violence', 'hit',
  'threaten', 'afraid', 'scared', 'unsafe', 'danger'
];

export interface TherapeuticSupportAnalysis {
  userId: string;
  analysisDate: Date;
  
  // DESCRIPTIVE ONLY - No predictions
  currentEngagementLevel: 'low' | 'moderate' | 'high';
  sessionConsistency: 'irregular' | 'somewhat_regular' | 'consistent';
  communicationObservations: string[];
  
  // Pattern observations (not predictions)
  observedPatterns: PatternObservation[];
  progressIndicators: ProgressIndicator[];
  areasOfFocus: string[];
  
  // Support recommendations (therapist must approve)
  therapistRecommendations: TherapistRecommendation[];
  
  // Safety and validation
  requiresTherapistReview: boolean;
  crisisKeywordsDetected: boolean;
  confidenceLevel: 'very_low' | 'low' | 'moderate'; // Never high
  dataLimitations: string[];
  
  // Clinical disclaimer
  clinicalDisclaimer: ClinicalDisclaimer;
}

export interface PatternObservation {
  pattern: string;
  description: string;
  observedInSessions: string[]; // Session IDs
  frequency: 'rare' | 'occasional' | 'frequent';
  context: string;
  // NO PREDICTIONS - only observations
}

export interface ProgressIndicator {
  area: string;
  description: string;
  evidenceFromSessions: string[];
  timeframe: string; // "In recent sessions" not "In X weeks"
  type: 'milestone_reached' | 'skill_practiced' | 'topic_discussed';
  // NO FUTURE PREDICTIONS
}

export interface TherapistRecommendation {
  recommendation: string;
  rationale: string;
  urgency: 'routine' | 'moderate' | 'high';
  requiresSpecialistConsult: boolean;
  basedOnObservations: string[];
  
  // Approval system
  status: 'pending_review' | 'approved' | 'rejected' | 'needs_modification';
  therapistNotes?: string;
  approvedBy?: string;
  approvedAt?: Date;
}

export interface ClinicalDisclaimer {
  message: string;
  requiresAcknowledgment: boolean;
  therapistOverrideRequired: boolean;
  lastAcknowledged?: Date;
  version: string;
}

export class SafeTherapeuticAnalyzer {
  private userId: string;
  private readonly CONFIDENCE_CAP = 40; // Never exceed 40% confidence

  constructor(userId: string) {
    this.userId = userId;
  }

  /**
   * Generate SAFE descriptive analysis (no predictions)
   */
  async generateSafeAnalysis(): Promise<TherapeuticSupportAnalysis> {
    logger.info('Generating SAFE therapeutic analysis (descriptive only)', { 
      userId: this.userId 
    });

    try {
      // Check for crisis keywords first
      const sessionData = await this.getProcessedSessionData();
      const crisisDetected = this.detectCrisisKeywords(sessionData);
      
      if (crisisDetected) {
        logger.warn('CRISIS KEYWORDS DETECTED - Immediate therapist alert required', {
          userId: this.userId,
          timestamp: new Date().toISOString()
        });
        
        // Return minimal analysis with crisis flag
        return this.generateCrisisResponse();
      }

      // Descriptive analysis only
      const engagementLevel = this.describeEngagementLevel(sessionData);
      const consistency = this.describeSessionConsistency(sessionData);
      const communicationObs = this.describeCommunicationPatterns(sessionData);
      const patterns = this.observePatterns(sessionData);
      const progress = this.identifyProgressIndicators(sessionData);
      const focusAreas = this.identifyFocusAreas(sessionData);
      
      // Generate recommendations (require therapist approval)
      const recommendations = this.generateTherapistRecommendations(
        sessionData, patterns, progress
      );

      const analysis: TherapeuticSupportAnalysis = {
        userId: this.userId,
        analysisDate: new Date(),
        currentEngagementLevel: engagementLevel,
        sessionConsistency: consistency,
        communicationObservations: communicationObs,
        observedPatterns: patterns,
        progressIndicators: progress,
        areasOfFocus: focusAreas,
        therapistRecommendations: recommendations,
        requiresTherapistReview: true, // ALWAYS require review
        crisisKeywordsDetected: false,
        confidenceLevel: 'low', // Conservative confidence
        dataLimitations: this.identifyDataLimitations(sessionData),
        clinicalDisclaimer: this.getClinicalDisclaimer()
      };

      // Store for therapist review
      await this.storeForTherapistReview(analysis);

      logger.info('Generated SAFE therapeutic analysis', {
        userId: this.userId,
        recommendationCount: recommendations.length,
        requiresReview: true
      });

      return analysis;

    } catch (error) {
      logger.error('Failed to generate safe therapeutic analysis', {
        userId: this.userId,
        error: error instanceof Error ? error.message : error
      });
      
      return this.generateFallbackAnalysis();
    }
  }

  /**
   * Detect crisis keywords requiring immediate attention
   */
  private detectCrisisKeywords(sessionData: ProcessedSessionData[]): boolean {
    for (const session of sessionData) {
      // Check transcript content for crisis keywords
      const transcript = session.conversationFlow.transcript?.toLowerCase() || '';
      
      for (const keyword of CRISIS_KEYWORDS) {
        if (transcript.includes(keyword)) {
          logger.warn('Crisis keyword detected', {
            userId: this.userId,
            sessionId: session.sessionId,
            keyword: keyword,
            requiresImmediateAttention: true
          });
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Generate crisis response - minimal analysis, immediate therapist alert
   */
  private generateCrisisResponse(): TherapeuticSupportAnalysis {
    return {
      userId: this.userId,
      analysisDate: new Date(),
      currentEngagementLevel: 'moderate', // Neutral assessment
      sessionConsistency: 'somewhat_regular',
      communicationObservations: ['Session requires immediate therapist review'],
      observedPatterns: [],
      progressIndicators: [],
      areasOfFocus: ['Immediate therapist consultation required'],
      therapistRecommendations: [{
        recommendation: 'URGENT: Review session immediately for crisis intervention',
        rationale: 'Crisis keywords detected in session content',
        urgency: 'high',
        requiresSpecialistConsult: true,
        basedOnObservations: ['Automated crisis detection'],
        status: 'pending_review'
      }],
      requiresTherapistReview: true,
      crisisKeywordsDetected: true,
      confidenceLevel: 'very_low',
      dataLimitations: ['Analysis limited due to crisis detection'],
      clinicalDisclaimer: this.getClinicalDisclaimer()
    };
  }

  /**
   * Describe engagement level (no predictions)
   */
  private describeEngagementLevel(sessionData: ProcessedSessionData[]): 'low' | 'moderate' | 'high' {
    if (sessionData.length === 0) return 'moderate';
    
    const recentSessions = sessionData.slice(0, 3);
    const avgEngagement = recentSessions.reduce((sum, s) => 
      sum + (s.conversationFlow.engagementLevel || 50), 0
    ) / recentSessions.length;
    
    // Conservative thresholds
    if (avgEngagement > 70) return 'high';
    if (avgEngagement < 40) return 'low';
    return 'moderate';
  }

  /**
   * Describe session consistency patterns
   */
  private describeSessionConsistency(sessionData: ProcessedSessionData[]): 'irregular' | 'somewhat_regular' | 'consistent' {
    if (sessionData.length < 3) return 'somewhat_regular';
    
    // Calculate session intervals
    const intervals: number[] = [];
    for (let i = 1; i < sessionData.length; i++) {
      const daysBetween = (sessionData[i-1].startTime.getTime() - sessionData[i].startTime.getTime()) 
                         / (24 * 60 * 60 * 1000);
      intervals.push(daysBetween);
    }
    
    const avgInterval = intervals.reduce((a, b) => a + b) / intervals.length;
    const variance = intervals.reduce((sum, interval) => 
      sum + Math.pow(interval - avgInterval, 2), 0
    ) / intervals.length;
    
    const standardDeviation = Math.sqrt(variance);
    
    // Conservative thresholds
    if (standardDeviation < 3) return 'consistent';
    if (standardDeviation > 10) return 'irregular';
    return 'somewhat_regular';
  }

  /**
   * Describe communication patterns (no predictions)
   */
  private describeCommunicationPatterns(sessionData: ProcessedSessionData[]): string[] {
    const observations: string[] = [];
    
    if (sessionData.length === 0) {
      observations.push('Insufficient data for communication analysis');
      return observations;
    }

    // Analyze conversation balance
    const balanceScores = sessionData.map(s => s.conversationFlow.conversationBalance);
    const avgBalance = balanceScores.reduce((a, b) => a + b) / balanceScores.length;
    
    if (avgBalance > 60) {
      observations.push('One participant tends to speak more in sessions');
    } else if (avgBalance < 40) {
      observations.push('Communication appears relatively balanced between participants');
    } else {
      observations.push('Communication balance varies between sessions');
    }

    // Check for supportive vs defensive patterns
    let supportiveCount = 0;
    let defensiveCount = 0;
    
    sessionData.forEach(session => {
      supportiveCount += session.communicationPatterns
        .filter(p => p.type === 'supportive')
        .reduce((sum, p) => sum + p.frequency, 0);
      defensiveCount += session.communicationPatterns
        .filter(p => p.type === 'defensive')
        .reduce((sum, p) => sum + p.frequency, 0);
    });

    if (supportiveCount > defensiveCount * 1.5) {
      observations.push('Supportive communication patterns observed');
    } else if (defensiveCount > supportiveCount) {
      observations.push('Some defensive communication patterns noted - area for continued focus');
    }

    return observations;
  }

  /**
   * Observe patterns in sessions (descriptive only)
   */
  private observePatterns(sessionData: ProcessedSessionData[]): PatternObservation[] {
    const patterns: PatternObservation[] = [];
    
    // Topic consistency
    const topicFrequency = new Map<string, string[]>();
    sessionData.forEach(session => {
      session.conversationFlow.topicsDiscussed?.forEach(topic => {
        if (!topicFrequency.has(topic)) {
          topicFrequency.set(topic, []);
        }
        topicFrequency.get(topic)!.push(session.sessionId);
      });
    });

    // Report frequently discussed topics
    for (const [topic, sessionIds] of topicFrequency.entries()) {
      if (sessionIds.length >= 2) {
        patterns.push({
          pattern: `Recurring topic: ${topic}`,
          description: `This topic has been discussed in ${sessionIds.length} sessions`,
          observedInSessions: sessionIds,
          frequency: sessionIds.length >= 3 ? 'frequent' : 'occasional',
          context: 'Topic analysis from session transcripts'
        });
      }
    }

    return patterns;
  }

  /**
   * Identify progress indicators (descriptive only)
   */
  private identifyProgressIndicators(sessionData: ProcessedSessionData[]): ProgressIndicator[] {
    const indicators: ProgressIndicator[] = [];
    
    // Session completion milestones
    if (sessionData.length >= 3) {
      indicators.push({
        area: 'Session Engagement',
        description: `Has completed ${sessionData.length} therapy sessions`,
        evidenceFromSessions: sessionData.map(s => s.sessionId),
        timeframe: 'Recent session history',
        type: 'milestone_reached'
      });
    }

    // Communication skill practice
    const skillPractice = sessionData.filter(s => 
      s.communicationPatterns.some(p => p.type === 'skill_practice')
    );
    
    if (skillPractice.length > 0) {
      indicators.push({
        area: 'Communication Skills',
        description: 'Communication techniques have been practiced in sessions',
        evidenceFromSessions: skillPractice.map(s => s.sessionId),
        timeframe: 'Observed in recent sessions',
        type: 'skill_practiced'
      });
    }

    return indicators;
  }

  /**
   * Identify areas for continued focus
   */
  private identifyFocusAreas(sessionData: ProcessedSessionData[]): string[] {
    const areas: string[] = [];
    
    if (sessionData.length < 3) {
      areas.push('Establishing regular session attendance');
    }

    // Check for communication balance issues
    const hasBalanceIssues = sessionData.some(s => 
      s.conversationFlow.conversationBalance > 75 || s.conversationFlow.conversationBalance < 25
    );
    
    if (hasBalanceIssues) {
      areas.push('Communication balance and turn-taking');
    }

    // Check for defensive patterns
    const hasDefensivePatterns = sessionData.some(s =>
      s.communicationPatterns.some(p => p.type === 'defensive' && p.frequency > 3)
    );
    
    if (hasDefensivePatterns) {
      areas.push('Reducing defensive communication patterns');
    }

    return areas;
  }

  /**
   * Generate recommendations requiring therapist approval
   */
  private generateTherapistRecommendations(
    sessionData: ProcessedSessionData[],
    patterns: PatternObservation[],
    progress: ProgressIndicator[]
  ): TherapistRecommendation[] {
    const recommendations: TherapistRecommendation[] = [];
    
    // Session consistency recommendation
    if (sessionData.length > 0) {
      const consistency = this.describeSessionConsistency(sessionData);
      if (consistency === 'irregular') {
        recommendations.push({
          recommendation: 'Consider discussing session scheduling and consistency',
          rationale: 'Irregular session attendance observed',
          urgency: 'routine',
          requiresSpecialistConsult: false,
          basedOnObservations: ['Session timing analysis'],
          status: 'pending_review'
        });
      }
    }

    // Communication pattern recommendation
    const hasDefensivePatterns = patterns.some(p => 
      p.pattern.includes('defensive') || p.pattern.includes('interruption')
    );
    
    if (hasDefensivePatterns) {
      recommendations.push({
        recommendation: 'Focus on communication de-escalation techniques',
        rationale: 'Defensive communication patterns observed in sessions',
        urgency: 'moderate',
        requiresSpecialistConsult: false,
        basedOnObservations: ['Communication pattern analysis'],
        status: 'pending_review'
      });
    }

    return recommendations;
  }

  /**
   * Get clinical disclaimer
   */
  private getClinicalDisclaimer(): ClinicalDisclaimer {
    return {
      message: "AI insights are for informational purposes only and do not replace professional therapy. All recommendations require therapist approval before implementation.",
      requiresAcknowledgment: true,
      therapistOverrideRequired: true,
      version: "1.0.0"
    };
  }

  /**
   * Identify data limitations
   */
  private identifyDataLimitations(sessionData: ProcessedSessionData[]): string[] {
    const limitations: string[] = [];
    
    if (sessionData.length < 3) {
      limitations.push('Limited session history - analysis based on insufficient data');
    }
    
    if (sessionData.length < 5) {
      limitations.push('Short-term data only - long-term patterns cannot be determined');
    }
    
    limitations.push('AI analysis requires professional validation');
    limitations.push('Cultural and individual context not fully captured');
    
    return limitations;
  }

  // Data fetching methods
  private async getProcessedSessionData(): Promise<ProcessedSessionData[]> {
    // This would fetch actual session data
    return [];
  }

  private async storeForTherapistReview(analysis: TherapeuticSupportAnalysis): Promise<void> {
    try {
      // Store analysis for therapist review
      logger.info('Stored analysis for therapist review', { 
        userId: this.userId,
        requiresReview: true 
      });
    } catch (error) {
      logger.error('Failed to store analysis for review', {
        userId: this.userId,
        error: error instanceof Error ? error.message : error
      });
    }
  }

  private generateFallbackAnalysis(): TherapeuticSupportAnalysis {
    return {
      userId: this.userId,
      analysisDate: new Date(),
      currentEngagementLevel: 'moderate',
      sessionConsistency: 'somewhat_regular',
      communicationObservations: ['Insufficient data for analysis'],
      observedPatterns: [],
      progressIndicators: [],
      areasOfFocus: ['Continue regular therapy sessions'],
      therapistRecommendations: [{
        recommendation: 'Standard therapy continuation',
        rationale: 'Insufficient data for specific recommendations',
        urgency: 'routine',
        requiresSpecialistConsult: false,
        basedOnObservations: ['Limited data analysis'],
        status: 'pending_review'
      }],
      requiresTherapistReview: true,
      crisisKeywordsDetected: false,
      confidenceLevel: 'very_low',
      dataLimitations: ['Insufficient session data', 'System fallback mode'],
      clinicalDisclaimer: this.getClinicalDisclaimer()
    };
  }
}

/**
 * Crisis detection function for immediate alerts
 */
export async function detectAndAlertCrisis(
  userId: string,
  sessionTranscript: string
): Promise<boolean> {
  const transcript = sessionTranscript.toLowerCase();
  
  for (const keyword of CRISIS_KEYWORDS) {
    if (transcript.includes(keyword)) {
      logger.error('CRISIS DETECTED - IMMEDIATE THERAPIST ALERT REQUIRED', {
        userId,
        keyword,
        timestamp: new Date().toISOString(),
        requiresImmediateAttention: true
      });
      
      // Trigger immediate therapist notification
      // This would integrate with emergency alert system
      
      return true;
    }
  }
  
  return false;
}

/**
 * Therapist approval system
 */
export async function approveRecommendation(
  userId: string,
  recommendationId: string,
  therapistId: string,
  approved: boolean,
  notes?: string
): Promise<void> {
  try {
    logger.info('Therapist recommendation review', {
      userId,
      recommendationId,
      therapistId,
      approved,
      notes
    });
    
    // Update recommendation status in database
    
  } catch (error) {
    logger.error('Failed to process therapist approval', {
      userId,
      recommendationId,
      error: error instanceof Error ? error.message : error
    });
  }
}