import { IncrementalMetrics } from '@/lib/real-time-metrics-optimized';
import { SessionDuration } from '@/lib/therapy-session/constants';
import Vapi from '@vapi-ai/web';

// Extended VAPI type with custom properties
export type ExtendedVapi = Vapi & {
  _sessionId?: string
  _customData?: {
    systemPrompt?: string
    firstMessage?: string
    userName?: string
    therapyType?: string
  }
  setMuted?: (muted: boolean) => void
  isMuted?: () => boolean
}

// Therapy type definition
export type TherapyType = 'couple' | 'solo' | 'family';

// Assistant configuration type
export interface AssistantConfigType {
  id: string | undefined;
  name: string;
  type: string;
  model: {
    provider: string;
    model: string;
    temperature: number;
    messages: Array<{
      role: string;
      content: string;
    }>;
  };
  voice: {
    provider: string;
    voiceId: string | undefined;
  };
  firstMessage: string;
}

// Props for the main TherapyButton component
export interface TherapyButtonProps {
  userId: string;
  assistantConfig?: AssistantConfigType;
  therapyType?: string;
  shouldAutoRestart?: boolean;
}

// Family member type
export interface FamilyMember {
  name: string;
  age: number;
  relation: string;
}

// Session state management
export interface TherapySessionState {
  isLoading: boolean;
  showDurationModal: boolean;
  showFamilySelectionModal: boolean;
  selectedSessionDuration: SessionDuration;
  familyMembers: FamilyMember[];
  selectedFamilyMembers: FamilyMember[];
  isCallActive: boolean;
  sessionId: string | null;
  transcriptChunks: string[];
  errorMessage: string | null;
  audioLevel: number;
  isMuted: boolean;
  loadingMessageIndex: number;
  sessionStartTime: Date | null;
  sessionRecovered: boolean;
  isEndingSession: boolean;
  vapiCallStartTime: Date | null;
  vapiCallDuration: number;
  
  // Pause functionality state
  isSessionPaused: boolean;
  isResuming: boolean;
  pauseStartTime: Date | null;
  totalPausedTimeSeconds: number;
  
  // Metrics state
  metricsCalculator: unknown | null; // RealTimeMetricsCalculator instance
  currentMetrics: IncrementalMetrics | null;
  
  // Conversation timing
  conversationTimeSeconds: number;
  conversationStartTime: Date | null;
}

// Transcript buffer state
export interface TranscriptBufferState {
  assistantBuffer: string;
  userBuffer: string;
  isProcessingAssistant: boolean;
  isProcessingUser: boolean;
}

// Session data from database
export interface SessionData {
  id: string;
  userId: string;
  startTime: string;
  duration: number;
  status: string;
  assistantId?: string;
  isPaused?: boolean;
  pauseStartTime?: string | null;
  totalPausedTime?: number;
  conversationTime?: number;
  therapyType?: string;
}

// Session recovery data
export interface SessionRecoveryData {
  sessionId: string;
  originalStart: string;
  recoveredAt: string;
  conversationTimeMinutes: number;
  conversationTimeSeconds: number;
  remainingMinutes: number;
  autoRestarted: boolean;
  sessionData: SessionData;
  pauseInfo?: {
    isPaused: boolean;
    pauseStartTime: string | null;
    totalPausedTime: number;
  };
}

// Transcript entry for storage
export interface TranscriptEntry {
  speaker: 'user' | 'assistant' | 'therapist' | 'system';
  text: string;
  timestamp: string;
  isFinal: boolean;
  messageType?: string;
  wordCount?: number;
  characterCount?: number;
}

// Conversation metadata
export interface ConversationMetadata {
  hash: string;
  messageCount: number;
  lastMessageContent: string;
  timestamp: number;
}

// WebSocket message types
export interface MetricsUpdateMessage {
  type: 'metrics_update';
  userId: string;
  sessionId: string;
  metrics: IncrementalMetrics;
  timestamp: string;
}

export interface SessionUpdateMessage {
  type: 'session_update';
  userId: string;
  sessionId: string;
  status: string;
  data?: unknown;
  timestamp: string;
}

// VAPI state management
export interface VapiState {
  isActive: boolean;
  isLoading: boolean;
  isMuted: boolean;
  error: string | null;
  audioLevel: number;
}

// Session completion data
export interface SessionCompletionData {
  actualDurationMinutes: number;
  totalConversationMinutes: number;
  totalPausedMinutes: number;
  billableMinutes: number;
  transcriptCount: number;
  completedAt: string;
  completionNotes?: string;
}

// User profile type (from API)
export interface UserProfile {
  id: string;
  name?: string;
  email: string;
  age?: number;
  pronouns?: string;
  relationshipStatus?: string;
  partnerName?: string;
  partnerAge?: number;
  hasFamily?: 'yes' | 'no';
  familyMemberCount?: number;
  currentConcerns?: string;
  communicationStyle?: string;
  sessionHistory?: string;
  familyMembers?: FamilyMember[];
}