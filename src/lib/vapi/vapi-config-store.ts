/**
 * Configuration store for Vapi assistant settings
 * This allows us to store large configurations without sending them in the payload
 */

export class VapiConfigStore {
  private static readonly CONFIG_KEY = 'vapi-assistant-config';
  private static readonly CONFIG_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

  /**
   * Store assistant configuration in sessionStorage
   */
  static storeConfig(assistantId: string, config: any): void {
    if (typeof window === 'undefined' || !window.sessionStorage) {
      console.warn('SessionStorage not available');
      return;
    }

    try {
      const configData = {
        assistantId,
        config,
        timestamp: Date.now(),
      };
      
      sessionStorage.setItem(
        `${this.CONFIG_KEY}-${assistantId}`,
        JSON.stringify(configData)
      );
      
      console.log(`Stored configuration for assistant ${assistantId}`);
    } catch (error) {
      console.error('Failed to store configuration:', error);
    }
  }

  /**
   * Retrieve assistant configuration from sessionStorage
   */
  static getConfig(assistantId: string): any | null {
    if (typeof window === 'undefined' || !window.sessionStorage) {
      return null;
    }

    try {
      const stored = sessionStorage.getItem(`${this.CONFIG_KEY}-${assistantId}`);
      if (!stored) {
        return null;
      }

      const configData = JSON.parse(stored);
      
      // Check if config has expired
      if (Date.now() - configData.timestamp > this.CONFIG_EXPIRY_MS) {
        this.clearConfig(assistantId);
        return null;
      }

      return configData.config;
    } catch (error) {
      console.error('Failed to retrieve configuration:', error);
      return null;
    }
  }

  /**
   * Clear configuration for an assistant
   */
  static clearConfig(assistantId: string): void {
    if (typeof window === 'undefined' || !window.sessionStorage) {
      return;
    }

    try {
      sessionStorage.removeItem(`${this.CONFIG_KEY}-${assistantId}`);
    } catch (error) {
      console.error('Failed to clear configuration:', error);
    }
  }

  /**
   * Clear all expired configurations
   */
  static clearExpiredConfigs(): void {
    if (typeof window === 'undefined' || !window.sessionStorage) {
      return;
    }

    try {
      const keys = Object.keys(sessionStorage);
      const now = Date.now();

      keys.forEach(key => {
        if (key.startsWith(this.CONFIG_KEY)) {
          try {
            const stored = sessionStorage.getItem(key);
            if (stored) {
              const configData = JSON.parse(stored);
              if (now - configData.timestamp > this.CONFIG_EXPIRY_MS) {
                sessionStorage.removeItem(key);
              }
            }
          } catch (error) {
            // Remove invalid entries
            sessionStorage.removeItem(key);
          }
        }
      });
    } catch (error) {
      console.error('Failed to clear expired configurations:', error);
    }
  }
}