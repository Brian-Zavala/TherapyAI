import Vapi from '@vapi-ai/web'
import { cleanAndValidateVapiConfig, extractVariableValues } from './vapi-config-cleaner'

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
  private currentAssistantConfig: any = null // Store inline config for pause/resume

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
    assistantId?: string
    assistantConfig?: any // Full inline assistant configuration
    resumeFromMessages?: ConversationMessage[]
    variableValues?: Record<string, unknown>
  }): Promise<void> {
    if (this.isDestroyed) {
      throw new Error('Manager has been destroyed')
    }

    try {
      let startConfig: any

      // Handle inline configuration
      if (config.assistantConfig) {
        console.log('🎭 Starting VAPI with inline assistant configuration')
        
        try {
          // Clean and validate the configuration
          const cleanedConfig = cleanAndValidateVapiConfig(config.assistantConfig)
          console.log('✅ VAPI config cleaned and validated')
          
          // Extract variable values separately (they shouldn't be in the inline config)
          const variableValues = extractVariableValues(config.assistantConfig) || config.variableValues
          
          // For inline config, pass the cleaned config object
          startConfig = { ...cleanedConfig }
          
          // Store a placeholder ID for inline configs
          this.currentAssistantId = 'inline-config'
          this.currentAssistantConfig = cleanedConfig
          
          // Store messages for later injection if resuming
          const messagesToInject = config.resumeFromMessages || []
          
          // Apply variable values if provided (after cleaning)
          if (variableValues) {
            startConfig.variableValues = variableValues
          }
        } catch (error) {
          console.error('❌ VAPI config validation failed:', error)
          throw new Error(`Invalid VAPI configuration: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
      }
      // Handle assistant ID configuration
      else if (config.assistantId) {
        console.log('🎯 Starting VAPI with assistant ID:', config.assistantId)
        
        // Store the assistant ID for later use
        this.currentAssistantId = config.assistantId
        
        startConfig = {
          assistantId: config.assistantId,
        }

        // Configure assistant overrides for variable values only
        if (config.variableValues) {
          startConfig.assistantOverrides = {
            variableValues: config.variableValues
          }
        }
      } else {
        throw new Error('Either assistantId or assistantConfig must be provided')
      }

      await this.vapi.start(startConfig)
      
      // After session starts, inject conversation history using add-message
      if (config.resumeFromMessages && config.resumeFromMessages.length > 0) {
        console.log(`Injecting ${config.resumeFromMessages.length} conversation history messages`)
        
        // Wait a moment for session to be fully established
        await new Promise(resolve => setTimeout(resolve, 500))
        
        // Inject each message into the conversation history
        for (const msg of config.resumeFromMessages) {
          try {
            this.vapi.send({
              type: 'add-message',
              message: {
                role: msg.role,
                content: msg.content
              }
            })
            // Small delay between messages to ensure proper ordering
            await new Promise(resolve => setTimeout(resolve, 100))
          } catch (error) {
            console.error('Failed to inject message:', error)
          }
        }
        
        // Add the conversation messages to our local history
        this.conversationHistory = [...config.resumeFromMessages]
      }

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

  getCurrentAssistantConfig(): any {
    return this.currentAssistantConfig
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
    this.currentAssistantConfig = null
    
    console.log('VAPIManager destroyed and cleaned up')
  }
}