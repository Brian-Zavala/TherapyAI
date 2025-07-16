import { z } from 'zod'

// ========================================
// BASE SCHEMAS
// ========================================

const BaseMessageSchema = z.object({
  type: z.string(),
  timestamp: z.string().optional(),
})

// ========================================
// CALL METADATA SCHEMAS
// ========================================

const CallMetadataSchema = z.object({
  sessionId: z.string().optional(),
  userId: z.string().optional(),
  sessionType: z.enum(['couple', 'family', 'individual']).optional(),
  assistantVersion: z.string().optional(),
}).passthrough() // Allow additional fields

const CustomerSchema = z.object({
  number: z.string().optional(),
  name: z.string().optional(),
  email: z.string().optional(),
}).passthrough()

const CallSchema = z.object({
  id: z.string(),
  assistantId: z.string().optional(),
  customer: CustomerSchema.optional(),
  phoneNumber: z.string().optional(),
  startedAt: z.string().optional(),
  endedAt: z.string().optional(),
  duration: z.number().optional(),
  cost: z.number().optional(),
  recordingUrl: z.string().optional(),
  metadata: CallMetadataSchema.optional(),
}).passthrough()

// ========================================
// MESSAGE TYPE SCHEMAS
// ========================================

// Transcript messages
export const TranscriptMessageSchema = BaseMessageSchema.extend({
  type: z.literal('transcript'),
  role: z.enum(['user', 'assistant']),
  transcript: z.string(),
  transcriptType: z.enum(['partial', 'final']),
  timestamp: z.string(),
})

// Model output messages
export const ModelOutputMessageSchema = BaseMessageSchema.extend({
  type: z.literal('model-output'),
  output: z.string(),
  role: z.literal('assistant'),
  timestamp: z.string(),
  isFinal: z.boolean().optional(),
})

// Conversation update messages
export const ConversationUpdateMessageSchema = BaseMessageSchema.extend({
  type: z.literal('conversation-update'),
  conversation: z.array(z.object({
    role: z.string(),
    content: z.string(),
    timestamp: z.string(),
  })),
})

// Speech update messages
export const SpeechUpdateMessageSchema = BaseMessageSchema.extend({
  type: z.literal('speech-update'),
  status: z.enum(['started', 'stopped']),
  role: z.enum(['user', 'assistant']),
  timestamp: z.string(),
})

// Status update messages
export const StatusUpdateMessageSchema = BaseMessageSchema.extend({
  type: z.literal('status-update'),
  status: z.enum(['connecting', 'connected', 'disconnected', 'error']),
  message: z.string().optional(),
})

// Function call messages
export const FunctionCallMessageSchema = BaseMessageSchema.extend({
  type: z.literal('function-call'),
  functionCall: z.object({
    name: z.string(),
    parameters: z.record(z.any()),
  }),
  result: z.any().optional(),
})

// Hang messages
export const HangMessageSchema = BaseMessageSchema.extend({
  type: z.literal('hang'),
  reason: z.string().optional(),
})

// End of call report
export const EndOfCallReportSchema = BaseMessageSchema.extend({
  type: z.literal('end-of-call-report'),
  call: z.object({
    id: z.string(),
    assistantId: z.string(),
    startedAt: z.string(),
    endedAt: z.string(),
    duration: z.number(),
    cost: z.number(),
    recordingUrl: z.string().optional(),
    messages: z.array(z.object({
      role: z.string(),
      message: z.string(),
      timestamp: z.string(),
    })).optional(),
    transcript: z.string().optional(),
    metadata: CallMetadataSchema.optional(),
  }).passthrough(),
})

// Error messages
export const ErrorMessageSchema = BaseMessageSchema.extend({
  type: z.literal('error'),
  error: z.object({
    message: z.string(),
    code: z.string().optional(),
    details: z.any().optional(),
  }),
})

// Union schema for all message types
export const VapiMessageSchema = z.discriminatedUnion('type', [
  TranscriptMessageSchema,
  ModelOutputMessageSchema,
  ConversationUpdateMessageSchema,
  SpeechUpdateMessageSchema,
  StatusUpdateMessageSchema,
  FunctionCallMessageSchema,
  HangMessageSchema,
  EndOfCallReportSchema,
  ErrorMessageSchema,
])

// Webhook payload schema
export const VapiWebhookPayloadSchema = z.object({
  message: VapiMessageSchema,
  call: CallSchema.optional(),
})

// ========================================
// TYPESCRIPT TYPES (inferred from schemas)
// ========================================

export type TranscriptMessage = z.infer<typeof TranscriptMessageSchema>
export type ModelOutputMessage = z.infer<typeof ModelOutputMessageSchema>
export type ConversationUpdateMessage = z.infer<typeof ConversationUpdateMessageSchema>
export type SpeechUpdateMessage = z.infer<typeof SpeechUpdateMessageSchema>
export type StatusUpdateMessage = z.infer<typeof StatusUpdateMessageSchema>
export type FunctionCallMessage = z.infer<typeof FunctionCallMessageSchema>
export type HangMessage = z.infer<typeof HangMessageSchema>
export type EndOfCallReport = z.infer<typeof EndOfCallReportSchema>
export type ErrorMessage = z.infer<typeof ErrorMessageSchema>
export type VapiMessage = z.infer<typeof VapiMessageSchema>
export type VapiWebhookPayload = z.infer<typeof VapiWebhookPayloadSchema>
export type CallMetadata = z.infer<typeof CallMetadataSchema>

// ========================================
// TYPE GUARDS
// ========================================

export function isTranscriptMessage(message: VapiMessage): message is TranscriptMessage {
  return message.type === 'transcript'
}

export function isModelOutputMessage(message: VapiMessage): message is ModelOutputMessage {
  return message.type === 'model-output'
}

export function isConversationUpdateMessage(message: VapiMessage): message is ConversationUpdateMessage {
  return message.type === 'conversation-update'
}

export function isSpeechUpdateMessage(message: VapiMessage): message is SpeechUpdateMessage {
  return message.type === 'speech-update'
}

export function isStatusUpdateMessage(message: VapiMessage): message is StatusUpdateMessage {
  return message.type === 'status-update'
}

export function isFunctionCallMessage(message: VapiMessage): message is FunctionCallMessage {
  return message.type === 'function-call'
}

export function isHangMessage(message: VapiMessage): message is HangMessage {
  return message.type === 'hang'
}

export function isEndOfCallReport(message: VapiMessage): message is EndOfCallReport {
  return message.type === 'end-of-call-report'
}

export function isErrorMessage(message: VapiMessage): message is ErrorMessage {
  return message.type === 'error'
}

// ========================================
// VALIDATION HELPERS
// ========================================

export function validateWebhookPayload(payload: unknown): VapiWebhookPayload {
  return VapiWebhookPayloadSchema.parse(payload)
}

export function safeValidateWebhookPayload(payload: unknown): 
  { success: true; data: VapiWebhookPayload } | 
  { success: false; error: z.ZodError } {
  const result = VapiWebhookPayloadSchema.safeParse(payload)
  if (result.success) {
    return { success: true, data: result.data }
  } else {
    return { success: false, error: result.error }
  }
}

// ========================================
// WEBHOOK EVENT TYPES FOR DATABASE
// ========================================

export const WebhookEventSchema = z.object({
  id: z.string(),
  webhookId: z.string(), // VAPI's unique webhook ID for idempotency
  messageType: z.string(),
  callId: z.string().optional(),
  sessionId: z.string().optional(),
  payload: z.any(), // Store full payload as JSON
  processedAt: z.date().optional(),
  status: z.enum(['pending', 'processing', 'completed', 'failed']),
  error: z.string().optional(),
  retryCount: z.number().default(0),
  createdAt: z.date(),
})

export type WebhookEvent = z.infer<typeof WebhookEventSchema>

// ========================================
// UTILITY FUNCTIONS
// ========================================

export function extractSessionId(payload: VapiWebhookPayload): string | null {
  // Try multiple locations for session ID
  const metadata = payload.message.type === 'end-of-call-report' 
    ? payload.message.call.metadata 
    : payload.call?.metadata
    
  return metadata?.sessionId || null
}

export function extractCallId(payload: VapiWebhookPayload): string | null {
  if (payload.message.type === 'end-of-call-report') {
    return payload.message.call.id
  }
  return payload.call?.id || null
}

export function generateWebhookId(payload: VapiWebhookPayload): string {
  // Generate a unique ID for idempotency checking
  const callId = extractCallId(payload)
  const messageType = payload.message.type
  const timestamp = payload.message.timestamp || new Date().toISOString()
  
  return `${callId || 'unknown'}-${messageType}-${timestamp}`
}

export function shouldProcessWebhook(messageType: string): boolean {
  // Define which webhook types we actually want to process
  const processableTypes = [
    'transcript',
    'end-of-call-report',
    'conversation-update',
    'hang',
    'error',
  ]
  
  return processableTypes.includes(messageType)
}

// ========================================
// LOGGING UTILITIES
// ========================================

export function formatWebhookLog(payload: VapiWebhookPayload, correlationId: string): string {
  const sessionId = extractSessionId(payload)
  const callId = extractCallId(payload)
  
  return JSON.stringify({
    correlationId,
    timestamp: new Date().toISOString(),
    messageType: payload.message.type,
    sessionId,
    callId,
    metadata: {
      ...(payload.message.type === 'end-of-call-report' ? {
        duration: payload.message.call.duration,
        cost: payload.message.call.cost,
        messageCount: payload.message.call.messages?.length || 0,
      } : {}),
    },
  })
}