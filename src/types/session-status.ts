/**
 * Centralized session status type definitions
 * Database uses UPPERCASE enums, application normalizes to lowercase for consistency
 */

// Database enum values (Prisma generates these as UPPERCASE)
export enum SessionStatus {
  SCHEDULED = 'SCHEDULED',
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  TERMINATED = 'TERMINATED',
  ABANDONED = 'ABANDONED',
  TECHNICAL_ISSUE = 'TECHNICAL_ISSUE'
}

// Reservation status enum for credit management
export enum ReservationStatus {
  ACTIVE = 'ACTIVE',
  EXPIRED = 'EXPIRED',
  CONSUMED = 'CONSUMED',
  RELEASED = 'RELEASED'
}

// Type guards for runtime validation
export function isValidSessionStatus(status: string): status is keyof typeof SessionStatus {
  return Object.values(SessionStatus).includes(status as SessionStatus);
}

export function isValidReservationStatus(status: string): status is keyof typeof ReservationStatus {
  return Object.values(ReservationStatus).includes(status as ReservationStatus);
}

// Constants for commonly used status values
export const SESSION_STATUS = {
  SCHEDULED: SessionStatus.SCHEDULED,
  ACTIVE: SessionStatus.ACTIVE,
  PAUSED: SessionStatus.PAUSED,
  COMPLETED: SessionStatus.COMPLETED,
  CANCELLED: SessionStatus.CANCELLED,
  TERMINATED: SessionStatus.TERMINATED,
  ABANDONED: SessionStatus.ABANDONED,
  TECHNICAL_ISSUE: SessionStatus.TECHNICAL_ISSUE
} as const;

export const RESERVATION_STATUS = {
  ACTIVE: ReservationStatus.ACTIVE,
  EXPIRED: ReservationStatus.EXPIRED,
  CONSUMED: ReservationStatus.CONSUMED,
  RELEASED: ReservationStatus.RELEASED
} as const;

// Terminal states for sessions
export const TERMINAL_SESSION_STATES = [
  SessionStatus.COMPLETED,
  SessionStatus.CANCELLED,
  SessionStatus.TERMINATED,
  SessionStatus.ABANDONED,
  SessionStatus.TECHNICAL_ISSUE
] as const;

// Active states for sessions
export const ACTIVE_SESSION_STATES = [
  SessionStatus.ACTIVE,
  SessionStatus.PAUSED
] as const;