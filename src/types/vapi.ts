// TypeScript interfaces for VAPI message types
// Based on VAPI SDK documentation and real message patterns

// Base message interface
export interface VapiBaseMessage {
  type: string;
  timestamp?: string;
}

// Transcript messages - real-time speech-to-text
export interface VapiTranscriptMessage extends VapiBaseMessage {
  type: 'transcript';
  role: 'user' | 'assistant';
  transcript: string;
  transcriptType: 'partial' | 'final';
  timestamp: string;
}

// Model output messages - AI assistant responses
export interface VapiModelOutputMessage extends VapiBaseMessage {
  type: 'model-output';
  output: string;
  role: 'assistant';
  timestamp: string;
  isFinal?: boolean;
}

// Conversation update messages - full conversation state
export interface VapiConversationUpdateMessage extends VapiBaseMessage {
  type: 'conversation-update';
  conversation: Array<{
    role: string;
    content: string;
    timestamp: string;
  }>;
}

// Speech update messages - real-time speech detection
export interface VapiSpeechUpdateMessage extends VapiBaseMessage {
  type: 'speech-update';
  status: 'started' | 'stopped';
  role: 'user' | 'assistant';
  timestamp: string;
}

// Call status messages
export interface VapiStatusUpdateMessage extends VapiBaseMessage {
  type: 'status-update';
  status: 'connecting' | 'connected' | 'disconnected' | 'error';
  message?: string;
}

// Function call messages - for tool usage
export interface VapiFunctionCallMessage extends VapiBaseMessage {
  type: 'function-call';
  functionCall: {
    name: string;
    parameters: Record<string, any>;
  };
  result?: any;
}

// Hang message - when call ends
export interface VapiHangMessage extends VapiBaseMessage {
  type: 'hang';
  reason?: string;
}

// End of call report - comprehensive call summary
export interface VapiEndOfCallReport extends VapiBaseMessage {
  type: 'end-of-call-report';
  call: {
    id: string;
    assistantId: string;
    startedAt: string;
    endedAt: string;
    duration: number;
    cost: number;
    recordingUrl?: string;
    messages: Array<{
      role: string;
      message: string;
      timestamp: string;
    }>;
    transcript: string;
  };
}

// Error messages
export interface VapiErrorMessage extends VapiBaseMessage {
  type: 'error';
  error: {
    message: string;
    code?: string;
    details?: any;
  };
}

// Union type for all VAPI messages
export type VapiMessage = 
  | VapiTranscriptMessage
  | VapiModelOutputMessage
  | VapiConversationUpdateMessage
  | VapiSpeechUpdateMessage
  | VapiStatusUpdateMessage
  | VapiFunctionCallMessage
  | VapiHangMessage
  | VapiEndOfCallReport
  | VapiErrorMessage;

// Type guards for message identification
export function isTranscriptMessage(message: VapiMessage): message is VapiTranscriptMessage {
  return message.type === 'transcript';
}

export function isModelOutputMessage(message: VapiMessage): message is VapiModelOutputMessage {
  return message.type === 'model-output';
}

export function isConversationUpdateMessage(message: VapiMessage): message is VapiConversationUpdateMessage {
  return message.type === 'conversation-update';
}

export function isSpeechUpdateMessage(message: VapiMessage): message is VapiSpeechUpdateMessage {
  return message.type === 'speech-update';
}

export function isStatusUpdateMessage(message: VapiMessage): message is VapiStatusUpdateMessage {
  return message.type === 'status-update';
}

export function isFunctionCallMessage(message: VapiMessage): message is VapiFunctionCallMessage {
  return message.type === 'function-call';
}

export function isHangMessage(message: VapiMessage): message is VapiHangMessage {
  return message.type === 'hang';
}

export function isEndOfCallReport(message: VapiMessage): message is VapiEndOfCallReport {
  return message.type === 'end-of-call-report';
}

export function isErrorMessage(message: VapiMessage): message is VapiErrorMessage {
  return message.type === 'error';
}

// VAPI Call configuration types
export interface VapiCallConfig {
  assistant?: {
    id?: string;
    model?: {
      provider: string;
      model: string;
      temperature?: number;
      maxTokens?: number;
    };
    voice?: {
      provider: string;
      voiceId: string;
    };
    firstMessage?: string;
    transcriber?: {
      provider: string;
      model?: string;
    };
  };
  assistantId?: string;
  maxDurationSeconds?: number;
  recordingEnabled?: boolean;
  clientMessages?: string[];
  serverMessages?: string[];
  serverUrl?: string;
  metadata?: Record<string, any>;
}

// Webhook payload types for server-side handling
export interface VapiWebhookPayload {
  message: VapiMessage;
  call?: {
    id: string;
    assistantId?: string;
    customer?: {
      number?: string;
    };
  };
}