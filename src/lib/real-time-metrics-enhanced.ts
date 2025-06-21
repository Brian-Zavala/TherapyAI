import { TranscriptEntry } from '@/types/therapy-session'

// Enhanced metrics types matching new schema
export interface EnhancedCommunicationMetrics {
  clarity: number
  empathy: number
  respect: number
  overall: number
  listening: number
  expression: number
  conflict: number
  confidence: number
  entryCount: number
  userWordCount: number
  assistantWordCount: number
  lastUpdated: string
  sessionDuration: number
  participantCount: number
  familyMemberIds?: string[]
}

// Enhanced keyword patterns with weighted scoring
const METRIC_PATTERNS = {
  clarity: {
    positive: [
      { pattern: /\b(understand|clear|explain|specific|detail|example)\b/gi, weight: 1.5 },
      { pattern: /\b(let me clarify|to be clear|what I mean)\b/gi, weight: 2.0 },
      { pattern: /\b(point|intention|purpose|goal)\b/gi, weight: 1.2 },
    ],
    negative: [
      { pattern: /\b(confused|unclear|vague|don't understand)\b/gi, weight: -1.5 },
      { pattern: /\b(mixed signals|ambiguous|uncertain)\b/gi, weight: -1.8 },
    ],
  },
  empathy: {
    positive: [
      { pattern: /\b(feel|feeling|understand how|empathize|relate)\b/gi, weight: 1.8 },
      { pattern: /\b(perspective|point of view|shoes|experience)\b/gi, weight: 1.5 },
      { pattern: /\b(validate|acknowledge|appreciate|recognize)\b/gi, weight: 2.0 },
      { pattern: /\b(must be|sounds like|hear you)\b/gi, weight: 1.6 },
    ],
    negative: [
      { pattern: /\b(don't care|insensitive|cold|dismissive)\b/gi, weight: -2.0 },
      { pattern: /\b(ignore|overlook|minimize)\b/gi, weight: -1.8 },
    ],
  },
  respect: {
    positive: [
      { pattern: /\b(respect|value|appreciate|honor|dignity)\b/gi, weight: 2.0 },
      { pattern: /\b(thank you|please|considerate|thoughtful)\b/gi, weight: 1.5 },
      { pattern: /\b(boundaries|space|choice|decision)\b/gi, weight: 1.6 },
    ],
    negative: [
      { pattern: /\b(disrespect|rude|inconsiderate|belittle)\b/gi, weight: -2.0 },
      { pattern: /\b(interrupt|dismiss|ignore|mock)\b/gi, weight: -1.8 },
      { pattern: /\b(always|never|stupid|crazy)\b/gi, weight: -1.5 },
    ],
  },
  listening: {
    positive: [
      { pattern: /\b(hear|heard|listen|listening)\b/gi, weight: 1.8 },
      { pattern: /\b(tell me more|go on|continue|elaborate)\b/gi, weight: 2.0 },
      { pattern: /\b(noted|understood|got it|I see)\b/gi, weight: 1.5 },
      { pattern: /\b(reflect|paraphrase|summarize)\b/gi, weight: 1.8 },
    ],
    negative: [
      { pattern: /\b(not listening|tuned out|ignored|didn't hear)\b/gi, weight: -2.0 },
      { pattern: /\b(interrupt|talk over|cut off)\b/gi, weight: -1.8 },
    ],
  },
  expression: {
    positive: [
      { pattern: /\bI (feel|think|believe|want|need)\b/gi, weight: 1.8 },
      { pattern: /\b(express|share|communicate|convey)\b/gi, weight: 1.5 },
      { pattern: /\b(open|honest|transparent|authentic)\b/gi, weight: 2.0 },
    ],
    negative: [
      { pattern: /\b(bottle up|hold back|suppress|hide)\b/gi, weight: -1.8 },
      { pattern: /\b(shut down|close off|withdraw)\b/gi, weight: -2.0 },
    ],
  },
  conflict: {
    positive: [
      { pattern: /\b(resolve|solution|compromise|work together)\b/gi, weight: 2.0 },
      { pattern: /\b(common ground|agree|consensus|collaborate)\b/gi, weight: 1.8 },
      { pattern: /\b(calm|peaceful|constructive)\b/gi, weight: 1.5 },
    ],
    negative: [
      { pattern: /\b(fight|argue|conflict|dispute)\b/gi, weight: -1.5 },
      { pattern: /\b(blame|fault|attack|criticize)\b/gi, weight: -2.0 },
      { pattern: /\b(yell|scream|hostile|aggressive)\b/gi, weight: -2.5 },
    ],
  },
}

export class EnhancedRealTimeMetricsCalculator {
  private sessionId: string
  private userId: string
  private therapyType: 'couple' | 'solo' | 'family'
  private sessionDurationMinutes: number
  private startTime: number
  private transcriptEntries: TranscriptEntry[] = []
  private currentMetrics: EnhancedCommunicationMetrics
  private scoreHistory: Map<string, number[]> = new Map()
  private familyMemberIds: string[] = []

  constructor(config: {
    sessionId: string
    userId: string
    therapyType?: 'couple' | 'solo' | 'family'
    sessionDurationMinutes?: number
    familyMemberIds?: string[]
  }) {
    this.sessionId = config.sessionId
    this.userId = config.userId
    this.therapyType = config.therapyType || 'couple'
    this.sessionDurationMinutes = config.sessionDurationMinutes || 60
    this.startTime = Date.now()
    this.familyMemberIds = config.familyMemberIds || []

    // Initialize metrics based on therapy type
    const baseScore = this.getBaseScoreForTherapyType()
    this.currentMetrics = {
      clarity: baseScore,
      empathy: baseScore,
      respect: baseScore,
      overall: baseScore,
      listening: baseScore,
      expression: baseScore,
      conflict: baseScore,
      confidence: 0,
      entryCount: 0,
      userWordCount: 0,
      assistantWordCount: 0,
      lastUpdated: new Date().toISOString(),
      sessionDuration: this.sessionDurationMinutes,
      participantCount: this.familyMemberIds.length || 2,
      familyMemberIds: this.familyMemberIds,
    }

    // Initialize score history
    Object.keys(METRIC_PATTERNS).forEach(metric => {
      this.scoreHistory.set(metric, [baseScore])
    })
  }

  private getBaseScoreForTherapyType(): number {
    switch (this.therapyType) {
      case 'solo':
        return 70 // Higher base for individual therapy
      case 'family':
        return 55 // Lower base for complex family dynamics
      default:
        return 60 // Couple therapy baseline
    }
  }

  async addTranscriptEntry(entry: TranscriptEntry): Promise<EnhancedCommunicationMetrics> {
    this.transcriptEntries.push(entry)

    // Update word counts
    const wordCount = entry.text.split(/\s+/).filter(w => w.length > 0).length
    if (entry.speaker === 'user') {
      this.currentMetrics.userWordCount += wordCount
    } else {
      this.currentMetrics.assistantWordCount += wordCount
    }

    // Calculate metrics for this entry
    const entryMetrics = this.calculateEntryMetrics(entry)
    
    // Update rolling averages with weighted history
    this.updateMetricsWithHistory(entryMetrics)
    
    // Calculate confidence based on data quality
    this.updateConfidence()
    
    // Update metadata
    this.currentMetrics.entryCount++
    this.currentMetrics.lastUpdated = new Date().toISOString()

    // Save to database periodically (every 10 entries)
    if (this.currentMetrics.entryCount % 10 === 0) {
      await this.persistMetrics()
    }

    return { ...this.currentMetrics }
  }

  private calculateEntryMetrics(entry: TranscriptEntry): Partial<EnhancedCommunicationMetrics> {
    const text = entry.text.toLowerCase()
    const metrics: Partial<EnhancedCommunicationMetrics> = {}

    // Calculate each metric based on pattern matching
    Object.entries(METRIC_PATTERNS).forEach(([metricName, patterns]) => {
      let score = 0
      let matchCount = 0

      // Check positive patterns
      patterns.positive.forEach(({ pattern, weight }) => {
        const matches = text.match(pattern)
        if (matches) {
          score += matches.length * weight
          matchCount += matches.length
        }
      })

      // Check negative patterns
      patterns.negative.forEach(({ pattern, weight }) => {
        const matches = text.match(pattern)
        if (matches) {
          score += matches.length * weight // weight is already negative
          matchCount += matches.length
        }
      })

      // Normalize score based on text length and match density
      const textLength = text.split(/\s+/).length
      const density = matchCount / Math.max(textLength, 1)
      
      // Base score from current value
      const currentScore = this.currentMetrics[metricName as keyof typeof METRIC_PATTERNS] || 60
      
      // Calculate new score with bounded change
      const impact = Math.min(Math.max(score * density * 10, -15), 15) // Limit change per entry
      const newScore = Math.min(Math.max(currentScore + impact, 0), 100)
      
      metrics[metricName as keyof typeof metrics] = newScore
    })

    // Apply therapy type modifiers
    if (this.therapyType === 'family' && this.familyMemberIds.length > 2) {
      // Family sessions with many participants have different dynamics
      metrics.clarity = (metrics.clarity || 50) * 0.9 // Harder to maintain clarity
      metrics.conflict = (metrics.conflict || 50) * 0.85 // More potential for conflict
    }

    return metrics
  }

  private updateMetricsWithHistory(newMetrics: Partial<EnhancedCommunicationMetrics>) {
    const smoothingFactor = 0.3 // How much weight to give new values

    Object.entries(newMetrics).forEach(([metric, value]) => {
      if (typeof value === 'number' && metric in METRIC_PATTERNS) {
        // Get history for this metric
        const history = this.scoreHistory.get(metric) || []
        history.push(value)
        
        // Keep only recent history (last 20 entries)
        if (history.length > 20) {
          history.shift()
        }
        
        // Calculate weighted average with recency bias
        const weightedSum = history.reduce((sum, val, idx) => {
          const weight = Math.pow(1.1, idx) // Exponential weight for recency
          return sum + val * weight
        }, 0)
        
        const totalWeight = history.reduce((sum, _, idx) => {
          return sum + Math.pow(1.1, idx)
        }, 0)
        
        const smoothedValue = weightedSum / totalWeight
        
        // Update current metric
        this.currentMetrics[metric as keyof EnhancedCommunicationMetrics] = 
          Math.round(smoothedValue * 10) / 10
      }
    })

    // Calculate overall score as weighted average
    this.currentMetrics.overall = this.calculateOverallScore()
  }

  private calculateOverallScore(): number {
    const weights = {
      clarity: 0.20,
      empathy: 0.25,
      respect: 0.20,
      listening: 0.15,
      expression: 0.10,
      conflict: 0.10,
    }

    const weightedSum = Object.entries(weights).reduce((sum, [metric, weight]) => {
      const value = this.currentMetrics[metric as keyof typeof weights] || 0
      return sum + value * weight
    }, 0)

    return Math.round(weightedSum * 10) / 10
  }

  private updateConfidence() {
    // Confidence based on multiple factors
    const factors = {
      entryCount: Math.min(this.currentMetrics.entryCount / 20, 1), // Max at 20 entries
      balance: this.calculateSpeakerBalance(),
      duration: Math.min((Date.now() - this.startTime) / (10 * 60 * 1000), 1), // Max at 10 min
      wordCount: Math.min((this.currentMetrics.userWordCount + this.currentMetrics.assistantWordCount) / 500, 1),
    }

    // Weighted confidence calculation
    const confidence = 
      factors.entryCount * 0.3 +
      factors.balance * 0.2 +
      factors.duration * 0.2 +
      factors.wordCount * 0.3

    this.currentMetrics.confidence = Math.round(confidence * 100)
  }

  private calculateSpeakerBalance(): number {
    const total = this.currentMetrics.userWordCount + this.currentMetrics.assistantWordCount
    if (total === 0) return 0
    
    const userRatio = this.currentMetrics.userWordCount / total
    // Ideal is 40-60% user participation
    if (userRatio >= 0.4 && userRatio <= 0.6) return 1
    if (userRatio >= 0.3 && userRatio <= 0.7) return 0.8
    return 0.6
  }

  private async persistMetrics() {
    try {
      const response = await fetch('/api/dashboard/metrics/enhanced', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: this.sessionId,
          metrics: {
            clarity: this.currentMetrics.clarity,
            empathy: this.currentMetrics.empathy,
            respect: this.currentMetrics.respect,
            overall: this.currentMetrics.overall,
            listening: this.currentMetrics.listening,
            expression: this.currentMetrics.expression,
            conflict: this.currentMetrics.conflict,
          },
        }),
      })

      if (!response.ok) {
        console.error('Failed to persist metrics:', await response.text())
      }
    } catch (error) {
      console.error('Error persisting metrics:', error)
    }
  }

  async finalizeSession(): Promise<EnhancedCommunicationMetrics> {
    // Persist final metrics
    await this.persistMetrics()
    
    // Mark confidence as 100 for completed session
    this.currentMetrics.confidence = 100
    
    return { ...this.currentMetrics }
  }

  getTranscriptSummary() {
    return {
      entries: this.transcriptEntries,
      totalEntries: this.transcriptEntries.length,
      userEntries: this.transcriptEntries.filter(e => e.speaker === 'user').length,
      assistantEntries: this.transcriptEntries.filter(e => e.speaker === 'assistant').length,
      sessionDuration: Math.floor((Date.now() - this.startTime) / 1000),
    }
  }

  cleanupSession() {
    this.transcriptEntries = []
    this.scoreHistory.clear()
  }
}