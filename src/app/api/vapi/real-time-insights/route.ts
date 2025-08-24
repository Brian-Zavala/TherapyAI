/**
 * VAPI Real-Time Insights Webhook
 * Processes VAPI events to generate real-time insights during active sessions
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/utils/logger';
import { verifyVAPIWebhookSignature } from '@/lib/vapi/webhook-verification';
import { realTimeInsightsProcessor } from '@/lib/ai-insights/real-time-insights-processor';
import { broadcastToChannel } from '@/lib/metrics/metrics-broadcaster';
import { prisma } from '@/lib/database/prisma-optimized';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Verify webhook signature
    const body = await request.text();
    const signature = request.headers.get('x-vapi-signature');
    
    // In development, allow webhooks without signature verification
    if (process.env.NODE_ENV === 'production') {
      if (!signature) {
        logger.warn('VAPI webhook called without signature');
        return NextResponse.json({ error: 'Missing signature' }, { status: 401 });
      }
      
      const isValid = await verifyVAPIWebhookSignature(body, signature);
      if (!isValid) {
        logger.warn('Invalid VAPI webhook signature');
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    } else {
      logger.info('Skipping webhook signature verification in development');
    }
    
    const data = JSON.parse(body);
    const { message } = data;
    
    if (!message) {
      return NextResponse.json({ error: 'Missing message' }, { status: 400 });
    }
    
    // Extract session info
    const sessionId = message.call?.id || message.sessionId;
    const userId = message.call?.metadata?.userId || message.userId;
    
    if (!sessionId || !userId) {
      logger.warn('VAPI webhook missing required identifiers', { sessionId, userId });
      return NextResponse.json({ error: 'Missing session or user ID' }, { status: 400 });
    }
    
    // Get therapy type from session
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      select: { sessionType: true }
    });
    
    const therapyType = session?.sessionType?.toLowerCase() as 'solo' | 'couple' | 'family' || 'solo';
    
    // Handle different VAPI message types
    switch (message.type) {
      case 'transcript':
      case 'transcript-update':
        // Process transcript for real-time insights
        await processTranscriptUpdate(message, sessionId, userId, therapyType);
        break;
        
      case 'metrics-update':
      case 'conversation-update':
        // Process metrics update
        await processMetricsUpdate(message, sessionId, userId, therapyType);
        break;
        
      case 'speech-update':
        // Process speech events for emotion detection
        await processSpeechUpdate(message, sessionId, userId);
        break;
        
      case 'end-of-call-report':
      case 'call-ended':
        // Final insights generation
        await processFinalInsights(sessionId, userId);
        break;
        
      default:
        logger.debug('Unhandled VAPI message type for insights', { type: message.type });
    }
    
    const duration = Date.now() - startTime;
    logger.info('VAPI real-time insights webhook processed', {
      sessionId,
      userId,
      messageType: message.type,
      duration
    });
    
    // Return quickly to avoid VAPI timeout
    return NextResponse.json({ success: true });
    
  } catch (error) {
    logger.error('VAPI real-time insights webhook error', {
      error: error instanceof Error ? error.message : error
    });
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function processTranscriptUpdate(
  message: any, 
  sessionId: string, 
  userId: string,
  therapyType: 'solo' | 'couple' | 'family'
) {
  try {
    const transcript = {
      speaker: message.role || message.speaker || 'user',
      text: message.transcript || message.text || '',
      timestamp: new Date(message.timestamp || Date.now())
    };
    
    // Broadcast transcript update for real-time processing
    await broadcastToChannel(
      'transcript-updates',
      'transcript-update',
      {
        sessionId,
        userId,
        therapyType,
        transcript,
        timestamp: new Date().toISOString()
      }
    );
    
    logger.debug('Transcript update broadcasted for insights', {
      sessionId,
      speaker: transcript.speaker,
      textLength: transcript.text.length
    });
    
  } catch (error) {
    logger.error('Failed to process transcript update', {
      sessionId,
      error: error instanceof Error ? error.message : error
    });
  }
}

async function processMetricsUpdate(
  message: any, 
  sessionId: string, 
  userId: string,
  therapyType: 'solo' | 'couple' | 'family'
) {
  try {
    // Extract metrics from VAPI message
    const metrics = {
      activeListeningScore: message.metrics?.listening || 50,
      expressingNeedsScore: message.metrics?.expression || 50,
      conflictResolutionScore: message.metrics?.conflict || 50,
      emotionalSupportScore: message.metrics?.empathy || 50,
      communicationScore: message.metrics?.overall || 50,
      closenessScore: message.metrics?.closeness || 50,
      confidence: message.metrics?.confidence || 0,
      entryCount: message.metrics?.entryCount || 0,
      sessionProgress: message.metrics?.progress || 0
    };
    
    // Broadcast metrics update
    await broadcastToChannel(
      'metrics-updates',
      'metrics-update',
      {
        sessionId,
        userId,
        therapyType,
        metrics,
        timestamp: new Date().toISOString()
      }
    );
    
    logger.debug('Metrics update broadcasted for insights', {
      sessionId,
      communicationScore: metrics.communicationScore,
      confidence: metrics.confidence
    });
    
  } catch (error) {
    logger.error('Failed to process metrics update', {
      sessionId,
      error: error instanceof Error ? error.message : error
    });
  }
}

async function processSpeechUpdate(
  message: any, 
  sessionId: string, 
  userId: string
) {
  try {
    // Extract emotional indicators from speech
    const speechData = {
      speaker: message.speaker || 'user',
      isSpeaking: message.isSpeaking || false,
      speechStartTime: message.speechStartTimestamp,
      speechEndTime: message.speechEndTimestamp,
      // Additional speech metadata if available
      volume: message.volume,
      pitch: message.pitch,
      pace: message.pace
    };
    
    // Analyze speech patterns for stress/emotion
    if (speechData.volume && speechData.pitch) {
      const stressIndicator = calculateStressFromSpeech(speechData);
      
      if (stressIndicator > 0.7) {
        logger.info('High stress detected in speech', {
          sessionId,
          speaker: speechData.speaker,
          stressLevel: stressIndicator
        });
        
        // Trigger immediate insight update for high stress
        await realTimeInsightsProcessor.handleMetricsUpdate({
          sessionId,
          userId,
          metrics: {
            currentStressLevel: stressIndicator * 100
          }
        });
      }
    }
    
  } catch (error) {
    logger.error('Failed to process speech update', {
      sessionId,
      error: error instanceof Error ? error.message : error
    });
  }
}

async function processFinalInsights(sessionId: string, userId: string) {
  try {
    // Get session data for final insights
    const sessionData = await realTimeInsightsProcessor.getSessionAnalysis(sessionId);
    
    if (!sessionData) {
      logger.warn('No session data found for final insights', { sessionId });
      return;
    }
    
    // Generate final comprehensive insights
    const finalInsights = await realTimeInsightsProcessor.generateDynamicInsights(sessionData);
    
    // Store insights in database
    if (finalInsights.length > 0) {
      await prisma.therapyInsight.createMany({
        data: finalInsights.map(insight => ({
          sessionId,
          userId,
          category: insight.category,
          title: insight.title,
          description: insight.description,
          priority: insight.priority,
          confidence: insight.confidence,
          evidence: insight.evidence || [],
          recommendations: insight.recommendations || [],
          metadata: {
            isRealTime: true,
            generatedAt: new Date().toISOString()
          }
        }))
      });
      
      logger.info('Final insights stored', {
        sessionId,
        insightCount: finalInsights.length
      });
    }
    
  } catch (error) {
    logger.error('Failed to process final insights', {
      sessionId,
      error: error instanceof Error ? error.message : error
    });
  }
}

function calculateStressFromSpeech(speechData: any): number {
  // Simple stress calculation based on speech characteristics
  // High pitch + high volume + fast pace = higher stress
  
  const pitchFactor = speechData.pitch ? Math.min(speechData.pitch / 200, 1) : 0.5;
  const volumeFactor = speechData.volume ? Math.min(speechData.volume / 100, 1) : 0.5;
  const paceFactor = speechData.pace ? Math.min(speechData.pace / 150, 1) : 0.5;
  
  return (pitchFactor + volumeFactor + paceFactor) / 3;
}

// OPTIONS request handler for CORS
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, x-vapi-signature',
    },
  });
}