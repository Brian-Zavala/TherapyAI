// metrics-validation.ts
// Advanced validation and confidence scoring for therapy session metrics

import type { IncrementalMetrics, TranscriptEntry } from '@/lib/real-time-metrics-optimized';

export interface MetricsQualityAssessment {
  overallConfidence: number;
  dataQuality: 'excellent' | 'good' | 'fair' | 'poor';
  reliabilityFactors: {
    conversationLength: number;
    speakerBalance: number;
    contentQuality: number;
    temporalConsistency: number;
    therapeuticAlignment: number;
  };
  recommendations: string[];
  warnings: string[];
  qualityFlags: {
    insufficientData: boolean;
    unbalancedConversation: boolean;
    repetitiveContent: boolean;
    inconsistentScoring: boolean;
    technicalIssues: boolean;
  };
}

export interface ValidationResult {
  isValid: boolean;
  confidence: number;
  qualityAssessment: MetricsQualityAssessment;
  adjustedMetrics?: IncrementalMetrics;
  validationNotes: string[];
}

export class MetricsValidator {
  private readonly MIN_CONVERSATION_LENGTH = 5; // Minimum transcript entries
  private readonly MIN_SPEAKER_BALANCE = 0.2; // 20% minimum for either speaker
  private readonly MAX_REPETITION_THRESHOLD = 0.7; // 70% similarity threshold
  private readonly MIN_SESSION_DURATION = 2; // Minimum 2 minutes for meaningful metrics

  // Validate metrics and provide quality assessment
  public validateMetrics(
    metrics: IncrementalMetrics,
    transcriptEntries: TranscriptEntry[],
    sessionDurationMinutes: number
  ): ValidationResult {
    const qualityAssessment = this.assessMetricsQuality(metrics, transcriptEntries, sessionDurationMinutes);
    const adjustedMetrics = this.adjustMetricsBasedOnQuality(metrics, qualityAssessment);
    
    const isValid = qualityAssessment.overallConfidence >= 40 && !this.hasCriticalFlags(qualityAssessment);
    
    const validationNotes = this.generateValidationNotes(qualityAssessment, isValid);

    return {
      isValid,
      confidence: qualityAssessment.overallConfidence,
      qualityAssessment,
      adjustedMetrics,
      validationNotes
    };
  }

  // Comprehensive quality assessment
  private assessMetricsQuality(
    metrics: IncrementalMetrics,
    transcriptEntries: TranscriptEntry[],
    sessionDurationMinutes: number
  ): MetricsQualityAssessment {
    const reliabilityFactors = {
      conversationLength: this.assessConversationLength(transcriptEntries),
      speakerBalance: this.assessSpeakerBalance(transcriptEntries),
      contentQuality: this.assessContentQuality(transcriptEntries),
      temporalConsistency: this.assessTemporalConsistency(transcriptEntries, sessionDurationMinutes),
      therapeuticAlignment: this.assessTherapeuticAlignment(transcriptEntries, metrics)
    };

    const qualityFlags = {
      insufficientData: transcriptEntries.length < this.MIN_CONVERSATION_LENGTH,
      unbalancedConversation: reliabilityFactors.speakerBalance < this.MIN_SPEAKER_BALANCE,
      repetitiveContent: reliabilityFactors.contentQuality < 0.6,
      inconsistentScoring: this.detectScoringInconsistencies(metrics),
      technicalIssues: this.detectTechnicalIssues(transcriptEntries, sessionDurationMinutes)
    };

    // Calculate overall confidence as weighted average
    const overallConfidence = Math.round(
      reliabilityFactors.conversationLength * 0.25 +
      reliabilityFactors.speakerBalance * 0.2 +
      reliabilityFactors.contentQuality * 0.2 +
      reliabilityFactors.temporalConsistency * 0.15 +
      reliabilityFactors.therapeuticAlignment * 0.2
    );

    const dataQuality = this.determineDataQuality(overallConfidence);
    const recommendations = this.generateRecommendations(reliabilityFactors, qualityFlags);
    const warnings = this.generateWarnings(qualityFlags, overallConfidence);

    return {
      overallConfidence,
      dataQuality,
      reliabilityFactors,
      recommendations,
      warnings,
      qualityFlags
    };
  }

  // Assess conversation length adequacy
  private assessConversationLength(transcriptEntries: TranscriptEntry[]): number {
    const entryCount = transcriptEntries.length;
    
    if (entryCount >= 20) return 100; // Excellent data volume
    if (entryCount >= 15) return 85;  // Good data volume
    if (entryCount >= 10) return 70;  // Fair data volume
    if (entryCount >= 5) return 50;   // Minimal acceptable data
    return 20; // Insufficient data
  }

  // Assess balance between speakers
  private assessSpeakerBalance(transcriptEntries: TranscriptEntry[]): number {
    if (transcriptEntries.length === 0) return 0;

    const userEntries = transcriptEntries.filter(entry => entry.speaker === 'user').length;
    const assistantEntries = transcriptEntries.filter(entry => entry.speaker === 'assistant').length;
    
    const userRatio = userEntries / transcriptEntries.length;
    const assistantRatio = assistantEntries / transcriptEntries.length;
    
    // Ideal balance is around 50/50, but therapeutic conversations often have more client speech
    // Acceptable range: 30-70% for either speaker
    const balance = Math.min(userRatio, assistantRatio);
    
    if (balance >= 0.4) return 100; // Excellent balance
    if (balance >= 0.3) return 80;  // Good balance
    if (balance >= 0.2) return 60;  // Fair balance
    if (balance >= 0.1) return 40;  // Poor balance
    return 20; // Very poor balance
  }

  // Assess content quality and diversity
  private assessContentQuality(transcriptEntries: TranscriptEntry[]): number {
    if (transcriptEntries.length === 0) return 0;

    let qualityScore = 50; // Base score

    // Check for content diversity
    const uniqueWords = new Set<string>();
    let totalWords = 0;
    let meaningfulEntries = 0;

    for (const entry of transcriptEntries) {
      const words = entry.text.toLowerCase().split(/\s+/).filter(word => word.length > 2);
      totalWords += words.length;
      
      if (words.length >= 3) meaningfulEntries++;
      
      words.forEach(word => uniqueWords.add(word));
    }

    // Vocabulary diversity (higher is better)
    const vocabularyDiversity = totalWords > 0 ? uniqueWords.size / totalWords : 0;
    qualityScore += vocabularyDiversity * 30;

    // Meaningful entry ratio
    const meaningfulRatio = meaningfulEntries / transcriptEntries.length;
    qualityScore += meaningfulRatio * 20;

    // Check for repetitive patterns
    const repetitionPenalty = this.detectRepetitiveContent(transcriptEntries);
    qualityScore -= repetitionPenalty;

    return Math.max(0, Math.min(100, qualityScore));
  }

  // Assess temporal consistency
  private assessTemporalConsistency(transcriptEntries: TranscriptEntry[], sessionDurationMinutes: number): number {
    if (transcriptEntries.length === 0 || sessionDurationMinutes < this.MIN_SESSION_DURATION) return 30;

    // Check if entries are distributed reasonably over time
    const expectedEntriesPerMinute = transcriptEntries.length / sessionDurationMinutes;
    
    // Reasonable conversation flow: 1-8 entries per minute
    if (expectedEntriesPerMinute >= 1 && expectedEntriesPerMinute <= 8) return 100;
    if (expectedEntriesPerMinute >= 0.5 && expectedEntriesPerMinute <= 10) return 80;
    if (expectedEntriesPerMinute >= 0.3 && expectedEntriesPerMinute <= 12) return 60;
    return 40;
  }

  // Assess therapeutic alignment
  private assessTherapeuticAlignment(transcriptEntries: TranscriptEntry[], metrics: IncrementalMetrics): number {
    let alignmentScore = 50; // Base score

    // Check for therapeutic language patterns
    const therapeuticPatterns = [
      /\b(feel|feeling|emotion|understand|support|listen|share|express|communicate|relationship)\b/gi,
      /\b(progress|goal|challenge|growth|insight|aware|realize|learn|change|improve)\b/gi,
      /\b(together|partnership|connection|trust|respect|love|care|appreciate)\b/gi
    ];

    let therapeuticMatches = 0;
    let totalText = '';

    transcriptEntries.forEach(entry => {
      totalText += entry.text + ' ';
      therapeuticPatterns.forEach(pattern => {
        const matches = entry.text.match(pattern);
        if (matches) therapeuticMatches += matches.length;
      });
    });

    // Higher therapeutic language indicates better alignment
    const therapeuticDensity = totalText.length > 0 ? therapeuticMatches / (totalText.split(' ').length / 100) : 0;
    alignmentScore += Math.min(30, therapeuticDensity * 10);

    // Check if metrics align with conversation content
    const avgScore = (metrics.activeListeningScore + metrics.expressingNeedsScore + 
                     metrics.conflictResolutionScore + metrics.emotionalSupportScore) / 4;
    
    // If scores are very high but conversation is short/poor, reduce alignment
    if (avgScore > 80 && transcriptEntries.length < 10) {
      alignmentScore -= 20;
    }

    return Math.max(0, Math.min(100, alignmentScore));
  }

  // Detect repetitive content
  private detectRepetitiveContent(transcriptEntries: TranscriptEntry[]): number {
    if (transcriptEntries.length < 3) return 0;

    let repetitionPenalty = 0;
    const entryTexts = transcriptEntries.map(entry => entry.text.toLowerCase());

    for (let i = 0; i < entryTexts.length - 1; i++) {
      for (let j = i + 1; j < entryTexts.length; j++) {
        const similarity = this.calculateTextSimilarity(entryTexts[i], entryTexts[j]);
        if (similarity > this.MAX_REPETITION_THRESHOLD) {
          repetitionPenalty += 10;
        }
      }
    }

    return Math.min(50, repetitionPenalty); // Cap penalty at 50 points
  }

  // Calculate text similarity
  private calculateTextSimilarity(text1: string, text2: string): number {
    const words1 = new Set(text1.split(/\s+/));
    const words2 = new Set(text2.split(/\s+/));
    
    const intersection = new Set([...words1].filter(word => words2.has(word)));
    const union = new Set([...words1, ...words2]);
    
    return union.size > 0 ? intersection.size / union.size : 0;
  }

  // Detect scoring inconsistencies
  private detectScoringInconsistencies(metrics: IncrementalMetrics): boolean {
    const scores = [
      metrics.activeListeningScore,
      metrics.expressingNeedsScore,
      metrics.conflictResolutionScore,
      metrics.emotionalSupportScore
    ];

    // Check for impossible score patterns
    const allPerfect = scores.every(score => score >= 95);
    const allLow = scores.every(score => score <= 30);
    const extremeVariation = Math.max(...scores) - Math.min(...scores) > 70;

    return allPerfect || allLow || extremeVariation;
  }

  // Detect technical issues
  private detectTechnicalIssues(transcriptEntries: TranscriptEntry[], sessionDurationMinutes: number): boolean {
    // Check for timing issues
    if (sessionDurationMinutes > 0 && transcriptEntries.length === 0) return true;
    
    // Check for malformed entries
    const malformedEntries = transcriptEntries.filter(entry => 
      !entry.text || entry.text.trim().length < 2 || !entry.timestamp || !entry.speaker
    );
    
    return malformedEntries.length > transcriptEntries.length * 0.2; // More than 20% malformed
  }

  // Determine overall data quality category
  private determineDataQuality(confidence: number): 'excellent' | 'good' | 'fair' | 'poor' {
    if (confidence >= 85) return 'excellent';
    if (confidence >= 70) return 'good';
    if (confidence >= 50) return 'fair';
    return 'poor';
  }

  // Generate actionable recommendations
  private generateRecommendations(
    reliabilityFactors: MetricsQualityAssessment['reliabilityFactors'],
    qualityFlags: MetricsQualityAssessment['qualityFlags']
  ): string[] {
    const recommendations: string[] = [];

    if (reliabilityFactors.conversationLength < 70) {
      recommendations.push("Encourage longer conversation sessions for more accurate metrics");
    }

    if (reliabilityFactors.speakerBalance < 60) {
      recommendations.push("Aim for more balanced participation between speakers");
    }

    if (reliabilityFactors.contentQuality < 60) {
      recommendations.push("Focus on deeper, more varied therapeutic conversations");
    }

    if (reliabilityFactors.therapeuticAlignment < 70) {
      recommendations.push("Incorporate more therapeutic language and techniques");
    }

    if (qualityFlags.repetitiveContent) {
      recommendations.push("Explore new topics and conversation directions");
    }

    return recommendations;
  }

  // Generate quality warnings
  private generateWarnings(
    qualityFlags: MetricsQualityAssessment['qualityFlags'],
    confidence: number
  ): string[] {
    const warnings: string[] = [];

    if (qualityFlags.insufficientData) {
      warnings.push("Insufficient conversation data - metrics may be unreliable");
    }

    if (qualityFlags.unbalancedConversation) {
      warnings.push("Conversation is heavily dominated by one speaker");
    }

    if (qualityFlags.technicalIssues) {
      warnings.push("Technical issues detected - some data may be corrupted");
    }

    if (qualityFlags.inconsistentScoring) {
      warnings.push("Scoring patterns appear inconsistent - review session quality");
    }

    if (confidence < 50) {
      warnings.push("Low confidence metrics - use for reference only");
    }

    return warnings;
  }

  // Check for critical quality flags
  private hasCriticalFlags(assessment: MetricsQualityAssessment): boolean {
    return assessment.qualityFlags.technicalIssues || 
           assessment.qualityFlags.insufficientData ||
           assessment.overallConfidence < 30;
  }

  // Adjust metrics based on quality assessment
  private adjustMetricsBasedOnQuality(
    metrics: IncrementalMetrics,
    assessment: MetricsQualityAssessment
  ): IncrementalMetrics {
    const adjustmentFactor = assessment.overallConfidence / 100;
    
    // Apply conservative adjustments for low-quality data
    if (assessment.dataQuality === 'poor' || assessment.dataQuality === 'fair') {
      const conservativeAdjustment = 0.8; // Reduce scores by 20%
      
      return {
        ...metrics,
        activeListeningScore: Math.round(metrics.activeListeningScore * conservativeAdjustment),
        expressingNeedsScore: Math.round(metrics.expressingNeedsScore * conservativeAdjustment),
        conflictResolutionScore: Math.round(metrics.conflictResolutionScore * conservativeAdjustment),
        emotionalSupportScore: Math.round(metrics.emotionalSupportScore * conservativeAdjustment),
        communicationScore: Math.round(metrics.communicationScore * conservativeAdjustment),
        closenessScore: Math.round(metrics.closenessScore * conservativeAdjustment),
        confidence: Math.round(metrics.confidence * adjustmentFactor)
      };
    }

    return metrics;
  }

  // Generate comprehensive validation notes
  private generateValidationNotes(assessment: MetricsQualityAssessment, isValid: boolean): string[] {
    const notes: string[] = [];

    notes.push(`Overall confidence: ${assessment.overallConfidence}% (${assessment.dataQuality})`);
    notes.push(`Conversation length: ${assessment.reliabilityFactors.conversationLength}%`);
    notes.push(`Speaker balance: ${assessment.reliabilityFactors.speakerBalance}%`);
    notes.push(`Content quality: ${assessment.reliabilityFactors.contentQuality}%`);

    if (!isValid) {
      notes.push("⚠️ Metrics validation failed - use with caution");
    }

    if (assessment.warnings.length > 0) {
      notes.push(`Warnings: ${assessment.warnings.join('; ')}`);
    }

    return notes;
  }
}

// Export singleton instance
export const metricsValidator = new MetricsValidator();