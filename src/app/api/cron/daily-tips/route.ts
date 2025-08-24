/**
 * Daily Tips Cron Job
 * Triggered at midnight to rotate daily tips for all users
 */

import { NextRequest, NextResponse } from 'next/server';
import { dailyTipScheduler } from '@/lib/ai-insights/daily-tip-scheduler';
import { logger } from '@/lib/utils/logger';

export async function POST(request: NextRequest) {
  // Verify this is a legitimate cron request
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  
  if (!cronSecret) {
    logger.error('CRON_SECRET not configured');
    return NextResponse.json({ error: 'Cron secret not configured' }, { status: 500 });
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    logger.warn('Unauthorized cron request', { 
      hasAuth: !!authHeader,
      userAgent: request.headers.get('user-agent')
    });
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    logger.info('Starting daily tip rotation cron job');
    
    const startTime = Date.now();
    
    // Rotate daily tips for all active users
    await dailyTipScheduler.rotateDailyTips();
    
    const duration = Date.now() - startTime;
    
    logger.info('Daily tip rotation completed successfully', { 
      duration: `${duration}ms` 
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Daily tips rotated successfully',
      duration 
    });

  } catch (error) {
    logger.error('Daily tip rotation cron job failed', { 
      error: error instanceof Error ? error.message : error 
    });

    return NextResponse.json({ 
      success: false, 
      error: 'Failed to rotate daily tips' 
    }, { status: 500 });
  }
}

// Allow GET requests for health checks
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json({ 
    status: 'healthy',
    service: 'daily-tips-cron',
    timestamp: new Date().toISOString()
  });
}