/**
 * Session Type Integrity Management
 * 
 * CRITICAL: Ensures consistent mapping between frontend therapy types and database sessionType enums
 * This prevents the dashboard metric sync issues caused by sessionType mismatches
 */

import { prisma } from '@/lib/prisma-optimized';
import { logger } from '@/lib/logger';
import { SessionType } from '@prisma/client';

// Centralized therapy type mapping - replaces duplicated functions across the codebase
export function therapyTypeToPrismaEnum(therapyType: string): SessionType {
  const normalized = therapyType.toLowerCase().trim();
  
  switch (normalized) {
    case 'solo':
    case 'individual':
    case 'self':
    case 'personal':
      return 'SOLO';
    case 'couple':
    case 'couples':
    case 'relationship':
    case 'romantic':
    case 'partner':
      return 'COUPLE';
    case 'family':
    case 'families':
    case 'household':
    case 'group':
      return 'FAMILY';
    default:
      logger.warn('Unknown therapy type, defaulting to SOLO', { therapyType });
      return 'SOLO';
  }
}

// Reverse mapping for display purposes
export function prismaEnumToTherapyType(sessionType: SessionType): string {
  switch (sessionType) {
    case 'SOLO':
      return 'solo';
    case 'COUPLE':
      return 'couple';
    case 'FAMILY':
      return 'family';
    default:
      return 'solo';
  }
}

// Theme-based sessionType detection for existing sessions
export function detectSessionTypeFromTheme(theme: string): SessionType {
  const lowerTheme = theme.toLowerCase();
  
  // Family therapy patterns
  if (lowerTheme.includes('family') || 
      lowerTheme.includes('household') || 
      lowerTheme.includes('parenting') ||
      lowerTheme.includes('siblings') ||
      lowerTheme.includes('children')) {
    return 'FAMILY';
  }
  
  // Couple therapy patterns
  if (lowerTheme.includes('relationship') || 
      lowerTheme.includes('couple') || 
      lowerTheme.includes('romantic') ||
      lowerTheme.includes('partner') ||
      lowerTheme.includes('marriage') ||
      lowerTheme.includes('dating')) {
    return 'COUPLE';
  }
  
  // Solo therapy patterns
  if (lowerTheme.includes('individual') || 
      lowerTheme.includes('personal') || 
      lowerTheme.includes('self') ||
      lowerTheme.includes('solo') ||
      lowerTheme.includes('anxiety') ||
      lowerTheme.includes('depression') ||
      lowerTheme.includes('stress')) {
    return 'SOLO';
  }
  
  // Default to SOLO if unclear
  return 'SOLO';
}

export interface SessionTypeIntegrityReport {
  totalSessions: number;
  correctSessions: number;
  incorrectSessions: number;
  nullSessionTypes: number;
  mismatches: Array<{
    sessionId: string;
    currentType: SessionType | null;
    expectedType: SessionType;
    theme: string;
    confidence: 'high' | 'medium' | 'low';
  }>;
  recommendations: string[];
}

/**
 * Comprehensive session type integrity check
 */
export async function checkSessionTypeIntegrity(
  userId?: string,
  options: {
    autoFix?: boolean;
    dryRun?: boolean;
    limit?: number;
  } = {}
): Promise<SessionTypeIntegrityReport> {
  const { autoFix = false, dryRun = true, limit = 1000 } = options;
  
  logger.info('Starting session type integrity check', {
    userId,
    autoFix,
    dryRun,
    limit
  });

  try {
    // Get sessions to analyze
    const sessions = await prisma.session.findMany({
      where: userId ? { userId } : {},
      select: {
        id: true,
        sessionType: true,
        theme: true,
        userId: true,
        status: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' },
      take: limit
    });

    const report: SessionTypeIntegrityReport = {
      totalSessions: sessions.length,
      correctSessions: 0,
      incorrectSessions: 0,
      nullSessionTypes: 0,
      mismatches: [],
      recommendations: []
    };

    let fixedCount = 0;

    for (const session of sessions) {
      const expectedType = detectSessionTypeFromTheme(session.theme || '');
      
      // Check for null sessionType
      if (!session.sessionType) {
        report.nullSessionTypes++;
        report.mismatches.push({
          sessionId: session.id,
          currentType: null,
          expectedType,
          theme: session.theme || '',
          confidence: 'high'
        });
        
        // Auto-fix null sessionTypes
        if (autoFix && !dryRun) {
          await prisma.session.update({
            where: { id: session.id },
            data: { sessionType: expectedType }
          });
          fixedCount++;
          logger.info('Fixed null sessionType', {
            sessionId: session.id,
            newType: expectedType,
            theme: session.theme
          });
        }
        continue;
      }

      // Check for mismatched sessionTypes
      if (session.sessionType !== expectedType) {
        report.incorrectSessions++;
        
        // Determine confidence level
        let confidence: 'high' | 'medium' | 'low' = 'medium';
        const theme = session.theme?.toLowerCase() || '';
        
        // High confidence indicators
        if (theme.includes('family') || theme.includes('couple') || theme.includes('individual')) {
          confidence = 'high';
        }
        // Low confidence if theme is generic
        else if (theme.includes('general') || theme.includes('therapy') || theme.length < 10) {
          confidence = 'low';
        }
        
        report.mismatches.push({
          sessionId: session.id,
          currentType: session.sessionType,
          expectedType,
          theme: session.theme || '',
          confidence
        });

        // Auto-fix high confidence mismatches
        if (autoFix && !dryRun && confidence === 'high') {
          await prisma.session.update({
            where: { id: session.id },
            data: { sessionType: expectedType }
          });
          fixedCount++;
          logger.info('Fixed sessionType mismatch', {
            sessionId: session.id,
            oldType: session.sessionType,
            newType: expectedType,
            theme: session.theme,
            confidence
          });
        }
      } else {
        report.correctSessions++;
      }
    }

    // Generate recommendations
    if (report.nullSessionTypes > 0) {
      report.recommendations.push(`${report.nullSessionTypes} sessions have null sessionType - should be set based on theme`);
    }
    
    if (report.incorrectSessions > 0) {
      const highConfidenceMismatches = report.mismatches.filter(m => m.confidence === 'high').length;
      report.recommendations.push(`${report.incorrectSessions} sessions have potential sessionType mismatches (${highConfidenceMismatches} high confidence)`);
    }

    if (report.mismatches.length > report.totalSessions * 0.1) {
      report.recommendations.push('High percentage of mismatches detected - consider reviewing session creation logic');
    }

    logger.info('Session type integrity check completed', {
      ...report,
      fixedCount,
      accuracyPercentage: Math.round((report.correctSessions / report.totalSessions) * 100)
    });

    return report;

  } catch (error) {
    logger.error('Error during session type integrity check', {
      userId,
      error: error instanceof Error ? error.message : error
    });
    
    throw new Error(`Session type integrity check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Fix dashboard cache for sessions with corrected sessionTypes
 */
export async function invalidateCacheForCorrectedSessions(
  sessionIds: string[]
): Promise<void> {
  if (sessionIds.length === 0) return;
  
  try {
    const { dashboardCache } = await import('@/lib/cache/dashboard-cache');
    
    // Get affected users and their session types
    const affectedSessions = await prisma.session.findMany({
      where: { id: { in: sessionIds } },
      select: {
        userId: true,
        sessionType: true,
        theme: true
      }
    });

    // Group by user and invalidate their dashboard cache
    const userIds = [...new Set(affectedSessions.map(s => s.userId))];
    
    for (const userId of userIds) {
      const userSessions = affectedSessions.filter(s => s.userId === userId);
      const therapyTypes = [...new Set(userSessions.map(s => prismaEnumToTherapyType(s.sessionType)))];
      
      // Invalidate cache for each therapy type
      for (const therapyType of therapyTypes) {
        await dashboardCache.invalidateTherapyType(userId, therapyType);
      }
      
      logger.info('Invalidated dashboard cache after sessionType correction', {
        userId,
        therapyTypes,
        sessionCount: userSessions.length
      });
    }
  } catch (error) {
    logger.error('Error invalidating cache for corrected sessions', {
      sessionIds,
      error
    });
  }
}

/**
 * Validate sessionType consistency for a specific user's dashboard
 */
export async function validateUserDashboardIntegrity(userId: string): Promise<{
  isValid: boolean;
  issues: string[];
  metricsCount: Record<SessionType, number>;
  sessionsCount: Record<SessionType, number>;
}> {
  try {
    // Count sessions by type
    const sessionCounts = await prisma.session.groupBy({
      by: ['sessionType'],
      where: {
        userId,
        status: 'COMPLETED'
      },
      _count: true
    });

    // Count metrics by session type (through session relation)
    const metricCounts = await prisma.communicationMetric.groupBy({
      by: ['session.sessionType'],
      where: {
        userId,
        session: {
          status: 'COMPLETED'
        }
      },
      _count: true
    });

    const issues: string[] = [];
    const sessionsCount: Record<SessionType, number> = { SOLO: 0, COUPLE: 0, FAMILY: 0 };
    const metricsCount: Record<SessionType, number> = { SOLO: 0, COUPLE: 0, FAMILY: 0 };

    // Populate counts
    sessionCounts.forEach(item => {
      if (item.sessionType) {
        sessionsCount[item.sessionType] = item._count;
      }
    });

    metricCounts.forEach(item => {
      // Note: This requires a proper join - may need adjustment based on Prisma capabilities
      // For now, we'll do a separate query
    });

    // Alternative approach for metrics count
    for (const sessionType of ['SOLO', 'COUPLE', 'FAMILY'] as SessionType[]) {
      const count = await prisma.communicationMetric.count({
        where: {
          userId,
          session: {
            sessionType,
            status: 'COMPLETED'
          }
        }
      });
      metricsCount[sessionType] = count;
    }

    // Check for inconsistencies
    for (const sessionType of ['SOLO', 'COUPLE', 'FAMILY'] as SessionType[]) {
      const sessions = sessionsCount[sessionType];
      const metrics = metricsCount[sessionType];
      
      if (sessions > 0 && metrics === 0) {
        issues.push(`${sessions} completed ${sessionType} sessions but no communication metrics found`);
      }
      
      if (metrics > sessions) {
        issues.push(`More ${sessionType} metrics (${metrics}) than sessions (${sessions}) - possible duplicate metrics`);
      }
    }

    return {
      isValid: issues.length === 0,
      issues,
      metricsCount,
      sessionsCount
    };

  } catch (error) {
    logger.error('Error validating user dashboard integrity', {
      userId,
      error
    });
    
    return {
      isValid: false,
      issues: [`Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
      metricsCount: { SOLO: 0, COUPLE: 0, FAMILY: 0 },
      sessionsCount: { SOLO: 0, COUPLE: 0, FAMILY: 0 }
    };
  }
}