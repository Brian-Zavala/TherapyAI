/**
 * Metrics Monitor - Performance tracking and monitoring
 * Stub implementation to fix build errors
 */

export interface MetricData {
  name: string;
  value: number;
  tags?: Record<string, string>;
  timestamp?: Date;
}

export interface TimerHandle {
  stop: () => number;
}

class MetricsMonitor {
  private metrics: Map<string, MetricData[]> = new Map();

  /**
   * Record a metric value
   */
  record(name: string, value: number, tags?: Record<string, string>): void {
    const metric: MetricData = {
      name,
      value,
      tags,
      timestamp: new Date()
    };

    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    this.metrics.get(name)!.push(metric);
  }

  /**
   * Increment a counter metric
   */
  increment(name: string, value: number = 1, tags?: Record<string, string>): void {
    this.record(name, value, tags);
  }  /**
   * Start a timer for measuring duration
   */
  startTimer(name: string, tags?: Record<string, string>): TimerHandle {
    const start = Date.now();
    
    return {
      stop: () => {
        const duration = Date.now() - start;
        this.record(name, duration, { ...tags, unit: 'ms' });
        return duration;
      }
    };
  }

  /**
   * Get metrics summary
   */
  getSummary(name: string): {
    count: number;
    total: number;
    average: number;
    min: number;
    max: number;
  } | null {
    const values = this.metrics.get(name);
    if (!values || values.length === 0) return null;

    const numbers = values.map(m => m.value);
    return {
      count: numbers.length,
      total: numbers.reduce((a, b) => a + b, 0),
      average: numbers.reduce((a, b) => a + b, 0) / numbers.length,
      min: Math.min(...numbers),
      max: Math.max(...numbers)
    };
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics.clear();
  }

  /**
   * Record an error metric
   */
  recordError(name: string, error: unknown, tags?: Record<string, string>): void {
    const errorMessage = error instanceof Error ? error.message : String(error);
    this.record(`${name}_error`, 1, {
      ...tags,
      error: errorMessage,
      type: 'error'
    });
  }

  /**
   * Record an operation duration
   */
  recordOperation(name: string, duration: number, tags?: Record<string, string>): void {
    this.record(`${name}_duration`, duration, {
      ...tags,
      unit: 'ms',
      type: 'operation'
    });
  }

  /**
   * Start tracking an operation (returns timer handle)
   */
  startOperation(name: string, tags?: Record<string, string>): TimerHandle {
    return this.startTimer(`${name}_operation`, {
      ...tags,
      type: 'operation'
    });
  }
}

// Export singleton instance
export const metrics = new MetricsMonitor();