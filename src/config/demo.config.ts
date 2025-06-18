// Demo environment configuration
export const demoConfig = {
  enabled: process.env.NEXT_PUBLIC_DEMO_MODE === 'true',
  
  limits: {
    sessionDuration: 5 * 60 * 1000, // 5 minutes in milliseconds
    maxConcurrentUsers: 10,
    dailySessionsPerIP: 3,
    maxTranscriptLength: 1000, // characters
    
    // Features disabled in demo
    featuresDisabled: [
      'email-notifications',
      'data-export', 
      'session-history',
      'real-payments',
      'custom-prompts',
      'session-recordings'
    ]
  },
  
  // Mock data configuration
  mockData: {
    useSimulatedResponses: true,
    responseDelay: 1000, // ms - simulate thinking
    
    // Preset conversation scenarios
    scenarios: [
      {
        id: 'communication',
        name: 'Communication Issues',
        triggers: ['talk', 'listen', 'understand', 'communicate'],
        responses: [
          "I hear that communication has been challenging for you both. Can you tell me more about what happens when you try to talk?",
          "It sounds like you both want to be heard. What would help you feel more understood?",
          "Many couples struggle with communication. Let's explore what gets in the way of understanding each other."
        ]
      },
      {
        id: 'trust',
        name: 'Trust & Intimacy',
        triggers: ['trust', 'betrayal', 'honest', 'intimate'],
        responses: [
          "Trust is fundamental to any relationship. What has affected trust between you?",
          "Rebuilding trust takes time and consistent actions. What would help you feel safer?",
          "I understand trust has been broken. How do you both feel about working to rebuild it?"
        ]
      },
      {
        id: 'conflict',
        name: 'Conflict Resolution',
        triggers: ['fight', 'argue', 'conflict', 'disagree'],
        responses: [
          "Conflict is normal in relationships. What matters is how we handle it. What typically happens when you disagree?",
          "It sounds like conflicts escalate quickly. What do you think triggers these escalations?",
          "Let's explore healthier ways to express disagreement. What would that look like for you?"
        ]
      }
    ],
    
    // Default responses when no trigger matches
    defaultResponses: [
      "Thank you for sharing that. Can you tell me more?",
      "I understand. How does that make you feel?",
      "That's important. What would you like to see change?"
    ],
    
    // Sample session data for dashboard
    sampleSessions: [
      {
        id: 'demo-1',
        date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 1 week ago
        duration: 45,
        sentiment: 0.7,
        topics: ['communication', 'trust']
      },
      {
        id: 'demo-2',
        date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
        duration: 38,
        sentiment: 0.8,
        topics: ['conflict', 'resolution']
      }
    ]
  },
  
  // Demo UI customization
  ui: {
    showDemoBanner: true,
    showTimeRemaining: true,
    showFeatureLimits: true,
    
    demoMessages: {
      welcome: "Welcome to our demo! You have 5 minutes to explore our AI therapy platform.",
      timeWarning: "You have 1 minute remaining in your demo session.",
      ended: "Thank you for trying our demo! Ready to start your journey?",
      featureLocked: "This feature is available in the full version."
    }
  },
  
  // Analytics configuration
  analytics: {
    trackEvents: true,
    trackFeatureUsage: true,
    trackConversion: true,
    
    // Events to track
    events: [
      'demo_started',
      'demo_session_started',
      'demo_feature_clicked',
      'demo_time_expired',
      'demo_signup_clicked',
      'demo_feedback_submitted'
    ]
  },
  
  // API configuration for demo
  api: {
    // Use mock endpoints
    endpoints: {
      vapi: '/api/demo/vapi',
      sessions: '/api/demo/sessions',
      analytics: '/api/demo/analytics'
    },
    
    // Rate limiting
    rateLimit: {
      maxRequests: 100,
      windowMs: 15 * 60 * 1000 // 15 minutes
    }
  }
};

// Helper functions
export function isDemoMode(): boolean {
  return demoConfig.enabled;
}

export function isDemoFeatureEnabled(feature: string): boolean {
  if (!isDemoMode()) return true;
  return !demoConfig.limits.featuresDisabled.includes(feature);
}

export function getDemoTimeRemaining(startTime: number): number {
  if (!isDemoMode()) return Infinity;
  const elapsed = Date.now() - startTime;
  const remaining = demoConfig.limits.sessionDuration - elapsed;
  return Math.max(0, remaining);
}

export function formatDemoTime(milliseconds: number): string {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}