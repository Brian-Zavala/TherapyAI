/**
 * AI Insights System - Main Export
 * Complete dynamic therapy insights system powered by real VAPI session data
 */

// Core services
export { DynamicInsightsService, generateDynamicTherapyInsights } from './dynamic-insights-service';
export { SafeDynamicInsightsService, generateSafeTherapyInsights, getApprovedTherapyInsights } from './dynamic-insights-service-safe';
export { CrisisDetectionService, crisisDetectionService, scanForCrisisKeywords } from './crisis-detection-service';
export { SessionDataProcessor } from './session-data-processor';
export { AIInsightGenerator } from './ai-insight-generator';
export { AdvancedPatternAnalytics } from './advanced-pattern-analytics';

// Scheduling and automation
export { DailyTipScheduler, dailyTipScheduler } from './daily-tip-scheduler';
export { SessionCompletionHandler, onSessionCompleted } from './session-completion-handler';

// Real-time capabilities
export { RealTimeInsightsBroadcaster, insightsBroadcaster } from './real-time-insights-broadcaster';

// Personalization and SAFE analytics (no predictions)
export { InsightPersonalizationEngine, trackInsightInteraction } from './insight-personalization-engine';
export { SafeTherapeuticAnalyzer, detectAndAlertCrisis, approveRecommendation } from './therapeutic-outcome-predictor-safe';

// Clinical safety and disclaimers
export { 
  ClinicalDisclaimerService, 
  getDisclaimerService, 
  withDisclaimerCheck, 
  emergencyOverride 
} from './clinical-disclaimer-service';

// React hooks
// export { useRealTimeInsights, useInsightNotifications } from '../hooks/useRealTimeInsights';

// Types
export type {
  ProcessedSessionData,
  ConversationAnalysis,
  EmotionalAnalysis,
  CommunicationPattern
} from './session-data-processor';

export type {
  GeneratedInsights,
  DynamicInsight,
  UserContext
} from './ai-insight-generator';

export type {
  RelationshipTrend,
  DataPoint,
  InflectionPoint,
  TherapeuticOutcome
} from './advanced-pattern-analytics';

export type {
  InsightUpdatePayload
} from './real-time-insights-broadcaster';

export type {
  UserEngagementProfile,
  PersonalizedInsightRecommendation
} from './insight-personalization-engine';

export type {
  TherapeuticSupportAnalysis,
  PatternObservation,
  ProgressIndicator,
  TherapistRecommendation
} from './therapeutic-outcome-predictor-safe';

export type {
  ClinicalDisclaimer,
  DisclaimerAcknowledgment,
  TherapistOverride
} from './clinical-disclaimer-service';

export type {
  CrisisIndicator,
  CrisisDetectionResult
} from './crisis-detection-service';

export type {
  SafeComprehensiveInsights
} from './dynamic-insights-service-safe';

/**
 * Quick setup for new installations
 */
export const AI_INSIGHTS_CONFIG = {
  // Environment variables needed
  requiredEnvVars: [
    'ANTHROPIC_API_KEY',
    'CRON_SECRET',
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY'
  ],
  
  // Database migrations needed
  databaseMigrations: [
    'AIInsight',
    'DailyTip',
    'InsightPattern',
    'DynamicGoal',
    'SessionAnalysisCache'
  ],
  
  // Cron jobs to set up
  cronJobs: [
    {
      name: 'Daily Tips Rotation',
      schedule: '0 0 * * *', // Midnight daily
      endpoint: '/api/cron/daily-tips',
      method: 'POST'
    }
  ],
  
  // Features enabled (SAFE MODE)
  features: {
    realTimeInsights: true,
    dynamicTips: true,
    patternAnalytics: true,
    safeAnalytics: true, // SAFE descriptive analytics only
    outcomePredictor: false, // DISABLED - dangerous predictions
    personalization: true,
    sessionTriggers: true,
    crisisDetection: true, // NEW - crisis keyword detection
    therapistApproval: true // NEW - required therapist approval
  }
};

/**
 * System health check
 */
export async function checkAIInsightsHealth(): Promise<{
  status: 'healthy' | 'degraded' | 'unhealthy';
  components: Record<string, boolean>;
  message: string;
}> {
  const components = {
    anthropicAPI: !!process.env.ANTHROPIC_API_KEY,
    supabaseConfig: !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY),
    cronSecret: !!process.env.CRON_SECRET,
    databaseConnection: true, // Would check prisma connection
  };
  
  const healthyCount = Object.values(components).filter(Boolean).length;
  const totalCount = Object.keys(components).length;
  
  let status: 'healthy' | 'degraded' | 'unhealthy';
  let message: string;
  
  if (healthyCount === totalCount) {
    status = 'healthy';
    message = 'All AI insights components operational';
  } else if (healthyCount >= totalCount * 0.5) {
    status = 'degraded';
    message = `${totalCount - healthyCount} components unavailable`;
  } else {
    status = 'unhealthy';
    message = 'Multiple critical components offline';
  }
  
  return { status, components, message };
}

/**
 * Migration helper for existing installations
 */
export const MIGRATION_GUIDE = {
  from: 'therapy-insights-generator.ts',
  to: 'dynamic-insights-service.ts',
  steps: [
    '1. Add new database models (see database-schema.sql)',
    '2. Update therapy insights API route import',
    '3. Set up cron job for daily tips',
    '4. Configure environment variables',
    '5. Test with existing session data'
  ],
  compatibilityMode: true, // System maintains compatibility with old format
  rollbackPlan: 'Switch import back to therapy-insights-generator.ts'
};

/**
 * Performance optimization settings
 */
export const PERFORMANCE_CONFIG = {
  // AI generation limits
  maxInsightsPerGeneration: 10,
  maxSessionsAnalyzed: 10,
  aiRequestTimeout: 30000, // 30 seconds
  
  // Caching settings
  insightCacheDuration: 6 * 60 * 60 * 1000, // 6 hours
  patternCacheDuration: 24 * 60 * 60 * 1000, // 24 hours
  predictionCacheDuration: 7 * 24 * 60 * 60 * 1000, // 7 days
  
  // Real-time settings
  broadcastThrottleMs: 1000, // Max 1 broadcast per second per user
  maxConcurrentGenerations: 5, // Max 5 concurrent AI generations
  
  // Cleanup settings
  oldInsightRetentionDays: 90,
  oldTipRetentionDays: 30,
  oldPredictionRetentionDays: 365
};

/**
 * Default fallback data for when AI is unavailable
 */
export const FALLBACK_CONFIG = {
  defaultTips: [
    'Take three deep breaths before responding in tense moments',
    'Express one appreciation to your partner today',
    'Practice active listening by reflecting back what you hear',
    'Share one vulnerable thought with your partner',
    'Notice and acknowledge your partner\'s efforts today'
  ],
  
  defaultInsights: {
    title: 'Continue Your Therapy Journey',
    description: 'Keep attending sessions regularly for the best outcomes',
    actionItems: [
      'Attend your scheduled sessions consistently',
      'Practice techniques learned in therapy',
      'Communicate openly about your progress'
    ]
  },
  
  defaultAnalysis: {
    engagementLevel: 'moderate' as const,
    sessionConsistency: 'somewhat_regular' as const,
    confidenceLevel: 'low' as const, // Conservative confidence
    requiresTherapistReview: true,
    clinicalDisclaimer: 'AI insights are for informational purposes only and require professional validation'
  }
};

/**
 * Monitoring and analytics
 */
export const ANALYTICS_CONFIG = {
  trackEvents: [
    'insight_generated',
    'tip_rotated',
    'pattern_detected',
    'safe_analysis_made', // SAFE analytics only
    'session_analyzed',
    'user_engagement',
    'crisis_detected', // NEW - crisis detection
    'therapist_approval_required', // NEW - approval workflow
    'therapist_approval_granted'
  ],
  
  metrics: [
    'generation_latency',
    'therapist_approval_rate', // NEW - approval metrics
    'user_engagement_rate',
    'tip_completion_rate',
    'insight_action_rate',
    'crisis_detection_rate', // NEW - safety metrics
    'analysis_accuracy_vs_therapist' // Therapist validation accuracy
  ],
  
  alerts: [
    'high_error_rate',
    'crisis_keywords_detected', // NEW - immediate crisis alert
    'system_overload',
    'data_quality_degradation',
    'low_therapist_approval_rate', // NEW - validation alerts
    'pending_therapist_reviews_accumulating'
  ]
};

// Version and build info
export const AI_INSIGHTS_VERSION = '2.0.0';
export const BUILD_DATE = new Date().toISOString();
export const FEATURES_ENABLED = Object.keys(AI_INSIGHTS_CONFIG.features).filter(
  feature => AI_INSIGHTS_CONFIG.features[feature as keyof typeof AI_INSIGHTS_CONFIG.features]
);