import { prisma } from '@/lib/prisma';
import { getConcernsSummary } from '@/lib/concerns-formatter';
import { log } from '@/lib/log-config';

/**
 * Enhance session creation with concerns context
 * Adds concerns to session metadata for VAPI and analytics
 */
export async function enhanceSessionWithConcerns(
  sessionId: string,
  userId: string
): Promise<void> {
  try {
    // Get user's current concerns from profile
    const userProfile = await prisma.userProfile.findUnique({
      where: { userId },
      select: { currentConcerns: true }
    });
    
    if (!userProfile?.currentConcerns) {
      log.debug('No concerns found for user', { userId });
      return;
    }
    
    // Parse concerns (handle both array and JSON string)
    const concernIds = Array.isArray(userProfile.currentConcerns) 
      ? userProfile.currentConcerns as string[]
      : typeof userProfile.currentConcerns === 'string'
        ? JSON.parse(userProfile.currentConcerns)
        : [];
    
    if (concernIds.length === 0) {
      return;
    }    
    // Get concerns summary
    const concernsSummary = getConcernsSummary(concernIds);
    
    // Update session with concerns context
    await prisma.session.update({
      where: { id: sessionId },
      data: {
        metadata: {
          concernsContext: {
            primary: concernsSummary.primary,
            secondary: concernsSummary.secondary,
            categories: concernsSummary.categories,
            formatted: concernsSummary.formatted,
            timestamp: new Date().toISOString()
          }
        }
      }
    });
    
    log.info('Enhanced session with concerns context', {
      sessionId,
      primaryConcerns: concernsSummary.primary,
      totalConcerns: concernIds.length
    });
    
  } catch (error) {
    log.error('Failed to enhance session with concerns', { 
      sessionId, 
      userId, 
      error 
    });
    // Non-critical error - don't throw
  }
}/**
 * Get session concerns context for VAPI assistant
 * Returns formatted concerns for use in system prompts
 */
export async function getSessionConcernsContext(
  sessionId: string
): Promise<string | null> {
  try {
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      select: { 
        metadata: true,
        user: {
          select: {
            profile: {
              select: { currentConcerns: true }
            }
          }
        }
      }
    });
    
    // Check session metadata first
    const metadata = session?.metadata as any;
    if (metadata?.concernsContext?.formatted) {
      return metadata.concernsContext.formatted;
    }
    
    // Fallback to user profile concerns
    const concerns = session?.user?.profile?.currentConcerns;
    if (concerns) {
      const concernIds = Array.isArray(concerns) 
        ? concerns as string[]
        : typeof concerns === 'string'
          ? JSON.parse(concerns)
          : [];
      
      if (concernIds.length > 0) {
        const summary = getConcernsSummary(concernIds);
        return summary.formatted;
      }
    }
    
    return null;
  } catch (error) {
    log.error('Failed to get session concerns context', { sessionId, error });
    return null;
  }
}