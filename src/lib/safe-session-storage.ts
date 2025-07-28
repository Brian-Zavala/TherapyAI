/**
 * Safe sessionStorage utility with automatic quota handling and error recovery
 * 
 * Features:
 * - Automatic cleanup of old data when quota is exceeded
 * - Graceful error handling for disabled/unavailable storage
 * - Consistent logging for debugging
 * - Type-safe operations
 */

/**
 * Safe wrapper for sessionStorage operations with automatic quota handling
 */
export const safeSessionStorage = {
  /**
   * Safely set an item in sessionStorage with automatic cleanup on quota exceeded
   * @param key The storage key
   * @param value The value to store (will be stringified if not a string)
   * @returns true if successful, false if failed
   */
  setItem: (key: string, value: string): boolean => {
    try {
      sessionStorage.setItem(key, value)
      return true
    } catch (error) {
      if (error instanceof Error && 
          (error.name === 'QuotaExceededError' || 
           error.message.includes('QuotaExceeded'))) {
        console.warn(`Storage quota exceeded for key: ${key}`)
        
        // Try to clean up old session data
        try {
          const oneHourAgo = Date.now() - 60 * 60 * 1000
          const keysToRemove: string[] = []
          
          for (let i = 0; i < sessionStorage.length; i++) {
            const storageKey = sessionStorage.key(i)
            if (!storageKey) continue
            
            // Check if it's old session data
            if (storageKey.includes('session-') && storageKey.includes('-backup')) {
              try {
                const data = sessionStorage.getItem(storageKey)
                if (data) {
                  const parsed = JSON.parse(data)
                  if (parsed.savedAt && new Date(parsed.savedAt).getTime() < oneHourAgo) {
                    keysToRemove.push(storageKey)
                  }
                }
              } catch {
                // If we can't parse it, it's probably corrupted - remove it
                keysToRemove.push(storageKey)
              }
            }
            
            // Also clean up old transcript backups
            if (storageKey.includes('transcript-backup-')) {
              try {
                const data = sessionStorage.getItem(storageKey)
                if (data) {
                  const parsed = JSON.parse(data)
                  // If it doesn't have a timestamp or is old, remove it
                  if (!parsed.timestamp || parsed.timestamp < oneHourAgo) {
                    keysToRemove.push(storageKey)
                  }
                }
              } catch {
                // Can't parse, remove it
                keysToRemove.push(storageKey)
              }
            }
            
            // Clean up old recovery data
            if (storageKey === 'session-just-ended' || storageKey === 'session-recovered') {
              try {
                const data = sessionStorage.getItem(storageKey)
                if (data) {
                  const parsed = JSON.parse(data)
                  if (parsed.timestamp && parsed.timestamp < oneHourAgo) {
                    keysToRemove.push(storageKey)
                  }
                }
              } catch {
                keysToRemove.push(storageKey)
              }
            }
          }
          
          // Remove old data
          keysToRemove.forEach(k => sessionStorage.removeItem(k))
          
          if (keysToRemove.length > 0) {
            console.log(`Cleaned up ${keysToRemove.length} old storage items`)
          }
          
          // Try one more time
          sessionStorage.setItem(key, value)
          console.log('Successfully saved after cleanup')
          return true
        } catch (retryError) {
          console.error('Failed to save even after cleanup:', retryError)
          return false
        }
      }
      
      console.error('Failed to save to sessionStorage:', error)
      return false
    }
  },
  
  /**
   * Safely get an item from sessionStorage
   * @param key The storage key
   * @returns The stored value or null if not found/error
   */
  getItem: (key: string): string | null => {
    try {
      return sessionStorage.getItem(key)
    } catch (error) {
      console.error('Failed to read from sessionStorage:', error)
      return null
    }
  },
  
  /**
   * Safely remove an item from sessionStorage
   * @param key The storage key
   */
  removeItem: (key: string): void => {
    try {
      sessionStorage.removeItem(key)
    } catch (error) {
      console.error('Failed to remove from sessionStorage:', error)
    }
  },
  
  /**
   * Clear all sessionStorage safely
   */
  clear: (): void => {
    try {
      sessionStorage.clear()
    } catch (error) {
      console.error('Failed to clear sessionStorage:', error)
    }
  },
  
  /**
   * Get all keys in sessionStorage
   * @returns Array of storage keys
   */
  keys: (): string[] => {
    try {
      const keys: string[] = []
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i)
        if (key) keys.push(key)
      }
      return keys
    } catch (error) {
      console.error('Failed to get sessionStorage keys:', error)
      return []
    }
  },
  
  /**
   * Check if storage is available
   * @returns true if storage is available
   */
  isAvailable: (): boolean => {
    try {
      const testKey = '__storage_test__'
      sessionStorage.setItem(testKey, 'test')
      sessionStorage.removeItem(testKey)
      return true
    } catch {
      return false
    }
  }
}