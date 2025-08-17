/**
 * Centralized billing utilities to ensure consistent credit calculations
 * across the entire application. This prevents billing discrepancies.
 */

/**
 * Company billing policy: Always round UP to nearest minute
 * This ensures we never undercharge for partial minutes
 */
export const BILLING_ROUNDING_MODE = 'ALWAYS_UP' as const;

/**
 * Convert seconds to billable minutes with consistent rounding
 * @param seconds - Duration in seconds
 * @returns Billable minutes (always rounds up)
 */
export function convertToBillableMinutes(seconds: number): number {
  if (seconds <= 0) return 0;
  
  const minutes = seconds / 60;
  
  // Company policy: Always round up for billing
  // 59 seconds = 1 minute, 61 seconds = 2 minutes
  return Math.ceil(minutes);
}

/**
 * Calculate available credits for a user
 * @param totalCredits - Base credits from plan
 * @param bonusCredits - Additional bonus credits
 * @param usedCredits - Credits already consumed
 * @returns Available credits (never negative)
 */
export function calculateAvailableCredits(
  totalCredits: number,
  bonusCredits: number,
  usedCredits: number
): number {
  const available = totalCredits + bonusCredits - usedCredits;
  return Math.max(0, available);
}

/**
 * Validate if user has sufficient credits
 * @param available - Available credits
 * @param requested - Requested credits
 * @returns Boolean indicating if sufficient
 */
export function hasSufficientCredits(
  available: number,
  requested: number
): boolean {
  return available >= requested && requested > 0;
}

/**
 * Calculate reservation expiry time
 * @param durationMinutes - Session duration in minutes
 * @returns Expiry date (2x duration + 30 min buffer)
 */
export function calculateReservationExpiry(durationMinutes: number): Date {
  // Reservation expires after 2x session duration + 30 min buffer
  // This handles technical issues and gives reasonable time to complete
  const expiryMinutes = (durationMinutes * 2) + 30;
  const maxExpiry = 180; // Cap at 3 hours
  
  const finalExpiry = Math.min(expiryMinutes, maxExpiry);
  return new Date(Date.now() + finalExpiry * 60 * 1000);
}

/**
 * Check if a reservation has expired
 * @param expiryDate - Reservation expiry date
 * @returns Boolean indicating if expired
 */
export function isReservationExpired(expiryDate: Date): boolean {
  return new Date() > expiryDate;
}

/**
 * Format credits for display
 * @param credits - Number of credits (minutes)
 * @returns Formatted string for UI display
 */
export function formatCreditsDisplay(credits: number): string {
  if (credits < 0) return 'Unlimited';
  
  const hours = Math.floor(credits / 60);
  const minutes = credits % 60;
  
  if (hours === 0) {
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  }
  
  if (minutes === 0) {
    return `${hours} hour${hours !== 1 ? 's' : ''}`;
  }
  
  return `${hours} hour${hours !== 1 ? 's' : ''} ${minutes} minute${minutes !== 1 ? 's' : ''}`;
}

/**
 * Validate credit operation amount
 * @param amount - Amount to validate
 * @returns Boolean indicating if valid
 */
export function isValidCreditAmount(amount: number): boolean {
  return Number.isInteger(amount) && amount > 0 && amount <= 1440; // Max 24 hours
}

/**
 * Generate idempotency key for credit operations
 * @param operation - Operation type
 * @param params - Operation parameters
 * @returns Deterministic idempotency key
 */
export function generateCreditIdempotencyKey(
  operation: string,
  params: string[]
): string {
  // Create deterministic key from operation and params
  const normalized = [operation, ...params].join(':');
  return `credit:idempotent:${normalized}`;
}

/**
 * Calculate grace period for interrupted sessions
 * @param sessionStartTime - When session started
 * @param interruptedAt - When interruption occurred
 * @returns Grace period end time (5 minutes from interruption)
 */
export function calculateGracePeriod(
  sessionStartTime: Date,
  interruptedAt: Date
): Date {
  const GRACE_PERIOD_MINUTES = 5;
  return new Date(interruptedAt.getTime() + GRACE_PERIOD_MINUTES * 60 * 1000);
}

/**
 * Check if within grace period
 * @param gracePeriodEnd - When grace period expires
 * @returns Boolean indicating if still within grace period
 */
export function isWithinGracePeriod(gracePeriodEnd: Date): boolean {
  return new Date() < gracePeriodEnd;
}

/**
 * Calculate refund amount for technical issues
 * @param minutesUsed - Minutes actually used
 * @param minutesCharged - Minutes charged to user
 * @returns Refund amount in minutes
 */
export function calculateRefundAmount(
  minutesUsed: number,
  minutesCharged: number
): number {
  // Only refund if charged more than used
  if (minutesCharged <= minutesUsed) return 0;
  
  // Refund the difference
  return minutesCharged - minutesUsed;
}

/**
 * Determine if session qualifies for technical issue refund
 * @param durationSeconds - Session duration in seconds
 * @param hadTechnicalIssue - Whether technical issue occurred
 * @returns Boolean indicating if refund should be issued
 */
export function qualifiesForTechnicalRefund(
  durationSeconds: number,
  hadTechnicalIssue: boolean
): boolean {
  // Sessions under 2 minutes with technical issues get full refund
  const MIN_BILLABLE_DURATION = 120; // 2 minutes in seconds
  return hadTechnicalIssue && durationSeconds < MIN_BILLABLE_DURATION;
}