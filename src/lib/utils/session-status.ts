/**
 * Utility functions for handling session status comparisons
 * Normalizes status values to handle both uppercase (Prisma enum) and lowercase (legacy) formats
 */

export type SessionStatusEnum = 'SCHEDULED' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED' | 'TERMINATED' | 'ABANDONED'
export type SessionStatusLowercase = 'scheduled' | 'active' | 'paused' | 'completed' | 'cancelled' | 'terminated' | 'abandoned'

/**
 * Normalizes session status to lowercase for consistent comparisons
 */
export function normalizeSessionStatus(status: string | undefined | null): SessionStatusLowercase | undefined {
  if (!status) return undefined
  return status.toLowerCase() as SessionStatusLowercase
}

/**
 * Check if session is active (handles case sensitivity)
 */
export function isSessionActive(status: string | undefined | null): boolean {
  return normalizeSessionStatus(status) === 'active'
}

/**
 * Check if session is paused
 */
export function isSessionPaused(status: string | undefined | null): boolean {
  return normalizeSessionStatus(status) === 'paused'
}

/**
 * Check if session is completed
 */
export function isSessionCompleted(status: string | undefined | null): boolean {
  return normalizeSessionStatus(status) === 'completed'
}

/**
 * Check if session is in a terminal state (completed, cancelled, terminated, abandoned)
 */
export function isSessionTerminal(status: string | undefined | null): boolean {
  const normalized = normalizeSessionStatus(status)
  return normalized === 'completed' || 
         normalized === 'cancelled' || 
         normalized === 'terminated' || 
         normalized === 'abandoned'
}

/**
 * Check if session can be resumed (active or paused)
 */
export function canResumeSession(status: string | undefined | null): boolean {
  const normalized = normalizeSessionStatus(status)
  return normalized === 'active' || normalized === 'paused'
}