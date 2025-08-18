/**
 * VAPI Instance Manager
 * 
 * Singleton service to manage VAPI instance lifecycle
 * Prevents instance loss during React re-renders
 * 
 * Backend Architecture Pattern: Service Layer with Singleton
 */

import Vapi from '@vapi-ai/web';

class VapiInstanceManager {
  private static instance: VapiInstanceManager;
  private vapiInstance: Vapi | null = null;
  private currentApiKey: string | null = null;
  private initializationPromise: Promise<Vapi> | null = null;
  private listeners: Set<(instance: Vapi | null) => void> = new Set();

  private constructor() {
    console.log('[VapiInstanceManager] Singleton created');
  }

  public static getInstance(): VapiInstanceManager {
    if (!VapiInstanceManager.instance) {
      VapiInstanceManager.instance = new VapiInstanceManager();
    }
    return VapiInstanceManager.instance;
  }

  /**
   * Get or create VAPI instance with the given API key
   * Ensures only one instance exists per API key
   */
  public async getOrCreateInstance(apiKey: string): Promise<Vapi> {
    // If same key and instance exists, return it
    if (this.currentApiKey === apiKey && this.vapiInstance) {
      console.log('[VapiInstanceManager] Returning existing instance');
      return this.vapiInstance;
    }

    // If already initializing with same key, wait for it
    if (this.currentApiKey === apiKey && this.initializationPromise) {
      console.log('[VapiInstanceManager] Waiting for ongoing initialization');
      return this.initializationPromise;
    }

    // If different key, clean up old instance
    if (this.currentApiKey !== apiKey && this.vapiInstance) {
      console.log('[VapiInstanceManager] API key changed, cleaning up old instance');
      this.cleanup();
    }

    // Create new instance
    this.initializationPromise = this.createInstance(apiKey);
    
    try {
      const instance = await this.initializationPromise;
      return instance;
    } finally {
      this.initializationPromise = null;
    }
  }

  /**
   * Create a new VAPI instance
   */
  private async createInstance(apiKey: string): Promise<Vapi> {
    console.log('[VapiInstanceManager] Creating new VAPI instance');
    
    return new Promise((resolve, reject) => {
      try {
        const instance = new Vapi(apiKey);
        
        // Store instance immediately
        this.vapiInstance = instance;
        this.currentApiKey = apiKey;
        
        // Notify listeners immediately
        this.notifyListeners(instance);
        
        // Set up event listeners for validation (after storing)
        instance.on('call-start', () => {
          console.log('[VapiInstanceManager] Instance validated - call started');
        });

        instance.on('error', (error: any) => {
          console.error('[VapiInstanceManager] Instance error:', error);
          // Don't null out the instance on error - let consumer handle it
        });
        
        console.log('[VapiInstanceManager] Instance created and stored successfully');
        resolve(instance);
      } catch (error) {
        console.error('[VapiInstanceManager] Failed to create instance:', error);
        this.vapiInstance = null;
        this.currentApiKey = null;
        this.notifyListeners(null);
        reject(error);
      }
    });
  }

  /**
   * Get current instance without creating
   */
  public getCurrentInstance(): Vapi | null {
    return this.vapiInstance;
  }

  /**
   * Check if instance is ready
   */
  public isReady(): boolean {
    return this.vapiInstance !== null;
  }

  /**
   * Subscribe to instance changes
   */
  public subscribe(listener: (instance: Vapi | null) => void): () => void {
    this.listeners.add(listener);
    
    // Immediately notify of current state
    if (this.vapiInstance) {
      listener(this.vapiInstance);
    }
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Notify all listeners of instance change
   */
  private notifyListeners(instance: Vapi | null): void {
    this.listeners.forEach(listener => {
      try {
        listener(instance);
      } catch (error) {
        console.error('[VapiInstanceManager] Listener error:', error);
      }
    });
  }

  /**
   * Clean up current instance
   */
  public cleanup(): void {
    if (this.vapiInstance) {
      console.log('[VapiInstanceManager] Cleaning up instance');
      try {
        this.vapiInstance.stop();
      } catch (error) {
        console.error('[VapiInstanceManager] Error during cleanup:', error);
      }
      this.vapiInstance = null;
      this.currentApiKey = null;
      this.notifyListeners(null);
    }
  }

  /**
   * Reset the manager (for testing or recovery)
   */
  public reset(): void {
    this.cleanup();
    this.listeners.clear();
    console.log('[VapiInstanceManager] Manager reset');
  }
}

// Export singleton instance
export const vapiInstanceManager = VapiInstanceManager.getInstance();