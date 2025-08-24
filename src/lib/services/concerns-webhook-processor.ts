/**
 * Concerns-Focused Webhook Processor
 * Extracts and processes therapy concerns insights from VAPI webhooks
 */

import { prisma } from '@/lib/database/prisma-optimized';
import { THERAPY_CONCERNS, getConcernById } from '@/data/therapy-concerns';
import { VAPIConcernsIntegration } from './vapi-concerns-integration';
import type { ConcernsWebhookPayload, ConcernInsight } from '@/types/concerns-synchronization';

export class ConcernsWebhookProcessor {
  /**
   * Process concerns-related data from VAPI webhook
   */
  static async processWebhookForConcerns(
    sessionId: string,
    webhookType: string,
    payload: any
  ): Promise<void> {
    try {
      switch (webhookType) {
        case 'transcript':
          await this.processTranscriptForConcerns(sessionId, payload);
          break;
        
        case 'conversation-update':
          await this.processConversationUpdate(sessionId, payload);
          break;
        
        case 'end-of-call-report':
          await this.processEndOfCallConcerns(sessionId, payload);
          break;
        
        default:
          // Log unhandled webhook types for concerns
          console.log(`[Concerns Processor] Unhandled webhook type: ${webhookType}`);
      }
    } catch (error) {
      console.error(`[Concerns Processor] Error processing webhook:`, error);
    }
  }

  /**
   * Process transcript updates for real-time concerns detection
   */
  private static async processTranscriptForConcerns(
    sessionId: string,
    payload: any
  ): Promise<void> {
    const { transcript, confidence, timestamp } = payload;
    
    if (!transcript || confidence < 0.7) return;

    // Extract concerns from transcript segment
    const extractedConcerns = await this.extractConcernsFromTranscript(transcript);
    
    if (extractedConcerns.length === 0) return;

    // Update real-time concerns tracking
    await VAPIConcernsIntegration.processConcernsMention(
      sessionId,
      transcript,
      confidence
    );

    // Generate immediate insights if high-confidence concerns detected
    if (confidence > 0.85) {
      await this.generateImmediateInsights(sessionId, extractedConcerns, transcript, timestamp);
    }
  }

  /**
   * Process conversation updates for concerns progress tracking
   */
  private static async processConversationUpdate(
    sessionId: string,
    payload: any
  ): Promise<void> {
    const { role, content, timestamp } = payload;
    
    // Focus on user (client) messages for concerns analysis
    if (role !== 'user') return;

    const concernsAnalysis = await this.analyzeConcernsInMessage(content);
    
    if (concernsAnalysis.detectedConcerns.length > 0) {
      await this.updateConcernsProgress(sessionId, concernsAnalysis, timestamp);
    }
  }

  /**
   * Process end-of-call report for comprehensive concerns analysis
   */
  private static async processEndOfCallConcerns(
    sessionId: string,
    payload: any
  ): Promise<void> {
    const { transcript, duration, summary } = payload;
    
    // Get session context
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        user: {
          include: {
            profile: {
              select: { currentConcerns: true }
            }
          }
        }
      }
    });

    if (!session) return;

    const userConcerns = (session.user.profile?.currentConcerns as string[]) || [];
    
    // Comprehensive concerns analysis of full session
    const fullAnalysis = await this.comprehensiveConcernsAnalysis(
      transcript,
      userConcerns,
      duration
    );

    // Update session with concerns insights
    await this.updateSessionConcernsInsights(sessionId, fullAnalysis);
    
    // Update user profile concerns progress
    await this.updateProfileConcernsProgress(session.userId, fullAnalysis);
    
    // Generate actionable insights
    await this.generateActionableInsights(sessionId, fullAnalysis);
  }

  /**
   * Extract therapy concerns from transcript text
   */
  private static async extractConcernsFromTranscript(transcript: string): Promise<Array<{
    concernId: string;
    confidence: number;
    evidence: string[];
  }>> {
    const results: Array<{ concernId: string; confidence: number; evidence: string[] }> = [];
    const lowerTranscript = transcript.toLowerCase();

    // Analyze each therapy concern
    THERAPY_CONCERNS.forEach(concern => {
      const evidence: string[] = [];
      let confidence = 0;

      // Direct label matching
      if (lowerTranscript.includes(concern.label.toLowerCase())) {
        evidence.push(concern.label);
        confidence += 0.3;
      }

      // Keyword-based matching
      const keywords = this.getConcernKeywords(concern.id);
      keywords.forEach(keyword => {
        if (lowerTranscript.includes(keyword.toLowerCase())) {
          evidence.push(keyword);
          confidence += 0.2;
        }
      });

      // Contextual pattern matching
      const patterns = this.getConcernPatterns(concern.id);
      patterns.forEach(pattern => {
        const regex = new RegExp(pattern, 'i');
        if (regex.test(transcript)) {
          evidence.push(`Pattern: ${pattern}`);
          confidence += 0.25;
        }
      });

      // If we have reasonable confidence, include this concern
      if (confidence >= 0.4 && evidence.length > 0) {
        results.push({
          concernId: concern.id,
          confidence: Math.min(confidence, 0.95), // Cap at 95%
          evidence
        });
      }
    });

    return results.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Analyze concerns progress in a message
   */
  private static async analyzeConcernsInMessage(message: string): Promise<{
    detectedConcerns: string[];
    progressIndicators: Array<{
      type: 'positive' | 'negative' | 'neutral';
      concernId: string;
      description: string;
    }>;
    emotionalTone: 'positive' | 'negative' | 'neutral';
  }> {
    // This would integrate with your AI analysis system
    // For now, providing structure for implementation
    
    const detectedConcerns = await this.extractConcernsFromTranscript(message);
    const progressIndicators: any[] = [];
    
    // Analyze sentiment and progress for each detected concern
    detectedConcerns.forEach(({ concernId, confidence, evidence }) => {
      if (confidence > 0.6) {
        // Simple sentiment analysis based on keywords
        const progressType = this.analyzeProgressSentiment(message, concernId);
        
        progressIndicators.push({
          type: progressType,
          concernId,
          description: `${progressType} progress indicators detected for ${concernId}`,
        });
      }
    });

    return {
      detectedConcerns: detectedConcerns.map(c => c.concernId),
      progressIndicators,
      emotionalTone: this.analyzeOverallTone(message)
    };
  }

  /**
   * Comprehensive analysis of full session transcript
   */
  private static async comprehensiveConcernsAnalysis(
    transcript: string,
    userConcerns: string[],
    duration: number
  ): Promise<ConcernsWebhookPayload> {
    const extractedConcerns = await this.extractConcernsFromTranscript(transcript);
    
    // Focus on user's actual concerns
    const relevantConcerns = extractedConcerns.filter(concern => 
      userConcerns.includes(concern.concernId)
    );

    const progressIndicators = await Promise.all(
      relevantConcerns.map(async ({ concernId, evidence }) => {
        const segments = this.findConcernSegments(transcript, concernId);
        
        return segments.map(segment => ({
          type: this.analyzeProgressSentiment(segment, concernId) as 'positive' | 'negative' | 'neutral',
          description: `Analysis of ${concernId} discussion`,
          timestamp: new Date().toISOString()
        }));
      })
    );

    const suggestedActions = this.generateSuggestedActions(relevantConcerns, duration);

    return {
      sessionId: '', // Will be set by caller
      extractedConcerns: relevantConcerns.map(c => ({
        concernId: c.concernId,
        confidence: c.confidence,
        evidence: c.evidence,
        progressIndicators: progressIndicators.flat()
      })),
      suggestedActions
    };
  }  // Helper methods for concerns analysis
  private static getConcernKeywords(concernId: string): string[] {
    const keywordMap: Record<string, string[]> = {
      'communication': ['talk', 'listen', 'understand', 'express', 'conversation', 'discuss'],
      'trust': ['trust', 'honest', 'betrayal', 'lies', 'faithful', 'reliable'],
      'intimacy': ['close', 'intimate', 'connection', 'affection', 'romance', 'sexual'],
      'conflict': ['fight', 'argue', 'disagreement', 'tension', 'clash', 'dispute'],
      'anxiety': ['anxious', 'worried', 'nervous', 'panic', 'stress', 'overwhelm'],
      'depression': ['sad', 'depressed', 'down', 'hopeless', 'empty', 'numb'],
      'finances': ['money', 'financial', 'budget', 'debt', 'bills', 'expenses'],
      'parenting': ['children', 'kids', 'parenting', 'discipline', 'family'],
      // Add more mappings as needed
    };

    return keywordMap[concernId] || concernId.split('-');
  }

  private static getConcernPatterns(concernId: string): string[] {
    const patternMap: Record<string, string[]> = {
      'communication': [
        'we don\'t talk',
        'can\'t get through to',
        'not listening',
        'misunderstand each other'
      ],
      'trust': [
        'can\'t trust',
        'broken trust',
        'trust issues',
        'don\'t believe'
      ],
      'anxiety': [
        'feel anxious about',
        'worry constantly',
        'panic attacks',
        'can\'t stop thinking'
      ],
      // Add more patterns as needed
    };

    return patternMap[concernId] || [];
  }

  private static analyzeProgressSentiment(text: string, concernId: string): 'positive' | 'negative' | 'neutral' {
    const positiveWords = ['better', 'improved', 'progress', 'good', 'positive', 'helping', 'working'];
    const negativeWords = ['worse', 'difficult', 'hard', 'struggling', 'problem', 'bad', 'failed'];
    
    const lowerText = text.toLowerCase();
    const positiveCount = positiveWords.filter(word => lowerText.includes(word)).length;
    const negativeCount = negativeWords.filter(word => lowerText.includes(word)).length;
    
    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  }

  private static analyzeOverallTone(text: string): 'positive' | 'negative' | 'neutral' {
    // Simple tone analysis - could be enhanced with AI
    const positiveWords = ['happy', 'good', 'better', 'progress', 'grateful', 'hopeful'];
    const negativeWords = ['sad', 'angry', 'frustrated', 'hopeless', 'difficult', 'terrible'];
    
    const lowerText = text.toLowerCase();
    const positiveScore = positiveWords.filter(word => lowerText.includes(word)).length;
    const negativeScore = negativeWords.filter(word => lowerText.includes(word)).length;
    
    if (positiveScore > negativeScore) return 'positive';
    if (negativeScore > positiveScore) return 'negative';
    return 'neutral';
  }

  private static findConcernSegments(transcript: string, concernId: string): string[] {
    const sentences = transcript.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const keywords = this.getConcernKeywords(concernId);
    
    return sentences.filter(sentence => 
      keywords.some(keyword => 
        sentence.toLowerCase().includes(keyword.toLowerCase())
      )
    );
  }

  private static generateSuggestedActions(
    concerns: Array<{ concernId: string; confidence: number; evidence: string[] }>,
    duration: number
  ) {
    const actions: Array<{
      concernId: string;
      action: 'increase_focus' | 'decrease_priority' | 'add_to_profile' | 'schedule_followup';
      rationale: string;
    }> = [];

    concerns.forEach(({ concernId, confidence, evidence }) => {
      if (confidence > 0.8) {
        actions.push({
          concernId,
          action: 'increase_focus',
          rationale: `High confidence detection (${(confidence * 100).toFixed(0)}%) suggests this area needs more attention`
        });
      } else if (confidence > 0.6 && evidence.length > 2) {
        actions.push({
          concernId,
          action: 'schedule_followup',
          rationale: 'Multiple mentions suggest this concern warrants dedicated follow-up'
        });
      }
    });

    // If session was short but covered many concerns
    if (duration < 1800 && concerns.length > 3) { // Less than 30 minutes
      actions.push({
        concernId: concerns[0].concernId,
        action: 'increase_focus',
        rationale: 'Short session covered many concerns - recommend focusing on primary issue'
      });
    }

    return actions;
  }

  // Database update methods
  private static async updateSessionConcernsInsights(
    sessionId: string,
    analysis: ConcernsWebhookPayload
  ): Promise<void> {
    const insights = analysis.extractedConcerns.map(concern => ({
      concernId: concern.concernId,
      type: 'concerns_analysis',
      confidence: concern.confidence,
      content: `Session analysis detected discussion of ${concern.concernId}`,
      evidence: concern.evidence,
      progressIndicators: concern.progressIndicators
    }));

    await prisma.session.update({
      where: { id: sessionId },
      data: {
        insights: {
          push: insights
        },
        metadata: {
          concernsAnalysis: {
            extractedConcerns: analysis.extractedConcerns,
            suggestedActions: analysis.suggestedActions,
            processedAt: new Date().toISOString()
          }
        }
      }
    });
  }

  private static async updateProfileConcernsProgress(
    userId: string,
    analysis: ConcernsWebhookPayload
  ): Promise<void> {
    // This would update user profile with concerns progress data
    // Implementation would depend on your profile data structure
    console.log(`[Profile Update] Updating concerns progress for user: ${userId}`);
    
    // Example: Update concerns metadata in user profile
    const progressUpdate = analysis.extractedConcerns.reduce((acc, concern) => {
      const positiveIndicators = concern.progressIndicators.filter(p => p.type === 'positive').length;
      const negativeIndicators = concern.progressIndicators.filter(p => p.type === 'negative').length;
      
      acc[concern.concernId] = {
        lastDiscussed: new Date(),
        recentProgress: positiveIndicators > negativeIndicators ? 'improving' : 
                       negativeIndicators > positiveIndicators ? 'needs_attention' : 'stable',
        confidence: concern.confidence,
        sessionCount: 1 // This would be incremented
      };
      
      return acc;
    }, {} as Record<string, any>);

    // Update would be applied to user profile concerns metadata
  }

  private static async generateActionableInsights(
    sessionId: string,
    analysis: ConcernsWebhookPayload
  ): Promise<void> {
    // Generate insights for the therapist dashboard
    const actionableInsights = analysis.suggestedActions.map(action => ({
      type: 'actionable_insight',
      concernId: action.concernId,
      recommendation: action.action,
      rationale: action.rationale,
      priority: action.action === 'increase_focus' ? 'high' : 'medium',
      generatedAt: new Date()
    }));

    // This would integrate with your existing insights notification system
    console.log(`[Actionable Insights] Generated ${actionableInsights.length} insights for session: ${sessionId}`);
  }

  private static async generateImmediateInsights(
    sessionId: string,
    extractedConcerns: Array<{ concernId: string; confidence: number; evidence: string[] }>,
    transcript: string,
    timestamp: string
  ): Promise<void> {
    // Generate real-time insights during active session
    const immediateInsights = extractedConcerns.map(concern => ({
      sessionId,
      concernId: concern.concernId,
      type: 'real_time_detection',
      confidence: concern.confidence,
      content: `Real-time detection of ${concern.concernId} discussion`,
      timestamp: new Date(timestamp),
      evidence: concern.evidence,
      transcriptSegment: transcript
    }));

    // This would trigger real-time notifications or updates
    console.log(`[Real-time Insights] Generated immediate insights for ${extractedConcerns.length} concerns`);
  }

  private static async updateConcernsProgress(
    sessionId: string,
    analysis: any,
    timestamp: string
  ): Promise<void> {
    // Update real-time progress tracking
    const progressUpdates = analysis.detectedConcerns.map((concernId: string) => ({
      sessionId,
      concernId,
      timestamp: new Date(timestamp),
      progressType: analysis.emotionalTone,
      confidence: 0.7 // Base confidence for conversation updates
    }));

    // Store progress updates for real-time dashboard
    console.log(`[Progress Update] Tracking progress for ${analysis.detectedConcerns.length} concerns`);
  }
}