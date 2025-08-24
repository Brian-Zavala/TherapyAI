/**
 * VAPI Configuration Validator
 * Validates VAPI inline configuration before sending to API to prevent 400 errors
 */

export interface VapiValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateVapiInlineConfig(config: Record<string, unknown>): VapiValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    // Check required top-level fields
    if (!config) {
      errors.push('Configuration object is null or undefined');
      return { isValid: false, errors, warnings };
    }

    // Validate model configuration
    if (!config.model) {
      errors.push('Model configuration is required');
    } else {
      const model = config.model as Record<string, unknown>;
      if (!model.provider) {
        errors.push('Model must have a "provider" field (e.g., "anthropic", "openai")');
      }
      
      if (!model.model) {
        errors.push('Model must have a "model" field specifying the model name');
      }
      
      // Validate provider-specific model names
      if (model.provider === 'anthropic') {
        const validAnthropicModels = [
          'claude-3-opus-20240229',
          'claude-3-sonnet-20240229', 
          'claude-3-haiku-20240307',
          'claude-3-5-sonnet-20240620',
          'claude-3-5-sonnet-20241022',
          'claude-3-5-haiku-20241022',
          'claude-3-7-sonnet-20250219',
          'claude-opus-4-20250514',
          'claude-sonnet-4-20250514'
        ];
        
        if (!validAnthropicModels.includes(model.model as string)) {
          warnings.push(`Model ${model.model} is not in the list of known Anthropic models. Please ensure it is a valid model.`);
        }
      }
    }

    // Validate voice configuration
    if (!config.voice) {
      errors.push('Voice configuration is required');
    } else {
      const voice = config.voice as Record<string, unknown>;
      if (!voice.provider) {
        errors.push('Voice must have a "provider" field (e.g., "11labs", "openai")');
      }
      
      if (voice.provider === '11labs' && !voice.voiceId) {
        errors.push('11labs voice must have a "voiceId" field');
      }
    }

    // Validate transcriber configuration
    if (!config.transcriber) {
      errors.push('Transcriber configuration is required');
    } else {
      const transcriber = config.transcriber as Record<string, unknown>;
      if (!transcriber.provider) {
        errors.push('Transcriber must have a "provider" field (e.g., "deepgram", "openai")');
      }
    }

    // Validate optional fields
    const maxDuration = config.maxDurationSeconds as number;
    if (maxDuration !== undefined && (maxDuration < 10 || maxDuration > 43200)) {
      errors.push('maxDurationSeconds must be between 10 and 43200 (12 hours)');
    }

    const silenceTimeout = config.silenceTimeoutSeconds as number;
    if (silenceTimeout !== undefined && (silenceTimeout < 10 || silenceTimeout > 3600)) {
      errors.push('silenceTimeoutSeconds must be between 10 and 3600 (1 hour)');
    }

    // Check for invalid fields that might cause 400 errors
    const invalidFields = [
      'variableValues',
      'metadata', 
      'recordingEnabled',
      'hipaaEnabled',
      'responseDelaySeconds',
      'llmRequestDelaySeconds',
      'numWordsToInterruptAssistant',
      'functions' // Should be in model.tools instead
    ];

    // Validate tools in model.tools array
    const model = config.model as Record<string, unknown>;
    if (model && model.tools && Array.isArray(model.tools)) {
      const validToolTypes = [
        'dtmf', 'endCall', 'transferCall', 'output', 'voicemail', 'query', 'sms', 
        'function', 'mcp', 'apiRequest', 'bash', 'computer', 'textEditor',
        'google.calendar.event.create', 'google.calendar.availability.check', 
        'google.sheets.row.append', 'slack.message.send', 
        'gohighlevel.calendar.event.create', 'gohighlevel.calendar.availability.check',
        'gohighlevel.contact.create', 'gohighlevel.contact.get', 'make', 'ghl'
      ];

      config.model.tools.forEach((tool: Record<string, any>, index: number) => {
        if (!tool.type) {
          errors.push(`Tool at index ${index} is missing required "type" field`);
        } else if (!validToolTypes.includes(tool.type)) {
          errors.push(`Tool at index ${index} has invalid type "${tool.type}". Valid types: ${validToolTypes.join(', ')}`);
        }

        // Validate function tools have proper structure
        if (tool.type === 'function') {
          if (!tool.function) {
            errors.push(`Function tool at index ${index} is missing required "function" property`);
          } else {
            if (!tool.function.name) {
              errors.push(`Function tool at index ${index} is missing required "function.name" property`);
            }
            if (tool.name || tool.description || tool.parameters) {
              warnings.push(`Function tool at index ${index} has properties at root level (name, description, parameters). These should be inside the "function" property`);
            }
          }
        }
      });
    }

    // Validate clientMessages array
    if (config.clientMessages && Array.isArray(config.clientMessages)) {
      const validClientMessages = [
        'conversation-update', 'function-call', 'function-call-result', 'hang', 
        'language-changed', 'metadata', 'model-output', 'speech-update', 
        'status-update', 'transcript', 'tool-calls', 'tool-calls-result', 
        'tool.completed', 'transfer-update', 'user-interrupted', 'voice-input', 
        'workflow.node.started'
      ];

      config.clientMessages.forEach((messageType: string, index: number) => {
        if (!validClientMessages.includes(messageType)) {
          errors.push(`Client message at index ${index} has invalid type "${messageType}". Valid types: ${validClientMessages.join(', ')}`);
        }
      });
    }

    invalidFields.forEach(field => {
      if (config[field] !== undefined) {
        warnings.push(`Field "${field}" is not part of VAPI CreateAssistantDTO schema and may cause errors`);
      }
    });

    // Check for proper client messages format
    if (config.clientMessages && !Array.isArray(config.clientMessages)) {
      errors.push('clientMessages must be an array');
    }

    // Validate backgroundSound
    if (config.backgroundSound && typeof config.backgroundSound !== 'string') {
      errors.push('backgroundSound must be a string ("off", "office", or URL)');
    }

  } catch (error) {
    errors.push(`Validation error: ${error instanceof Error ? error.message : String(error)}`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

export function logVapiValidationResult(result: VapiValidationResult) {
  if (!result.isValid) {
    console.error('🚨 VAPI Configuration Validation Failed:');
    result.errors.forEach((error, index) => {
      console.error(`  ${index + 1}. ${error}`);
    });
  }

  if (result.warnings.length > 0) {
    console.warn('⚠️ VAPI Configuration Warnings:');
    result.warnings.forEach((warning, index) => {
      console.warn(`  ${index + 1}. ${warning}`);
    });
  }

  if (result.isValid && result.warnings.length === 0) {
    console.log('✅ VAPI Configuration validation passed');
  }
}