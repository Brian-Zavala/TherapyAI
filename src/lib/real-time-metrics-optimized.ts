// real-time-metrics-optimized.ts
// Optimized real-time metrics calculation with debouncing and reduced regex operations

interface TranscriptEntry {
  speaker: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

export interface IncrementalMetrics {
  activeListeningScore: number;
  expressingNeedsScore: number;
  conflictResolutionScore: number;
  emotionalSupportScore: number;
  communicationScore: number;
  closenessScore: number;
  confidence: number;
  entryCount: number;
  sessionProgress: number;
}

interface RealTimeMetricsOptions {
  sessionId: string;
  therapyType: 'couple' | 'family' | 'solo';
  sessionDurationMinutes?: number;
  userId: string;
}

// Optimized cache with debouncing
const metricsCache = new Map<string, IncrementalMetrics>();
const debouncedCalculations = new Map<string, NodeJS.Timeout>();

export class RealTimeMetricsCalculator {
  private sessionId: string;
  private therapyType: 'couple' | 'family' | 'solo';
  private sessionDurationMinutes: number;
  private userId: string;
  private transcriptEntries: TranscriptEntry[] = [];
  private sessionStartTime: Date;
  private lastUpdateTime: Date;
  private calculationThreshold: number = 5; // Increased from 3 to reduce calculation frequency
  private debounceMs: number = 5000; // Increased from 2 to 5 seconds to reduce overhead

  constructor(options: RealTimeMetricsOptions) {
    this.sessionId = options.sessionId;
    this.therapyType = options.therapyType;
    this.sessionDurationMinutes = options.sessionDurationMinutes || 60;
    this.userId = options.userId;
    this.sessionStartTime = new Date();
    this.lastUpdateTime = new Date();
  }

  // Add transcript entry with optimized calculation
  public addTranscriptEntry(entry: TranscriptEntry): IncrementalMetrics {
    this.transcriptEntries.push(entry);
    this.lastUpdateTime = new Date();
    
    const entryCount = this.transcriptEntries.length;
    
    // Return cached metrics if we haven't reached threshold
    if (entryCount < this.calculationThreshold && entryCount > 1) {
      const cached = this.getCurrentMetrics();
      if (cached) {
        cached.entryCount = entryCount;
        console.log(`📊 METRICS: Using cached metrics (${entryCount}/${this.calculationThreshold})`);
        return cached;
      }
    }
    
    // Calculate only every N entries or if confidence is too low
    const shouldCalculate = 
      entryCount % this.calculationThreshold === 0 || 
      entryCount <= this.calculationThreshold ||
      this.getConfidence(entryCount) < 40;

    if (!shouldCalculate) {
      const cached = this.getCurrentMetrics();
      if (cached) {
        cached.entryCount = entryCount;
        console.log(`📊 METRICS: Calculated but not broadcasting (confidence: ${cached.confidence}%, entries: ${entryCount})`);
        return cached;
      }
    }

    // Debounce calculations to prevent excessive compute
    this.debouncedCalculate();
    
    // Return immediate metrics from cache or quick calculation
    return this.getQuickMetrics();
  }

  // Debounced calculation
  private debouncedCalculate(): void {
    const existingTimeout = debouncedCalculations.get(this.sessionId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    const timeout = setTimeout(() => {
      this.performCalculation();
      debouncedCalculations.delete(this.sessionId);
    }, this.debounceMs);

    debouncedCalculations.set(this.sessionId, timeout);
  }

  // Immediate lightweight calculation
  private getQuickMetrics(): IncrementalMetrics {
    const entryCount = this.transcriptEntries.length;
    const confidence = this.getConfidence(entryCount);
    const sessionProgress = this.getSessionProgress();

    // Use basic heuristics instead of regex for quick metrics
    const baseScore = 45 + Math.min(20, entryCount * 2);
    
    return {
      activeListeningScore: baseScore,
      expressingNeedsScore: baseScore,
      conflictResolutionScore: baseScore,
      emotionalSupportScore: baseScore,
      communicationScore: baseScore,
      closenessScore: baseScore,
      confidence,
      entryCount,
      sessionProgress
    };
  }

  // Full calculation (debounced)
  private performCalculation(): void {
    const metrics = this.calculateOptimizedMetrics();
    metricsCache.set(this.sessionId, metrics);
    
    console.log(`📊 OPTIMIZED METRICS: Session ${this.sessionId} - ${metrics.entryCount} entries - Confidence: ${metrics.confidence}%`);
  }

  // Optimized metrics calculation with reduced regex operations
  private calculateOptimizedMetrics(): IncrementalMetrics {
    const entryCount = this.transcriptEntries.length;
    const confidence = this.getConfidence(entryCount);
    const sessionProgress = this.getSessionProgress();

    if (entryCount === 0) {
      return this.getQuickMetrics();
    }

    // Combine all text for more efficient processing
    const fullText = this.transcriptEntries
      .map(entry => entry.text.toLowerCase())
      .join(' ');

    // Use simple string includes instead of regex where possible
    const scores = this.fastScoreCalculation(fullText, entryCount);

    return {
      ...scores,
      confidence,
      entryCount,
      sessionProgress
    };
  }

  // Fast scoring using string operations instead of regex
  private fastScoreCalculation(text: string, entryCount: number): Omit<IncrementalMetrics, 'confidence' | 'entryCount' | 'sessionProgress'> {
    const baseScore = 45;
    const scoreMultiplier = Math.min(2.5, 1 + (entryCount / 10));

    // Simple keyword counting (much faster than regex)
    const keywordScores = {
      activeListening: 0,
      expressingNeeds: 0,
      conflictResolution: 0,
      emotionalSupport: 0
    };

    // Optimized keyword lists (most common patterns only)
    const keywords = {
      activeListening: ['understand', 'hear you', 'sounds like', 'tell me more'],
      expressingNeeds: ['i need', 'i want', 'i feel', 'important to me'],
      conflictResolution: ['solution', 'compromise', 'work together', 'agree'],
      emotionalSupport: ['here for you', 'support', 'appreciate', 'difficult']
    };

    // Fast string matching
    Object.entries(keywords).forEach(([category, words]) => {
      words.forEach(word => {
        const occurrences = (text.split(word).length - 1);
        keywordScores[category as keyof typeof keywordScores] += occurrences;
      });
    });

    // Calculate scores with reduced complexity
    const activeListeningScore = Math.min(100, baseScore + (keywordScores.activeListening * scoreMultiplier * 2));
    const expressingNeedsScore = Math.min(100, baseScore + (keywordScores.expressingNeeds * scoreMultiplier * 2));
    const conflictResolutionScore = Math.min(100, baseScore + (keywordScores.conflictResolution * scoreMultiplier * 3));
    const emotionalSupportScore = Math.min(100, baseScore + (keywordScores.emotionalSupport * scoreMultiplier * 2));

    // Simple aggregate calculations
    const communicationScore = Math.min(100, Math.floor(
      (activeListeningScore * 0.35 + expressingNeedsScore * 0.35 + conflictResolutionScore * 0.3)
    ));
    
    const closenessScore = Math.min(100, Math.floor(
      (emotionalSupportScore * 0.7 + activeListeningScore * 0.3)
    ));

    return {
      activeListeningScore,
      expressingNeedsScore,
      conflictResolutionScore,
      emotionalSupportScore,
      communicationScore,
      closenessScore
    };
  }

  public getCurrentMetrics(): IncrementalMetrics | null {
    const cached = metricsCache.get(this.sessionId);
    if (cached) {
      // Update session progress
      cached.sessionProgress = this.getSessionProgress();
      return cached;
    }
    return null;
  }

  private getConfidence(entryCount: number): number {
    if (entryCount < 3) return 20;
    if (entryCount < 6) return 40;
    if (entryCount < 10) return 60;
    if (entryCount < 20) return 80;
    return 95;
  }

  private getSessionProgress(): number {
    const elapsed = new Date().getTime() - this.sessionStartTime.getTime();
    const elapsedMinutes = elapsed / (1000 * 60);
    return Math.min(100, (elapsedMinutes / this.sessionDurationMinutes) * 100);
  }

  public cleanupSession(): void {
    // Clear debounced calculations
    const timeout = debouncedCalculations.get(this.sessionId);
    if (timeout) {
      clearTimeout(timeout);
      debouncedCalculations.delete(this.sessionId);
    }
    
    // Clear cache
    metricsCache.delete(this.sessionId);
    console.log(`🧹 OPTIMIZED CLEANUP: Removed metrics cache and timeouts for session ${this.sessionId}`);
  }

  // Force immediate calculation (bypass debouncing)
  public forceCalculation(): IncrementalMetrics {
    const metrics = this.calculateOptimizedMetrics();
    metricsCache.set(this.sessionId, metrics);
    return metrics;
  }

  static getMetricsForSession(sessionId: string): IncrementalMetrics | null {
    return metricsCache.get(sessionId) || null;
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

// Export helper types
export type { TranscriptEntry };