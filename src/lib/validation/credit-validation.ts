/**
 * Credit validation utilities with overflow protection and security checks
 */

import { z } from 'zod';

// PostgreSQL INTEGER max value for overflow protection
export const MAX_CREDITS = 2147483647;
export const MIN_CREDITS = 0;
export const MAX_SESSION_DURATION = 180; // 3 hours max
export const MIN_SESSION_DURATION = 5; // 5 minutes min

/**
 * Safely add credits with overflow protection
 */
export function safeAddCredits(a: number, b: number): number {
  const result = a + b;
  if (result > MAX_CREDITS || result < 0) {
    throw new Error('Credit calculation overflow detected');
  }
  return result;
}

/**
 * Safely subtract credits with underflow protection
 */
export function safeSubtractCredits(a: number, b: number): number {
  const result = a - b;
  if (result < MIN_CREDITS) {
    return MIN_CREDITS; // Clamp to 0 instead of going negative
  }
  if (result > MAX_CREDITS) {
    throw new Error('Credit calculation overflow detected');
  }
  return result;
}

/**
 * Calculate available credits with overflow protection
 */
export function calculateAvailableCredits(
  totalCredits: number | null,
  bonusCredits: number | null,
  usedCredits: number | null
): number {
  // Ensure all values are valid numbers
  const total = Math.max(0, Math.min(totalCredits || 0, MAX_CREDITS));
  const bonus = Math.max(0, Math.min(bonusCredits || 0, MAX_CREDITS));
  const used = Math.max(0, Math.min(usedCredits || 0, MAX_CREDITS));

  // Safely calculate total available
  const totalAvailable = safeAddCredits(total, bonus);
  
  // Safely subtract used credits
  return safeSubtractCredits(totalAvailable, used);
}

/**
 * Validate credit amount is within safe bounds
 */
export function validateCreditAmount(amount: number): boolean {
  if (!Number.isInteger(amount)) {
    return false;
  }
  if (amount < MIN_CREDITS || amount > MAX_CREDITS) {
    return false;
  }
  return true;
}

/**
 * Schema for credit operation validation
 */
export const creditOperationSchema = z.object({
  userId: z.string().uuid('Invalid user ID format'),
  sessionId: z.string().uuid('Invalid session ID format'),
  amount: z.number()
    .int('Credit amount must be whole number')
    .min(MIN_CREDITS, `Minimum credit amount is ${MIN_CREDITS}`)
    .max(MAX_CREDITS, `Maximum credit amount is ${MAX_CREDITS}`)
    .refine(validateCreditAmount, 'Invalid credit amount'),
  operation: z.enum(['reserve', 'deduct', 'refund', 'add']),
  metadata: z.record(z.unknown()).optional(),
});

/**
 * Schema for duration validation with plan-specific limits
 */
export const durationValidationSchema = z.object({
  duration: z.number()
    .int('Duration must be whole minutes')
    .min(MIN_SESSION_DURATION)
    .max(MAX_SESSION_DURATION),
  planType: z.enum(['free', 'essential', 'growth', 'unlimited']),
});

/**
 * Validate session duration based on plan limits
 */
export function validateSessionDuration(
  duration: number,
  planType: 'free' | 'essential' | 'growth' | 'unlimited'
): { isValid: boolean; error?: string } {
  // Plan-specific max durations
  const planLimits = {
    free: 15,
    essential: 20,
    growth: 30,
    unlimited: 60,
  };

  const maxDuration = planLimits[planType];

  if (!Number.isInteger(duration)) {
    return { isValid: false, error: 'Duration must be whole minutes' };
  }

  if (duration < MIN_SESSION_DURATION) {
    return { isValid: false, error: `Minimum session duration is ${MIN_SESSION_DURATION} minutes` };
  }

  if (duration > maxDuration) {
    return { isValid: false, error: `Maximum session duration for ${planType} plan is ${maxDuration} minutes` };
  }

  if (duration > MAX_SESSION_DURATION) {
    return { isValid: false, error: `Maximum session duration is ${MAX_SESSION_DURATION} minutes` };
  }

  return { isValid: true };
}

/**
 * Calculate prorated credits for plan upgrades
 */
export function calculateProratedCredits(
  oldPlanCredits: number,
  newPlanCredits: number,
  daysRemaining: number,
  totalDaysInPeriod: number
): number {
  if (daysRemaining <= 0 || totalDaysInPeriod <= 0) {
    return 0;
  }

  // Calculate the additional credits from upgrade
  const additionalCredits = Math.max(0, newPlanCredits - oldPlanCredits);
  
  // Prorate based on remaining days
  const proratedAmount = Math.round(
    (additionalCredits * daysRemaining) / totalDaysInPeriod
  );

  // Ensure result is within safe bounds
  if (!validateCreditAmount(proratedAmount)) {
    throw new Error('Prorated credit calculation resulted in invalid amount');
  }

  return proratedAmount;
}

/**
 * Sanitize and validate request size to prevent DoS
 */
export function validateRequestSize(data: unknown): boolean {
  const jsonString = JSON.stringify(data);
  const maxSize = 10 * 1024; // 10KB max
  
  if (jsonString.length > maxSize) {
    return false;
  }
  
  return true;
}

export type CreditOperation = z.infer<typeof creditOperationSchema>;
export type DurationValidation = z.infer<typeof durationValidationSchema>;