import { z } from 'zod';
import { z } from 'zod';
import { SESSION_DURATION_OPTIONS, type SessionDuration } from '@/lib/therapy-session/constants';

/**
 * Unified duration validation for all API routes
 * Ensures only valid session durations are accepted
 */

// Strict duration schema - only allows exact matches
export const strictDurationSchema = z.number()
  .refine(
    (val): val is SessionDuration => SESSION_DURATION_OPTIONS.includes(val as SessionDuration),
    {
      message: `Duration must be one of: ${SESSION_DURATION_OPTIONS.join(', ')} minutes`
    }
  );

// Plan-specific duration limits
export const PLAN_DURATION_LIMITS = {
  free: {
    allowed: [15] as const,
    max: 15,
    description: 'Free tier: 15-minute sessions only'
  },
  essential: {
    allowed: [15, 20] as const,
    max: 20,
    description: 'Essential tier: Up to 20-minute sessions'
  },
  growth: {
    allowed: [15, 20, 25] as const,
    max: 25,
    description: 'Growth tier: Up to 25-minute sessions'
  },
  unlimited: {
    allowed: [15, 20, 25, 30, 60] as const,
    max: 60,
    description: 'Unlimited tier: All session durations available'
  }
} as const;

export type PlanType = keyof typeof PLAN_DURATION_LIMITS;

/**
 * Validates duration against user's plan restrictions
 */
export function validateDurationForPlan(duration: number, planType: PlanType): {
  valid: boolean;
  error?: string;
  allowedDurations: readonly number[];
} {
  const planLimits = PLAN_DURATION_LIMITS[planType];
  const allowedDurations = planLimits.allowed;
  
  if (!allowedDurations.includes(duration as any)) {
    return {
      valid: false,
      error: `${planLimits.description}. Selected ${duration} minutes is not available for your plan.`,
      allowedDurations
    };
  }
  
  return {
    valid: true,
    allowedDurations
  };
}

/**
 * Runtime validation for duration values
 */
export function isValidDuration(duration: number): duration is SessionDuration {
  return SESSION_DURATION_OPTIONS.includes(duration as SessionDuration);
}

/**
 * Sanitizes invalid durations to nearest valid option
 * Used for backward compatibility with existing data
 */
export function sanitizeDuration(duration: number): SessionDuration {
  if (isValidDuration(duration)) {
    return duration;
  }
  
  // Find closest valid duration
  const closest = SESSION_DURATION_OPTIONS.reduce((prev, curr) => 
    Math.abs(curr - duration) < Math.abs(prev - duration) ? curr : prev
  );
  
  console.warn(`Invalid duration ${duration} sanitized to ${closest} minutes`);
  return closest;
}

/**
 * Gets maximum allowed duration for a plan
 */
export function getMaxDurationForPlan(planType: PlanType): SessionDuration {
  return PLAN_DURATION_LIMITS[planType].max as SessionDuration;
}

/**
 * Gets all allowed durations for a plan
 */
export function getAllowedDurationsForPlan(planType: PlanType): readonly SessionDuration[] {
  return PLAN_DURATION_LIMITS[planType].allowed as readonly SessionDuration[];
}

/**
 * Validation result type
 */
export interface DurationValidationResult {
  isValid: boolean;
  duration: SessionDuration;
  originalDuration: number;
  wasModified: boolean;
  error?: string;
}

/**
 * Comprehensive duration validation with plan awareness
 */
export function validateAndSanitizeDuration(
  duration: number,
  planType?: PlanType
): DurationValidationResult {
  const originalDuration = duration;
  
  // First check if it's a valid duration at all
  if (!isValidDuration(duration)) {
    const sanitized = sanitizeDuration(duration);
    
    // If we have a plan, check if sanitized duration is allowed
    if (planType) {
      const planValidation = validateDurationForPlan(sanitized, planType);
      if (!planValidation.valid) {
        // Use the maximum allowed for the plan
        const maxAllowed = getMaxDurationForPlan(planType);
        return {
          isValid: false,
          duration: maxAllowed,
          originalDuration,
          wasModified: true,
          error: `Duration ${originalDuration} is invalid. Using maximum allowed: ${maxAllowed} minutes for ${planType} plan.`
        };
      }
    }
    
    return {
      isValid: false,
      duration: sanitized,
      originalDuration,
      wasModified: true,
      error: `Duration ${originalDuration} is not valid. Using closest valid duration: ${sanitized} minutes.`
    };
  }
  
  // Valid duration, check plan restrictions if provided
  if (planType) {
    const planValidation = validateDurationForPlan(duration, planType);
    if (!planValidation.valid) {
      const maxAllowed = getMaxDurationForPlan(planType);
      return {
        isValid: false,
        duration: maxAllowed,
        originalDuration,
        wasModified: true,
        error: planValidation.error
      };
    }
  }
  
  return {
    isValid: true,
    duration: duration as SessionDuration,
    originalDuration,
    wasModified: false
  };
}

// Export reusable Zod schemas
export const durationValidationSchema = z.object({
  duration: strictDurationSchema,
  planType: z.enum(['free', 'essential', 'growth', 'unlimited']).optional()
});

// Schema for session creation with duration validation
export const sessionCreationSchema = z.object({
  duration: strictDurationSchema,
  therapyType: z.enum(['individual', 'couple', 'family', 'solo']).transform(val => 
    val === 'solo' ? 'individual' : val
  ),
  familyMembers: z.array(z.object({
    name: z.string(),
    age: z.number(),
    relation: z.string(),
  })).optional(),
  metadata: z.record(z.any()).optional(), // Allow any type in metadata
});

export default {
  strictDurationSchema,
  isValidDuration,
  sanitizeDuration,
  validateDurationForPlan,
  validateAndSanitizeDuration,
  getMaxDurationForPlan,
  getAllowedDurationsForPlan,
  PLAN_DURATION_LIMITS
};