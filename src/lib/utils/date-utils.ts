/**
 * Date utilities for consistent timezone handling
 */

/**
 * Convert date to UTC midnight for billing period consistency
 */
export function toUTCMidnight(date: Date): Date {
  const utcDate = new Date(date);
  utcDate.setUTCHours(0, 0, 0, 0);
  return utcDate;
}

/**
 * Get billing period start date (first day of month at UTC midnight)
 */
export function getBillingPeriodStart(date: Date = new Date()): Date {
  const startDate = new Date(date);
  startDate.setUTCDate(1);
  startDate.setUTCHours(0, 0, 0, 0);
  return startDate;
}

/**
 * Get billing period end date (last day of month at 23:59:59.999 UTC)
 */
export function getBillingPeriodEnd(date: Date = new Date()): Date {
  const endDate = new Date(date);
  endDate.setUTCMonth(endDate.getUTCMonth() + 1);
  endDate.setUTCDate(0); // Last day of current month
  endDate.setUTCHours(23, 59, 59, 999);
  return endDate;
}

/**
 * Check if a date is within a billing period
 */
export function isWithinBillingPeriod(
  date: Date,
  periodStart: Date,
  periodEnd: Date
): boolean {
  const checkDate = date.getTime();
  return checkDate >= periodStart.getTime() && checkDate <= periodEnd.getTime();
}

/**
 * Calculate days remaining in billing period
 */
export function daysRemainingInPeriod(periodEnd: Date, now: Date = new Date()): number {
  const msRemaining = periodEnd.getTime() - now.getTime();
  return Math.max(0, Math.ceil(msRemaining / (1000 * 60 * 60 * 24)));
}

/**
 * Format date for consistent display (always in UTC)
 */
export function formatUTCDate(date: Date, format: 'short' | 'long' = 'short'): string {
  const options: Intl.DateTimeFormatOptions = {
    timeZone: 'UTC',
    year: 'numeric',
    month: format === 'long' ? 'long' : '2-digit',
    day: '2-digit',
  };
  
  if (format === 'long') {
    options.hour = '2-digit';
    options.minute = '2-digit';
    options.second = '2-digit';
  }
  
  return new Intl.DateTimeFormat('en-US', options).format(date);
}

/**
 * Parse subscription period from Stripe timestamps (seconds to Date)
 */
export function parseStripeTimestamp(timestamp: number): Date {
  return new Date(timestamp * 1000);
}

/**
 * Get next billing date from current period end
 */
export function getNextBillingDate(currentPeriodEnd: Date): Date {
  const nextDate = new Date(currentPeriodEnd);
  nextDate.setUTCDate(nextDate.getUTCDate() + 1);
  nextDate.setUTCHours(0, 0, 0, 0);
  return nextDate;
}