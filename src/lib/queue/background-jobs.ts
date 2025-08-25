// Background job queue service for async tasks
import { Redis } from '@upstash/redis'

// Job types
export enum JobType {
  SEND_WELCOME_MESSAGES = 'send_welcome_messages',
  SEND_SESSION_REMINDER = 'send_session_reminder',
  PROCESS_SESSION_METRICS = 'process_session_metrics',
  CLEANUP_OLD_SESSIONS = 'cleanup_old_sessions',
  PROCESS_VAPI_WEBHOOK = 'process_vapi_webhook'
}

interface Job {
  id: string
  type: JobType
  data: any
  createdAt: number
  attempts: number
  maxAttempts: number
  nextRunAt: number
  status: 'pending' | 'processing' | 'completed' | 'failed'
  error?: string
}

// Initialize Redis if available
let redis: Redis | null = null
if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  })
}

// In-memory queue fallback
const memoryQueue: Job[] = []
let isProcessing = false

export const jobQueue = {
  async enqueue(type: JobType, data: any, options?: { delay?: number; maxAttempts?: number }): Promise<string> {
    const job: Job = {
      id: `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      data,
      createdAt: Date.now(),
      attempts: 0,
      maxAttempts: options?.maxAttempts || 3,
      nextRunAt: Date.now() + (options?.delay || 0),
      status: 'pending'
    }

    try {
      if (redis) {
        // Store in Redis sorted set by nextRunAt timestamp
        await redis.zadd('job_queue', {
          score: job.nextRunAt,
          member: JSON.stringify(job)
        })
        console.log(`[JobQueue] Enqueued job ${job.id} to Redis`)
      } else {
        // Fallback to memory queue
        memoryQueue.push(job)
        memoryQueue.sort((a, b) => a.nextRunAt - b.nextRunAt)
        console.log(`[JobQueue] Enqueued job ${job.id} to memory`)
      }

      // Start processing if not already running
      if (!isProcessing) {
        processQueue()
      }

      return job.id
    } catch (error) {
      console.error('[JobQueue] Error enqueueing job:', error)
      // Try memory queue as fallback
      memoryQueue.push(job)
      if (!isProcessing) {
        processQueue()
      }
      return job.id
    }
  },

  async getJob(jobId: string): Promise<Job | null> {
    try {
      if (redis) {
        // Search in Redis
        const jobs = await redis.zrange('job_queue', 0, -1)
        for (const jobData of jobs) {
          // Upstash Redis might return the data as an object or a string
          const job = typeof jobData === 'string' 
            ? JSON.parse(jobData) as Job 
            : jobData as Job
          if (job.id === jobId) {
            return job
          }
        }
      }
      
      // Search in memory queue
      const job = memoryQueue.find(j => j.id === jobId)
      return job || null
    } catch (error) {
      console.error('[JobQueue] Error getting job:', error)
      return null
    }
  },

  async getJobsByType(type: JobType): Promise<Job[]> {
    try {
      const jobs: Job[] = []
      
      if (redis) {
        // Get all jobs from Redis
        const allJobs = await redis.zrange('job_queue', 0, -1)
        for (const jobData of allJobs) {
          const job = typeof jobData === 'string' 
            ? JSON.parse(jobData) as Job 
            : jobData as Job
          if (job.type === type) {
            jobs.push(job)
          }
        }
      }
      
      // Also check memory queue
      const memoryJobs = memoryQueue.filter(j => j.type === type)
      
      // Combine and deduplicate by ID
      const allJobsMap = new Map<string, Job>()
      jobs.forEach(job => allJobsMap.set(job.id, job))
      memoryJobs.forEach(job => allJobsMap.set(job.id, job))
      
      return Array.from(allJobsMap.values())
    } catch (error) {
      console.error('[JobQueue] Error getting jobs by type:', error)
      return []
    }
  }
}

// Process jobs from the queue
async function processQueue() {
  if (isProcessing) return
  isProcessing = true

  try {
    while (true) {
      const job = await getNextJob()
      if (!job || job.nextRunAt > Date.now()) {
        break
      }

      console.log(`[JobQueue] Processing job ${job.id} of type ${job.type}`)
      
      try {
        // Update job status
        job.status = 'processing'
        job.attempts++
        
        // Process the job based on type
        await processJob(job)
        
        // Mark as completed
        job.status = 'COMPLETED'
        await removeJob(job)
        console.log(`[JobQueue] Completed job ${job.id}`)
      } catch (error) {
        console.error(`[JobQueue] Error processing job ${job.id}:`, error)
        job.error = error instanceof Error ? error.message : 'Unknown error'
        
        // Check for permanent failures that shouldn't be retried
        const isPermanentFailure = job.error && (
          job.error.includes('rate_limit_exceeded') ||
          job.error.includes('daily_quota_exceeded') ||
          job.error.includes('Invalid phone number') ||
          job.error.includes('opted out') ||
          job.error.includes('block list')
        )
        
        if (job.attempts >= job.maxAttempts || isPermanentFailure) {
          job.status = 'failed'
          await removeJob(job)
          console.log(`[JobQueue] Failed job ${job.id} after ${job.attempts} attempts${isPermanentFailure ? ' (permanent failure)' : ''}`)
        } else {
          // Retry with exponential backoff (max 5 minutes)
          const backoffMs = Math.min(Math.pow(2, job.attempts) * 1000, 300000)
          job.nextRunAt = Date.now() + backoffMs
          job.status = 'pending'
          await updateJob(job)
          console.log(`[JobQueue] Retrying job ${job.id} in ${backoffMs / 1000}s`)
        }
      }
    }
  } finally {
    isProcessing = false
    
    // Schedule next check
    setTimeout(() => {
      if (!isProcessing) {
        processQueue()
      }
    }, 5000) // Check every 5 seconds
  }
}

async function getNextJob(): Promise<Job | null> {
  try {
    if (redis) {
      const results = await redis.zrange('job_queue', 0, 0, { withScores: false })
      if (results.length > 0) {
        // Upstash Redis might return the data as an object or a string
        const jobData = results[0]
        const job = typeof jobData === 'string' 
          ? JSON.parse(jobData) as Job 
          : jobData as Job
        return job
      }
    }
    
    // Fallback to memory queue
    return memoryQueue[0] || null
  } catch (error) {
    console.error('[JobQueue] Error getting next job:', error)
    return memoryQueue[0] || null
  }
}

async function removeJob(job: Job) {
  try {
    if (redis) {
      await redis.zrem('job_queue', JSON.stringify(job))
    }
    
    // Also remove from memory queue
    const index = memoryQueue.findIndex(j => j.id === job.id)
    if (index !== -1) {
      memoryQueue.splice(index, 1)
    }
  } catch (error) {
    console.error('[JobQueue] Error removing job:', error)
  }
}

async function updateJob(job: Job) {
  try {
    if (redis) {
      // Remove old entry and add updated one
      await redis.zrem('job_queue', JSON.stringify(job))
      await redis.zadd('job_queue', {
        score: job.nextRunAt,
        member: JSON.stringify(job)
      })
    }
    
    // Update in memory queue
    const index = memoryQueue.findIndex(j => j.id === job.id)
    if (index !== -1) {
      memoryQueue[index] = job
      memoryQueue.sort((a, b) => a.nextRunAt - b.nextRunAt)
    }
  } catch (error) {
    console.error('[JobQueue] Error updating job:', error)
  }
}

// Process different job types
async function processJob(job: Job) {
  switch (job.type) {
    case JobType.SEND_WELCOME_MESSAGES:
      const { sendWelcomeMessages } = await import('@/lib/notifications/welcome-messages')
      await sendWelcomeMessages(job.data)
      break
      
    case JobType.SEND_SESSION_REMINDER:
      const { sendSessionReminder } = await import('@/lib/notifications/sms-service')
      await sendSessionReminder(job.data.userId, job.data.sessionTime)
      break
      
    case JobType.PROCESS_SESSION_METRICS:
      // Process session metrics asynchronously
      console.log('[JobQueue] Processing session metrics:', job.data)
      // Implementation would go here
      break
      
    case JobType.CLEANUP_OLD_SESSIONS:
      // Cleanup old sessions
      console.log('[JobQueue] Cleaning up old sessions')
      // Implementation would go here
      break
      
    case JobType.PROCESS_VAPI_WEBHOOK:
      const { processVapiWebhook } = await import('@/lib/vapi/webhook-processor')
      await processVapiWebhook(job.data.webhookEventId, job.data.payload, job.data.correlationId)
      break
      
    default:
      throw new Error(`Unknown job type: ${job.type}`)
  }
}

// Export for manual start
export { processQueue }

// Start processing queue on module load
if (typeof window === 'undefined') { // Only run on server
  processQueue()
}