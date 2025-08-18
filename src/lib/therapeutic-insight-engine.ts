/**
 * AI-Powered Therapeutic Insight Engine
 * Analyzes session transcripts for breakthroughs, emotional insights, and therapeutic progress
 */

import { prisma } from './prisma-optimized';
import { OpenAI } from 'openai';

interface TranscriptAnalysis {
  breakthroughs: TherapeuticBreakthrough[];
  emotionalJourney: EmotionalState[];
  keyThemes: string[];
  sessionSummary: string;
  nextSessionFocus: string;
  contextForNext: string;
}

interface TherapeuticBreakthrough {
  type: 'emotional_release' | 'insight' | 'pattern_recognition' | 'vulnerability_moment' | 'empathy_breakthrough';
  description: string;
  intensity: number; // 0-1
  timestamp: string;
  context: string;
  themes: string[];
  confidence: number;
}

interface EmotionalState {
  timestamp: string;
  emotions: {
    type: string;
    intensity: number;
    description: string;
  }[];
  overallValence: number; // -1 to 1 (negative to positive)
  arousal: number; // 0-1 (calm to excited)
}

export class TherapeuticInsightEngine {
  private openai: OpenAI;
  
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  /**
   * Main processing function for completed sessions
   */
  async processSessionTranscript(sessionId: string): Promise<void> {
    try {
      // Get session and transcript data
      const session = await prisma.session.findUnique({
        where: { id: sessionId },
        include: {
          transcriptEntries: {
            orderBy: { timestamp: 'asc' }
          },
          user: {
            select: {
              id: true,
              profile: true
            }
          }
        }
      });

      if (!session || session.transcriptEntries.length === 0) {
        console.log(`No transcript data found for session ${sessionId}`);
        return;
      }

      // Check if already processed
      const existingSummary = await prisma.sessionSummary.findUnique({
        where: { sessionId }
      });

      if (existingSummary && existingSummary.processingStatus === 'completed') {
        console.log(`Session ${sessionId} already processed`);
        return;
      }

      // Mark as processing
      await prisma.sessionSummary.upsert({
        where: { sessionId },
        create: {
          sessionId,
          userId: session.userId,
          processingStatus: 'processing',
          keyThemes: [],
          emotionalJourney: [],
          breakthroughMoments: [],
          progressMarkers: [],
          challengeAreas: []
        },
        update: {
          processingStatus: 'processing'
        }
      });

      // Analyze transcript with AI
      const analysis = await this.analyzeTranscriptWithAI(session);
      
      // Store breakthrough moments
      await this.storeBreakthroughs(sessionId, session.userId, analysis.breakthroughs);
      
      // Store emotional milestones
      await this.storeEmotionalMilestones(sessionId, session.userId, analysis.emotionalJourney);
      
      // Create/update session summary
      await this.createSessionSummary(sessionId, session.userId, analysis);
      
      // Link to previous sessions if patterns found
      await this.linkToPreviousSessions(sessionId, session.userId, analysis);

      console.log(`Successfully processed transcript for session ${sessionId}`);

    } catch (error) {
      console.error(`Error processing session ${sessionId}:`, error);
      
      // Mark as failed
      await prisma.sessionSummary.upsert({
        where: { sessionId },
        create: {
          sessionId,
          userId: session?.userId || '',
          processingStatus: 'failed',
          keyThemes: [],
          emotionalJourney: [],
          breakthroughMoments: [],
          progressMarkers: [],
          challengeAreas: []
        },
        update: {
          processingStatus: 'failed'
        }
      });
    }
  }

  /**
   * AI analysis of transcript using OpenAI
   */
  private async analyzeTranscriptWithAI(session: any): Promise<TranscriptAnalysis> {
    const transcript = session.transcriptEntries
      .map((entry: any) => `${entry.speaker}: ${entry.text}`)
      .join('\n');

    const userProfile = session.user.profile;
    const therapyType = session.sessionType?.toLowerCase() || 'solo';
    
    const systemPrompt = `You are an expert therapeutic AI analyst specializing in ${therapyType} therapy sessions. 
    
Your task is to analyze therapy session transcripts and identify:
1. Breakthrough moments (emotional releases, insights, pattern recognition)
2. Emotional journey throughout the session
3. Key therapeutic themes
4. Progress markers and areas needing continued work
5. Context for next session to maintain therapeutic continuity

${userProfile ? `
Client Profile Context:
- Current concerns: ${JSON.stringify(userProfile.currentConcerns)}
- Relationship status: ${userProfile.relationshipStatus}
- Communication style: ${userProfile.communicationStyle}
- Additional context: ${userProfile.additionalNotes}
` : ''}

Return a comprehensive analysis in JSON format.`;

    const userPrompt = `Analyze this therapy session transcript for therapeutic insights:

${transcript}

Please provide a detailed analysis including:
1. Specific breakthrough moments with timestamps and context
2. Emotional journey progression 
3. Key themes discussed
4. Session summary focusing on therapeutic progress
5. Recommended focus for next session
6. Context statement for next session (what therapist should remember)

Format as JSON with the following structure:
{
  "breakthroughs": [
    {
      "type": "emotional_release|insight|pattern_recognition|vulnerability_moment|empathy_breakthrough",
      "description": "detailed description",
      "intensity": 0.8,
      "timestamp": "approximate time in session",
      "context": "surrounding conversation",
      "themes": ["theme1", "theme2"],
      "confidence": 0.9
    }
  ],
  "emotionalJourney": [
    {
      "timestamp": "early/mid/late session",
      "emotions": [
        {
          "type": "emotion name",
          "intensity": 0.7,
          "description": "how it manifested"
        }
      ],
      "overallValence": 0.2,
      "arousal": 0.6
    }
  ],
  "keyThemes": ["theme1", "theme2", "theme3"],
  "sessionSummary": "comprehensive summary of therapeutic progress",
  "nextSessionFocus": "what to focus on next time",
  "contextForNext": "Hi [client], last session we explored..."
}`;

    try {
      const completion = await this.openai.chat.completions.create({
        model: "gpt-4o-mini", // Cost-effective for analysis tasks
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        response_format: { type: "json_object" },
        temperature: 0.3, // Lower temperature for consistent analysis
        max_tokens: 2000
      });

      const analysisText = completion.choices[0]?.message?.content;
      if (!analysisText) {
        throw new Error('No analysis returned from OpenAI');
      }

      return JSON.parse(analysisText) as TranscriptAnalysis;

    } catch (error) {
      console.error('Error in AI analysis:', error);
      
      // Fallback analysis
      return {
        breakthroughs: [],
        emotionalJourney: [{
          timestamp: 'session_average',
          emotions: [{ type: 'neutral', intensity: 0.5, description: 'baseline emotional state' }],
          overallValence: 0,
          arousal: 0.3
        }],
        keyThemes: ['general_discussion'],
        sessionSummary: 'Session completed - analysis unavailable due to AI processing error',
        nextSessionFocus: 'Continue previous session themes',
        contextForNext: 'In our last session, we had a productive conversation about your ongoing concerns.'
      };
    }
  }

  /**
   * Store breakthrough moments in database
   */
  private async storeBreakthroughs(sessionId: string, userId: string, breakthroughs: TherapeuticBreakthrough[]): Promise<void> {
    for (const breakthrough of breakthroughs) {
      await prisma.therapeuticBreakthrough.create({
        data: {
          sessionId,
          userId,
          breakthroughType: breakthrough.type,
          intensity: breakthrough.intensity,
          description: breakthrough.description,
          themes: breakthrough.themes,
          emotionalState: {
            context: breakthrough.context,
            timestamp: breakthrough.timestamp
          },
          context: breakthrough.context,
          confidence: breakthrough.confidence,
          aiGenerated: true
        }
      });
    }
  }

  /**
   * Store emotional milestones
   */
  private async storeEmotionalMilestones(sessionId: string, userId: string, emotionalJourney: EmotionalState[]): Promise<void> {
    for (const state of emotionalJourney) {
      // Create milestone for significant emotional moments
      const significantEmotions = state.emotions.filter(e => e.intensity > 0.6);
      
      for (const emotion of significantEmotions) {
        await prisma.emotionalMilestone.create({
          data: {
            userId,
            sessionId,
            milestoneType: `${emotion.type}_expression`,
            emotionType: emotion.type,
            intensity: emotion.intensity,
            description: emotion.description,
            context: `During ${state.timestamp} of session`,
            progressValue: emotion.intensity // Can be enhanced with historical comparison
          }
        });
      }
    }
  }

  /**
   * Create comprehensive session summary
   */
  private async createSessionSummary(sessionId: string, userId: string, analysis: TranscriptAnalysis): Promise<void> {
    await prisma.sessionSummary.upsert({
      where: { sessionId },
      create: {
        sessionId,
        userId,
        keyThemes: analysis.keyThemes,
        emotionalJourney: analysis.emotionalJourney,
        breakthroughMoments: analysis.breakthroughs.map(b => b.description),
        progressMarkers: [], // Can be enhanced based on analysis
        challengeAreas: [], // Can be enhanced based on analysis
        nextSessionFocus: analysis.nextSessionFocus,
        therapistNotes: `Key themes: ${analysis.keyThemes.join(', ')}. Breakthroughs: ${analysis.breakthroughs.length}`,
        contextForNextSession: analysis.contextForNext,
        processingStatus: 'completed'
      },
      update: {
        keyThemes: analysis.keyThemes,
        emotionalJourney: analysis.emotionalJourney,
        breakthroughMoments: analysis.breakthroughs.map(b => b.description),
        nextSessionFocus: analysis.nextSessionFocus,
        therapistNotes: `Key themes: ${analysis.keyThemes.join(', ')}. Breakthroughs: ${analysis.breakthroughs.length}`,
        contextForNextSession: analysis.contextForNext,
        processingStatus: 'completed',
        updatedAt: new Date()
      }
    });
  }

  /**
   * Link current session to previous sessions based on patterns
   */
  private async linkToPreviousSessions(sessionId: string, userId: string, analysis: TranscriptAnalysis): Promise<void> {
    try {
      // Find recent sessions with similar themes
      const recentSessions = await prisma.session.findMany({
        where: {
          userId,
          id: { not: sessionId },
          status: 'COMPLETED',
          completedAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
          }
        },
        include: {
          sessionSummary: true
        },
        orderBy: { completedAt: 'desc' },
        take: 5
      });

      for (const prevSession of recentSessions) {
        if (!prevSession.sessionSummary) continue;

        const prevThemes = prevSession.sessionSummary.keyThemes as string[];
        const commonThemes = analysis.keyThemes.filter(theme => 
          prevThemes.some(prevTheme => 
            prevTheme.toLowerCase().includes(theme.toLowerCase()) ||
            theme.toLowerCase().includes(prevTheme.toLowerCase())
          )
        );

        if (commonThemes.length > 0) {
          await prisma.therapeuticRelationship.create({
            data: {
              userId,
              relationshipType: 'theme_evolution',
              fromSessionId: prevSession.id,
              toSessionId: sessionId,
              connectionType: 'recurring_theme',
              strength: commonThemes.length / Math.max(analysis.keyThemes.length, prevThemes.length),
              description: `Common themes: ${commonThemes.join(', ')}`,
              evidence: { commonThemes, previousSessionDate: prevSession.completedAt }
            }
          });
        }
      }
    } catch (error) {
      console.error('Error linking to previous sessions:', error);
      // Non-critical error, continue processing
    }
  }

  /**
   * Get therapeutic context for next session
   */
  async getTherapeuticContext(userId: string, currentSessionId?: string): Promise<string> {
    try {
      const recentSummaries = await prisma.sessionSummary.findMany({
        where: {
          userId,
          ...(currentSessionId && { sessionId: { not: currentSessionId } }),
          processingStatus: 'completed'
        },
        include: {
          session: {
            select: { completedAt: true, theme: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 3
      });

      if (recentSummaries.length === 0) {
        return "This is our first session together. I'm looking forward to understanding your current situation and how I can best support you.";
      }

      let context = "Based on our previous sessions, here's what I recall:\n\n";
      
      recentSummaries.forEach((summary, index) => {
        const sessionDate = summary.session?.completedAt?.toLocaleDateString() || 'recently';
        context += `From our session on ${sessionDate}:\n`;
        context += `${summary.contextForNextSession}\n\n`;
        
        if (summary.nextSessionFocus) {
          context += `Focus area: ${summary.nextSessionFocus}\n\n`;
        }
      });

      // Get recent breakthroughs
      const recentBreakthroughs = await prisma.therapeuticBreakthrough.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 3
      });

      if (recentBreakthroughs.length > 0) {
        context += "Recent breakthroughs we've made together:\n";
        recentBreakthroughs.forEach(breakthrough => {
          context += `- ${breakthrough.description}\n`;
        });
        context += "\n";
      }

      context += "How are you feeling today, and what would you like to focus on in our session?";
      
      return context;

    } catch (error) {
      console.error('Error getting therapeutic context:', error);
      return "I'm here to support you in today's session. What's on your mind?";
    }
  }
}

// Export singleton instance
export const therapeuticInsightEngine = new TherapeuticInsightEngine();