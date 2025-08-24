import { SessionLifecycleManager } from './session-lifecycle-manager';
import { logger } from '@/lib/utils/logger';

let cleanupInterval: NodeJS.Timeout | null = null;

/**
 * Start periodic cleanup of old session states
 */
export function startLifecycleCleanup(intervalMs: number = 3600000): void {
  if (cleanupInterval) {
    logger.warn('Lifecycle cleanup already running');
    return;
  }

  const lifecycleManager = SessionLifecycleManager.getInstance();
  
  cleanupInterval = setInterval(() => {
    try {
      logger.info('Running session lifecycle cleanup');
      lifecycleManager.cleanupOldStates();
    } catch (error) {
      logger.error('Error during lifecycle cleanup', { error });
    }
  }, intervalMs);

  logger.info('Session lifecycle cleanup started', { intervalMs });
}

/**
 * Stop the cleanup interval
 */
export function stopLifecycleCleanup(): void {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
    logger.info('Session lifecycle cleanup stopped');
  }
}

/**
 * Run cleanup once
 */
export function runLifecycleCleanup(): void {
  const lifecycleManager = SessionLifecycleManager.getInstance();
  lifecycleManager.cleanupOldStates();
}