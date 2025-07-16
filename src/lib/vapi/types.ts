/**
 * VAPI Type Definitions
 */

export interface VAPIMessage {
  role: 'user' | 'assistant' | 'system' | 'function';
  content: string;
  timestamp?: string;
  metadata?: Record<string, any>;
}

export interface VAPIEndOfCallReport {
  id: string;
  sessionId: string;
  callId: string;
  duration: number;
  messages: VAPIMessage[];
  transcript?: string;
  recordingUrl?: string;
  summary?: string;
  metadata?: Record<string, any>;
  startedAt: string;
  endedAt: string;
  endedReason?: string;
  cost?: number;
  call: {
    id: string;
    metadata?: {
      sessionId?: string;
      [key: string]: any;
    };
  };
}

export interface VAPIWebhookPayload {
  type: 'end-of-call-report' | 'status-update' | 'transcript-ready' | 'error';
  message: VAPIEndOfCallReport | any;
  timestamp: string;
}

export interface VAPITranscriptChunk {
  id: string;
  sessionId: string;
  messages: VAPIMessage[];
  sequenceNumber: number;
  timestamp: string;
}