import Vapi from '@vapi-ai/web'

interface ConversationMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: number
  metadata?: Record<string, any>
}

interface SessionMetadata {
  startTime: number
  lastActiveTime: number
  totalDuration: number
}

interface VAPIManagerConfig {
  publicKey: string
  userId: string
  maxRetries?: number
  timeout?: number
}

export class VAPIManager {
  private vapi: Vapi
  private isActive = false
  private conversationHistory: ConversationMessage[] = []
  private sessionStartTime = 0
  private config: Required<VAPIManagerConfig>
  private eventListeners: Map<string, (...args: any[]) => void> = new Map()
  private isDestroyed = false
  private currentAssistantId: string | null = null

  constructor(config: VAPIManagerConfig) {
    this.config = {
      maxRetries: 3,
      timeout: 30000,
      ...config
    }

    this.vapi = new Vapi(this.config.publicKey)
    this.setupEventListeners()
  }

  private setupEventListeners() {
    const messageHandler = (message: any) => {
      if (this.isDestroyed) return

      try {
        // Handle different message types from VAPI
        if (message.type === 'conversation-update' || 
            message.type === 'transcript' ||
            message.type === 'function-call' ||
            message.type === 'speech-update') {
          
          // Extract content based on message type
          let content = ''
          let role: 'user' | 'assistant' | 'system' = 'user'
          
          if (message.type === 'transcript' && message.transcript) {
            content = message.transcript
            role = message.role === 'assistant' ? 'assistant' : 'user'
          } else if (message.type === 'conversation-update' && message.conversation) {
            // Handle conversation updates
            const lastMessage = message.conversation[message.conversation.length - 1]
            if (lastMessage) {
              content = lastMessage.content || lastMessage.text || ''
              role = lastMessage.role === 'assistant' ? 'assistant' : 'user'
            }
          } else if (message.type === 'speech-update' && message.text) {
            content = message.text
            role = message.role === 'assistant' ? 'assistant' : 'user'
          }

          if (content) {
            const messageData: ConversationMessage = {
              role,
              content,
              timestamp: Date.now(),
              metadata: {
                type: message.type,
                originalData: message
              }
            }

            this.conversationHistory.push(messageData)
          }
        }
      } catch (error) {
        console.error('Error processing VAPI message:', error)
      }
    }

    const callStartHandler = () => {
      if (this.isDestroyed) return
      console.log('VAPI session started')
      this.isActive = true
      this.sessionStartTime = Date.now()
    }

    const callEndHandler = () => {
      if (this.isDestroyed) return
      console.log('VAPI session ended')
      this.isActive = false
    }

    const errorHandler = (error: any) => {
      if (this.isDestroyed) return
      console.error('VAPI Error:', error)
    }

    // Store references for cleanup
    this.eventListeners.set('message', messageHandler)
    this.eventListeners.set('call-start', callStartHandler)
    this.eventListeners.set('call-end', callEndHandler)
    this.eventListeners.set('error', errorHandler)

    // Attach listeners
    this.vapi.on('message', messageHandler)
    this.vapi.on('call-start', callStartHandler)
    this.vapi.on('call-end', callEndHandler)
    this.vapi.on('error', errorHandler)
  }

  async startSession(config: {
    assistantId: string
    resumeFromMessages?: ConversationMessage[]
    variableValues?: Record<string, unknown>
  }): Promise<void> {
    if (this.isDestroyed) {
      throw new Error('Manager has been destroyed')
    }

    try {
      // Store the assistant ID for later use
      this.currentAssistantId = config.assistantId
      
      let startConfig: any = {
        assistantId: config.assistantId,
      }

      // If resuming from saved state, inject previous messages
      if (config.resumeFromMessages && config.resumeFromMessages.length > 0) {
        console.log(`Resuming with ${config.resumeFromMessages.length} messages`)
        
        // Add previous messages to conversation history
        this.conversationHistory = [...config.resumeFromMessages]
        
        // Configure VAPI to start with previous context
        startConfig.assistantOverrides = {
          model: {
            messages: config.resumeFromMessages.map(msg => ({
              role: msg.role,
              content: msg.content
            }))
          },
          variableValues: config.variableValues || {}
        }
      }

      await this.vapi.start(startConfig)

    } catch (error) {
      console.error('Failed to start VAPI session:', error)
      throw new Error(`Failed to start VAPI session: ${(error as Error).message}`)
    }
  }

  async stopSession(): Promise<void> {
    if (!this.isActive) {
      throw new Error('No active session to stop')
    }

    try {
      this.vapi.stop()
      this.isActive = false
    } catch (error) {
      console.error('Failed to stop VAPI session:', error)
      throw error
    }
  }

  getConversationHistory(): ConversationMessage[] {
    return [...this.conversationHistory]
  }

  getSessionMetadata(): SessionMetadata {
    const now = Date.now()
    return {
      startTime: this.sessionStartTime,
      lastActiveTime: now,
      totalDuration: this.isActive ? now - this.sessionStartTime : 0
    }
  }

  getSessionStatus() {
    return {
      isActive: this.isActive,
      messageCount: this.conversationHistory.length,
      sessionDuration: this.isActive ? Date.now() - this.sessionStartTime : 0,
      isDestroyed: this.isDestroyed
    }
  }

  getCurrentAssistantId(): string | null {
    return this.currentAssistantId
  }

  clearHistory() {
    this.conversationHistory = []
  }

  // Expose VAPI methods for compatibility
  say(message: string, endCallAfterSpoken?: boolean) {
    if (this.vapi && typeof this.vapi.say === 'function') {
      this.vapi.say(message, endCallAfterSpoken)
    } else {
      console.warn('VAPI say method not available')
    }
  }

  send(message: any) {
    if (this.vapi && typeof this.vapi.send === 'function') {
      this.vapi.send(message)
    } else {
      console.warn('VAPI send method not available')
    }
  }

  // Cleanup method - CRITICAL for production
  destroy() {
    if (this.isDestroyed) return

    this.isDestroyed = true
    
    // Remove all event listeners
    this.eventListeners.forEach((handler, event) => {
      this.vapi.off(event, handler)
    })
    this.eventListeners.clear()

    // Stop any active sessions
    if (this.isActive) {
      this.vapi.stop()
    }

    // Clear references
    this.conversationHistory = []
    
    console.log('VAPIManager destroyed and cleaned up')
  }
}