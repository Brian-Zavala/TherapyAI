/**
 * Session Type Converter
 * 
 * Handles conversion between frontend lowercase session types and database uppercase enums
 */

import { SessionType } from '@prisma/client';

/**
 * Convert frontend session type to Prisma enum
 */
export function toPrismaSessionType(type: string): SessionType {
  switch (type.toLowerCase()) {
    case 'solo':
    case 'individual':
      return 'SOLO';
    case 'couple':
    case 'couples':
      return 'COUPLE';
    case 'family':
      return 'FAMILY';
    default:
      return 'SOLO'; // Default fallback
  }
}

/**
 * Convert Prisma enum to frontend session type
 */
export function fromPrismaSessionType(type: SessionType): 'solo' | 'couple' | 'family' {
  switch (type) {
    case 'SOLO':
      return 'solo';
    case 'COUPLE':
      return 'couple';
    case 'FAMILY':
      return 'family';
    default:
      return 'solo';
  }
}

/**
 * Check if a string is a valid session type
 */
export function isValidSessionType(type: string): boolean {
  const normalized = type.toLowerCase();
  return ['solo', 'individual', 'couple', 'couples', 'family'].includes(normalized);
}

/**
 * Convert session theme to session type
 * Used for legacy sessions that rely on theme for type detection
 */
export function themeToSessionType(theme: string): SessionType {
  const lowerTheme = theme.toLowerCase();
  
  if (lowerTheme.includes('individual') || lowerTheme.includes('solo') || lowerTheme.includes('personal')) {
    return 'SOLO';
  } else if (lowerTheme.includes('family')) {
    return 'FAMILY';
  } else if (lowerTheme.includes('relationship') || lowerTheme.includes('couple')) {
    return 'COUPLE';
  }
  
  // Default to SOLO if unclear
  return 'SOLO';
}