import { getAuthSession } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma-optimized'

// Monitoring endpoint for webhook processing status
export async function GET(request: NextRequest) {
  try {
    // Check authentication (optional - could be protected by API key instead)
    const session = await getAuthSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Get query parameters
    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '20', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)
    
    // Build where clause
    const where: any = {}
    if (status) {
      where.status = status
    }
    
    // Get webhook events with pagination
    const [webhooks, total] = await Promise.all([
      prisma.webhookEvent.findMany({        where,
        take: limit,
        skip: offset,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          webhookId: true,
          messageType: true,
          callId: true,
          sessionId: true,
          status: true,
          correlationId: true,
          error: true,
          retryCount: true,
          createdAt: true,
          processedAt: true,
        },
      }),
      prisma.webhookEvent.count({ where }),
    ])
    
    // Get status summary
    const statusSummary = await prisma.webhookEvent.groupBy({
      by: ['status'],
      _count: {
        status: true,
      },
    })
    
    return NextResponse.json({
      webhooks,
      pagination: {        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
      summary: statusSummary.reduce((acc, item) => {
        acc[item.status] = item._count.status
        return acc
      }, {} as Record<string, number>),
    })
    
  } catch (error) {
    console.error('[Monitoring-Webhooks] Error fetching webhook status:', error)
    return NextResponse.json(
      { error: 'Failed to fetch webhook status' },
      { status: 500 }
    )
  }
}

// Retry failed webhooks
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getAuthSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { webhookIds } = await request.json()    
    if (!Array.isArray(webhookIds) || webhookIds.length === 0) {
      return NextResponse.json(
        { error: 'Invalid webhook IDs' },
        { status: 400 }
      )
    }
    
    // Import job queue
    const { jobQueue, JobType } = await import('@/lib/queue/background-jobs')
    
    // Get failed webhooks
    const failedWebhooks = await prisma.webhookEvent.findMany({
      where: {
        id: { in: webhookIds },
        status: 'failed',
      },
    })
    
    const retryResults = []
    
    for (const webhook of failedWebhooks) {
      try {
        // Reset webhook status
        await prisma.webhookEvent.update({
          where: { id: webhook.id },
          data: { status: 'queued' },
        })
        
        // Re-queue for processing
        const jobId = await jobQueue.enqueue(          JobType.PROCESS_VAPI_WEBHOOK,
          {
            webhookEventId: webhook.id,
            payload: webhook.payload,
            correlationId: webhook.correlationId || `retry_${Date.now()}`,
          },
          {
            maxAttempts: 3,
          }
        )
        
        retryResults.push({
          webhookId: webhook.id,
          success: true,
          jobId,
        })
      } catch (error) {
        retryResults.push({
          webhookId: webhook.id,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }
    
    return NextResponse.json({
      retried: retryResults.filter(r => r.success).length,
      failed: retryResults.filter(r => !r.success).length,
      results: retryResults,
    })
    
  } catch (error) {
    console.error('[Monitoring-Webhooks] Error retrying webhooks:', error)
    return NextResponse.json(
      { error: 'Failed to retry webhooks' },
      { status: 500 }
    )
  }
}