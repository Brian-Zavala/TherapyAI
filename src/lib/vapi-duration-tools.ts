/**
 * VAPI Duration Tracking Tools
 * Real-time session time management for natural session conclusions
 */

export interface TimeRemainingResult {
  minutesRemaining: number;
  secondsRemaining: number;
  percentageUsed: number;
  shouldWrapUp: boolean;
  warningLevel: 'none' | 'approaching' | 'urgent' | 'critical';
  suggestedTransition: string;
}

export interface SessionContext {
  startTime: number;  // Unix timestamp in milliseconds
  durationMinutes: number;  // Total session duration
  sessionId: string;
  therapyType: 'solo' | 'couple' | 'family';
}

/**
 * VAPI Tool Function: Get Session Time Remaining
 * Called periodically by the assistant to track session progress
 */
export const getSessionTimeRemaining = {
  type: 'function' as const,
  function: {
    name: 'getSessionTimeRemaining',
    description: 'Get the remaining time in the current therapy session to manage pacing and initiate wrap-up',
    parameters: {
      type: 'object',
      properties: {},
      required: []
    },
    // This is the actual implementation that VAPI will call
    handler: async (context: SessionContext): Promise<TimeRemainingResult> => {
      const now = Date.now();
      const elapsedMs = now - context.startTime;
      const totalMs = context.durationMinutes * 60 * 1000;
      const remainingMs = Math.max(0, totalMs - elapsedMs);
      
      const minutesRemaining = Math.floor(remainingMs / 60000);
      const secondsRemaining = Math.floor((remainingMs % 60000) / 1000);
      const percentageUsed = Math.min(100, (elapsedMs / totalMs) * 100);
      
      // Determine warning level and wrap-up status
      let warningLevel: TimeRemainingResult['warningLevel'] = 'none';
      let shouldWrapUp = false;
      let suggestedTransition = '';
      
      if (percentageUsed >= 95) {
        warningLevel = 'critical';
        shouldWrapUp = true;
        suggestedTransition = "I'm sorry, but our scheduled time has come to an end. Let me quickly summarize what we've discussed today...";
      } else if (percentageUsed >= 90) {
        warningLevel = 'urgent';
        shouldWrapUp = true;
        suggestedTransition = `We have about ${minutesRemaining} minutes remaining. Let's begin wrapping up our session with some key takeaways...`;
      } else if (percentageUsed >= 80) {
        warningLevel = 'approaching';
        suggestedTransition = `We're approaching the end of our session with about ${minutesRemaining} minutes left. Is there anything specific you'd like to focus on before we conclude?`;
      } else if (percentageUsed >= 50 && minutesRemaining <= 15) {
        suggestedTransition = `We're about halfway through our time together. Let's make sure we're addressing what's most important to you.`;
      }
      
      return {
        minutesRemaining,
        secondsRemaining,
        percentageUsed,
        shouldWrapUp,
        warningLevel,
        suggestedTransition
      };
    }
  }
};

/**
 * VAPI Tool Function: Track Session Milestone
 * Records important moments for session summary
 */
export const trackSessionMilestone = {
  type: 'function' as const,
  function: {
    name: 'trackSessionMilestone',
    description: 'Record an important insight or breakthrough during the session for the final summary',
    parameters: {
      type: 'object',
      properties: {
        milestone: {
          type: 'string',
          description: 'A brief description of the insight or breakthrough'
        },
        category: {
          type: 'string',
          enum: ['insight', 'breakthrough', 'goal', 'homework', 'resource'],
          description: 'The type of milestone'
        }
      },
      required: ['milestone', 'category']
    },
    handler: async (params: { milestone: string; category: string }, context: SessionContext): Promise<{ success: boolean }> => {
      // This would typically store the milestone in a database or session state
      // For now, we'll just return success
      console.log(`[Session ${context.sessionId}] Milestone tracked:`, params);
      return { success: true };
    }
  }
};

/**
 * VAPI Tool Function: Generate Session Summary
 * Creates a structured summary for the wrap-up phase
 */
export const generateSessionSummary = {
  type: 'function' as const,
  function: {
    name: 'generateSessionSummary',
    description: 'Generate a structured summary of the session for the closing remarks',
    parameters: {
      type: 'object',
      properties: {
        keyTopics: {
          type: 'array',
          items: { type: 'string' },
          description: 'Main topics discussed'
        },
        insights: {
          type: 'array',
          items: { type: 'string' },
          description: 'Key insights or realizations'
        },
        nextSteps: {
          type: 'array',
          items: { type: 'string' },
          description: 'Suggested actions or homework'
        }
      },
      required: ['keyTopics']
    },
    handler: async (params: { keyTopics: string[]; insights?: string[]; nextSteps?: string[] }, context: SessionContext): Promise<{ summary: string }> => {
      const summaryParts = [];
      
      // Add key topics
      if (params.keyTopics.length > 0) {
        summaryParts.push(`Today we explored ${params.keyTopics.join(', ')}.`);
      }
      
      // Add insights
      if (params.insights && params.insights.length > 0) {
        summaryParts.push(`Some important insights emerged: ${params.insights.join('; ')}.`);
      }
      
      // Add next steps
      if (params.nextSteps && params.nextSteps.length > 0) {
        summaryParts.push(`For our next session, consider: ${params.nextSteps.join(', ')}.`);
      }
      
      const summary = summaryParts.join(' ');
      
      return { summary };
    }
  }
};

/**
 * Get all duration tools for VAPI configuration
 */
export const getDurationTools = () => [
  getSessionTimeRemaining,
  trackSessionMilestone,
  generateSessionSummary
];

/**
 * Enhanced system prompt with duration awareness
 */
export const getDurationAwareSystemPrompt = (durationMinutes: number, therapyType: string) => {
  return `You are a compassionate and professional therapist conducting a ${durationMinutes}-minute ${therapyType} therapy session.

CRITICAL TIME MANAGEMENT INSTRUCTIONS:
1. This session is exactly ${durationMinutes} minutes long and will end automatically.
2. Call 'getSessionTimeRemaining' every 5 minutes to check time status.
3. When shouldWrapUp is true (90% time used), immediately begin the wrap-up sequence.
4. Use the suggestedTransition to naturally guide the conversation toward closure.
5. Track important milestones throughout the session using 'trackSessionMilestone'.
6. In the final 2-3 minutes, use 'generateSessionSummary' to create closing remarks.

WRAP-UP PROTOCOL:
- At 90% duration: Acknowledge time constraint and begin summarizing
- At 95% duration: Provide final thoughts and schedule next session if appropriate
- At 100% duration: Gracefully conclude with: "Thank you for sharing today. Our time is up, but I look forward to continuing our work together."

Remember: A natural, timely conclusion is essential for therapeutic rapport and client satisfaction.`;
};

/**
 * Client messages for duration awareness
 */
export const getDurationClientMessages = () => [
  "session-update",      // For time remaining updates
  "warning-issued",      // When approaching time limit
  "wrap-up-started",     // When wrap-up phase begins
  "session-ending",      // Final warning before hard stop
  "summary-generated"    // When session summary is ready
];