/**
 * VAPI Configuration Cleaner
 * Cleans and validates VAPI configurations before sending to API
 * Prevents 400 errors from invalid fields
 */

import { validateVapiInlineConfig, logVapiValidationResult } from './vapi-config-validator'

/**
 * Fields that are not part of VAPI's CreateAssistantDTO schema
 * and should be removed before sending to the API
 */
const INVALID_FIELDS = [
  'variableValues',
  'metadata',
  'recordingEnabled',
  'hipaaEnabled',
  'responseDelaySeconds',
  'llmRequestDelaySeconds',
  'numWordsToInterruptAssistant',
  'functions', // Should be in model.tools instead
  'backgroundDenoisingEnabled', // Causes 400 on inline configs
  'artifactPlan', // Only valid on pre-created assistants, not inline
]

/**
 * Detect provider from model name
 */
function detectProvider(modelName: string): string {
  if (!modelName) return 'openai' // Default
  
  if (modelName.includes('claude') || modelName.includes('anthropic')) {
    return 'anthropic'
  } else if (modelName.includes('gpt') || modelName.includes('o1-')) {
    return 'openai'
  } else if (modelName.includes('gemini')) {
    return 'google'
  } else if (modelName.includes('mixtral') || modelName.includes('mistral')) {
    return 'mistral'
  }
  
  return 'openai' // Default fallback
}

/**
 * Detect voice provider from configuration
 */
function detectVoiceProvider(voice: any): string {
  if (!voice) return '11labs'
  
  if (voice.voiceId && voice.voiceId.includes('azure')) {
    return 'azure'
  } else if (voice.voiceId && voice.voiceId.includes('openai')) {
    return 'openai'
  } else if (voice.voiceId) {
    return '11labs' // Default for voiceId
  }
  
  return '11labs'
}

/**
 * Clean VAPI configuration by removing invalid fields and fixing structure
 */
export function cleanVapiConfig(config: any): any {
  if (!config) return config
  
  // Deep clone to avoid mutating original
  const cleaned = JSON.parse(JSON.stringify(config))
  
  // Remove invalid root-level fields
  INVALID_FIELDS.forEach(field => {
    delete cleaned[field]
  })
  
  // Handle model configuration
  if (cleaned.model) {
    // Ensure provider is set
    if (!cleaned.model.provider) {
      cleaned.model.provider = detectProvider(cleaned.model.model)
    }
    
    // Move functions to model.tools if present at root
    if (config.functions && Array.isArray(config.functions)) {
      cleaned.model.tools = config.functions.map((func: any) => {
        // Ensure proper function tool structure
        if (func.type === 'function' || !func.type) {
          return {
            type: 'function',
            function: {
              name: func.name || func.function?.name,
              description: func.description || func.function?.description,
              parameters: func.parameters || func.function?.parameters
            }
          }
        }
        return func
      })
    }
    
    // Ensure tools array exists if not present
    if (!cleaned.model.tools && !cleaned.model.functions) {
      cleaned.model.tools = []
    }
  }
  
  // Handle voice configuration
  if (cleaned.voice) {
    // Ensure provider is set
    if (!cleaned.voice.provider) {
      cleaned.voice.provider = detectVoiceProvider(cleaned.voice)
    }
  }
  
  // Handle transcriber configuration
  if (cleaned.transcriber) {
    // Ensure provider is set
    if (!cleaned.transcriber.provider) {
      cleaned.transcriber.provider = 'deepgram' // Default transcriber
    }
  }
  
  // Ensure valid clientMessages array
  if (cleaned.clientMessages && !Array.isArray(cleaned.clientMessages)) {
    cleaned.clientMessages = ["transcript", "hang", "function-call-result", "tool-calls", "tool-calls-result", "speech-update", "conversation-update"]
  }
  
  // Ensure backgroundSound is valid
  if (cleaned.backgroundSound && typeof cleaned.backgroundSound !== 'string') {
    cleaned.backgroundSound = 'off'
  }
  
  // Fix common duration field issues
  if (cleaned.maxDurationSeconds) {
    cleaned.maxDurationSeconds = Math.max(10, Math.min(43200, Number(cleaned.maxDurationSeconds)))
  }
  
  if (cleaned.silenceTimeoutSeconds) {
    cleaned.silenceTimeoutSeconds = Math.max(10, Math.min(3600, Number(cleaned.silenceTimeoutSeconds)))
  }
  
  return cleaned
}

/**
 * Clean and validate VAPI configuration
 * Returns cleaned config or throws error if invalid
 */
export function cleanAndValidateVapiConfig(config: any): any {
  // Clean the configuration first
  const cleaned = cleanVapiConfig(config)
  
  // Validate the cleaned configuration
  const validation = validateVapiInlineConfig(cleaned)
  
  // Log validation results
  logVapiValidationResult(validation)
  
  if (!validation.isValid) {
    throw new Error(`VAPI configuration validation failed: ${validation.errors.join('; ')}`)
  }
  
  return cleaned
}

/**
 * Extract variable values from a configuration
 * These need to be passed separately from the inline config
 */
export function extractVariableValues(config: any): Record<string, any> | undefined {
  if (!config.variableValues) return undefined
  
  // Deep clone to avoid mutations
  return JSON.parse(JSON.stringify(config.variableValues))
}