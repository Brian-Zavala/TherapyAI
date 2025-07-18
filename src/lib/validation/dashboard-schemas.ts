/**
 * Zod validation schemas for dashboard API responses
 * Ensures consistent data validation and prevents runtime errors
 */

import { z } from 'zod';
import { SessionStatus } from '@prisma/client';

// Helper schemas for common patterns
const safeNumberSchema = z.number().finite().safe().default(0);
const percentageSchema = z.number().min(0).max(100).finite().default(50);
const dateStringSchema = z.string().datetime();
const optionalDateSchema = z.date().nullable().optional();

// Session Status validation
export const sessionStatusSchema = z.nativeEnum(SessionStatus);

// Communication Metrics Schema
export const communicationMetricSchema = z.object({
  id: z.string(),
  sessionId: z.string().nullable(),
  userId: z.string(),
  clarity: percentageSchema,
  empathy: percentageSchema,
  respect: percentageSchema,
  overall: percentageSchema,
  listening: percentageSchema.nullable().optional(),
  expression: percentageSchema.nullable().optional(),
  metricType: z.enum(['real-time', 'final', 'manual']).default('real-time'),
  calculatedAt: z.union([z.string().datetime(), z.date()]).transform(val => 
    typeof val === 'string' ? new Date(val) : val
  ),
  confidence: z.number().min(0).max(1).nullable().optional(),
  createdAt: z.union([z.string().datetime(), z.date()]).transform(val => 
    typeof val === 'string' ? new Date(val) : val
  ),
  updatedAt: z.union([z.string().datetime(), z.date()]).transform(val => 
    typeof val === 'string' ? new Date(val) : val
  ),
});

// Session Time Chart Data
export const sessionTimeDataSchema = z.object({
  month: z.string(),
  sessionTime: safeNumberSchema,
  sessionCount: safeNumberSchema,
});

// Relationship Progress Data
export const relationshipProgressSchema = z.object({
  date: dateStringSchema,
  closenessScore: percentageSchema,
  communicationScore: percentageSchema,
  sessionId: z.string().optional(),
  notes: z.string().nullable().optional(),
});

// Session Schema
export const sessionSchema = z.object({
  id: z.string(),
  userId: z.string(),
  assistantId: z.string().nullable().optional(),
  date: z.union([z.string().datetime(), z.date()]).transform(val => 
    typeof val === 'string' ? new Date(val) : val
  ),
  startTime: optionalDateSchema,
  endTime: optionalDateSchema,
  completedAt: optionalDateSchema,
  duration: safeNumberSchema.default(60),
  theme: z.string().default('AI Therapy Session'),
  notes: z.string().nullable().default(''),
  sessionType: z.enum(['couple', 'family', 'individual']).default('couple'),
  status: sessionStatusSchema,
  terminationReason: z.string().nullable().optional(),
  conversationTimeSeconds: safeNumberSchema,
  lastConversationStart: optionalDateSchema,
  isPaused: z.boolean().default(false),
  pausedAt: optionalDateSchema,
  resumedAt: optionalDateSchema,
  totalPausedTimeSeconds: safeNumberSchema,
  pauseStartTime: optionalDateSchema,
  vapiCallId: z.string().nullable().optional(),
  vapiCallCost: z.number().finite().nullable().optional(),
  vapiRecordingUrl: z.string().url().nullable().optional(),
  reminderSent: z.boolean().default(false),
  smsReminderSent: z.boolean().nullable().default(false),
  emailReminderSent: z.boolean().nullable().default(false),
  oneHourReminderSent: z.boolean().nullable().default(false),
  version: safeNumberSchema,
  createdAt: z.union([z.string().datetime(), z.date()]).transform(val => 
    typeof val === 'string' ? new Date(val) : val
  ),
  updatedAt: z.union([z.string().datetime(), z.date()]).transform(val => 
    typeof val === 'string' ? new Date(val) : val
  ),
});

// Dashboard Metrics Overview
export const dashboardMetricsSchema = z.object({
  // Communication metrics
  communicationMetrics: z.object({
    current: communicationMetricSchema.nullable(),
    history: z.array(communicationMetricSchema),
    average: z.object({
      clarity: percentageSchema,
      empathy: percentageSchema,
      respect: percentageSchema,
      overall: percentageSchema,
    }).nullable(),
  }),
  
  // Session time data
  sessionTimeData: z.array(sessionTimeDataSchema),
  
  // Relationship progress
  relationshipProgress: z.array(relationshipProgressSchema),
  
  // Active session info
  activeSession: sessionSchema.nullable(),
  
  // Upcoming sessions
  upcomingSessions: z.array(sessionSchema),
  
  // Summary stats
  stats: z.object({
    totalSessions: safeNumberSchema,
    completedSessions: safeNumberSchema,
    totalMinutes: safeNumberSchema,
    averageSessionLength: safeNumberSchema,
    lastSessionDate: dateStringSchema.nullable().optional(),
    nextSessionDate: dateStringSchema.nullable().optional(),
  }).optional(),
});

// API Response Wrappers
export const apiSuccessResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) => z.object({
  success: z.literal(true),
  data: dataSchema,
  timestamp: dateStringSchema.optional(),
});

export const apiErrorResponseSchema = z.object({
  success: z.literal(false).optional(),
  error: z.string(),
  code: z.string().optional(),
  details: z.any().optional(),
  timestamp: dateStringSchema.optional(),
});

export const apiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) => z.union([
  apiSuccessResponseSchema(dataSchema),
  apiErrorResponseSchema,
]);

// Paginated Response
export const paginatedResponseSchema = <T extends z.ZodTypeAny>(itemSchema: T) => z.object({
  data: z.array(itemSchema),
  pagination: z.object({
    page: safeNumberSchema,
    limit: safeNumberSchema,
    total: safeNumberSchema,
    totalPages: safeNumberSchema,
    hasNext: z.boolean(),
    hasPrevious: z.boolean(),
  }),
});

// Export type inference helpers
export type CommunicationMetric = z.infer<typeof communicationMetricSchema>;
export type SessionTimeData = z.infer<typeof sessionTimeDataSchema>;
export type RelationshipProgress = z.infer<typeof relationshipProgressSchema>;
export type Session = z.infer<typeof sessionSchema>;
export type DashboardMetrics = z.infer<typeof dashboardMetricsSchema>;

// Validation helpers
export const validateDashboardData = (data: unknown): DashboardMetrics => {
  return dashboardMetricsSchema.parse(data);
};

export const validateSession = (data: unknown): Session => {
  return sessionSchema.parse(data);
};

export const validateCommunicationMetrics = (data: unknown): CommunicationMetric => {
  return communicationMetricSchema.parse(data);
};

// Safe parsing helpers that return default values on error
export const safeParseSession = (data: unknown): Session | null => {
  const result = sessionSchema.safeParse(data);
  return result.success ? result.data : null;
};

export const safeParseDashboardMetrics = (data: unknown): DashboardMetrics | null => {
  const result = dashboardMetricsSchema.safeParse(data);
  return result.success ? result.data : null;
};

// Array validation with filtering of invalid items
export const validateSessionArray = (data: unknown[]): Session[] => {
  return data
    .map(item => safeParseSession(item))
    .filter((item): item is Session => item !== null);
};

export const validateMetricsArray = (data: unknown[]): CommunicationMetric[] => {
  return data
    .map(item => {
      const result = communicationMetricSchema.safeParse(item);
      return result.success ? result.data : null;
    })
    .filter((item): item is CommunicationMetric => item !== null);
};

// Number safety utilities
export const sanitizeNumber = (value: unknown, defaultValue = 0): number => {
  if (typeof value !== 'number') return defaultValue;
  if (!Number.isFinite(value)) return defaultValue;
  if (!Number.isSafeInteger(value) && Math.abs(value) > Number.MAX_SAFE_INTEGER) {
    return defaultValue;
  }
  return value;
};

export const sanitizePercentage = (value: unknown, defaultValue = 50): number => {
  const num = sanitizeNumber(value, defaultValue);
  return Math.max(0, Math.min(100, num));
};