/**
 * Notification Deduplicator
 * Prevents duplicate notifications from being shown
 */

export class NotificationDeduplicator {
  private seenIds: Set<string>;
  private maxSize: number;
  private timestamps: Map<string, number>;
  private cleanupInterval: number;

  constructor(maxSize = 1000, cleanupInterval = 300000) { // 5 minutes
    this.seenIds = new Set();
    this.maxSize = maxSize;
    this.timestamps = new Map();
    this.cleanupInterval = cleanupInterval;
    
    // Periodically clean up old entries
    this.startCleanup();
  }

  private startCleanup() {
    if (typeof window === 'undefined') return;

    const cleanup = () => {
      const now = Date.now();
      const cutoff = now - this.cleanupInterval;

      // Remove old entries
      for (const [id, timestamp] of this.timestamps.entries()) {
        if (timestamp < cutoff) {
          this.seenIds.delete(id);
          this.timestamps.delete(id);
        }
      }

      // If still too large, remove oldest entries
      if (this.seenIds.size > this.maxSize) {
        const sortedEntries = Array.from(this.timestamps.entries())
          .sort((a, b) => a[1] - b[1]);
        
        const toRemove = sortedEntries.slice(0, this.seenIds.size - this.maxSize);
        
        toRemove.forEach(([id]) => {
          this.seenIds.delete(id);
          this.timestamps.delete(id);
        });
      }
    };

    // Run cleanup periodically
    setInterval(cleanup, this.cleanupInterval);
  }

  deduplicate<T extends { id: string }>(notifications: T[]): T[] {
    const result: T[] = [];
    const now = Date.now();

    for (const notification of notifications) {
      if (!this.seenIds.has(notification.id)) {
        this.seenIds.add(notification.id);
        this.timestamps.set(notification.id, now);
        result.push(notification);
      }
    }

    return result;
  }

  hasSeen(id: string): boolean {
    return this.seenIds.has(id);
  }

  markAsSeen(id: string): void {
    this.seenIds.add(id);
    this.timestamps.set(id, Date.now());
  }

  clear(): void {
    this.seenIds.clear();
    this.timestamps.clear();
  }

  size(): number {
    return this.seenIds.size;
  }
}