/**
 * VAPI Message Validator - Enhanced for new schema
 * Validates and sanitizes messages before injection into VAPI conversations
 * Includes family member context and enhanced metadata support
 */

export interface VapiMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp?: number
  metadata?: {
    speakerId?: string
    familyMemberId?: string
    emotion?: string
    confidence?: number
    sessionId?: string
    [key: string]: unknown
  }
}

export interface FamilyMemberContext {
  id: string
  name: string
  relationship: string
  age?: number
  notes?: string
}

export interface SessionContext {
  sessionId: string
  sessionType: 'individual' | 'couple' | 'family'
  familyMembers: FamilyMemberContext[]
  theme?: string
  goals?: string[]
}

/**
 * Validate a single VAPI message
 */
export function validateVapiMessage(message: unknown): { valid: boolean; error?: string } {
  if (!message || typeof message !== 'object') {
    return { valid: false, error: 'Message must be an object' }
  }

  const msg = message as Record<string, unknown>

  if (!msg.role || !['user', 'assistant', 'system'].includes(msg.role as string)) {
    return { valid: false, error: 'Message must have a valid role (user, assistant, or system)' }
  }

  if (!msg.content || typeof msg.content !== 'string') {
    return { valid: false, error: 'Message must have string content' }
  }

  const content = msg.content as string
  if (content.trim().length === 0) {
    return { valid: false, error: 'Message content cannot be empty' }
  }

  // Check for excessive length that might cause issues
  if (content.length > 4000) {
    return { valid: false, error: 'Message content exceeds maximum length (4000 characters)' }
  }

  return { valid: true }
}

/**
 * Validate an array of messages for injection
 */
export function validateMessageArray(messages: unknown[]): { 
  valid: boolean
  errors: string[]
  validMessages: VapiMessage[]
} {
  if (!Array.isArray(messages)) {
    return { 
      valid: false, 
      errors: ['Messages must be an array'], 
      validMessages: [] 
    }
  }

  if (!messages.every(m => m !== null && m !== undefined)) {
    return {
      valid: false,
      errors: ['Messages array contains null or undefined values'],
      validMessages: []
    }
  }

  const errors: string[] = []
  const validMessages: VapiMessage[] = []

  messages.forEach((msg, index) => {
    const validation = validateVapiMessage(msg)
    if (validation.valid && msg && typeof msg === 'object') {
      const validMsg = msg as Record<string, unknown>
      validMessages.push({
        role: validMsg.role as 'user' | 'assistant' | 'system',
        content: (validMsg.content as string).trim(),
        timestamp: validMsg.timestamp as number | undefined,
        metadata: validMsg.metadata as Record<string, unknown> | undefined
      })
    } else {
      errors.push(`Message ${index}: ${validation.error}`)
    }
  })

  return {
    valid: errors.length === 0,
    errors,
    validMessages
  }
}

/**
 * Sanitize message content for VAPI
 * Removes or escapes problematic characters
 */
export function sanitizeMessageContent(content: string): string {
  if (!content) return ''

  // Remove control characters except newlines and tabs
  let sanitized = content.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')

  // Normalize whitespace
  sanitized = sanitized.replace(/\s+/g, ' ').trim()

  // Remove any potential script injection attempts
  sanitized = sanitized.replace(/<script[^>]*>.*?<\/script>/gi, '')

  // Limit consecutive newlines
  sanitized = sanitized.replace(/\n{3,}/g, '\n\n')

  return sanitized
}

/**
 * Format conversation history for VAPI injection
 * Ensures proper structure and validation
 */
export function formatConversationHistory(
  history: unknown[],
  options: {
    maxMessages?: number
    excludeSystem?: boolean
    sanitize?: boolean
  } = {}
): VapiMessage[] {
  const { 
    maxMessages = 50, 
    excludeSystem = false,
    sanitize = true 
  } = options

  // Validate and filter messages
  const validation = validateMessageArray(history)
  
  if (!validation.valid) {
    console.warn('Conversation history validation errors:', validation.errors)
  }

  let formattedMessages = validation.validMessages

  // Exclude system messages if requested
  if (excludeSystem) {
    formattedMessages = formattedMessages.filter(msg => msg.role !== 'system')
  }

  // Sanitize content if requested
  if (sanitize) {
    formattedMessages = formattedMessages.map(msg => ({
      ...msg,
      content: sanitizeMessageContent(msg.content)
    }))
  }

  // Limit message count from the end (keep most recent)
  if (formattedMessages.length > maxMessages) {
    formattedMessages = formattedMessages.slice(-maxMessages)
  }

  return formattedMessages
}

/**
 * Inject family member context into conversation
 * Helps AI understand family dynamics
 */
export function injectFamilyContext(
  messages: VapiMessage[],
  context: SessionContext
): VapiMessage[] {
  if (!context.familyMembers || context.familyMembers.length === 0) {
    return messages
  }

  // Create a system message with family context
  const familyContextMessage: VapiMessage = {
    role: 'system',
    content: `Session context:\n` +
      `- Session type: ${context.sessionType}\n` +
      `- Theme: ${context.theme || 'General therapy'}\n` +
      `- Family members present:\n` +
      context.familyMembers.map(member => 
        `  * ${member.name} (${member.relationship}${member.age ? ', age ' + member.age : ''})${member.notes ? ' - ' + member.notes : ''}`
      ).join('\n') +
      (context.goals && context.goals.length > 0 ? 
        `\n- Session goals:\n` + context.goals.map(goal => `  * ${goal}`).join('\n') : ''),
    timestamp: Date.now(),
    metadata: {
      sessionId: context.sessionId,
      contextType: 'family'
    }
  }

  // Insert context at the beginning, after any existing system messages
  const systemMessages = messages.filter(m => m.role === 'system')
  const otherMessages = messages.filter(m => m.role !== 'system')
  
  return [...systemMessages, familyContextMessage, ...otherMessages]
}

/**
 * Create a summary message for long conversation histories
 * Useful when full history would be too large
 */
export function createConversationSummary(
  messages: VapiMessage[],
  maxLength: number = 1000,
  includeMetadata: boolean = false
): string {
  if (messages.length === 0) return 'No previous conversation history.'

  const userMessages = messages.filter(m => m.role === 'user')
  const assistantMessages = messages.filter(m => m.role === 'assistant')

  let summary = `Previous conversation summary (${messages.length} messages):\n\n`

  // Extract key topics from the last few exchanges
  const recentExchanges = messages.slice(-10)
  const topics = new Set<string>()

  recentExchanges.forEach(msg => {
    // Simple topic extraction (can be enhanced)
    const words = msg.content.toLowerCase().split(/\s+/)
    words.forEach(word => {
      if (word.length > 5 && !['about', 'really', 'think', 'would', 'could'].includes(word)) {
        topics.add(word)
      }
    })
  })

  summary += `Topics discussed: ${Array.from(topics).slice(0, 5).join(', ')}\n`
  summary += `User contributions: ${userMessages.length}\n`
  summary += `Therapist responses: ${assistantMessages.length}\n\n`
  summary += `Last exchange:\n`
  summary += `User: "${userMessages[userMessages.length - 1]?.content.slice(0, 100)}..."\n`
  summary += `Therapist: "${assistantMessages[assistantMessages.length - 1]?.content.slice(0, 100)}..."`

  return summary.slice(0, maxLength)
}

/**
 * Extract metrics from conversation messages
 * Used for real-time metric calculation
 */
export function extractConversationMetrics(
  messages: VapiMessage[]
): {
  turnCount: number
  userMessageCount: number
  assistantMessageCount: number
  averageUserMessageLength: number
  averageAssistantMessageLength: number
  emotionalTone: Record<string, number>
  topics: string[]
} {
  const userMessages = messages.filter(m => m.role === 'user')
  const assistantMessages = messages.filter(m => m.role === 'assistant')
  
  const emotionalTone: Record<string, number> = {}
  const topicWords = new Set<string>()
  
  // Analyze messages for emotional tone and topics
  messages.forEach(msg => {
    if (msg.metadata?.emotion) {
      emotionalTone[msg.metadata.emotion as string] = 
        (emotionalTone[msg.metadata.emotion as string] || 0) + 1
    }
    
    // Extract meaningful words for topics
    const words = msg.content.toLowerCase()
      .split(/[\s,\.!?;:]+/)
      .filter(word => 
        word.length > 4 && 
        !['about', 'really', 'think', 'would', 'could', 'should', 'that', 'this', 'with', 'from'].includes(word)
      )
    
    words.forEach(word => topicWords.add(word))
  })
  
  return {
    turnCount: messages.length,
    userMessageCount: userMessages.length,
    assistantMessageCount: assistantMessages.length,
    averageUserMessageLength: userMessages.length > 0 
      ? userMessages.reduce((sum, m) => sum + m.content.length, 0) / userMessages.length 
      : 0,
    averageAssistantMessageLength: assistantMessages.length > 0
      ? assistantMessages.reduce((sum, m) => sum + m.content.length, 0) / assistantMessages.length
      : 0,
    emotionalTone,
    topics: Array.from(topicWords).slice(0, 10)
  }
}

/**
 * Validate transcript entry for database storage
 */
export function validateTranscriptEntry(entry: unknown): {
  valid: boolean
  error?: string
  sanitized?: {
    speaker: string
    text: string
    timestamp: Date
    isFinal: boolean
    metadata?: Record<string, unknown>
  }
} {
  if (!entry || typeof entry !== 'object') {
    return { valid: false, error: 'Entry must be an object' }
  }
  
  const e = entry as Record<string, unknown>
  
  if (!e.speaker || typeof e.speaker !== 'string') {
    return { valid: false, error: 'Entry must have a speaker' }
  }
  
  if (!e.text || typeof e.text !== 'string') {
    return { valid: false, error: 'Entry must have text content' }
  }
  
  const speaker = sanitizeMessageContent(e.speaker as string)
  const text = sanitizeMessageContent(e.text as string)
  
  if (!speaker || !text) {
    return { valid: false, error: 'Entry content cannot be empty after sanitization' }
  }
  
  // Handle timestamp
  let timestamp: Date
  if (e.timestamp instanceof Date) {
    timestamp = e.timestamp
  } else if (typeof e.timestamp === 'string' || typeof e.timestamp === 'number') {
    timestamp = new Date(e.timestamp)
    if (isNaN(timestamp.getTime())) {
      return { valid: false, error: 'Invalid timestamp' }
    }
  } else {
    timestamp = new Date()
  }
  
  return {
    valid: true,
    sanitized: {
      speaker,
      text,
      timestamp,
      isFinal: e.isFinal === true,
      metadata: e.metadata as Record<string, unknown>
    }
  }
}