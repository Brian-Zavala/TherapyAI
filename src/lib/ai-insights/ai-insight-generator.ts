/**
 * AI-Powered Insight Generator
 * Uses Claude AI to analyze real VAPI session data and generate personalized insights
 */

import { logger } from '@/lib/utils/logger';
import { ProcessedSessionData, SessionDataProcessor } from './session-data-processor';
import { DeterministicInsightEngine } from './deterministic-insights-engine';
import { ComprehensiveInsightsService } from './comprehensive-insights-service';

// AI Service interface - supports multiple providers
interface AIProvider {
  generateInsights(sessionData: ProcessedSessionData[], userContext: UserContext): Promise<GeneratedInsights>;
}

export interface UserContext {
  userId: string;
  therapyType: 'couples' | 'individual' | 'family';
  relationshipStatus?: string;
  currentConcerns?: string[];
  sessionHistory: {
    totalSessions: number;
    averageDuration: number;
    consistency: 'excellent' | 'good' | 'needs-improvement';
  };
}

export interface GeneratedInsights {
  insights: DynamicInsight[];
  weeklyGoals: string[];
  focusAreas: string[];
  strengths: string[];
  dailyTips: string[];
  trends: {
    communication: 'improving' | 'stable' | 'declining';
    emotional: 'improving' | 'stable' | 'declining';
    consistency: 'excellent' | 'good' | 'needs-improvement';
  };
  confidence: number; // 0-100, how confident AI is in these insights
  dataQuality: 'high' | 'medium' | 'low'; // Quality of underlying session data
}

export interface DynamicInsight {
  id: string;
  title: string;
  description: string;
  category: 'communication' | 'emotional' | 'behavioral' | 'mental-health' | 'relationship' | 'progress';
  priority: 'high' | 'medium' | 'low';
  actionItems: string[];
  basedOn: string[]; // Specific data points from sessions
  evidence: string[]; // Actual quotes or examples from sessions
  recommendations?: string[]; // Specific recommendations
  timeframe: 'immediate' | 'this-week' | 'this-month';
  confidence: number; // 0-100
}

/**
 * Claude AI Provider for generating insights
 */
class ClaudeAIProvider implements AIProvider {
  private apiKey: string;
  private baseUrl: string = 'https://api.anthropic.com/v1/messages';

  constructor() {
    this.apiKey = process.env.ANTHROPIC_API_KEY || '';
    if (!this.apiKey) {
      logger.warn('ANTHROPIC_API_KEY not configured - AI insights will use fallback mode');
    }
  }

  async generateInsights(sessionData: ProcessedSessionData[], userContext: UserContext): Promise<GeneratedInsights> {
    logger.info('Generating AI insights from session data', { 
      userId: userContext.userId, 
      sessionCount: sessionData.length 
    });

    // If no API key is configured, use fallback immediately
    if (!this.apiKey) {
      logger.info('Using fallback insights due to missing API key');
      return this.generateFallbackInsights(sessionData, userContext);
    }

    const prompt = this.buildAnalysisPrompt(sessionData, userContext);
    
    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-3-sonnet-20241022',
          max_tokens: 4000,
          messages: [{
            role: 'user',
            content: prompt
          }]
        })
      });

      if (!response.ok) {
        throw new Error(`Claude API error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      const analysis = this.parseAIResponse(result.content[0].text);
      
      return this.structureInsights(analysis, sessionData, userContext);
    } catch (error) {
      logger.error('Failed to generate AI insights', { 
        error: error instanceof Error ? error.message : error 
      });
      
      // Fallback to enhanced rule-based insights
      return this.generateFallbackInsights(sessionData, userContext);
    }
  }

  private buildAnalysisPrompt(sessionData: ProcessedSessionData[], userContext: UserContext): string {
    const sessionSummaries = sessionData.map((session, index) => {
      return `
SESSION ${index + 1} (${new Date(session.startTime).toDateString()}):
- Duration: ${Math.round(session.duration / 60)} minutes
- Participants: ${session.participants.join(', ')}
- Conversation Balance: ${session.conversationFlow.conversationBalance}%
- Engagement Level: ${session.conversationFlow.engagementLevel}%
- Overall Sentiment: ${session.emotionalTone.overallSentiment}
- Communication Patterns: ${session.communicationPatterns.map(p => `${p.type} (${p.frequency}x)`).join(', ')}
- Key Topics: ${session.keyTopics.slice(0, 5).join(', ')}
- Stress Indicators: ${session.emotionalTone.stressIndicators.length} detected
- Breakthrough Moments: ${session.emotionalTone.breakthroughMoments.length} identified
${session.emotionalTone.breakthroughMoments.length > 0 ? `- Examples: ${session.emotionalTone.breakthroughMoments.slice(0, 2).join('; ')}` : ''}
      `.trim();
    }).join('\n\n');

    return `
You are an expert relationship therapist analyzing real therapy session data. Based on the following ACTUAL session data from ${userContext.therapyType} therapy sessions, generate personalized, actionable insights.

CONTEXT:
- Therapy Type: ${userContext.therapyType}
- Total Sessions Analyzed: ${sessionData.length}
- Relationship Status: ${userContext.relationshipStatus || 'Not specified'}
- Current Concerns: ${userContext.currentConcerns?.join(', ') || 'None specified'}
- Session Consistency: ${userContext.sessionHistory.consistency}

SESSION DATA:
${sessionSummaries}

TASK: Analyze this data and provide insights in the following JSON format:

{
  "insights": [
    {
      "title": "Specific insight based on actual data",
      "description": "Detailed explanation referencing specific patterns",
      "category": "communication|emotional|behavioral|mental-health|relationship|progress",
      "priority": "high|medium|low",
      "actionItems": ["Specific, actionable steps"],
      "basedOn": ["Specific data points that support this insight"],
      "evidence": ["Direct quotes or examples from sessions"],
      "timeframe": "immediate|this-week|this-month",
      "confidence": 85
    }
  ],
  "weeklyGoals": ["Specific goals based on identified patterns"],
  "focusAreas": ["Areas needing attention based on session analysis"],
  "strengths": ["Actual strengths observed in the sessions"],
  "dailyTips": ["Actionable daily practices based on needs identified"],
  "trends": {
    "communication": "improving|stable|declining",
    "emotional": "improving|stable|declining",
    "consistency": "excellent|good|needs-improvement"
  },
  "confidence": 85,
  "dataQuality": "high|medium|low"
}

REQUIREMENTS:
1. Base ALL insights on the actual session data provided
2. Reference specific patterns, behaviors, or moments from the sessions
3. Provide evidence from actual conversations when possible
4. Make recommendations specific to the identified issues
5. Consider the therapy type and relationship context
6. Prioritize insights based on frequency and impact of observed patterns
7. Generate 3-5 high-quality insights rather than many generic ones
8. Ensure daily tips are specific to the problems identified in sessions

Be specific, evidence-based, and actionable. Avoid generic advice that could apply to anyone.
    `.trim();
  }

  private parseAIResponse(response: string): any {
    try {
      // Extract JSON from the response (handles cases where AI adds explanation)
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in AI response');
      }
      
      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      logger.error('Failed to parse AI response', { response, error });
      throw new Error('Invalid AI response format');
    }
  }

  private structureInsights(analysis: any, sessionData: ProcessedSessionData[], userContext: UserContext): GeneratedInsights {
    // Add unique IDs and ensure data quality
    const insights: DynamicInsight[] = (analysis.insights || []).map((insight: any, index: number) => ({
      id: `ai-insight-${Date.now()}-${index}`,
      title: insight.title || 'Untitled Insight',
      description: insight.description || 'No description provided',
      category: insight.category || 'relationship',
      priority: insight.priority || 'medium',
      actionItems: Array.isArray(insight.actionItems) ? insight.actionItems : [],
      basedOn: Array.isArray(insight.basedOn) ? insight.basedOn : [],
      evidence: Array.isArray(insight.evidence) ? insight.evidence : [],
      timeframe: insight.timeframe || 'this-week',
      confidence: Math.min(100, Math.max(0, insight.confidence || 30)) // SAFETY: Lowered from 70% to 30%
    }));

    return {
      insights,
      weeklyGoals: Array.isArray(analysis.weeklyGoals) ? analysis.weeklyGoals : [],
      focusAreas: Array.isArray(analysis.focusAreas) ? analysis.focusAreas : [],
      strengths: Array.isArray(analysis.strengths) ? analysis.strengths : [],
      dailyTips: Array.isArray(analysis.dailyTips) ? analysis.dailyTips : [],
      trends: {
        communication: analysis.trends?.communication || 'stable',
        emotional: analysis.trends?.emotional || 'stable',
        consistency: analysis.trends?.consistency || userContext.sessionHistory.consistency
      },
      confidence: Math.min(100, Math.max(0, analysis.confidence || 30)), // SAFETY: Lowered from 70% to 30%
      dataQuality: this.assessDataQuality(sessionData)
    };
  }

  private assessDataQuality(sessionData: ProcessedSessionData[]): 'high' | 'medium' | 'low' {
    if (sessionData.length === 0) return 'low';
    if (sessionData.length < 3) return 'low';
    
    const avgDuration = sessionData.reduce((sum, s) => sum + s.duration, 0) / sessionData.length;
    const hasTranscripts = sessionData.every(s => s.conversationFlow.totalSpeakingTime);
    
    if (sessionData.length >= 5 && avgDuration >= 600 && hasTranscripts) {
      return 'high';
    } else if (sessionData.length >= 3 && avgDuration >= 300) {
      return 'medium';
    }
    
    return 'low';
  }

  private generateFallbackInsights(sessionData: ProcessedSessionData[], userContext: UserContext): GeneratedInsights {
    logger.warn('Using fallback insight generation', { userId: userContext.userId });
    
    // Enhanced rule-based insights as fallback
    const insights: DynamicInsight[] = [];
    
    if (sessionData.length > 0) {
      const latestSession = sessionData[0];
      
      // Communication balance insight
      if (latestSession.conversationFlow.conversationBalance < 60) {
        insights.push({
          id: `fallback-balance-${Date.now()}`,
          title: 'Improve Conversation Balance',
          description: `Recent sessions show conversation balance at ${latestSession.conversationFlow.conversationBalance}%. One partner may be dominating discussions.`,
          category: 'communication',
          priority: 'high',
          actionItems: [
            'Set a timer for equal speaking time',
            'Practice the "speaker-listener" technique',
            'Ask open-ended questions to encourage participation'
          ],
          basedOn: [`Conversation balance: ${latestSession.conversationFlow.conversationBalance}%`],
          evidence: [],
          timeframe: 'immediate',
          confidence: 35 // SAFETY: Lowered from 75% to 35%
        });
      }

      // Emotional tone insight
      if (latestSession.emotionalTone.overallSentiment === 'negative') {
        insights.push({
          id: `fallback-emotion-${Date.now()}`,
          title: 'Address Emotional Climate',
          description: 'Recent sessions have shown predominantly negative emotional tone. Focus on rebuilding positive interactions.',
          category: 'emotional',
          priority: 'high',
          actionItems: [
            'Start sessions with appreciation sharing',
            'Practice gratitude exercises together',
            'Focus on solutions rather than problems'
          ],
          basedOn: [`Overall sentiment: ${latestSession.emotionalTone.overallSentiment}`],
          evidence: [],
          timeframe: 'this-week',
          confidence: 30 // SAFETY: Lowered from 70% to 30%
        });
      }
    }

    return {
      insights,
      weeklyGoals: ['Continue attending regular therapy sessions', 'Practice one new communication technique'],
      focusAreas: ['Communication patterns', 'Emotional connection'],
      strengths: ['Commitment to therapy', 'Willingness to work on relationship'],
      dailyTips: ['Take three deep breaths before difficult conversations', 'Express one appreciation daily'],
      trends: {
        communication: sessionData.length > 1 ? 'stable' : 'stable',
        emotional: sessionData.length > 1 ? 'stable' : 'stable',
        consistency: userContext.sessionHistory.consistency
      },
      confidence: 25, // SAFETY: Lowered from 60% to 25%
      dataQuality: this.assessDataQuality(sessionData)
    };
  }
}

/**
 * Main AI Insight Generator Class
 */
export class AIInsightGenerator {
  private aiProvider: AIProvider | null = null;
  private deterministicEngine: DeterministicInsightEngine;
  private comprehensiveService: ComprehensiveInsightsService;
  private sessionProcessor: SessionDataProcessor;

  constructor(userId: string) {
    // Try to initialize AI provider if key exists
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (apiKey) {
      try {
        this.aiProvider = new ClaudeAIProvider();
      } catch (error) {
        logger.warn('Failed to initialize AI provider, using deterministic engine', { error });
        this.aiProvider = null;
      }
    }
    
    // Always initialize deterministic engine as fallback
    this.deterministicEngine = new DeterministicInsightEngine();
    this.comprehensiveService = new ComprehensiveInsightsService();
    this.sessionProcessor = new SessionDataProcessor(userId);
  }

  /**
   * Generate comprehensive insights based on recent sessions
   */
  async generateInsights(userContext: UserContext): Promise<GeneratedInsights> {
    logger.info('Starting insight generation', { userId: userContext.userId });

    try {
      // Process recent session data
      const sessionData = await this.sessionProcessor.processRecentSessions(10);
      
      if (sessionData.length === 0) {
        logger.warn('No session data available for insight generation', { userId: userContext.userId });
        return this.generateEmptyStateInsights(userContext);
      }

      // Use deterministic engine by default for reliability and cost savings
      const useDeterministic = !this.aiProvider || process.env.USE_DETERMINISTIC_INSIGHTS === 'true';
      const useEnhanced = process.env.USE_ENHANCED_INSIGHTS === 'true';
      
      if (useDeterministic) {
        // Use comprehensive service if enhanced insights are enabled
        if (useEnhanced) {
          logger.info('Using comprehensive insight service', { userId: userContext.userId });
          
          const insights = await this.comprehensiveService.generateComprehensiveInsights(
            userContext.userId,
            sessionData,
            userContext
          );
          
          logger.info('Successfully generated comprehensive insights', { 
            userId: userContext.userId,
            insightCount: insights.insights.length,
            confidence: insights.confidence,
            dataQuality: insights.dataQuality
          });
          
          return insights;
        } else {
          logger.info('Using deterministic insight engine', { userId: userContext.userId });
          const insights = this.deterministicEngine.generateInsights(sessionData, userContext);
          
          logger.info('Successfully generated deterministic insights', { 
            userId: userContext.userId,
            insightCount: insights.insights.length,
            confidence: insights.confidence,
            dataQuality: insights.dataQuality
          });
          
          return insights;
        }
      }

      // Try AI-powered insights if available
      try {
        const insights = await this.aiProvider!.generateInsights(sessionData, userContext);
        
        logger.info('Successfully generated AI insights', { 
          userId: userContext.userId,
          insightCount: insights.insights.length,
          confidence: insights.confidence,
          dataQuality: insights.dataQuality
        });

        return insights;
      } catch (aiError) {
        logger.warn('AI insight generation failed, falling back to deterministic', { 
          error: aiError instanceof Error ? aiError.message : aiError 
        });
        
        // Fallback to deterministic engine
        return this.deterministicEngine.generateInsights(sessionData, userContext);
      }
    } catch (error) {
      logger.error('Failed to generate insights', { 
        userId: userContext.userId,
        error: error instanceof Error ? error.message : error 
      });
      
      // Return empty state rather than throwing
      return this.generateEmptyStateInsights(userContext);
    }
  }

  private generateEmptyStateInsights(userContext: UserContext): GeneratedInsights {
    return {
      insights: [],
      weeklyGoals: ['Schedule your first therapy session', 'Set clear relationship goals'],
      focusAreas: ['Getting started with therapy'],
      strengths: ['Taking the first step toward improvement'],
      dailyTips: ['Practice mindful listening', 'Express gratitude to your partner'],
      trends: {
        communication: 'stable',
        emotional: 'stable',
        consistency: 'needs-improvement'
      },
      confidence: 0,
      dataQuality: 'low'
    };
  }
}