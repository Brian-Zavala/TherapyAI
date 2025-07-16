/**
 * Notification Telemetry
 * Tracks metrics and events for monitoring and debugging
 */

export interface TelemetryConfig {
  enabled: boolean;
  sampleRate: number;
  errorReportingEnabled: boolean;
  performanceTrackingEnabled: boolean;
  userTrackingEnabled: boolean;
}

export interface TelemetryEvent {
  type: 'success' | 'error' | 'event';
  category: string;
  action: string;
  label?: string;
  value?: number;
  metadata?: Record<string, any>;
  timestamp: number;
}

export class NotificationTelemetry {
  private config: TelemetryConfig;
  private events: TelemetryEvent[];
  private maxEvents: number;
  private metrics: Map<string, number>;

  constructor(config: TelemetryConfig, maxEvents = 1000) {
    this.config = config;
    this.events = [];
    this.maxEvents = maxEvents;
    this.metrics = new Map();
  }

  private shouldSample(): boolean {
    return Math.random() < this.config.sampleRate;
  }

  private addEvent(event: TelemetryEvent): void {
    if (!this.config.enabled) return;

    // Apply sampling
    if (!this.shouldSample() && event.type !== 'error') {
      return;
    }

    this.events.push(event);

    // Trim old events
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }

    // Send to monitoring service
    this.sendToMonitoring(event);
  }

  private sendToMonitoring(event: TelemetryEvent): void {
    if (typeof window === 'undefined' || !('fetch' in window)) {
      return;
    }

    // Only send errors and important events
    if (event.type === 'error' || (event.type === 'event' && event.category === 'critical')) {
      fetch('/api/monitoring/telemetry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: 'notifications',
          ...event,
        }),
      }).catch(() => {
        // Ignore telemetry errors
      });
    }
  }

  trackSuccess(action: string, metadata?: Record<string, any>): void {
    this.addEvent({
      type: 'success',
      category: 'notification',
      action,
      metadata,
      timestamp: Date.now(),
    });

    // Update success metric
    const key = `success_${action}`;
    this.metrics.set(key, (this.metrics.get(key) || 0) + 1);
  }

  trackError(action: string, error: Error, metadata?: Record<string, any>): void {
    if (!this.config.errorReportingEnabled) return;

    this.addEvent({
      type: 'error',
      category: 'notification',
      action,
      label: error.message,
      metadata: {
        ...metadata,
        stack: error.stack,
        name: error.name,
      },
      timestamp: Date.now(),
    });

    // Update error metric
    const key = `error_${action}`;
    this.metrics.set(key, (this.metrics.get(key) || 0) + 1);
  }

  trackEvent(action: string, metadata?: Record<string, any>): void {
    this.addEvent({
      type: 'event',
      category: 'notification',
      action,
      metadata,
      timestamp: Date.now(),
    });
  }

  trackPerformance(action: string, duration: number): void {
    if (!this.config.performanceTrackingEnabled) return;

    this.addEvent({
      type: 'event',
      category: 'performance',
      action,
      value: duration,
      timestamp: Date.now(),
    });

    // Update average duration
    const key = `perf_${action}_total`;
    const countKey = `perf_${action}_count`;
    
    this.metrics.set(key, (this.metrics.get(key) || 0) + duration);
    this.metrics.set(countKey, (this.metrics.get(countKey) || 0) + 1);
  }

  getMetrics(): Record<string, number> {
    const result: Record<string, number> = {};
    
    // Copy metrics
    this.metrics.forEach((value, key) => {
      result[key] = value;
    });

    // Calculate averages for performance metrics
    this.metrics.forEach((value, key) => {
      if (key.startsWith('perf_') && key.endsWith('_total')) {
        const action = key.replace('perf_', '').replace('_total', '');
        const count = this.metrics.get(`perf_${action}_count`) || 1;
        result[`perf_${action}_avg`] = value / count;
      }
    });

    return result;
  }

  getEvents(filter?: { type?: TelemetryEvent['type']; category?: string }): TelemetryEvent[] {
    if (!filter) {
      return [...this.events];
    }

    return this.events.filter(event => {
      if (filter.type && event.type !== filter.type) return false;
      if (filter.category && event.category !== filter.category) return false;
      return true;
    });
  }

  clear(): void {
    this.events = [];
    this.metrics.clear();
  }
}