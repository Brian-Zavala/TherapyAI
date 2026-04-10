import { getAuthSession } from '@/lib/auth'
/**
 * Session Type Integrity Management API
 * 
 * Admin endpoint to check and fix sessionType mismatches that cause dashboard sync issues
 */

import { NextRequest, NextResponse } from 'next/server';
import { 
  checkSessionTypeIntegrity, 
  validateUserDashboardIntegrity,
  invalidateCacheForCorrectedSessions
} from '@/lib/database/session-type-integrity';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const session = await getAuthSession();
    
    if (!session || (session.user as any)?.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'check';
    const userId = searchParams.get('userId');
    const autoFix = searchParams.get('autoFix') === 'true';
    const dryRun = searchParams.get('dryRun') !== 'false'; // Default to true
    const limit = parseInt(searchParams.get('limit') || '100');

    logger.info('Session type integrity API called', {
      action,
      userId,
      autoFix,
      dryRun,
      limit,
      adminUser: session.user.id
    });

    switch (action) {
      case 'check':
        const integrityReport = await checkSessionTypeIntegrity(userId || undefined, {
          autoFix,
          dryRun,
          limit
        });
        
        return NextResponse.json({
          success: true,
          action: 'check',
          report: integrityReport,
          summary: {
            accuracy: Math.round((integrityReport.correctSessions / integrityReport.totalSessions) * 100),
            needsAttention: integrityReport.nullSessionTypes + integrityReport.incorrectSessions,
            recommendations: integrityReport.recommendations
          }
        });

      case 'validate-user':
        if (!userId) {
          return NextResponse.json({ error: 'userId required for user validation' }, { status: 400 });
        }
        
        const userValidation = await validateUserDashboardIntegrity(userId);
        
        return NextResponse.json({
          success: true,
          action: 'validate-user',
          userId,
          validation: userValidation
        });

      case 'fix':
        if (dryRun) {
          return NextResponse.json({ 
            error: 'Cannot fix in dry-run mode. Set dryRun=false to apply fixes' 
          }, { status: 400 });
        }
        
        const fixReport = await checkSessionTypeIntegrity(userId || undefined, {
          autoFix: true,
          dryRun: false,
          limit
        });
        
        // Invalidate cache for corrected sessions
        const fixedSessionIds = fixReport.mismatches
          .filter(m => m.confidence === 'high')
          .map(m => m.sessionId);
          
        if (fixedSessionIds.length > 0) {
          await invalidateCacheForCorrectedSessions(fixedSessionIds);
        }
        
        return NextResponse.json({
          success: true,
          action: 'fix',
          report: fixReport,
          fixedSessions: fixedSessionIds.length,
          summary: {
            beforeAccuracy: Math.round(((fixReport.correctSessions - fixedSessionIds.length) / fixReport.totalSessions) * 100),
            afterAccuracy: Math.round((fixReport.correctSessions / fixReport.totalSessions) * 100),
            improvement: fixedSessionIds.length
          }
        });

      default:
        return NextResponse.json({ 
          error: 'Invalid action. Use: check, validate-user, or fix' 
        }, { status: 400 });
    }

  } catch (error) {
    logger.error('Session type integrity API error', {
      error: error instanceof Error ? error.message : error
    });
    
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getAuthSession();
    
    if (!session || (session.user as any)?.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { sessionIds, action = 'fix-specific' } = body;

    if (!Array.isArray(sessionIds) || sessionIds.length === 0) {
      return NextResponse.json({ 
        error: 'sessionIds array required' 
      }, { status: 400 });
    }

    logger.info('Session type integrity POST API called', {
      action,
      sessionCount: sessionIds.length,
      adminUser: session.user.id
    });

    switch (action) {
      case 'fix-specific':
        // Fix specific sessions by ID
        const { prisma } = await import('@/lib/prisma-optimized');
        const { detectSessionTypeFromTheme } = await import('@/lib/database/session-type-integrity');
        
        const sessions = await prisma.session.findMany({
          where: { id: { in: sessionIds } },
          select: { id: true, theme: true, sessionType: true }
        });

        let fixedCount = 0;
        const fixes = [];

        for (const sessionData of sessions) {
          const expectedType = detectSessionTypeFromTheme(sessionData.theme || '');
          
          if (sessionData.sessionType !== expectedType) {
            await prisma.session.update({
              where: { id: sessionData.id },
              data: { sessionType: expectedType }
            });
            
            fixes.push({
              sessionId: sessionData.id,
              oldType: sessionData.sessionType,
              newType: expectedType,
              theme: sessionData.theme
            });
            fixedCount++;
          }
        }

        // Invalidate cache for fixed sessions
        if (fixedCount > 0) {
          await invalidateCacheForCorrectedSessions(sessionIds);
        }

        return NextResponse.json({
          success: true,
          action: 'fix-specific',
          fixedCount,
          totalSessions: sessions.length,
          fixes
        });

      default:
        return NextResponse.json({ 
          error: 'Invalid action for POST. Use: fix-specific' 
        }, { status: 400 });
    }

  } catch (error) {
    logger.error('Session type integrity POST API error', {
      error: error instanceof Error ? error.message : error
    });
    
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}