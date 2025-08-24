// src/lib/dashboard-subscription-manager.ts
"use client";

import { logger } from '@/lib/utils/logger';

interface Subscription {
  id: string;
  type: 'communication' | 'progress' | 'sessions' | 'insights';
  channel: any; // Supabase channel
  cleanup: () => void;
  lastUpdate: Date;
}

class DashboardSubscriptionManager {
  private static instance: DashboardSubscriptionManager;
  private subscriptions: Map<string, Subscription> = new Map();
  private updateListeners: Map<string, Set<(data: any) => void>> = new Map();
  
  private constructor() {}
  
  static getInstance(): DashboardSubscriptionManager {
    if (!DashboardSubscriptionManager.instance) {
      DashboardSubscriptionManager.instance = new DashboardSubscriptionManager();
    }
    return DashboardSubscriptionManager.instance;
  }
  
  /**
   * Subscribe to a dashboard metric with deduplication
   */
  subscribe(
    userId: string,
    type: Subscription['type'],
    channel: any,
    cleanup: () => void,
    onUpdate: (data: any) => void
  ): string {
    const subscriptionKey = `${userId}-${type}`;
    const subscriptionId = `${subscriptionKey}-${Date.now()}`;
    
    // Check if we already have a subscription for this user and type
    const existing = this.subscriptions.get(subscriptionKey);
    if (existing) {
      logger.info(`Reusing existing subscription for ${subscriptionKey}`);
      
      // Add the new listener
      const listeners = this.updateListeners.get(subscriptionKey) || new Set();
      listeners.add(onUpdate);
      this.updateListeners.set(subscriptionKey, listeners);
      
      return existing.id;
    }
    
    // Create new subscription
    const subscription: Subscription = {
      id: subscriptionId,
      type,
      channel,
      cleanup,
      lastUpdate: new Date(),
    };
    
    this.subscriptions.set(subscriptionKey, subscription);
    
    // Initialize listeners
    const listeners = new Set<(data: any) => void>();
    listeners.add(onUpdate);
    this.updateListeners.set(subscriptionKey, listeners);
    
    logger.info(`Created new subscription ${subscriptionId} for ${type}`);
    
    return subscriptionId;
  }
  
  /**
   * Unsubscribe and cleanup
   */
  unsubscribe(userId: string, type: Subscription['type'], onUpdate: (data: any) => void): void {
    const subscriptionKey = `${userId}-${type}`;
    const listeners = this.updateListeners.get(subscriptionKey);
    
    if (listeners) {
      listeners.delete(onUpdate);
      
      // If no more listeners, cleanup the subscription
      if (listeners.size === 0) {
        const subscription = this.subscriptions.get(subscriptionKey);
        if (subscription) {
          logger.info(`Cleaning up subscription ${subscription.id}`);
          subscription.cleanup();
          this.subscriptions.delete(subscriptionKey);
          this.updateListeners.delete(subscriptionKey);
        }
      }
    }
  }
  
  /**
   * Broadcast update to all listeners
   */
  broadcast(userId: string, type: Subscription['type'], data: any): void {
    const subscriptionKey = `${userId}-${type}`;
    const listeners = this.updateListeners.get(subscriptionKey);
    
    if (listeners) {
      const subscription = this.subscriptions.get(subscriptionKey);
      if (subscription) {
        subscription.lastUpdate = new Date();
      }
      
      listeners.forEach(listener => {
        try {
          listener(data);
        } catch (error) {
          logger.error('Error in subscription listener:', { error, type });
        }
      });
    }
  }
  
  /**
   * Get subscription status
   */
  getStatus(): {
    activeSubscriptions: number;
    subscriptionsByType: Record<string, number>;
  } {
    const subscriptionsByType: Record<string, number> = {
      communication: 0,
      progress: 0,
      sessions: 0,
      insights: 0,
    };
    
    this.subscriptions.forEach(sub => {
      subscriptionsByType[sub.type]++;
    });
    
    return {
      activeSubscriptions: this.subscriptions.size,
      subscriptionsByType,
    };
  }
  
  /**
   * Cleanup all subscriptions (for debugging/testing)
   */
  cleanupAll(): void {
    logger.info('Cleaning up all dashboard subscriptions');
    
    this.subscriptions.forEach(subscription => {
      subscription.cleanup();
    });
    
    this.subscriptions.clear();
    this.updateListeners.clear();
  }
}

export const dashboardSubscriptionManager = DashboardSubscriptionManager.getInstance();