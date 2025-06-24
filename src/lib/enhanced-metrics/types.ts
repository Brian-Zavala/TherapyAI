// src/lib/enhanced-metrics/types.ts
"use client";

// ========================================
// ENHANCED METRIC TYPES
// ========================================

export interface EnhancedMetricData {
  // Core metrics (existing)
  id: string;
  name: string;
  value: number;
  previousValue?: number;
  trend?: 'up' | 'down' | 'stable';
  confidence: number;
  source: 'session' | 'assessment' | 'calculated';
  timestamp: string;
  
  // Enhanced metrics (new)
  insights?: MetricInsight[];
  patterns?: CommunicationPattern[];
  milestones?: Milestone[];
  recommendations?: Recommendation[];
  comparisons?: ComparativeData;
  predictions?: PredictiveAnalytics;
}

export interface MetricInsight {
  id: string;
  type: 'strength' | 'improvement' | 'observation' | 'warning';
  title: string;
  description: string;
  confidence: number;
  relatedMetrics: string[];
  createdAt: string;
}

export interface CommunicationPattern {
  id: string;
  name: string;
  description: string;
  frequency: 'rare' | 'occasional' | 'frequent' | 'consistent';
  impact: 'positive' | 'negative' | 'neutral' | 'mixed';
  examples: PatternExample[];
  suggestions: string[];
}

export interface PatternExample {
  sessionId: string;
  timestamp: string;
  context: string;
  outcome: 'positive' | 'negative' | 'neutral';
}

export interface Milestone {
  id: string;
  type: 'achievement' | 'streak' | 'improvement' | 'breakthrough';
  title: string;
  description: string;
  unlockedAt?: string;
  progress: number; // 0-100
  criteria: MilestoneCriteria;
  reward?: MilestoneReward;
}

export interface MilestoneCriteria {
  type: 'sessions' | 'metric_value' | 'consistency' | 'pattern';
  target: number;
  current: number;
  unit: string;
}

export interface MilestoneReward {
  type: 'badge' | 'insight' | 'feature_unlock';
  value: string;
  icon?: string;
}

export interface Recommendation {
  id: string;
  priority: 'high' | 'medium' | 'low';
  category: 'exercise' | 'technique' | 'focus_area' | 'resource';
  title: string;
  description: string;
  rationale: string;
  expectedImpact: string;
  timeframe: string;
  resources?: RecommendationResource[];
  relatedMetrics: string[];
}

export interface RecommendationResource {
  type: 'article' | 'video' | 'exercise' | 'tool';
  title: string;
  url?: string;
  duration?: string;
}

export interface ComparativeData {
  cohortSize: number;
  percentile: number;
  averageValue: number;
  distribution: {
    percentile: number;
    value: number;
  }[];
  insights: string[];
}

export interface PredictiveAnalytics {
  projectedValue: number;
  timeframe: string;
  confidence: number;
  factors: PredictiveFactor[];
  scenarios: PredictiveScenario[];
}

export interface PredictiveFactor {
  name: string;
  impact: 'positive' | 'negative';
  weight: number;
  description: string;
}

export interface PredictiveScenario {
  name: string;
  probability: number;
  outcome: number;
  description: string;
  requirements: string[];
}

// ========================================
// HABIT TRACKING
// ========================================

export interface HabitData {
  id: string;
  userId: string;
  type: 'communication' | 'practice' | 'reflection';
  name: string;
  streak: number;
  longestStreak: number;
  completions: HabitCompletion[];
  frequency: 'daily' | 'weekly' | 'session-based';
  impact: MetricImpact[];
}

export interface HabitCompletion {
  date: string;
  quality: 'excellent' | 'good' | 'fair' | 'poor';
  notes?: string;
  relatedSessionId?: string;
}

export interface MetricImpact {
  metricId: string;
  changePercentage: number;
  correlation: number;
}

// ========================================
// PROGRESS TRACKING
// ========================================

export interface ProgressSummary {
  userId: string;
  period: 'week' | 'month' | 'quarter' | 'year' | 'all-time';
  overallProgress: number; // -100 to +100
  highlights: ProgressHighlight[];
  challenges: ProgressChallenge[];
  breakthroughs: Breakthrough[];
  consistency: ConsistencyMetrics;
}

export interface ProgressHighlight {
  type: 'improvement' | 'consistency' | 'milestone' | 'breakthrough';
  title: string;
  description: string;
  metricImpact: number;
  date: string;
}

export interface ProgressChallenge {
  id: string;
  area: string;
  description: string;
  severity: 'minor' | 'moderate' | 'significant';
  suggestions: string[];
  resources: RecommendationResource[];
}

export interface Breakthrough {
  id: string;
  date: string;
  type: 'emotional' | 'behavioral' | 'relational' | 'cognitive';
  description: string;
  triggerEvent?: string;
  sustainabilityScore: number; // 0-100
}

export interface ConsistencyMetrics {
  sessionFrequency: number; // sessions per week
  engagementScore: number; // 0-100
  practiceAdherence: number; // 0-100
  improvementVelocity: number; // rate of change
}

// ========================================
// SESSION INSIGHTS
// ========================================

export interface SessionInsight {
  sessionId: string;
  keyMoments: KeyMoment[];
  emotionalJourney: EmotionalPoint[];
  communicationFlow: CommunicationFlow;
  breakthroughs: string[];
  practiceOpportunities: PracticeOpportunity[];
}

export interface KeyMoment {
  timestamp: number; // seconds into session
  type: 'breakthrough' | 'challenge' | 'insight' | 'practice';
  description: string;
  impact: 'high' | 'medium' | 'low';
  transcript?: string;
}

export interface EmotionalPoint {
  timestamp: number;
  emotion: string;
  intensity: number; // 0-100
  speaker: 'user' | 'partner' | 'therapist';
}

export interface CommunicationFlow {
  speakingBalance: number; // 0-100 (50 = equal)
  turnTaking: number; // average turns per minute
  interruptions: number;
  activeListeningScore: number; // 0-100
  empathyMoments: number;
}

export interface PracticeOpportunity {
  skill: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedImpact: 'high' | 'medium' | 'low';
  resources: RecommendationResource[];
}

// ========================================
// GOAL TRACKING
// ========================================

export interface CommunicationGoal {
  id: string;
  userId: string;
  title: string;
  description: string;
  targetMetric: string;
  targetValue: number;
  currentValue: number;
  deadline: string;
  status: 'active' | 'completed' | 'paused' | 'abandoned';
  milestones: GoalMilestone[];
  strategies: string[];
  progress: GoalProgress[];
}

export interface GoalMilestone {
  id: string;
  title: string;
  targetValue: number;
  completed: boolean;
  completedAt?: string;
}

export interface GoalProgress {
  date: string;
  value: number;
  note?: string;
  sessionId?: string;
}

// ========================================
// PARTNER INSIGHTS (for couple therapy)
// ========================================

export interface PartnerInsights {
  partnerId: string;
  relationshipDuration: string;
  communicationStyle: 'complementary' | 'similar' | 'contrasting';
  strengths: RelationshipStrength[];
  growthAreas: GrowthArea[];
  synchronicity: SynchronicityMetrics;
}

export interface RelationshipStrength {
  area: string;
  description: string;
  examples: string[];
  frequency: 'rare' | 'occasional' | 'frequent' | 'consistent';
}

export interface GrowthArea {
  area: string;
  currentLevel: number; // 0-100
  importance: 'critical' | 'high' | 'medium' | 'low';
  suggestions: string[];
  exercises: RecommendationResource[];
}

export interface SynchronicityMetrics {
  emotionalAlignment: number; // 0-100
  communicationRhythm: number; // 0-100
  conflictResolutionStyle: 'collaborative' | 'compromising' | 'competing' | 'avoiding';
  growthTrajectory: 'aligned' | 'diverging' | 'converging';
}