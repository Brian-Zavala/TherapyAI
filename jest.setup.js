import '@testing-library/jest-dom'

// Mock environment variables
process.env.NEXTAUTH_SECRET = 'test-secret-key-for-jest-testing'
process.env.NEXTAUTH_URL = 'http://localhost:3000'
process.env.RESEND_API_KEY = 'test-resend-key'
process.env.VAPI_API_KEY = 'test-vapi-key'
process.env.VAPI_ORG_ID = 'test-vapi-org'
process.env.VAPI_WEBHOOK_SECRET = 'test-webhook-secret'
process.env.UPSTASH_REDIS_REST_URL = 'test-redis-url'
process.env.UPSTASH_REDIS_REST_TOKEN = 'test-redis-token'
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test'

// Mock global fetch for tests
global.fetch = jest.fn()

// Mock Redis client globally
jest.mock('@/lib/cache/redis-client', () => ({
  redis: {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    incr: jest.fn(),
    expire: jest.fn(),
    eval: jest.fn()
  }
}))

// Mock Prisma client globally  
jest.mock('@/lib/prisma-optimized', () => ({
  prisma: {
    session: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn()
    },
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn()
    },
    usageCredits: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn()
    },
    usageTransaction: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn()
    },
    userProfile: {
      findUnique: jest.fn(),
      update: jest.fn()
    },
    $transaction: jest.fn(),
    $queryRaw: jest.fn()
  }
}))

// Mock logger
jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  }
}))

// Mock email service
jest.mock('@/lib/email', () => ({
  sendEmail: jest.fn().mockResolvedValue({ success: true })
}))

// Mock SMS service
jest.mock('@/lib/sms-service', () => ({
  sendSMS: jest.fn().mockResolvedValue({ success: true })
}))

// Mock AI insights
jest.mock('@/lib/ai-insights/session-completion-handler', () => ({
  onSessionCompleted: jest.fn().mockResolvedValue(undefined)
}))

// Mock transcript service
jest.mock('@/lib/transcript-service-optimized', () => ({
  flushSessionTranscripts: jest.fn().mockResolvedValue(undefined),
  cleanupSessionMetrics: jest.fn().mockResolvedValue(undefined)
}))

// Mock metrics broadcaster
jest.mock('@/lib/metrics-broadcaster', () => ({
  cleanupBroadcastChannels: jest.fn().mockResolvedValue(undefined)
}))

// Mock notification tracking
jest.mock('@/lib/notification-tokens', () => ({
  trackNotificationInteraction: jest.fn().mockResolvedValue(undefined)
}))

// Setup test-specific console overrides
const originalError = console.error
beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning: ReactDOM.render is no longer supported')
    ) {
      return
    }
    originalError.call(console, ...args)
  }
})

afterAll(() => {
  console.error = originalError
})