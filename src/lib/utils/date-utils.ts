import { format, parseISO } from 'date-fns';
import { formatInTimeZone, toZonedTime, fromZonedTime } from 'date-fns-tz';

/**
 * Timezone-aware date formatting utilities for the therapy platform
 * Following Next.js best practices to avoid hydration mismatches
 */

// Default timezone if user preference not available
export const DEFAULT_TIMEZONE = 'UTC';

/**
 * Get the user's timezone from their profile or browser
 */
export function getUserTimezone(userTimezone?: string | null): string {
  // Priority order:
  // 1. User's saved preference
  // 2. Browser timezone
  // 3. Default to UTC
  
  if (userTimezone) {
    return userTimezone;
  }
  
  // Get browser timezone (client-side only)
  if (typeof window !== 'undefined') {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  }
  
  return DEFAULT_TIMEZONE;
}

/**
 * Format a date in the user's timezone
 * Safe for server-side rendering to avoid hydration mismatches
 */
export function formatInUserTimezone(
  date: Date | string,
  formatStr: string,
  timezone: string = DEFAULT_TIMEZONE
): string {
  const dateObject = typeof date === 'string' ? parseISO(date) : date;
  return formatInTimeZone(dateObject, timezone, formatStr);
}

/**
 * Convert UTC date to user's timezone
 */
export function toUserTimezone(
  date: Date | string,
  timezone: string = DEFAULT_TIMEZONE
): Date {
  const dateObject = typeof date === 'string' ? parseISO(date) : date;
  return toZonedTime(dateObject, timezone);
}

/**
 * Convert user's timezone date to UTC for storage
 */
export function toUTC(
  date: Date | string,
  timezone: string = DEFAULT_TIMEZONE
): Date {
  const dateObject = typeof date === 'string' ? parseISO(date) : date;
  return fromZonedTime(dateObject, timezone);
}

/**
 * Get a consistent date format for display
 * This prevents hydration mismatches by using the same format on server and client
 */
export function getConsistentDateFormat(
  date: Date | string,
  options: {
    includeTime?: boolean;
    includeSeconds?: boolean;
    timezone?: string;
  } = {}
): string {
  const { includeTime = true, includeSeconds = false, timezone = DEFAULT_TIMEZONE } = options;
  
  let formatStr = 'MMM d, yyyy';
  if (includeTime) {
    formatStr += ' h:mm';
    if (includeSeconds) {
      formatStr += ':ss';
    }
    formatStr += ' a zzz';
  }
  
  return formatInUserTimezone(date, formatStr, timezone);
}

/**
 * Check if a session is happening soon (within next hour)
 * Timezone-aware comparison
 */
export function isSessionSoon(
  sessionDate: Date | string,
  timezone: string = DEFAULT_TIMEZONE
): boolean {
  const now = new Date();
  const sessionInUserTz = toUserTimezone(sessionDate, timezone);
  const diffInMs = sessionInUserTz.getTime() - now.getTime();
  const oneHourInMs = 60 * 60 * 1000;
  
  return diffInMs > 0 && diffInMs <= oneHourInMs;
}

/**
 * Get session badge info based on date
 * Returns consistent badge styling regardless of timezone
 */
export function getSessionBadgeInfo(
  sessionDate: Date | string,
  timezone: string = DEFAULT_TIMEZONE
): {
  label: string;
  colorClass: string;
  priority: number;
} {
  const now = new Date();
  const sessionInUserTz = toUserTimezone(sessionDate, timezone);
  const diffInMs = sessionInUserTz.getTime() - now.getTime();
  const diffInHours = diffInMs / (1000 * 60 * 60);
  const diffInDays = Math.floor(diffInHours / 24);
  
  // Past session
  if (diffInMs < 0) {
    return {
      label: 'Past',
      colorClass: 'bg-gray-100 text-gray-800',
      priority: 0
    };
  }
  
  // Within next hour
  if (diffInHours <= 1) {
    return {
      label: 'Happening soon',
      colorClass: 'bg-red-100 text-red-800',
      priority: 4
    };
  }
  
  // Today
  if (diffInDays === 0) {
    return {
      label: 'Today',
      colorClass: 'bg-amber-100 text-amber-800',
      priority: 3
    };
  }
  
  // Tomorrow
  if (diffInDays === 1) {
    return {
      label: 'Tomorrow',
      colorClass: 'bg-blue-100 text-blue-800',
      priority: 2
    };
  }
  
  // Future
  return {
    label: `In ${diffInDays} days`,
    colorClass: 'bg-green-100 text-green-800',
    priority: 1
  };
}

/**
 * Format session time for display
 * Shows date and time in user's timezone
 */
export function formatSessionTime(
  sessionDate: Date | string,
  duration: number,
  timezone: string = DEFAULT_TIMEZONE
): {
  date: string;
  time: string;
  endTime: string;
} {
  const startDate = toUserTimezone(sessionDate, timezone);
  const endDate = new Date(startDate.getTime() + duration * 60 * 1000);
  
  return {
    date: formatInTimeZone(startDate, timezone, 'EEEE, MMMM d, yyyy'),
    time: formatInTimeZone(startDate, timezone, 'h:mm a'),
    endTime: formatInTimeZone(endDate, timezone, 'h:mm a zzz')
  };
}

/**
 * Get available time slots for scheduling
 * Returns slots in user's timezone
 * Interval should match session duration for proper scheduling
 */
export function getAvailableTimeSlots(
  date: Date,
  timezone: string = DEFAULT_TIMEZONE,
  options: {
    startHour?: number;
    endHour?: number;
    interval?: number;
    duration?: number; // Session duration in minutes - used to determine interval if not specified
  } = {}
): Array<{ time: Date; display: string }> {
  const { startHour = 9, endHour = 21 } = options;
  
  // Use duration to determine interval if not explicitly provided
  // This ensures proper spacing between available slots based on session length
  let { interval = 30 } = options;
  if (options.duration && !options.interval) {
    // For 15-minute sessions, show slots every 15 minutes
    // For 30-minute sessions, show slots every 30 minutes
    // For 60-minute sessions, show slots every 30 minutes (more flexibility)
    interval = options.duration === 60 ? 30 : options.duration;
  }
  
  const slots: Array<{ time: Date; display: string }> = [];
  
  // Create date in user's timezone
  const dateInTz = toUserTimezone(date, timezone);
  
  for (let hour = startHour; hour < endHour; hour++) {
    for (let minute = 0; minute < 60; minute += interval) {
      const slotTime = new Date(dateInTz);
      slotTime.setHours(hour, minute, 0, 0);
      
      // Don't add slots that would extend past end hour with the session duration
      if (options.duration) {
        const slotEndTime = new Date(slotTime);
        slotEndTime.setMinutes(slotEndTime.getMinutes() + options.duration);
        if (slotEndTime.getHours() > endHour || (slotEndTime.getHours() === endHour && slotEndTime.getMinutes() > 0)) {
          continue;
        }
      }
      
      // Convert back to UTC for storage
      const utcTime = toUTC(slotTime, timezone);
      
      slots.push({
        time: utcTime,
        display: formatInTimeZone(slotTime, timezone, 'h:mm a')
      });
    }
  }
  
  return slots;
}

/**
 * Check if it's within business hours in user's timezone
 */
export function isBusinessHours(
  timezone: string = DEFAULT_TIMEZONE,
  options: {
    startHour?: number;
    endHour?: number;
    includeSaturday?: boolean;
    includeSunday?: boolean;
  } = {}
): boolean {
  const {
    startHour = 9,
    endHour = 17,
    includeSaturday = false,
    includeSunday = false
  } = options;
  
  const now = toUserTimezone(new Date(), timezone);
  const hour = now.getHours();
  const day = now.getDay(); // 0 = Sunday, 6 = Saturday
  
  // Check if weekend
  if (day === 0 && !includeSunday) return false;
  if (day === 6 && !includeSaturday) return false;
  
  // Check if within business hours
  return hour >= startHour && hour < endHour;
}