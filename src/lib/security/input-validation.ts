// Comprehensive input validation and sanitization utilities
import { z } from 'zod'

// Email validation with additional security checks
export const emailSchema = z.string()
  .email('Invalid email format')
  .min(3, 'Email too short')
  .max(254, 'Email too long') // RFC 5321
  .refine(email => {
    // Prevent email injection attacks
    const dangerous = ['<', '>', '"', "'", '\\', '\n', '\r', '\0']
    return !dangerous.some(char => email.includes(char))
  }, 'Email contains invalid characters')
  .refine(email => {
    // Check for valid domain
    const [, domain] = email.split('@')
    return domain && domain.includes('.') && !domain.startsWith('.') && !domain.endsWith('.')
  }, 'Invalid email domain')

// Phone number validation
export const phoneSchema = z.string()
  .regex(/^[\d\s\-\+\(\)]+$/, 'Invalid phone number format')
  .min(10, 'Phone number too short')
  .max(20, 'Phone number too long')
  .transform(phone => phone.replace(/\D/g, '')) // Strip non-digits

// Age validation with reasonable bounds
export const ageSchema = z.number()
  .int('Age must be a whole number')
  .min(13, 'Must be at least 13 years old')
  .max(120, 'Invalid age')

// Name validation to prevent XSS
export const nameSchema = z.string()
  .min(1, 'Name is required')
  .max(100, 'Name too long')
  .regex(/^[a-zA-Z\s\-\'\.]+$/, 'Name contains invalid characters')
  .transform(name => name.trim())

// Text field validation with XSS prevention
export const textFieldSchema = z.string()
  .max(1000, 'Text too long')
  .transform(text => {
    // Basic XSS prevention - strip dangerous tags
    return text
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '') // Remove event handlers
      .trim()
  })

// JSON validation for onboarding data
export const jsonSchema = z.string()
  .transform(str => {
    try {
      return JSON.parse(str)
    } catch {
      throw new Error('Invalid JSON format')
    }
  })
  .pipe(z.record(z.unknown()))

// Request size validation
export const requestSizeValidator = (maxSizeBytes: number = 100000) => {
  return (text: string) => {
    const size = new TextEncoder().encode(text).length
    if (size > maxSizeBytes) {
      throw new Error(`Request too large: ${size} bytes (max: ${maxSizeBytes})`)
    }
    return text
  }
}

// SQL injection prevention for dynamic queries
export const sanitizeSqlIdentifier = (identifier: string): string => {
  // Only allow alphanumeric, underscore, and dash
  if (!/^[a-zA-Z0-9_\-]+$/.test(identifier)) {
    throw new Error('Invalid SQL identifier')
  }
  return identifier
}

// Path traversal prevention
export const sanitizePath = (path: string): string => {
  // Remove path traversal attempts
  const sanitized = path
    .replace(/\.\./g, '')
    .replace(/\/\//g, '/')
    .replace(/\\/g, '/')
  
  // Ensure path doesn't start with system directories
  const blocked = ['/etc', '/usr', '/bin', '/sbin', '/proc', '/sys']
  if (blocked.some(dir => sanitized.startsWith(dir))) {
    throw new Error('Access to system directories not allowed')
  }
  
  return sanitized
}

// Rate limiting key sanitization
export const sanitizeRateLimitKey = (key: string): string => {
  // Ensure key is safe for Redis/cache storage
  return key
    .replace(/[^a-zA-Z0-9:_\-@\.]/g, '')
    .substring(0, 200) // Limit key length
}

// Validate and sanitize pagination params
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
})

// Validate session ID format
export const sessionIdSchema = z.string()
  .uuid('Invalid session ID format')

// Validate user ID format
export const userIdSchema = z.string()
  .regex(/^[a-zA-Z0-9_\-]+$/, 'Invalid user ID format')
  .min(1)
  .max(100)

// Combined profile validation schema
export const profileUpdateSchema = z.object({
  name: nameSchema.optional(),
  email: emailSchema.optional(),
  phone: phoneSchema.optional(),
  age: ageSchema.optional(),
  pronouns: textFieldSchema.optional(),
  partnerName: nameSchema.optional(),
  partnerAge: ageSchema.optional(),
  relationshipStatus: z.enum(['single', 'dating', 'engaged', 'married', 'divorced', 'widowed', 'other']).optional(),
  currentConcerns: z.array(z.string()).max(10).optional(),
  emergencyContact: phoneSchema.optional(),
  sessionPreference: z.enum(['morning', 'afternoon', 'evening', 'night']).optional(),
  preferredDays: z.array(z.enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'])).optional(),
  sessionFrequency: z.enum(['daily', 'weekly', 'biweekly', 'monthly']).optional(),
  communicationStyle: textFieldSchema.optional(),
  additionalNotes: textFieldSchema.optional()
})

// Export validation utility
export const validateInput = <T>(schema: z.ZodSchema<T>, data: unknown): T => {
  try {
    return schema.parse(data)
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
      throw new Error(`Validation failed: ${messages.join(', ')}`)
    }
    throw error
  }
}

// Security headers for responses
export const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';"
}