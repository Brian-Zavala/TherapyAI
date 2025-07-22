/**
 * In-memory cache for family members data
 * Reduces database queries for frequently accessed data
 */

interface FamilyMember {
  id: string
  name: string
  age: number | null
  relationship: string | null
  order: number
  isActive: boolean
}

interface CacheEntry {
  data: FamilyMember[]
  timestamp: number
  isLegacyFormat: boolean
}

class FamilyMembersCache {
  private cache = new Map<string, CacheEntry>()
  private readonly TTL = 5 * 60 * 1000 // 5 minutes cache TTL
  private readonly MAX_ENTRIES = 1000 // Maximum cache entries

  /**
   * Get family members from cache
   */
  get(userId: string): { data: FamilyMember[], isLegacyFormat: boolean } | null {
    const entry = this.cache.get(userId)
    
    if (!entry) {
      return null
    }
    
    // Check if cache entry has expired
    if (Date.now() - entry.timestamp > this.TTL) {
      this.cache.delete(userId)
      return null
    }
    
    return { data: entry.data, isLegacyFormat: entry.isLegacyFormat }
  }

  /**
   * Set family members in cache
   */
  set(userId: string, data: FamilyMember[], isLegacyFormat: boolean = false): void {
    // Implement LRU eviction if cache is full
    if (this.cache.size >= this.MAX_ENTRIES) {
      const oldestKey = this.findOldestEntry()
      if (oldestKey) {
        this.cache.delete(oldestKey)
      }
    }
    
    this.cache.set(userId, {
      data,
      isLegacyFormat,
      timestamp: Date.now()
    })
  }

  /**
   * Invalidate cache for a specific user
   */
  invalidate(userId: string): void {
    this.cache.delete(userId)
  }

  /**
   * Clear entire cache
   */
  clear(): void {
    this.cache.clear()
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.MAX_ENTRIES,
      ttl: this.TTL
    }
  }

  /**
   * Find oldest cache entry for LRU eviction
   */
  private findOldestEntry(): string | null {
    let oldestKey: string | null = null
    let oldestTimestamp = Infinity
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTimestamp) {
        oldestTimestamp = entry.timestamp
        oldestKey = key
      }
    }
    
    return oldestKey
  }
}

// Export singleton instance
export const familyMembersCache = new FamilyMembersCache()

// Auto-clear cache periodically to prevent memory leaks
if (typeof window === 'undefined') {
  setInterval(() => {
    // Clear expired entries
    const stats = familyMembersCache.getStats()
    if (stats.size > 0) {
      console.log(`[FamilyMembersCache] Clearing expired entries. Current size: ${stats.size}`)
      // Iterate through cache and remove expired entries
      const now = Date.now()
      for (const [userId, entry] of (familyMembersCache as any).cache.entries()) {
        if (now - entry.timestamp > (familyMembersCache as any).TTL) {
          familyMembersCache.invalidate(userId)
        }
      }
    }
  }, 60 * 1000) // Run every minute
}