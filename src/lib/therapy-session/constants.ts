// Session timing constants
export const TRANSCRIPT_DEBOUNCE_MS = 250; // Reduced from 1.5s to 250ms for better UX
export const DEFAULT_SESSION_DURATION = 60; // Default session duration in minutes
export const SESSION_DURATION_OPTIONS = [30, 60] as const;
export type SessionDuration = typeof SESSION_DURATION_OPTIONS[number];

// Therapy types
export const THERAPY_TYPES = {
  COUPLE: 'couple',
  SOLO: 'solo', 
  FAMILY: 'family'
} as const;

// Therapist information
export const THERAPIST_INFO = {
  [THERAPY_TYPES.SOLO]: {
    name: 'Dr. Elliot Mackaphy',
    image: '/images/dr-elliot-mackaphy.webp',
    assistantId: process.env.NEXT_PUBLIC_VAPI_INDIVIDUAL_ASSISTANT_ID
  },
  [THERAPY_TYPES.COUPLE]: {
    name: 'Dr. Maya Thompson',
    image: '/images/dr-maya-thompson.webp',
    assistantId: process.env.NEXT_PUBLIC_VAPI_COUPLE_ASSISTANT_ID
  },
  [THERAPY_TYPES.FAMILY]: {
    name: 'Dr. Jada Pearson',
    image: '/images/dr-jada-pearson.webp',
    assistantId: process.env.NEXT_PUBLIC_VAPI_FAMILY_ASSISTANT_ID
  }
} as const;

// Loading messages cycle (6 messages)
export const LOADING_MESSAGES = [
  "Setting up your private therapy session...",
  "Initializing encrypted connection...",
  "Preparing your personalized experience...",
  "Securing your conversation...",
  "Connecting with your therapist...",
  "Almost ready..."
] as const;

// Session states
export const SESSION_STATES = {
  IDLE: 'idle',
  LOADING: 'loading',
  ACTIVE: 'active',
  PAUSED: 'paused',
  ENDING: 'ending',
  ERROR: 'error'
} as const;

// Message types for transcript processing
export const TRANSCRIPT_MESSAGE_TYPES = {
  USER: 'user',
  ASSISTANT: 'assistant',
  THERAPIST: 'therapist',
  SYSTEM: 'system'
} as const;

// API endpoints
export const API_ENDPOINTS = {
  SESSIONS: '/api/sessions',
  SESSION_ACTIVE: '/api/sessions/active',
  SESSION_COMPLETE: (id: string) => `/api/sessions/${id}/complete`,
  SESSION_RESCHEDULE: (id: string) => `/api/sessions/${id}/reschedule`,
  SESSION_TRANSCRIPT: (id: string) => `/api/sessions/${id}/transcript`,
  METRICS: '/api/ws/metrics', // Note: This is for HTTP POST, WebSocket uses /ws/realtime/metrics
  VAPI_ASSISTANT: '/api/vapi/assistant',
  VAPI_TRANSCRIBER: '/api/vapi/transcriber'
} as const;

// WebSocket message types
export const WS_MESSAGE_TYPES = {
  METRICS_UPDATE: 'metrics_update',
  SESSION_UPDATE: 'session_update',
  TRANSCRIPT_UPDATE: 'transcript_update'
} as const;

// Session recovery constants
export const SESSION_RECOVERY = {
  CHECK_INTERVAL_MS: 5000, // Check for active sessions every 5 seconds
  MAX_PAUSE_DURATION_MS: 30 * 60 * 1000, // 30 minutes max pause
  AUTO_END_AFTER_MS: 60 * 60 * 1000 // Auto-end after 1 hour of inactivity
} as const;

// UI animation durations (in seconds)
export const ANIMATION_DURATIONS = {
  FADE_IN: 0.3,
  SLIDE_UP: 0.4,
  PULSE: 2.0,
  LOADING_CYCLE: 2.0
} as const;

// Error messages
export const ERROR_MESSAGES = {
  VAPI_KEY_MISSING: 'Failed to obtain authentication token. Please try refreshing the page or logging in again.',
  VAPI_INIT_FAILED: 'Failed to initialize Vapi instance',
  SESSION_CREATE_FAILED: 'Failed to create therapy session',
  TRANSCRIPT_SAVE_FAILED: 'Failed to save transcript entry',
  METRICS_UPDATE_FAILED: 'Failed to send metrics update',
  NETWORK_ERROR: 'Network connection error. Please check your internet connection.',
  PERMISSION_DENIED: 'Microphone permission denied. Please allow microphone access to continue.'
} as const;

// Session storage keys
export const STORAGE_KEYS = {
  CURRENT_SESSION_ID: 'current-session-id',
  SESSION_RECOVERY_PENDING: 'session-recovery-pending',
  SESSION_CONTINUE_TRIGGER: 'session-continue-trigger',
  SESSION_RECOVERED: 'session-recovered',
  TRANSCRIPT_PREFIX: 'transcript-',
  ONBOARDING_DATA: 'onboarding-data',
  FAMILY_MEMBERS: 'family-members'
} as const;

// VAPI configuration
export const VAPI_CONFIG = {
  USE_CUSTOM_TRANSCRIBER: false,
  RECONNECT_ENABLED: true,
  MAX_DURATION_SECONDS: {
    30: 1800,
    60: 3600
  },
  ICE_SERVERS: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun3.l.google.com:19302" },
    { urls: "stun:stun4.l.google.com:19302" },
    { urls: "stun:stun.ekiga.net" },
    { urls: "stun:stun.ideasip.com" },
    { urls: "stun:stun.schlund.de" }
  ]
} as const;

// Metrics calculation constants
export const METRICS_CONFIG = {
  UPDATE_INTERVAL_MS: 5000, // Update metrics every 5 seconds
  BATCH_SIZE: 10, // Batch transcript entries before processing
  MIN_WORD_LENGTH: 3, // Minimum word length for metrics
  SPEAKING_RATE_WPM: 150 // Average speaking rate for duration estimates
} as const;