// real-time-metrics.ts
// Real-time incremental metrics calculation for therapy sessions

interface TranscriptEntry {
  speaker: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

interface IncrementalMetrics {
  activeListeningScore: number;
  expressingNeedsScore: number;
  conflictResolutionScore: number;
  emotionalSupportScore: number;
  communicationScore: number;
  closenessScore: number;
  confidence: number; // Confidence level based on data available
  entryCount: number;
  sessionProgress: number; // Percentage of session completed
}

interface RealTimeMetricsOptions {
  sessionId: string;
  therapyType: 'couple' | 'family' | 'solo';
  sessionDurationMinutes?: number;
  userId: string;
}

// Cache for storing incremental metrics to avoid recalculation
const metricsCache = new Map<string, IncrementalMetrics>();

export class RealTimeMetricsCalculator {
  private sessionId: string;
  private therapyType: 'couple' | 'family' | 'solo';
  private sessionDurationMinutes: number;
  private userId: string;
  private transcriptEntries: TranscriptEntry[] = [];
  private sessionStartTime: Date;
  private lastUpdateTime: Date;

  constructor(options: RealTimeMetricsOptions) {
    this.sessionId = options.sessionId;
    this.therapyType = options.therapyType;
    this.sessionDurationMinutes = options.sessionDurationMinutes || 60;
    this.userId = options.userId;
    this.sessionStartTime = new Date();
    this.lastUpdateTime = new Date();
  }

  // Add a new transcript entry and recalculate metrics
  public addTranscriptEntry(entry: TranscriptEntry): IncrementalMetrics {
    this.transcriptEntries.push(entry);
    this.lastUpdateTime = new Date();
    
    const metrics = this.calculateIncrementalMetrics();
    
    // Cache the result
    metricsCache.set(this.sessionId, metrics);
    
    console.log(`📊 REAL-TIME METRICS UPDATE: Session ${this.sessionId} - ${metrics.entryCount} entries - Confidence: ${metrics.confidence}%`);
    
    return metrics;
  }

  // Get current metrics without adding new entries
  public getCurrentMetrics(): IncrementalMetrics | null {
    const cached = metricsCache.get(this.sessionId);
    if (cached) {
      // Update session progress based on current time
      const elapsed = new Date().getTime() - this.sessionStartTime.getTime();
      const elapsedMinutes = elapsed / (1000 * 60);
      cached.sessionProgress = Math.min(100, (elapsedMinutes / this.sessionDurationMinutes) * 100);
    }
    return cached;
  }

  // Calculate incremental metrics based on current transcript
  private calculateIncrementalMetrics(): IncrementalMetrics {
    const fullTranscript = this.transcriptEntries
      .map(entry => `${entry.speaker.toUpperCase()}: ${entry.text}`)
      .join('\n');

    // Base scores start lower for incremental calculation
    const baseScore = 45;
    const entryCount = this.transcriptEntries.length;
    
    // Calculate confidence based on data available
    const confidence = this.calculateConfidence(entryCount);
    
    // Use the same phrase analysis as full metrics but with adjusted base
    const metrics = this.analyzeTranscriptForIncrementalMetrics(fullTranscript, baseScore);
    
    // Calculate session progress
    const elapsed = new Date().getTime() - this.sessionStartTime.getTime();
    const elapsedMinutes = elapsed / (1000 * 60);
    const sessionProgress = Math.min(100, (elapsedMinutes / this.sessionDurationMinutes) * 100);

    return {
      ...metrics,
      confidence,
      entryCount,
      sessionProgress
    };
  }

  // Calculate confidence level based on amount of data available
  private calculateConfidence(entryCount: number): number {
    // Confidence increases with more conversation data
    if (entryCount < 3) return 20; // Very low confidence
    if (entryCount < 6) return 40; // Low confidence
    if (entryCount < 10) return 60; // Medium confidence
    if (entryCount < 20) return 80; // High confidence
    return 95; // Very high confidence
  }

  // Adapted metrics analysis for incremental calculation
  private analyzeTranscriptForIncrementalMetrics(transcript: string, baseScore = 45): Omit<IncrementalMetrics, 'confidence' | 'entryCount' | 'sessionProgress'> {
    if (!transcript || transcript.trim().length === 0) {
      return {
        activeListeningScore: baseScore,
        expressingNeedsScore: baseScore,
        conflictResolutionScore: baseScore,
        emotionalSupportScore: baseScore,
        communicationScore: baseScore,
        closenessScore: baseScore
      };
    }

    // Initialize scores
    let activeListeningScore = baseScore;
    let expressingNeedsScore = baseScore;
    let conflictResolutionScore = baseScore;
    let emotionalSupportScore = baseScore;

    const transcriptLower = transcript.toLowerCase();

    // Core therapeutic phrases (subset of full analysis for performance)
    const activeListeningPhrases = [
      'i understand', 'i hear you', 'what i\'m hearing is', 'it sounds like',
      'you feel', 'you\'re saying', 'let me understand', 'tell me more',
      'from your perspective', 'sounds like you feel', 'that makes sense'
    ];

    const expressingNeedsPhrases = [
      'i need', 'i want', 'i feel', 'i would like', 'from my perspective',
      'my concern is', 'it\'s important to me', 'i wish', 'i prefer',
      'what matters to me', 'i hope', 'i\'m asking for'
    ];

    const conflictResolutionPhrases = [
      'let\'s find a solution', 'we can compromise', 'middle ground', 'agree to',
      'resolve this', 'work together', 'common goal', 'both of us',
      'find a way forward', 'what if we', 'meet halfway'
    ];

    const emotionalSupportPhrases = [
      'i\'m here for you', 'i support you', 'thank you for sharing', 'i appreciate',
      'that must be difficult', 'i care about', 'your feelings matter', 'i\'m sorry',
      'i understand this is hard', 'that\'s valid', 'i believe in you'
    ];

    // Add therapy-specific phrases
    if (this.therapyType === 'family') {
      activeListeningPhrases.push(...['as a family', 'family dynamic', 'family system']);
      expressingNeedsPhrases.push(...['as a parent', 'as a child', 'our family needs']);
      conflictResolutionPhrases.push(...['family meeting', 'family discussion', 'family agreement']);
      emotionalSupportPhrases.push(...['family bond', 'family connection', 'family support']);
    } else {
      activeListeningPhrases.push(...['as a couple', 'in your relationship', 'partner\'s perspective']);
      expressingNeedsPhrases.push(...['in our relationship', 'as your partner', 'our connection']);
      conflictResolutionPhrases.push(...['as a couple', 'relationship compromise', 'relationship goals']);
      emotionalSupportPhrases.push(...['partner support', 'relationship bond', 'love language']);
    }

    // Count phrase occurrences with incremental scoring
    const scoreMultiplier = Math.min(2.5, 1 + (this.transcriptEntries.length / 10)); // Dynamic multiplier
    
    activeListeningPhrases.forEach(phrase => {
      const matches = (transcriptLower.match(new RegExp(phrase, 'g')) || []).length;
      activeListeningScore += matches * (2 * scoreMultiplier);
    });

    expressingNeedsPhrases.forEach(phrase => {
      const matches = (transcriptLower.match(new RegExp(phrase, 'g')) || []).length;
      expressingNeedsScore += matches * (2 * scoreMultiplier);
    });

    conflictResolutionPhrases.forEach(phrase => {
      const matches = (transcriptLower.match(new RegExp(phrase, 'g')) || []).length;
      conflictResolutionScore += matches * (3 * scoreMultiplier);
    });

    emotionalSupportPhrases.forEach(phrase => {
      const matches = (transcriptLower.match(new RegExp(phrase, 'g')) || []).length;
      emotionalSupportScore += matches * (2 * scoreMultiplier);
    });

    // Normalize scores to max of 100
    activeListeningScore = Math.min(100, activeListeningScore);
    expressingNeedsScore = Math.min(100, expressingNeedsScore);
    conflictResolutionScore = Math.min(100, conflictResolutionScore);
    emotionalSupportScore = Math.min(100, emotionalSupportScore);

    // Apply therapy type adjustments
    if (this.therapyType === 'family') {
      activeListeningScore = Math.min(100, activeListeningScore + 3);
      conflictResolutionScore = Math.min(100, conflictResolutionScore + 2);
    } else {
      emotionalSupportScore = Math.min(100, emotionalSupportScore + 3);
      expressingNeedsScore = Math.min(100, expressingNeedsScore + 2);
    }

    // Calculate aggregate scores
    let communicationScore, closenessScore;

    if (this.therapyType === 'family') {
      communicationScore = Math.min(100, Math.floor(
        (activeListeningScore * 0.4 + expressingNeedsScore * 0.3 + conflictResolutionScore * 0.3)
      ));
      closenessScore = Math.min(100, Math.floor(
        (emotionalSupportScore * 0.6 + activeListeningScore * 0.4)
      ));
    } else {
      communicationScore = Math.min(100, Math.floor(
        (activeListeningScore * 0.35 + expressingNeedsScore * 0.35 + conflictResolutionScore * 0.3)
      ));
      closenessScore = Math.min(100, Math.floor(
        (emotionalSupportScore * 0.7 + activeListeningScore * 0.3)
      ));
    }

    return {
      activeListeningScore,
      expressingNeedsScore,
      conflictResolutionScore,
      emotionalSupportScore,
      communicationScore,
      closenessScore
    };
  }

  // Cleanup cache entry when session ends
  public cleanupSession(): void {
    metricsCache.delete(this.sessionId);
    console.log(`🧹 CLEANUP: Removed metrics cache for session ${this.sessionId}`);
  }

  // Static method to get metrics for any session
  static getMetricsForSession(sessionId: string): IncrementalMetrics | null {
    return metricsCache.get(sessionId);
  }

  // Static method to check if metrics should trigger an update
  static shouldTriggerUpdate(metrics: IncrementalMetrics): boolean {
    // Trigger updates when:
    // 1. We have meaningful confidence (>40%)
    // 2. There's been significant score movement
    // 3. Every 5 transcript entries for regular updates
    return (
      metrics.confidence > 40 ||
      metrics.entryCount % 5 === 0 ||
      metrics.communicationScore > 70 ||
      metrics.closenessScore > 70
    );
  }
}

// Export types for use in other components
export type { IncrementalMetrics, RealTimeMetricsOptions, TranscriptEntry };