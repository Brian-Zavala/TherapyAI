/**
 * Centralized error handling for dashboard API routes
 * Provides consistent error responses and logging
 */

import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { logger } from '@/lib/utils/logger';

export enum DashboardErrorCode {
  // Authentication errors
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  
  // Validation errors
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',
  
  // Database errors
  DB_CONNECTION_ERROR = 'DB_CONNECTION_ERROR',
  DB_QUERY_ERROR = 'DB_QUERY_ERROR',
  RECORD_NOT_FOUND = 'RECORD_NOT_FOUND',
  
  // Session errors
  SESSION_NOT_FOUND = 'SESSION_NOT_FOUND',
  SESSION_ALREADY_ACTIVE = 'SESSION_ALREADY_ACTIVE',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  INVALID_SESSION_STATE = 'INVALID_SESSION_STATE',
  
  // Rate limiting
  RATE_LIMITED = 'RATE_LIMITED',
  
  // External service errors
  VAPI_ERROR = 'VAPI_ERROR',
  EMAIL_SERVICE_ERROR = 'EMAIL_SERVICE_ERROR',
  
  // General errors
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
}

export interface DashboardErrorResponse {
  error: string;
  code: DashboardErrorCode;
  details?: any;
  timestamp: string;
  requestId?: string;
}

export class DashboardError extends Error {
  constructor(
    public code: DashboardErrorCode,
    public message: string,
    public statusCode: number = 500,
    public details?: any
  ) {
    super(message);
    this.name = 'DashboardError';
  }
}

/**
 * Main error handler for dashboard API routes
 */
export function handleDashboardError(
  error: unknown,
  context?: {
    route?: string;
    userId?: string;
    sessionId?: string;
    action?: string;
  }
): NextResponse<DashboardErrorResponse> {
  const timestamp = new Date().toISOString();
  const requestId = crypto.randomUUID();
  
  // Log the error with context
  logger.error('Dashboard API Error', {
    error: error instanceof Error ? error.message : 'Unknown error',
    stack: error instanceof Error ? error.stack : undefined,
    context,
    requestId,
    timestamp,
  });
  
  // Handle known error types
  if (error instanceof DashboardError) {
    return NextResponse.json(
      {
        error: error.message,
        code: error.code,
        details: error.details,
        timestamp,
        requestId,
      },
      { status: error.statusCode }
    );
  }
  
  // Handle Zod validation errors
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: 'Validation failed',
        code: DashboardErrorCode.VALIDATION_ERROR,
        details: error.errors.map(err => ({
          path: err.path.join('.'),
          message: err.message,
          code: err.code,
        })),
        timestamp,
        requestId,
      },
      { status: 400 }
    );
  }
  
  // Handle Prisma errors
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    const { code, message } = error;
    
    // Record not found
    if (code === 'P2025') {
      return NextResponse.json(
        {
          error: 'Record not found',
          code: DashboardErrorCode.RECORD_NOT_FOUND,
          details: { prismaCode: code },
          timestamp,
          requestId,
        },
        { status: 404 }
      );
    }
    
    // Database connection error
    if (code === 'P1001' || code === 'P1002') {
      return NextResponse.json(
        {
          error: 'Database connection error',
          code: DashboardErrorCode.DB_CONNECTION_ERROR,
          details: { prismaCode: code },
          timestamp,
          requestId,
        },
        { status: 503 }
      );
    }
    
    // Generic database error
    return NextResponse.json(
      {
        error: 'Database operation failed',
        code: DashboardErrorCode.DB_QUERY_ERROR,
        details: { prismaCode: code, message },
        timestamp,
        requestId,
      },
      { status: 500 }
    );
  }
  
  // Handle generic errors
  if (error instanceof Error) {
    // Check for specific error messages
    if (error.message.includes('unauthorized') || error.message.includes('Unauthorized')) {
      return NextResponse.json(
        {
          error: 'Authentication required',
          code: DashboardErrorCode.UNAUTHORIZED,
          timestamp,
          requestId,
        },
        { status: 401 }
      );
    }
    
    if (error.message.includes('rate limit')) {
      return NextResponse.json(
        {
          error: 'Too many requests',
          code: DashboardErrorCode.RATE_LIMITED,
          timestamp,
          requestId,
        },
        { status: 429 }
      );
    }
    
    // Generic error response
    return NextResponse.json(
      {
        error: 'An unexpected error occurred',
        code: DashboardErrorCode.INTERNAL_ERROR,
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        timestamp,
        requestId,
      },
      { status: 500 }
    );
  }
  
  // Unknown error type
  return NextResponse.json(
    {
      error: 'An unknown error occurred',
      code: DashboardErrorCode.INTERNAL_ERROR,
      timestamp,
      requestId,
    },
    { status: 500 }
  );
}

/**
 * Wrapper for dashboard API route handlers with automatic error handling
 */
export function withDashboardErrorHandler<T extends any[], R>(
  handler: (...args: T) => Promise<NextResponse<R>>,
  context?: {
    route?: string;
    action?: string;
  }
) {
  return async (...args: T): Promise<NextResponse<R | DashboardErrorResponse>> => {
    try {
      return await handler(...args);
    } catch (error) {
      return handleDashboardError(error, context);
    }
  };
}

/**
 * Helper to create standardized success responses
 */
export function dashboardSuccessResponse<T>(
  data: T,
  options?: {
    status?: number;
    headers?: Record<string, string>;
  }
): NextResponse<{ success: true; data: T; timestamp: string }> {
  return NextResponse.json(
    {
      success: true,
      data,
      timestamp: new Date().toISOString(),
    },
    {
      status: options?.status ?? 200,
      headers: options?.headers,
    }
  );
}

/**
 * Helper to validate request authentication
 */
export async function validateDashboardAuth(
  session: any
): Promise<{ userId: string; email: string }> {
  if (!session?.user?.id) {
    throw new DashboardError(
      DashboardErrorCode.UNAUTHORIZED,
      'Authentication required',
      401
    );
  }
  
  if (!session.user.email) {
    throw new DashboardError(
      DashboardErrorCode.INVALID_INPUT,
      'User email not found',
      400
    );
  }
  
  return {
    userId: session.user.id,
    email: session.user.email,
  };
}

/**
 * Helper to handle empty data responses
 */
export function handleEmptyDataResponse<T>(
  data: T[] | null | undefined,
  defaultValue: T[] = []
): T[] {
  if (!data || !Array.isArray(data)) {
    return defaultValue;
  }
  return data;
}

/**
 * Retry wrapper for flaky operations
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: {
    maxAttempts?: number;
    delayMs?: number;
    shouldRetry?: (error: unknown) => boolean;
  } = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    delayMs = 1000,
    shouldRetry = (error) => {
      // Retry on connection errors and timeouts
      if (error instanceof Error) {
        return error.message.includes('connect') || 
               error.message.includes('timeout') ||
               error.message.includes('ECONNREFUSED');
      }
      return false;
    },
  } = options;
  
  let lastError: unknown;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      if (attempt === maxAttempts || !shouldRetry(error)) {
        throw error;
      }
      
      // Exponential backoff
      const delay = delayMs * Math.pow(2, attempt - 1);
      await new Promise(resolve => setTimeout(resolve, delay));
      
      logger.warn('Retrying operation', {
        attempt,
        maxAttempts,
        delay,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
  
  throw lastError;
}