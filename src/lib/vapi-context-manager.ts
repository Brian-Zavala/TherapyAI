// @ts-nocheck
/**
 * VAPI Context Manager for Pre-Session Context Injection
 * Integrates therapeutic continuity with VAPI's real-time functions
 */

import { therapeuticInsightEngine } from './therapeutic-insight-engine';
import { prisma } from './prisma-optimized';

interface VapiContextConfig {
  sessionId: string;
  userId: string;
  assistantId: string;
  therapyType: 'couple' | 'family' | 'solo';
}

interface VapiToolFunction {
  name: string;
  description: string;
  parameters: {
    type: string;
    properties: Record<string, any>;
    required?: string[];
  };
}

export class VapiContextManager {
  
  /**
   * Generate enhanced assistant configuration with therapeutic context
   */
  async createContextualAssistant(config: VapiContextConfig): Promise<any> {
    const therapeuticContext = await therapeuticInsightEngine.getTherapeuticContext(
      config.userId, 
      config.sessionId
    );

    const recentBreakthroughs = await this.getRecentBreakthroughs(config.userId);
    const emotionalPatterns = await this.getEmotionalPatterns(config.userId);
    
    const baseAssistantConfig = {
      transcriber: {
        provider: 'deepgram',
        model: 'nova-2',
        language: 'en-US',
        smartFormat: true,
        keywords: this.getTherapyKeywords(config.therapyType),
      },
      model: {
        provider: 'anthropic',
        model: 'claude-3-5-sonnet-20241022',
        tools: await this.generateContextualTools(config),
        systemMessage: await this.generateSystemMessage(config, therapeuticContext, recentBreakthroughs, emotionalPatterns),
        maxTokens: 4000,
        temperature: 0.7,
      },
      voice: {
        provider: '11labs',
        voiceId: 'sarah', // Warm, professional therapy voice
        stability: 0.8,
        similarityBoost: 0.7,
        style: 0.3, // Slightly more expressive for therapy
        useSpeakerBoost: true,
      },
      firstMessage: await this.generateFirstMessage(therapeuticContext),
      maxDurationSeconds: 3600, // 1 hour max
      silenceTimeoutSeconds: 30,
      responseDelaySeconds: 0.5,
      backgroundSound: 'off',
      recordingEnabled: true,
      hipaaEnabled: false, // Note: Currently not HIPAA compliant
    };

    return baseAssistantConfig;
  }

  /**
   * Generate contextual system message with therapeutic continuity
   */
  private async generateSystemMessage(
    config: VapiContextConfig, 
    therapeuticContext: string,
    recentBreakthroughs: any[],
    emotionalPatterns: any[]
  ): Promise<string> {
    const userProfile = await prisma.user.findUnique({
      where: { id: config.userId },
      include: { profile: true }
    });

    const basePersonality = `You are Dr. Sarah, an experienced and empathetic therapist specializing in ${config.therapyType} therapy. 
You are warm, professional, and skilled at creating safe spaces for emotional exploration.

Your therapeutic approach:
- Use active listening and reflective responses
- Ask open-ended questions that encourage deeper exploration
- Validate emotions while gently challenging unhelpful patterns
- Maintain professional boundaries while being genuinely caring
- Use evidence-based techniques from CBT, DBT, and humanistic therapy`;

    let contextualMessage = basePersonality;

    // Add session continuity context
    if (therapeuticContext.length > 200) {
      contextualMessage += `\n\nTHERAPEUTIC CONTEXT FROM PREVIOUS SESSIONS:
${therapeuticContext}

Use this context naturally in conversation - don't dump all the information at once, but reference relevant parts as the conversation flows.`;
    }

    // Add breakthrough awareness
    if (recentBreakthroughs.length > 0) {
      contextualMessage += `\n\nRECENT THERAPEUTIC BREAKTHROUGHS:
${recentBreakthroughs.map(b => `- ${b.description} (${b.breakthroughType})`).join('\n')}

Be aware of these breakthroughs and how they might connect to today's discussion.`;
    }

    // Add emotional pattern awareness
    if (emotionalPatterns.length > 0) {
      contextualMessage += `\n\nEMOTIONAL PATTERNS TO TRACK:
${emotionalPatterns.map(p => `- ${p.emotionType}: Typically appears ${p.description}`).join('\n')}

Watch for these patterns and gently explore them when appropriate.`;
    }

    // Add user-specific information
    if (userProfile?.profile) {
      const profile = userProfile.profile;
      contextualMessage += `\n\nCLIENT PROFILE:
- Communication style: ${profile.communicationStyle || 'Not specified'}
- Current concerns: ${JSON.stringify(profile.currentConcerns) || 'Not specified'}
- Relationship status: ${profile.relationshipStatus || 'Not specified'}`;

      if (profile.additionalNotes) {
        contextualMessage += `\n- Additional context: ${profile.additionalNotes}`;
      }
    }

    contextualMessage += `\n\nSESSION GOALS:
1. Create a safe, non-judgmental space for exploration
2. Help the client process their current concerns
3. Build on previous therapeutic progress
4. Identify any breakthrough moments or insights
5. End with clear next steps or reflections

Remember to use the available tools to track important moments and insights throughout the session.`;

    return contextualMessage;
  }

  /**
   * Generate contextual tools for real-time tracking
   */
  private async generateContextualTools(config: VapiContextConfig): Promise<VapiToolFunction[]> {
    return [
      {
        name: 'track_breakthrough_moment',
        description: 'Call this when you identify a significant therapeutic breakthrough or insight',
        parameters: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              enum: ['emotional_release', 'insight', 'pattern_recognition', 'vulnerability_moment', 'empathy_breakthrough'],
              description: 'Type of breakthrough identified'
            },
            description: {
              type: 'string',
              description: 'Detailed description of the breakthrough moment'
            },
            intensity: {
              type: 'number',
              minimum: 0,
              maximum: 1,
              description: 'Intensity of the breakthrough (0-1 scale)'
            },
            context: {
              type: 'string',
              description: 'What was being discussed when this breakthrough occurred'
            }
          },
          required: ['type', 'description', 'intensity', 'context']
        }
      },
      {
        name: 'track_emotional_state',
        description: 'Call this to track significant emotional shifts during the session',
        parameters: {
          type: 'object',
          properties: {
            emotions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  type: { type: 'string', description: 'Emotion type (e.g., anger, sadness, joy)' },
                  intensity: { type: 'number', minimum: 0, maximum: 1 },
                  description: { type: 'string', description: 'How the emotion is manifesting' }
                }
              }
            },
            overall_valence: {
              type: 'number',
              minimum: -1,
              maximum: 1,
              description: 'Overall emotional valence (-1 negative to 1 positive)'
            },
            context: {
              type: 'string',
              description: 'What triggered this emotional state'
            }
          },
          required: ['emotions', 'overall_valence', 'context']
        }
      },
      {
        name: 'identify_recurring_theme',
        description: 'Call this when you notice a theme that connects to previous sessions',
        parameters: {
          type: 'object',
          properties: {
            theme: {
              type: 'string',
              description: 'The recurring theme identified'
            },
            connection_to_past: {
              type: 'string',
              description: 'How this connects to previous sessions'
            },
            significance: {
              type: 'number',
              minimum: 0,
              maximum: 1,
              description: 'How significant this connection is (0-1)'
            }
          },
          required: ['theme', 'connection_to_past', 'significance']
        }
      },
      {
        name: 'set_next_session_focus',
        description: 'Call this near the end of session to set focus for next time',
        parameters: {
          type: 'object',
          properties: {
            focus_area: {
              type: 'string',
              description: 'Main area to focus on in next session'
            },
            specific_goals: {
              type: 'array',
              items: { type: 'string' },
              description: 'Specific goals or topics for next session'
            },
            context_for_therapist: {
              type: 'string',
              description: 'Context information for next session preparation'
            }
          },
          required: ['focus_area', 'context_for_therapist']
        }
      }
    ];
  }

  /**
   * Generate personalized first message with context
   */
  private async generateFirstMessage(therapeuticContext: string): Promise<string> {
    if (therapeuticContext.includes('first session')) {
      return "Hello! I'm Dr. Sarah, and I'm glad you're here today. This is a safe space where you can share whatever is on your mind. What brought you to therapy, and how are you feeling right now?";
    }

    // Extract the greeting portion of the therapeutic context
    const contextLines = therapeuticContext.split('\n');
    const greetingContext = contextLines.find(line => 
      line.includes('Hi ') || line.includes('Hello') || line.includes('session on')
    );

    if (greetingContext && greetingContext.length < 200) {
      return greetingContext;
    }

    return "Hello again! It's good to see you. Based on where we left off last time, I've been thinking about our previous conversation. How have you been since we last spoke?";
  }

  /**
   * Get therapy-specific keywords for improved transcription
   */
  private getTherapyKeywords(therapyType: string): string[] {
    const baseKeywords = [
      'therapy', 'therapeutic', 'feelings', 'emotions', 'anxiety', 'depression',
      'relationship', 'communication', 'boundaries', 'trauma', 'healing',
      'mindfulness', 'coping', 'strategies', 'breakthrough', 'insight'
    ];

    const typeSpecific = {
      couple: ['partner', 'marriage', 'intimacy', 'conflict', 'compromise', 'connection'],
      family: ['family', 'children', 'parenting', 'dynamics', 'siblings', 'household'],
      solo: ['self-care', 'identity', 'personal', 'individual', 'goals', 'growth']
    };

    return [...baseKeywords, ...(typeSpecific[therapyType as keyof typeof typeSpecific] || [])];
  }

  /**
   * Get recent breakthroughs for context awareness
   */
  private async getRecentBreakthroughs(userId: string): Promise<any[]> {
    return await prisma.therapeuticBreakthrough.findMany({
      where: { 
        userId,
        createdAt: {
          gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) // Last 14 days
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 5
    });
  }

  /**
   * Get emotional patterns for awareness
   */
  private async getEmotionalPatterns(userId: string): Promise<any[]> {
    return await prisma.emotionalMilestone.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 10
    });
  }

  /**
   * Process real-time tool calls during session
   */
  async processToolCall(
    sessionId: string,
    userId: string,
    toolName: string,
    parameters: any
  ): Promise<{ success: boolean; message: string }> {
    try {
      switch (toolName) {
        case 'track_breakthrough_moment':
          await prisma.therapeuticBreakthrough.create({
            data: {
              sessionId,
              userId,
              breakthroughType: parameters.type,
              description: parameters.description,
              intensity: parameters.intensity,
              context: parameters.context,
              themes: [],
              emotionalState: { realTime: true },
              confidence: 0.9,
              aiGenerated: true
            }
          });
          return { 
            success: true, 
            message: "I've noted that breakthrough moment. This seems like an important realization for you." 
          };

        case 'track_emotional_state':
          for (const emotion of parameters.emotions) {
            await prisma.emotionalMilestone.create({
              data: {
                userId,
                sessionId,
                milestoneType: `${emotion.type}_expression`,
                emotionType: emotion.type,
                intensity: emotion.intensity,
                description: emotion.description,
                context: parameters.context,
                progressValue: emotion.intensity
              }
            });
          }
          return {
            success: true,
            message: "I'm tracking how you're feeling right now. These emotions are valid and important."
          };

        case 'identify_recurring_theme':
          // Create therapeutic relationship link
          const recentSessions = await prisma.session.findMany({
            where: { 
              userId,
              status: 'COMPLETED',
              id: { not: sessionId }
            },
            orderBy: { completedAt: 'desc' },
            take: 3
          });

          if (recentSessions.length > 0) {
            await prisma.therapeuticRelationship.create({
              data: {
                userId,
                relationshipType: 'theme_evolution',
                fromSessionId: recentSessions[0].id,
                toSessionId: sessionId,
                connectionType: 'recurring_theme',
                strength: parameters.significance,
                description: parameters.theme,
                evidence: { 
                  connection: parameters.connection_to_past,
                  realTimeIdentified: true 
                }
              }
            });
          }

          return {
            success: true,
            message: "I notice this theme connecting to what we've discussed before. That's a valuable pattern to explore."
          };

        case 'set_next_session_focus':
          await prisma.sessionSummary.upsert({
            where: { sessionId },
            create: {
              sessionId,
              userId,
              nextSessionFocus: parameters.focus_area,
              therapistNotes: parameters.context_for_therapist,
              keyThemes: parameters.specific_goals || [],
              emotionalJourney: [],
              breakthroughMoments: [],
              progressMarkers: [],
              challengeAreas: [],
              processingStatus: 'partial'
            },
            update: {
              nextSessionFocus: parameters.focus_area,
              therapistNotes: parameters.context_for_therapist,
              updatedAt: new Date()
            }
          });

          return {
            success: true,
            message: "I've made note of what we should focus on next time. This gives us a clear direction to continue our work together."
          };

        default:
          return {
            success: false,
            message: "I'm not familiar with that tool, but let's continue our conversation."
          };
      }
    } catch (error) {
      console.error(`Error processing tool call ${toolName}:`, error);
      return {
        success: false,
        message: "I've made a note of that important moment. Let's continue exploring this together."
      };
    }
  }
}

// Export singleton instance
export const vapiContextManager = new VapiContextManager();