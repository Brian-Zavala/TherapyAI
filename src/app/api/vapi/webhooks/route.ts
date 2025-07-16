import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma-optimized'
import { 
  VapiWebhookPayload,
  EndOfCallReport,
  validateWebhookPayload,
  safeValidateWebhookPayload,
  extractSessionId,
  extractCallId,
  generateWebhookId,
  shouldProcessWebhook,
  formatWebhookLog,
  isEndOfCallReport,
} from '@/types/vapi-webhook'
import { randomUUID } from 'crypto'
import { jobQueue, JobType } from '@/lib/queue/background-jobs'

// VAPI webhook handler with comprehensive validation and idempotency
export async function POST(request: NextRequest) {
  const correlationId = randomUUID()
  const startTime = Date.now()
  
  try {
    // Parse request body
    const body = await request.json()
    
    // Log incoming webhook with correlation ID
    console.log(`[VAPI-Webhook] ${correlationId} Received webhook`, {
      correlationId,
      headers: {
        'content-type': request.headers.get('content-type'),
        'x-vapi-signature': request.headers.get('x-vapi-signature') ? 'present' : 'missing',
      },
    })
    
    // Validate webhook payload with Zod
    const validationResult = safeValidateWebhookPayload(body)
    
    if (!validationResult.success) {
      console.error(`[VAPI-Webhook] ${correlationId} Validation failed`, {
        correlationId,
        errors: validationResult.error.errors,
      })
      
      // Still return 200 to prevent VAPI retries
      return NextResponse.json({ 
        success: true,
        correlationId,
        message: 'Webhook received (validation failed)',
      })
    }
    
    const payload = validationResult.data
    const webhookId = generateWebhookId(payload)
    
    // Log validated webhook
    console.log(`[VAPI-Webhook] ${correlationId} Processing`, formatWebhookLog(payload, correlationId))
    
    // Check if we should process this webhook type
    if (!shouldProcessWebhook(payload.message.type)) {
      console.log(`[VAPI-Webhook] ${correlationId} Skipping unhandled message type: ${payload.message.type}`)
      return NextResponse.json({ 
        success: true,
        correlationId,
        message: `Webhook received (type ${payload.message.type} not processed)`,
      })
    }
    
    // Idempotency check
    const existingEvent = await prisma.webhookEvent.findUnique({
      where: { webhookId },
      select: { id: true, status: true },
    })
    
    if (existingEvent) {
      console.log(`[VAPI-Webhook] ${correlationId} Duplicate webhook detected`, {
        correlationId,
        webhookId,
        existingStatus: existingEvent.status,
      })
      
      return NextResponse.json({ 
        success: true,
        correlationId,
        message: 'Webhook already processed (idempotent)',
      })
    }
    
    // Store webhook event for processing
    const webhookEvent = await prisma.webhookEvent.create({
      data: {
        webhookId,
        messageType: payload.message.type,
        callId: extractCallId(payload),
        sessionId: extractSessionId(payload),
        payload: payload as any, // Prisma will handle JSON serialization
        status: 'queued',
        correlationId,
      },
    })
    
    // Queue webhook for background processing
    try {
      const jobId = await jobQueue.enqueue(
        JobType.PROCESS_VAPI_WEBHOOK,
        {
          webhookEventId: webhookEvent.id,
          payload,
          correlationId,
        },
        {
          maxAttempts: 3, // Retry up to 3 times on failure
        }
      )
      
      console.log(`[VAPI-Webhook] ${correlationId} Queued for processing`, {
        correlationId,
        webhookId,
        jobId,
      })
    } catch (queueError) {
      console.error(`[VAPI-Webhook] ${correlationId} Failed to queue webhook`, {
        correlationId,
        webhookId,
        error: queueError instanceof Error ? queueError.message : 'Unknown error',
      })
      
      // Update webhook status to failed if queueing fails
      await prisma.webhookEvent.update({
        where: { id: webhookEvent.id },
        data: {
          status: 'failed',
          error: 'Failed to queue for processing',
        },
      }).catch(() => {})
    }
    
    // Return success immediately (within 5s timeout)
    const processingTime = Date.now() - startTime
    console.log(`[VAPI-Webhook] ${correlationId} Returning success`, {
      correlationId,
      processingTimeMs: processingTime,
    })
    
    return NextResponse.json({ 
      success: true,
      correlationId,
      message: 'Webhook received and queued for processing',
    })
    
  } catch (error) {
    // Log error but still return success to prevent retries
    console.error(`[VAPI-Webhook] ${correlationId} Unexpected error`, {
      correlationId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    })
    
    // Always return 200 OK to VAPI
    return NextResponse.json({ 
      success: true,
      correlationId,
      message: 'Webhook received (error logged)',
    })
  }
}