import { z } from 'zod';

// Flexible schema that accepts both string and array formats
export const notificationPrefsSchema = z.union([
  z.string(),
  z.array(z.string()),
  z.array(z.object({
    type: z.string(),
    enabled: z.boolean(),
  }))
]);

// Array of strings or null/undefined
export const preferredDaysSchema = z.union([
  z.array(z.string()),
  z.null(),
  z.undefined()
]);

// Flexible schema for concerns - can be array of strings or objects
export const currentConcernsSchema = z.union([
  z.array(z.string()),
  z.array(z.object({
    concern: z.string(),
    description: z.string().optional(),
  })),
  z.null(),
  z.undefined()
]);

export const onboardingDataSchema = z.object({
  step: z.number().optional(),
  responses: z.record(z.unknown()).optional(),
}).passthrough(); // Allow additional fields

