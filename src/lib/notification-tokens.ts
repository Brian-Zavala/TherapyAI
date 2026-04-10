// @ts-nocheck
import { randomBytes } from 'crypto';
import { prisma } from '@/lib/prisma-optimized';
import { z } from 'zod';

/**
 * Notification token utilities for tracking email/SMS interactions
 */

// Token expiry duration (24 hours)
const TOKEN_EXPIRY_HOURS = 24;

/**
 * Generate a secure random token for notification tracking
 */
export function generateNotificationToken(): string {
  return randomBytes(32).toString('hex');
}

/**
 * Generate a short token for SMS (6-8 characters)
 */
export function generateShortToken(): string {
  // Use base36 for alphanumeric characters
  return randomBytes(4).toString('hex').substring(0, 6).toUpperCase();
}

/**
 * Create a tracking token for a session notification
 */
export async function createSessionNotificationToken(
  sessionId: string,
  userId: string,
  type: 'email' | 'sms'
): Promise<{ token: string; shortToken?: string; expiresAt: Date }> {
  const token = generateNotificationToken();
  const shortToken = type === 'sms' ? generateShortToken() : undefined;
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + TOKEN_EXPIRY_HOURS);

  // Update session with notification token
  await prisma.session.update({
    where: { id: sessionId },
    data: {
      notificationToken: token,
      notificationTokenExpiry: expiresAt,
    },
  });

  // Track notification sent
  await prisma.notificationTracking.create({
    data: {
      sessionId,
      userId,
      type,
      action: 'sent',
      token,
      metadata: shortToken ? { shortToken } : undefined,
    },
  });

  return { token, shortToken, expiresAt };
}

/**
 * Verify a notification token
 */
export async function verifyNotificationToken(
  token: string
): Promise<{ valid: boolean; sessionId?: string; userId?: string; expired?: boolean }> {
  // Find session by token
  const session = await prisma.session.findFirst({
    where: {
      notificationToken: token,
    },
    select: {
      id: true,
      userId: true,
      notificationTokenExpiry: true,
    },
  });

  if (!session) {
    // Check if it's a short token
    const tracking = await prisma.notificationTracking.findFirst({
      where: {
        metadata: {
          path: ['shortToken'],
          equals: token.toUpperCase(),
        },
      },
      select: {
        sessionId: true,
        userId: true,
      },
    });

    if (tracking) {
      // Get the full session details
      const fullSession = await prisma.session.findUnique({
        where: { id: tracking.sessionId },
        select: {
          notificationToken: true,
          notificationTokenExpiry: true,
        },
      });

      if (fullSession?.notificationToken) {
        return verifyNotificationToken(fullSession.notificationToken);
      }
    }

    return { valid: false };
  }

  // Check if token is expired
  if (session.notificationTokenExpiry && new Date() > session.notificationTokenExpiry) {
    return { valid: false, expired: true };
  }

  return {
    valid: true,
    sessionId: session.id,
    userId: session.userId,
  };
}

/**
 * Track notification interaction
 */
export async function trackNotificationInteraction(
  token: string,
  action: 'clicked' | 'started' | 'completed'
): Promise<boolean> {
  const verification = await verifyNotificationToken(token);
  
  if (!verification.valid || !verification.sessionId || !verification.userId) {
    return false;
  }

  // Track the interaction
  await prisma.notificationTracking.create({
    data: {
      sessionId: verification.sessionId,
      userId: verification.userId,
      type: 'unknown', // Will be determined from previous records
      action,
      token,
    },
  });

  // Update session if started via notification
  if (action === 'started') {
    await prisma.session.update({
      where: { id: verification.sessionId },
      data: {
        startedViaNotification: true,
        notificationStartedAt: new Date(),
      },
    });
  }

  return true;
}

/**
 * Generate notification URLs
 */
export function generateNotificationUrls(
  baseUrl: string,
  sessionId: string,
  token: string,
  shortToken?: string
): {
  instantStartUrl: string;
  dashboardUrl: string;
  rescheduleUrl: string;
  shortUrl?: string;
} {
  const urls = {
    instantStartUrl: `${baseUrl}/api/sessions/start-from-notification?token=${token}&action=instant`,
    dashboardUrl: `${baseUrl}/dashboard?token=${token}&sessionId=${sessionId}`,
    rescheduleUrl: `${baseUrl}/schedule?reschedule=${sessionId}&token=${token}`,
  };

  if (shortToken) {
    // Short URL for SMS
    urls.shortUrl = `${baseUrl}/s/${shortToken}`;
  }

  return urls;
}

/**
 * Clean up expired tokens
 */
export async function cleanupExpiredTokens(): Promise<number> {
  const result = await prisma.session.updateMany({
    where: {
      notificationTokenExpiry: {
        lt: new Date(),
      },
      notificationToken: {
        not: null,
      },
    },
    data: {
      notificationToken: null,
      notificationTokenExpiry: null,
    },
  });

  return result.count;
}