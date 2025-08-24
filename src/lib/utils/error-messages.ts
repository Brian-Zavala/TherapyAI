/**
 * Centralized error messages for consistent user experience
 * 
 * Guidelines:
 * - Use friendly, conversational tone
 * - Provide actionable next steps
 * - Avoid technical jargon
 * - Show empathy for user frustration
 */

// Authentication Errors
export const AUTH_ERRORS = {
  UNAUTHORIZED: 'Please sign in to continue',
  SESSION_EXPIRED: 'Your session has expired. Please sign in again.',
  INVALID_CREDENTIALS: 'Invalid email or password. Please try again.',
  ACCOUNT_LOCKED: 'Your account has been temporarily locked. Please try again later.',
  VERIFICATION_FAILED: "We couldn't verify your account. Please sign in again.",
  AUTH_NOT_CONFIGURED: 'Voice service is temporarily unavailable. Please contact support.',
} as const

// Session Management Errors  
export const SESSION_ERRORS = {
  // Creation
  CREATE_FAILED: "We couldn't start your session right now. Please try again in a moment.",
  START_FAILED: 'Something went wrong starting your session. Please try again.',
  ALREADY_ACTIVE: 'You already have an active session. Would you like to continue it?',
  
  // Recovery
  RECOVERY_AUTH_ERROR: "We're having trouble reconnecting your session. Please refresh the page to continue.",
  RECOVERY_TIMEOUT: 'The voice connection is taking longer than expected. Please refresh the page to reconnect.',
  RECOVERY_FAILED: "We couldn't resume your session. Please try starting a new session.",
  
  // Loading
  LOAD_FAILED: "We couldn't load your session. Please try again.",
  DETAILS_UNAVAILABLE: 'Session details are temporarily unavailable. Please try again.',
  NOT_FOUND: 'Session not found',
  
  // Completion
  COMPLETION_FAILED: "We couldn't save your session properly. Don't worry, your progress is safe.",
  
  // Family Members
  NO_FAMILY_MEMBERS: 'Please add family members to your profile before starting a family therapy session.',
} as const

// Connection Errors
export const CONNECTION_ERRORS = {
  NETWORK_ERROR: "We're having trouble connecting. Please check your internet and try again.",
  CONNECTION_LOST: 'The connection was interrupted. Please refresh to reconnect.',
  TIMEOUT: 'This is taking longer than expected. Please refresh the page.',
  SERVER_ERROR: "We're experiencing technical difficulties. Please try again later.",
} as const

// Voice/VAPI Errors
export const VOICE_ERRORS = {
  INIT_FAILED: 'Voice connection failed. Please check your microphone permissions.',
  MIC_PERMISSION_DENIED: 'Microphone access is required for therapy sessions. Please enable it in your browser settings.',
  MIC_NOT_FOUND: 'No microphone detected. Please connect a microphone and try again.',
  AUDIO_ERROR: 'Audio connection issue. Please refresh and try again.',
} as const

// Validation Errors
export const VALIDATION_ERRORS = {
  INVALID_INPUT: 'Please check your information and try again.',
  REQUIRED_FIELD: 'This field is required',
  INVALID_EMAIL: 'Please enter a valid email address',
  INVALID_PHONE: 'Please enter a valid phone number',
  INVALID_DURATION: 'Please select a session duration',
  INVALID_SCOPE: 'Invalid request parameters. Please refresh and try again.',
  MISSING_USER_ID: 'Your session information is missing. Please sign in again.',
} as const

// General Errors
export const GENERAL_ERRORS = {
  UNKNOWN: 'Something unexpected happened. Please try again.',
  PERMISSION_DENIED: "You don't have access to this feature. Please contact support if you believe this is an error.",
  FEATURE_UNAVAILABLE: 'This feature is temporarily unavailable. Please try again later.',
  SAVE_FAILED: 'Changes could not be saved. Please try again.',
  LOAD_FAILED: "We're having trouble loading your information. Please try again.",
} as const

// Success Messages
export const SUCCESS_MESSAGES = {
  SESSION_STARTED: 'Session started successfully',
  SESSION_RESUMED: 'Welcome back! Your session has been resumed.',
  SESSION_ENDED: 'Session ended successfully',
  CHANGES_SAVED: 'Your changes have been saved',
  PROFILE_UPDATED: 'Profile updated successfully',
} as const

// Helper function to get user-friendly error message
export function getUserFriendlyError(error: unknown): string {
  if (error instanceof Error) {
    // Map specific error messages to user-friendly ones
    const errorMessage = error.message.toLowerCase()
    
    if (errorMessage.includes('unauthorized') || errorMessage.includes('auth')) {
      return AUTH_ERRORS.UNAUTHORIZED
    }
    
    if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
      return CONNECTION_ERRORS.NETWORK_ERROR
    }
    
    if (errorMessage.includes('timeout')) {
      return CONNECTION_ERRORS.TIMEOUT
    }
    
    if (errorMessage.includes('not found') || errorMessage.includes('404')) {
      return SESSION_ERRORS.NOT_FOUND
    }
    
    if (errorMessage.includes('500') || errorMessage.includes('server')) {
      return CONNECTION_ERRORS.SERVER_ERROR
    }
    
    // Return the original message if it's already user-friendly
    if (errorMessage.includes('please') || errorMessage.includes('try again')) {
      return error.message
    }
  }
  
  return GENERAL_ERRORS.UNKNOWN
}

// Helper function to get error message by HTTP status
export function getErrorByStatus(status: number): string {
  switch (status) {
    case 401:
      return AUTH_ERRORS.UNAUTHORIZED
    case 403:
      return GENERAL_ERRORS.PERMISSION_DENIED
    case 404:
      return SESSION_ERRORS.NOT_FOUND
    case 408:
      return CONNECTION_ERRORS.TIMEOUT
    case 429:
      return 'Too many requests. Please wait a moment and try again.'
    case 500:
    case 502:
    case 503:
      return CONNECTION_ERRORS.SERVER_ERROR
    default:
      return GENERAL_ERRORS.UNKNOWN
  }
}