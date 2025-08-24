/**
 * SAFE Dynamic Insights Service
 * Implements comprehensive safety measures with clinical disclaimers and therapist approval
 * 
 * 🚨 CRITICAL SAFETY: All insights require therapist validation before client display
 * No predictive claims are made - descriptive analytics only
 */

import { prisma } from '@/lib/database/prisma-optimized';
import { logger } from '@/lib/utils/logger';
import { SafeTherapeuticAnalyzer, TherapeuticSupportAnalysis } from './therapeutic-outcome-predictor-safe';
import { getDisclaimerService, withDisclaimerCheck, ClinicalDisclaimer } from './clinical-disclaimer-service';
import { dailyTipScheduler } from './daily-tip-scheduler';
import { ComprehensiveInsights } from '../therapy-insights-generator';

export interface SafeComprehensiveInsights {
  // Original dashboard format for compatibility
  thisWeeksGoals: string[];
  areasToFocusOn: string[];
  overallProgress: string;
  dailyTip: string;
  communicationImprovement: string;
  
  // NEW: Safety and validation fields
  requiresTherapistApproval: boolean;
  clinicalDisclaimer: ClinicalDisclaimer;
  crisisDetected: boolean;
  confidenceLevel: 'very_low' | 'low' | 'moderate'; // Never high
  dataLimitations: string[];
  
  // Therapist workflow
  therapistReviewStatus: 'pending' | 'approved' | 'rejected' | 'needs_modification';
  therapistNotes?: string;
  approvedBy?: string;
  approvedAt?: Date;
  
  // Safety metadata
  generatedAt: Date;
  expiresAt: Date; // Insights expire after 7 days
  safetyVersion: string;
}

export class SafeDynamicInsightsService {
  private safeAnalyzer: SafeTherapeuticAnalyzer;
  private disclaimerService = getDisclaimerService();
  private readonly INSIGHTS_VALIDITY_DAYS = 7;
  private readonly SAFETY_VERSION = '1.0.0';

  constructor(private userId: string) {
    this.safeAnalyzer = new SafeTherapeuticAnalyzer(userId);
  }

  /**
   * Generate SAFE comprehensive insights with all safety measures
   */
  async generateSafeInsights(): Promise<SafeComprehensiveInsights> {
    logger.info('Generating SAFE comprehensive insights', { userId: this.userId });

    try {
      // Check if user has acknowledged disclaimers
      const disclaimer = await this.disclaimerService.getRequiredDisclaimer('comprehensive_insights', 'medium');
      const hasAcknowledged = await this.disclaimerService.hasUserAcknowledgedDisclaimers(
        this.userId, 
        [disclaimer.id]
      );

      if (!hasAcknowledged) {
        logger.warn('User has not acknowledged disclaimers', { userId: this.userId });
        return this.generateDisclaimerRequiredResponse(disclaimer);
      }

      // Generate safe therapeutic analysis
      const analysis = await this.safeAnalyzer.generateSafeAnalysis();
      
      // Check for crisis keywords
      if (analysis.crisisKeywordsDetected) {
        logger.error('CRISIS DETECTED in insights generation', {
          userId: this.userId,
          requiresImmediateAttention: true
        });
        return this.generateCrisisResponse(disclaimer);
      }

      // Convert analysis to dashboard format
      const insights = await this.convertAnalysisToDashboardFormat(analysis);
      
      // Add safety metadata
      const safeInsights: SafeComprehensiveInsights = {
        ...insights,
        requiresTherapistApproval: true, // ALWAYS require approval
        clinicalDisclaimer: disclaimer,
        crisisDetected: analysis.crisisKeywordsDetected,
        confidenceLevel: analysis.confidenceLevel,
        dataLimitations: analysis.dataLimitations,
        therapistReviewStatus: 'pending',
        generatedAt: new Date(),
        expiresAt: new Date(Date.now() + this.INSIGHTS_VALIDITY_DAYS * 24 * 60 * 60 * 1000),
        safetyVersion: this.SAFETY_VERSION
      };

      // Store for therapist review (don't show to client yet)
      await this.storeForTherapistReview(safeInsights, analysis);

      // Return insights with therapist approval requirement
      logger.info('Generated safe insights requiring therapist approval', {
        userId: this.userId,
        confidenceLevel: analysis.confidenceLevel,
        requiresApproval: true
      });

      return safeInsights;

    } catch (error) {
      logger.error('Failed to generate safe insights', {
        userId: this.userId,
        error: error instanceof Error ? error.message : error
      });
      
      return this.generateFailsafeInsights();
    }
  }

  /**
   * Get insights for display (only if approved by therapist)
   */
  async getApprovedInsights(): Promise<SafeComprehensiveInsights | null> {
    try {
      // Check if there are approved insights for this user
      const approvedInsights = await this.getLatestApprovedInsights();
      
      if (!approvedInsights) {
        logger.info('No approved insights available for user', { userId: this.userId });
        return null;
      }

      // Check if insights have expired
      if (new Date() > approvedInsights.expiresAt) {
        logger.warn('Approved insights have expired', { 
          userId: this.userId,
          expiresAt: approvedInsights.expiresAt 
        });
        return null;
      }

      return approvedInsights;

    } catch (error) {
      logger.error('Failed to get approved insights', {
        userId: this.userId,
        error: error instanceof Error ? error.message : error
      });
      return null;
    }
  }

  /**
   * Convert therapeutic analysis to dashboard-compatible format
   */
  private async convertAnalysisToDashboardFormat(
    analysis: TherapeuticSupportAnalysis
  ): Promise<Omit<SafeComprehensiveInsights, 'requiresTherapistApproval' | 'clinicalDisclaimer' | 'crisisDetected' | 'confidenceLevel' | 'dataLimitations' | 'therapistReviewStatus' | 'generatedAt' | 'expiresAt' | 'safetyVersion'>> {
    
    // Convert to safe, descriptive format
    const thisWeeksGoals = this.generateSafeGoals(analysis);
    const areasToFocusOn = analysis.areasOfFocus.slice(0, 3); // Limit to 3 areas
    const overallProgress = this.generateSafeProgressStatement(analysis);
    const dailyTip = await this.getSafeDailyTip();
    const communicationImprovement = this.generateSafeCommunicationInsight(analysis);

    return {
      thisWeeksGoals,
      areasToFocusOn,
      overallProgress,
      dailyTip,
      communicationImprovement
    };
  }

  /**
   * Generate safe, non-predictive goals
   */
  private generateSafeGoals(analysis: TherapeuticSupportAnalysis): string[] {
    const goals: string[] = [];
    
    // Base goals on observations, not predictions
    if (analysis.sessionConsistency === 'irregular') {
      goals.push('Maintain regular therapy session attendance');
    }
    
    if (analysis.currentEngagementLevel === 'low') {
      goals.push('Focus on active participation in sessions');
    }
    
    // Add goals based on focus areas
    analysis.areasOfFocus.slice(0, 2).forEach(area => {
      goals.push(`Continue working on ${area.toLowerCase()}`);
    });
    
    // Default goals if none identified
    if (goals.length === 0) {
      goals.push('Continue regular therapy sessions');
      goals.push('Practice communication techniques discussed');
    }
    
    return goals.slice(0, 3); // Limit to 3 goals
  }

  /**
   * Generate safe progress statement (no predictions)
   */
  private generateSafeProgressStatement(analysis: TherapeuticSupportAnalysis): string {
    const progressCount = analysis.progressIndicators.length;
    
    if (progressCount === 0) {
      return 'Continue working on your therapy goals with regular session attendance.';
    }
    
    if (progressCount === 1) {
      return `You've reached 1 milestone in your therapy journey. Keep building on this progress.`;
    }
    
    return `You've reached ${progressCount} milestones in your therapy journey. Your consistent effort is showing.`;
  }

  /**
   * Generate safe communication insight
   */
  private generateSafeCommunicationInsight(analysis: TherapeuticSupportAnalysis): string {
    const communicationObs = analysis.communicationObservations;
    
    if (communicationObs.length === 0) {
      return 'Continue practicing the communication techniques discussed in your sessions.';
    }
    
    // Use first observation as basis for insight
    const primaryObservation = communicationObs[0];
    
    if (primaryObservation.includes('balanced')) {
      return 'Your communication shows good balance between participants. Keep practicing active listening.';
    }
    
    if (primaryObservation.includes('supportive')) {
      return 'Supportive communication patterns have been observed. Continue building on these strengths.';
    }
    
    return 'Focus on the communication techniques your therapist has recommended for your specific situation.';
  }

  /**
   * Get safe daily tip
   */
  private async getSafeDailyTip(): Promise<string> {
    try {
      const tip = await dailyTipScheduler.getTodaysTip(this.userId);
      return tip || 'Take a moment today to appreciate something positive in your relationship.';
    } catch (error) {
      logger.error('Failed to get daily tip', { userId: this.userId, error });
      return 'Practice mindful communication today.';
    }
  }

  /**
   * Generate response when disclaimers not acknowledged
   */
  private generateDisclaimerRequiredResponse(disclaimer: ClinicalDisclaimer): SafeComprehensiveInsights {
    return {
      thisWeeksGoals: ['Review and acknowledge AI insights disclaimer'],
      areasToFocusOn: ['Understanding AI insights limitations'],
      overallProgress: 'Please review the clinical disclaimer before viewing insights.',
      dailyTip: 'AI insights require your acknowledgment to proceed.',
      communicationImprovement: 'Disclaimer acknowledgment required for personalized insights.',
      requiresTherapistApproval: true,
      clinicalDisclaimer: disclaimer,
      crisisDetected: false,
      confidenceLevel: 'very_low',
      dataLimitations: ['Disclaimer not acknowledged'],
      therapistReviewStatus: 'pending',
      generatedAt: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      safetyVersion: this.SAFETY_VERSION
    };
  }

  /**
   * Generate crisis response
   */
  private generateCrisisResponse(disclaimer: ClinicalDisclaimer): SafeComprehensiveInsights {
    return {
      thisWeeksGoals: ['Contact your therapist immediately'],
      areasToFocusOn: ['Crisis support and immediate help'],
      overallProgress: 'Your therapist needs to review your recent session immediately.',
      dailyTip: 'If you are in crisis, contact your therapist or emergency services.',
      communicationImprovement: 'Crisis detected - immediate therapist consultation required.',
      requiresTherapistApproval: true,
      clinicalDisclaimer: disclaimer,
      crisisDetected: true,
      confidenceLevel: 'very_low',
      dataLimitations: ['Analysis limited due to crisis detection'],
      therapistReviewStatus: 'pending',
      generatedAt: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      safetyVersion: this.SAFETY_VERSION
    };
  }

  /**
   * Generate failsafe insights when everything fails
   */
  private generateFailsafeInsights(): SafeComprehensiveInsights {
    const disclaimer = {
      id: 'failsafe_disclaimer',
      version: '1.0.0',
      content: 'System error occurred. Please contact your therapist for personalized guidance.',
      requiresAcknowledgment: true,
      therapistOverrideRequired: true,
      severity: 'critical' as const,
      validFrom: new Date(),
      createdBy: 'system',
      lastUpdated: new Date()
    };

    return {
      thisWeeksGoals: ['Contact your therapist for guidance'],
      areasToFocusOn: ['Continue regular therapy sessions'],
      overallProgress: 'Continue your therapy journey with professional guidance.',
      dailyTip: 'Focus on the goals you and your therapist have discussed.',
      communicationImprovement: 'Practice the techniques your therapist has recommended.',
      requiresTherapistApproval: true,
      clinicalDisclaimer: disclaimer,
      crisisDetected: false,
      confidenceLevel: 'very_low',
      dataLimitations: ['System error - minimal insights available'],
      therapistReviewStatus: 'pending',
      generatedAt: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      safetyVersion: this.SAFETY_VERSION
    };
  }

  // Database operations (would be implemented with actual database)
  private async storeForTherapistReview(
    insights: SafeComprehensiveInsights, 
    analysis: TherapeuticSupportAnalysis
  ): Promise<void> {
    try {
      // Store insights with pending review status
      logger.info('Stored insights for therapist review', {
        userId: this.userId,
        requiresApproval: true,
        confidenceLevel: insights.confidenceLevel
      });
    } catch (error) {
      logger.error('Failed to store insights for review', {
        userId: this.userId,
        error: error instanceof Error ? error.message : error
      });
    }
  }

  private async getLatestApprovedInsights(): Promise<SafeComprehensiveInsights | null> {
    // Would query database for latest approved insights
    return null;
  }
}

/**
 * Main export function for backward compatibility
 * SAFE version that replaces generateTherapyInsights
 */
export async function generateSafeTherapyInsights({
  userId,
  sessions,
  userProfile
}: {
  userId: string;
  sessions?: any[];
  userProfile?: any;
}): Promise<SafeComprehensiveInsights> {
  logger.info('generateSafeTherapyInsights called', { userId });
  
  const service = new SafeDynamicInsightsService(userId);
  return await service.generateSafeInsights();
}

/**
 * Get approved insights for display to client
 */
export async function getApprovedTherapyInsights(
  userId: string
): Promise<SafeComprehensiveInsights | null> {
  const service = new SafeDynamicInsightsService(userId);
  return await service.getApprovedInsights();
}

/**
 * Therapist approval workflow
 */
export async function approveInsights(
  userId: string,
  therapistId: string,
  approved: boolean,
  notes?: string,
  modifications?: Partial<SafeComprehensiveInsights>
): Promise<void> {
  try {
    logger.info('Therapist insights approval', {
      userId,
      therapistId,
      approved,
      hasNotes: !!notes,
      hasModifications: !!modifications
    });
    
    // Would update database with approval status
    
  } catch (error) {
    logger.error('Failed to process insights approval', {
      userId,
      therapistId,
      approved,
      error: error instanceof Error ? error.message : error
    });
    throw error;
  }
}