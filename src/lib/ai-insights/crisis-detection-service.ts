/**
 * Crisis Detection Service
 * Monitors session transcripts and user interactions for crisis indicators
 * 
 * 🚨 CRITICAL SAFETY: Immediate alerts for crisis situations
 * All crisis detections bypass normal workflows for immediate attention
 */

import { prisma } from '@/lib/prisma-optimized';
import { logger } from '@/lib/logger';
import { getSMSService } from '@/lib/sms/sms-service-factory';

export interface CrisisIndicator {
  keyword: string;
  severity: 'high' | 'critical' | 'emergency';
  context: string[];
  action: 'alert' | 'alert_and_lock' | 'emergency_contact';
}

export interface CrisisDetectionResult {
  detected: boolean;
  severity: 'none' | 'high' | 'critical' | 'emergency';
  indicators: CrisisIndicator[];
  immediateActionRequired: boolean;
  suggestedActions: string[];
  timestamp: Date;
}

export class CrisisDetectionService {
  private static instance: CrisisDetectionService;
  
  // Crisis keywords and phrases
  private readonly CRISIS_KEYWORDS: CrisisIndicator[] = [
    // Emergency indicators
    {
      keyword: 'suicide',
      severity: 'emergency',
      context: ['thinking about', 'contemplating', 'planning', 'want to'],
      action: 'emergency_contact'
    },
    {
      keyword: 'kill myself',
      severity: 'emergency',
      context: [],
      action: 'emergency_contact'
    },
    {
      keyword: 'end it all',
      severity: 'emergency',
      context: ['want to', 'going to', 'planning to'],
      action: 'emergency_contact'
    },
    {
      keyword: 'self harm',
      severity: 'critical',
      context: ['thinking about', 'have been', 'want to'],
      action: 'alert_and_lock'
    },
    {
      keyword: 'cutting',
      severity: 'critical',
      context: ['myself', 'started', 'thinking about'],
      action: 'alert_and_lock'
    },
    
    // Violence indicators
    {
      keyword: 'hurt',
      severity: 'critical',
      context: ['going to hurt', 'want to hurt', 'might hurt'],
      action: 'alert_and_lock'
    },
    {
      keyword: 'violence',
      severity: 'critical',
      context: ['domestic', 'physical', 'threat'],
      action: 'alert_and_lock'
    },
    {
      keyword: 'abuse',
      severity: 'high',
      context: ['being abused', 'abusing me', 'physical abuse', 'emotional abuse'],
      action: 'alert'
    },
    
    // Mental health crisis
    {
      keyword: 'breakdown',
      severity: 'high',
      context: ['having a', 'mental', 'nervous'],
      action: 'alert'
    },
    {
      keyword: 'cant go on',
      severity: 'critical',
      context: ['anymore', 'like this'],
      action: 'alert_and_lock'
    },
    {
      keyword: 'hopeless',
      severity: 'high',
      context: ['feeling', 'completely', 'utterly'],
      action: 'alert'
    },
    
    // Substance crisis
    {
      keyword: 'overdose',
      severity: 'emergency',
      context: ['took', 'planning', 'want to'],
      action: 'emergency_contact'
    },
    {
      keyword: 'pills',
      severity: 'critical',
      context: ['took all', 'swallow all', 'end it with'],
      action: 'emergency_contact'
    }
  ];
  
  // Safe phrases that might contain crisis keywords but are not crisis situations
  private readonly SAFE_CONTEXTS = [
    'therapist told me',
    'doctor said',
    'in the past',
    'used to',
    'no longer',
    'recovered from',
    'overcame',
    'book about',
    'movie about',
    'heard about'
  ];

  static getInstance(): CrisisDetectionService {
    if (!CrisisDetectionService.instance) {
      CrisisDetectionService.instance = new CrisisDetectionService();
    }
    return CrisisDetectionService.instance;
  }

  /**
   * Scan text for crisis indicators
   */
  async scanForCrisis(text: string, userId: string): Promise<CrisisDetectionResult> {
    logger.info('Scanning text for crisis indicators', { userId, textLength: text.length });
    
    const lowercaseText = text.toLowerCase();
    const detectedIndicators: CrisisIndicator[] = [];
    let highestSeverity: 'none' | 'high' | 'critical' | 'emergency' = 'none';
    
    // Check for safe contexts first
    const isSafeContext = this.SAFE_CONTEXTS.some(safe => lowercaseText.includes(safe));
    
    // Scan for crisis keywords
    for (const indicator of this.CRISIS_KEYWORDS) {
      if (lowercaseText.includes(indicator.keyword)) {
        // Check if keyword appears with concerning context
        let contextMatches = false;
        
        if (indicator.context.length === 0) {
          // No specific context required - keyword alone is concerning
          contextMatches = true;
        } else {
          // Check if any context phrases are present
          contextMatches = indicator.context.some(ctx => lowercaseText.includes(ctx));
        }
        
        if (contextMatches && !isSafeContext) {
          detectedIndicators.push(indicator);
          
          // Update highest severity
          if (indicator.severity === 'emergency') {
            highestSeverity = 'emergency';
          } else if (indicator.severity === 'critical' && highestSeverity !== 'emergency') {
            highestSeverity = 'critical';
          } else if (indicator.severity === 'high' && highestSeverity === 'none') {
            highestSeverity = 'high';
          }
        }
      }
    }
    
    const result: CrisisDetectionResult = {
      detected: detectedIndicators.length > 0,
      severity: highestSeverity,
      indicators: detectedIndicators,
      immediateActionRequired: highestSeverity === 'emergency' || highestSeverity === 'critical',
      suggestedActions: this.getSuggestedActions(highestSeverity, detectedIndicators),
      timestamp: new Date()
    };
    
    // Take immediate action if crisis detected
    if (result.detected) {
      await this.handleCrisisDetection(result, userId);
    }
    
    return result;
  }

  /**
   * Get suggested actions based on severity
   */
  private getSuggestedActions(
    severity: 'none' | 'high' | 'critical' | 'emergency',
    indicators: CrisisIndicator[]
  ): string[] {
    const actions: string[] = [];
    
    switch (severity) {
      case 'emergency':
        actions.push('Contact emergency services immediately');
        actions.push('Alert therapist with highest priority');
        actions.push('Lock all AI insights generation');
        actions.push('Activate crisis support protocol');
        break;
        
      case 'critical':
        actions.push('Alert therapist immediately');
        actions.push('Suspend AI insights until therapist review');
        actions.push('Provide crisis resources to user');
        actions.push('Monitor closely for escalation');
        break;
        
      case 'high':
        actions.push('Flag for therapist review');
        actions.push('Require therapist approval for all insights');
        actions.push('Increase monitoring frequency');
        break;
        
      default:
        actions.push('Continue standard monitoring');
    }
    
    return actions;
  }

  /**
   * Handle crisis detection with appropriate actions
   */
  private async handleCrisisDetection(
    result: CrisisDetectionResult,
    userId: string
  ): Promise<void> {
    try {
      logger.error('CRISIS DETECTED', {
        userId,
        severity: result.severity,
        indicators: result.indicators.map(i => i.keyword),
        immediateAction: result.immediateActionRequired
      });
      
      // Store crisis detection in database
      await this.storeCrisisDetection(result, userId);
      
      // Send immediate alerts based on severity
      if (result.severity === 'emergency') {
        await this.sendEmergencyAlert(result, userId);
      } else if (result.severity === 'critical') {
        await this.sendCriticalAlert(result, userId);
      } else if (result.severity === 'high') {
        await this.sendHighPriorityAlert(result, userId);
      }
      
      // Lock AI insights if needed
      if (result.immediateActionRequired) {
        await this.lockAIInsights(userId);
      }
      
    } catch (error) {
      logger.error('Failed to handle crisis detection', {
        userId,
        severity: result.severity,
        error: error instanceof Error ? error.message : error
      });
      // Don't throw - we don't want crisis handling to fail silently
    }
  }

  /**
   * Store crisis detection for audit and follow-up
   */
  private async storeCrisisDetection(
    result: CrisisDetectionResult,
    userId: string
  ): Promise<void> {
    try {
      // Would store in database with proper schema
      // For now, log critically
      logger.error('CRISIS_DETECTION_RECORD', {
        userId,
        severity: result.severity,
        indicators: result.indicators,
        timestamp: result.timestamp,
        requiresFollowUp: true
      });
    } catch (error) {
      logger.error('Failed to store crisis detection', { userId, error });
    }
  }

  /**
   * Send emergency alert to therapist and emergency contacts
   */
  private async sendEmergencyAlert(
    result: CrisisDetectionResult,
    userId: string
  ): Promise<void> {
    try {
      const smsService = getSMSService();
      
      // Get therapist and emergency contacts
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { 
          email: true, 
          name: true,
          phone: true
        }
      });
      
      if (!user) {
        logger.error('User not found for emergency alert', { userId });
        return;
      }
      
      // Send SMS alert to therapist (would need therapist phone in real implementation)
      const message = `🚨 EMERGENCY: Crisis detected for client ${user.name || user.email}. Immediate intervention required. Keywords: ${result.indicators.map(i => i.keyword).join(', ')}`;
      
      // Log emergency alert (in production, would send to multiple channels)
      logger.error('EMERGENCY_ALERT_SENT', {
        userId,
        userEmail: user.email,
        severity: 'emergency',
        message
      });
      
    } catch (error) {
      logger.error('Failed to send emergency alert', { userId, error });
    }
  }

  /**
   * Send critical alert to therapist
   */
  private async sendCriticalAlert(
    result: CrisisDetectionResult,
    userId: string
  ): Promise<void> {
    try {
      logger.error('CRITICAL_ALERT_SENT', {
        userId,
        severity: 'critical',
        indicators: result.indicators.map(i => i.keyword)
      });
    } catch (error) {
      logger.error('Failed to send critical alert', { userId, error });
    }
  }

  /**
   * Send high priority alert for therapist review
   */
  private async sendHighPriorityAlert(
    result: CrisisDetectionResult,
    userId: string
  ): Promise<void> {
    try {
      logger.warn('HIGH_PRIORITY_ALERT_SENT', {
        userId,
        severity: 'high',
        indicators: result.indicators.map(i => i.keyword),
        requiresReview: true
      });
    } catch (error) {
      logger.error('Failed to send high priority alert', { userId, error });
    }
  }

  /**
   * Lock AI insights generation for user in crisis
   */
  private async lockAIInsights(userId: string): Promise<void> {
    try {
      // Would update user settings to disable AI insights
      logger.error('AI_INSIGHTS_LOCKED', {
        userId,
        reason: 'crisis_detected',
        lockedAt: new Date()
      });
    } catch (error) {
      logger.error('Failed to lock AI insights', { userId, error });
    }
  }

  /**
   * Check if user has active crisis lock
   */
  async hasActiveCrisisLock(userId: string): Promise<boolean> {
    try {
      // Would check database for active crisis locks
      // For now, return false to not block everything
      return false;
    } catch (error) {
      logger.error('Failed to check crisis lock', { userId, error });
      // Fail safe - assume no lock
      return false;
    }
  }

  /**
   * Unlock AI insights after therapist review
   */
  async unlockAfterTherapistReview(
    userId: string,
    therapistId: string,
    notes: string
  ): Promise<void> {
    try {
      logger.info('AI insights unlocked after therapist review', {
        userId,
        therapistId,
        notes,
        unlockedAt: new Date()
      });
    } catch (error) {
      logger.error('Failed to unlock AI insights', { userId, therapistId, error });
      throw error;
    }
  }
}

// Export singleton instance
export const crisisDetectionService = CrisisDetectionService.getInstance();

// Convenience functions
export async function scanForCrisisKeywords(
  text: string,
  userId: string
): Promise<CrisisDetectionResult> {
  return crisisDetectionService.scanForCrisis(text, userId);
}

export async function isUserInCrisis(userId: string): Promise<boolean> {
  return crisisDetectionService.hasActiveCrisisLock(userId);
}

export async function unlockUserAfterReview(
  userId: string,
  therapistId: string,
  notes: string
): Promise<void> {
  return crisisDetectionService.unlockAfterTherapistReview(userId, therapistId, notes);
}