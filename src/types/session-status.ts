/**
 * Centralized SessionStatus type definitions
 * IMPORTANT: Always use uppercase SessionStatus values to match Prisma schema
 */

import { SessionStatus as PrismaSessionStatus } from '@prisma/client';

// Re-export Prisma's SessionStatus enum for consistent usage
export { PrismaSessionStatus as SessionStatus };

// Type guard to check if a string is a valid SessionStatus
export function isValidSessionStatus(status: string): status is PrismaSessionStatus {
  return Object.values(PrismaSessionStatus).includes(status as PrismaSessionStatus);
}

// Helper to safely convert string to SessionStatus
export function toSessionStatus(status: string): PrismaSessionStatus | undefined {
  const upperStatus = status.toUpperCase();
  return isValidSessionStatus(upperStatus) ? upperStatus as PrismaSessionStatus : undefined;
}

// Session state checks using Prisma enums
export function isSessionActive(status: PrismaSessionStatus | string): boolean {
  return status === PrismaSessionStatus.ACTIVE;
}

export function isSessionPaused(status: PrismaSessionStatus | string): boolean {
  return status === PrismaSessionStatus.PAUSED;
}

export function isSessionCompleted(status: PrismaSessionStatus | string): boolean {
  return status === PrismaSessionStatus.COMPLETED;
}

export function isSessionScheduled(status: PrismaSessionStatus | string): boolean {
  return status === PrismaSessionStatus.SCHEDULED;
}

export function isSessionCancelled(status: PrismaSessionStatus | string): boolean {
  return status === PrismaSessionStatus.CANCELLED;
}

export function isSessionTerminal(status: PrismaSessionStatus | string): boolean {
  return status === PrismaSessionStatus.COMPLETED || 
         status === PrismaSessionStatus.CANCELLED || 
         status === PrismaSessionStatus.TERMINATED || 
         status === PrismaSessionStatus.ABANDONED ||
         status === PrismaSessionStatus.TECHNICAL_ISSUE;
}

export function canResumeSession(status: PrismaSessionStatus | string): boolean {
  return status === PrismaSessionStatus.ACTIVE || status === PrismaSessionStatus.PAUSED;
}

export function canStartSession(status: PrismaSessionStatus | string): boolean {
  return status === PrismaSessionStatus.SCHEDULED;
}

// Valid status transitions
export const STATUS_TRANSITIONS: Record<PrismaSessionStatus, PrismaSessionStatus[]> = {
  [PrismaSessionStatus.SCHEDULED]: [PrismaSessionStatus.ACTIVE, PrismaSessionStatus.CANCELLED],
  [PrismaSessionStatus.ACTIVE]: [PrismaSessionStatus.PAUSED, PrismaSessionStatus.COMPLETED, PrismaSessionStatus.CANCELLED, PrismaSessionStatus.TERMINATED, PrismaSessionStatus.TECHNICAL_ISSUE],
  [PrismaSessionStatus.PAUSED]: [PrismaSessionStatus.ACTIVE, PrismaSessionStatus.COMPLETED, PrismaSessionStatus.CANCELLED, PrismaSessionStatus.TERMINATED],
  [PrismaSessionStatus.COMPLETED]: [], // Terminal state
  [PrismaSessionStatus.CANCELLED]: [], // Terminal state
  [PrismaSessionStatus.TERMINATED]: [], // Terminal state
  [PrismaSessionStatus.ABANDONED]: [], // Terminal state
  [PrismaSessionStatus.TECHNICAL_ISSUE]: [], // Terminal state
};

export function canTransitionStatus(from: PrismaSessionStatus, to: PrismaSessionStatus): boolean {
  return STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}