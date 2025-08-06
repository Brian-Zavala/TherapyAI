/**
 * Therapy Concerns Synchronization Types
 * Complete type definitions for concerns data flow across the system
 */

import { TherapyConcern } from '@/data/therapy-concerns';

// Enhanced concern with user context
export interface UserConcern extends TherapyConcern {
  priority: 'high' | 'medium' | 'low';
  selectedAt: Date;
  lastDiscussed?: Date;
  progressScore: number; // 0-100
  insights: ConcernInsight[];
  metadata: {
    source: 'onboarding' | 'profile' | 'session' | 'ai_suggested';
    confidence: number; // 0-1
    sessionCount: number;
  };
}

// Insights extracted from sessions
export interface ConcernInsight {
  sessionId: string;
  extractedAt: Date;
  type: 'progress' | 'breakthrough' | 'setback' | 'pattern' | 'goal_achieved';
  description: string;
  confidence: number;
  metadata: {
    transcriptSegments: string[];
    aiModel: string;
    processingVersion: string;
  };
}

// Session-specific concerns context
export interface SessionConcernsContext {
  sessionId: string;
  primaryConcerns: string[]; // Top 3-5 concerns for this session
  secondaryConcerns: string[];
  focusAreas: string[];
  expectedOutcomes: string[];
  contextualNotes: string;
}

// Real-time synchronization events
export interface ConcernsSyncEvent {
  eventId: string;
  userId: string;
  timestamp: Date;
  type: 'concerns_updated' | 'insight_extracted' | 'progress_scored' | 'priority_changed';
  data: {
    concernIds: string[];
    changes: Record<string, any>;
    source: string;
    sessionId?: string;
  };
}

// API request/response types
export interface UpdateConcernsRequest {
  concerns: Array<{
    id: string;
    priority: 'high' | 'medium' | 'low';
    notes?: string;
  }>;
  source: 'onboarding' | 'profile' | 'session';
  sessionId?: string;
}

export interface ConcernsProgressResponse {
  concerns: Array<{
    id: string;
    label: string;
    progressScore: number;
    recentInsights: ConcernInsight[];
    trend: 'improving' | 'stable' | 'declining';
    nextSteps: string[];
  }>;
  overallProgress: {
    score: number;
    trend: 'improving' | 'stable' | 'declining';
    milestones: Array<{
      description: string;
      achievedAt?: Date;
      targetDate?: Date;
    }>;
  };
}

// VAPI integration types
export interface VAPISessionContext {
  sessionId: string;
  userId: string;
  concerns: {
    primary: UserConcern[];
    secondary: UserConcern[];
    context: string; // Natural language summary
  };
  history: {
    recentInsights: ConcernInsight[];
    progressHighlights: string[];
    continuationPoints: string[];
  };
}

// Webhook processing types
export interface ConcernsWebhookPayload {
  sessionId: string;
  extractedConcerns: Array<{
    concernId: string;
    confidence: number;
    evidence: string[];
    progressIndicators: Array<{
      type: 'positive' | 'negative' | 'neutral';
      description: string;
      timestamp: string;
    }>;
  }>;
  suggestedActions: Array<{
    concernId: string;
    action: 'increase_focus' | 'decrease_priority' | 'add_to_profile' | 'schedule_followup';
    rationale: string;
  }>;
}