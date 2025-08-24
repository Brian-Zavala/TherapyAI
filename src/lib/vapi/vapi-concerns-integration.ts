/**
 * VAPI Concerns Integration Service
 * Handles passing therapy concerns context to VAPI sessions
 */

import { prisma } from '@/lib/database/prisma-optimized';
import { THERAPY_CONCERNS, getConcernById } from '@/data/therapy-concerns';
import { formatConcernsNaturally } from '@/lib/vapi/vapi';
import type { VAPISessionContext, SessionConcernsContext } from '@/types/concerns-synchronization';

export class VAPIConcernsIntegration {
  /**
   * Generate comprehensive concerns context for VAPI session initialization
   */
  static async generateSessionContext(
    userId: string, 
    sessionId: string,
    therapyType: string = 'couple'
  ): Promise<VAPISessionContext> {
    try {
      // Get user's current concerns from profile
      const userProfile = await prisma.userProfile.findUnique({
        where: { userId },
        select: {
          currentConcerns: true,
          communicationStyle: true,
          additionalNotes: true
        }
      });

      const concernIds = (userProfile?.currentConcerns as string[]) || [];
      
      // Get session-specific concerns context if exists
      const sessionContext = await this.getSessionConcernsContext(sessionId);
      
      // Prioritize concerns for this session
      const { primary, secondary } = await this.prioritizeConcernsForSession(
        userId, 
        concernIds, 
        sessionContext
      );

      // Get historical context
      const history = await this.getHistoricalContext(userId, concernIds);

      // Generate natural language context
      const contextText = this.generateNaturalLanguageContext(
        primary, 
        secondary, 
        therapyType,
        history
      );

      return {
        sessionId,
        userId,
        concerns: {
          primary,
          secondary,
          context: contextText
        },
        history
      };

    } catch (error) {
      console.error('Error generating VAPI concerns context:', error);
      return this.getDefaultContext(sessionId, userId);
    }
  }

  /**
   * Update VAPI system prompt with concerns context
   */
  static enhanceSystemPrompt(
    basePrompt: string, 
    concernsContext: VAPISessionContext
  ): string {
    const { concerns, history } = concernsContext;
    
    if (concerns.primary.length === 0) {
      return basePrompt;
    }

    const concernsSection = `

THERAPY CONCERNS CONTEXT:
Primary Focus Areas: ${concerns.primary.map(c => c.label).join(', ')}
${concerns.secondary.length > 0 ? `Secondary Areas: ${concerns.secondary.map(c => c.label).join(', ')}` : ''}

Session Context: ${concerns.context}

${history.recentInsights.length > 0 ? `Recent Progress: ${history.progressHighlights.join('. ')}` : ''}

GUIDANCE FOR THIS SESSION:
- Acknowledge these specific concerns naturally in conversation
- Look for opportunities to explore progress in primary areas
- Be attentive to insights related to these concerns
- ${history.continuationPoints.length > 0 ? `Continue work on: ${history.continuationPoints.join(', ')}` : ''}
`;

    return basePrompt + concernsSection;
  }

  /**
   * Generate VAPI variables for dynamic concerns handling
   */
  static generateVAPIVariables(concernsContext: VAPISessionContext) {
    return {
      // Primary concerns for easy reference
      primary_concerns: concernsContext.concerns.primary.map(c => c.label).join(', '),
      concerns_count: concernsContext.concerns.primary.length + concernsContext.concerns.secondary.length,
      
      // Context for natural conversation
      concerns_context: concernsContext.concerns.context,
      
      // Progress indicators
      has_previous_progress: concernsContext.history.progressHighlights.length > 0,
      continuation_points: concernsContext.history.continuationPoints.join(', '),
      
      // Session metadata
      session_id: concernsContext.sessionId,
      user_id: concernsContext.userId
    };
  }

  /**
   * Process concerns mentions during active session
   */
  static async processConcernsMention(
    sessionId: string,
    transcript: string,
    confidence: number
  ) {
    // Extract mentioned concerns from transcript
    const mentionedConcerns = await this.extractConcernsFromTranscript(transcript);
    
    if (mentionedConcerns.length === 0) return;

    // Update session context with mentioned concerns
    await this.updateSessionConcernsTracking(sessionId, mentionedConcerns, confidence);
    
    // Generate real-time insights
    await this.generateRealTimeInsights(sessionId, mentionedConcerns, transcript);
  }

  // Private helper methods
  private static async getSessionConcernsContext(sessionId: string): Promise<SessionConcernsContext | null> {
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      select: { notes: true }
    });

    if (!session?.notes) return null;

    try {
      const notesData = JSON.parse(session.notes);
      return notesData?.concernsContext || null;
    } catch {
      // Notes is not JSON or doesn't contain concerns context
      return null;
    }
  }

  private static async prioritizeConcernsForSession(
    userId: string,
    concernIds: string[],
    sessionContext: SessionConcernsContext | null
  ) {
    const allConcerns = concernIds.map(id => getConcernById(id)).filter(Boolean);
    
    // If session has specific focus, prioritize those
    if (sessionContext?.primaryConcerns) {
      const primary = sessionContext.primaryConcerns
        .map(id => getConcernById(id))
        .filter(Boolean);
      const secondary = allConcerns.filter(c => !sessionContext.primaryConcerns.includes(c.id));
      
      return { primary, secondary };
    }

    // Default prioritization based on concern importance and recency
    const recentSessions = await prisma.session.findMany({
      where: { userId, status: 'COMPLETED' },
      orderBy: { endedAt: 'desc' },
      take: 3,
      select: { insights: true }
    });

    // Score concerns based on recent mentions and category
    const scoredConcerns = allConcerns.map(concern => {
      let score = concern.common ? 10 : 5; // Common concerns get higher base score
      
      // Check recent session insights
      recentSessions.forEach(session => {
        const insights = (session.insights as any[]) || [];
        const mentioned = insights.some(insight => 
          insight.concernId === concern.id || 
          insight.content?.includes(concern.label.toLowerCase())
        );
        if (mentioned) score += 15;
      });

      return { concern, score };
    });

    // Sort and split into primary (top 3-5) and secondary
    scoredConcerns.sort((a, b) => b.score - a.score);
    const primary = scoredConcerns.slice(0, Math.min(5, Math.ceil(scoredConcerns.length * 0.6)))
      .map(item => item.concern);
    const secondary = scoredConcerns.slice(primary.length)
      .map(item => item.concern);

    return { primary, secondary };
  }  private static async getHistoricalContext(userId: string, concernIds: string[]) {
    const recentInsights = await prisma.session.findMany({
      where: {
        userId,
        status: 'COMPLETED',
        endedAt: { not: null }
      },
      orderBy: { endedAt: 'desc' },
      take: 5,
      select: {
        id: true,
        endedAt: true,
        insights: true,
        notes: true
      }
    });

    // Extract progress highlights
    const progressHighlights: string[] = [];
    const continuationPoints: string[] = [];

    recentInsights.forEach(session => {
      const insights = (session.insights as any[]) || [];
      
      insights.forEach(insight => {
        if (concernIds.includes(insight.concernId)) {
          if (insight.type === 'progress' || insight.type === 'breakthrough') {
            progressHighlights.push(insight.content);
          } else if (insight.type === 'pattern' || insight.actionRequired) {
            continuationPoints.push(insight.content);
          }
        }
      });
    });

    return {
      recentInsights: recentInsights.flatMap(session => 
        ((session.insights as any[]) || [])
          .filter(insight => concernIds.includes(insight.concernId))
          .map(insight => ({
            sessionId: session.id,
            extractedAt: session.endedAt!,
            type: insight.type,
            description: insight.content,
            confidence: insight.confidence || 0.8,
            metadata: {
              transcriptSegments: insight.evidence || [],
              aiModel: 'claude-3',
              processingVersion: '1.0'
            }
          }))
      ),
      progressHighlights: progressHighlights.slice(0, 3),
      continuationPoints: continuationPoints.slice(0, 3)
    };
  }

  private static generateNaturalLanguageContext(
    primary: any[],
    secondary: any[],
    therapyType: string,
    history: any
  ): string {
    if (primary.length === 0) {
      return 'This session will focus on general therapeutic support and exploration.';
    }

    const primaryLabels = primary.map(c => c.label.toLowerCase()).join(', ');
    const hasProgress = history.progressHighlights.length > 0;
    const hasContinuation = history.continuationPoints.length > 0;

    let context = '';

    if (therapyType === 'couple') {
      context = `This couple's session will focus primarily on ${primaryLabels}. `;
    } else if (therapyType === 'individual') {
      context = `This individual session will focus on ${primaryLabels}. `;
    } else if (therapyType === 'family') {
      context = `This family session will explore ${primaryLabels}. `;
    }

    if (hasProgress) {
      context += `Recent progress has been made in several areas. `;
    }

    if (hasContinuation) {
      context += `We'll continue building on previous work and insights. `;
    }

    if (secondary.length > 0) {
      const secondaryLabels = secondary.slice(0, 2).map(c => c.label.toLowerCase()).join(' and ');
      context += `We may also touch on ${secondaryLabels} as time allows.`;
    }

    return context;
  }

  private static async extractConcernsFromTranscript(transcript: string): Promise<string[]> {
    const mentionedConcerns: string[] = [];
    const lowerTranscript = transcript.toLowerCase();

    THERAPY_CONCERNS.forEach(concern => {
      // Check for direct label match
      if (lowerTranscript.includes(concern.label.toLowerCase())) {
        mentionedConcerns.push(concern.id);
        return;
      }

      // Check for keyword matches
      const keywords = concern.id.split('-');
      const matchCount = keywords.filter(keyword => 
        lowerTranscript.includes(keyword)
      ).length;

      // If majority of keywords match, consider it mentioned
      if (matchCount >= Math.ceil(keywords.length * 0.6)) {
        mentionedConcerns.push(concern.id);
      }
    });

    return [...new Set(mentionedConcerns)]; // Remove duplicates
  }

  private static async updateSessionConcernsTracking(
    sessionId: string,
    mentionedConcerns: string[],
    confidence: number
  ) {
    // Update session notes with mentioned concerns tracking
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      select: { notes: true }
    });

    let currentNotesData: any = {};
    if (session?.notes) {
      try {
        currentNotesData = JSON.parse(session.notes);
      } catch {
        // Keep existing plain text notes
        currentNotesData = { originalNotes: session.notes };
      }
    }

    const concernsTracking = currentNotesData.concernsTracking || {};

    // Update tracking for each mentioned concern
    mentionedConcerns.forEach(concernId => {
      if (!concernsTracking[concernId]) {
        concernsTracking[concernId] = {
          mentionCount: 0,
          firstMentioned: new Date().toISOString(),
          confidence: []
        };
      }
      
      concernsTracking[concernId].mentionCount += 1;
      concernsTracking[concernId].confidence.push(confidence);
      concernsTracking[concernId].lastMentioned = new Date().toISOString();
    });

    // Update session notes with tracking data
    await prisma.session.update({
      where: { id: sessionId },
      data: {
        notes: JSON.stringify({
          ...currentNotesData,
          concernsTracking
        })
      }
    });
  }

  private static async generateRealTimeInsights(
    sessionId: string,
    mentionedConcerns: string[],
    transcript: string
  ) {
    // This would integrate with your existing insights generation system
    console.log(`[Real-time Insights] Session ${sessionId}: Mentioned concerns: ${mentionedConcerns.join(', ')}`);
    
    // Generate insights for each mentioned concern
    // This could trigger AI analysis of the transcript segment
    // and update the session's insights array
  }

  private static getDefaultContext(sessionId: string, userId: string): VAPISessionContext {
    return {
      sessionId,
      userId,
      concerns: {
        primary: [],
        secondary: [],
        context: 'This session will focus on general therapeutic support and exploration.'
      },
      history: {
        recentInsights: [],
        progressHighlights: [],
        continuationPoints: []
      }
    };
  }

  /**
   * Integration point for updating existing VAPI session initialization
   */
  static async integrateWithExistingVAPIFlow(userId: string, sessionId: string, assistantConfig: any) {
    // Generate concerns context
    const concernsContext = await this.generateSessionContext(userId, sessionId);
    
    // Enhance system prompt
    if (assistantConfig.systemPrompt) {
      assistantConfig.systemPrompt = this.enhanceSystemPrompt(
        assistantConfig.systemPrompt,
        concernsContext
      );
    }

    // Add variables for dynamic handling
    assistantConfig.variables = {
      ...assistantConfig.variables,
      ...this.generateVAPIVariables(concernsContext)
    };

    // Enhanced first message with concerns context
    if (concernsContext.concerns.primary.length > 0) {
      const naturalContext = formatConcernsNaturally(
        concernsContext.concerns.primary.map(c => c.id),
        assistantConfig.therapyType || 'couple',
        'greeting'
      );
      
      if (naturalContext && assistantConfig.firstMessage) {
        assistantConfig.firstMessage = `${assistantConfig.firstMessage} ${naturalContext}`;
      }
    }

    return { assistantConfig, concernsContext };
  }
}