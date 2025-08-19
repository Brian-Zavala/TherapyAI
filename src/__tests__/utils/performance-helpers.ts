/**
 * Performance Test Helpers
 * 
 * Utilities for measuring and validating performance in credit deduction tests
 */

/**
 * Performance test helpers
 */
export class PerformanceHelpers {
  /**
   * Measure operation duration with high precision
   */
  static async measureDuration<T>(operation: () => Promise<T>): Promise<{ result: T; duration: number }> {
    const startTime = process.hrtime.bigint();
    const result = await operation();
    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - startTime) / 1000000; // Convert to milliseconds
    
    return { result, duration };
  }

  /**
   * Run concurrent operations and measure total time
   */
  static async runConcurrent<T>(
    operations: (() => Promise<T>)[],
    maxConcurrency = 10
  ): Promise<{ results: T[]; totalDuration: number; individualDurations: number[] }> {
    const startTime = process.hrtime.bigint();
    
    const chunks = [];
    for (let i = 0; i < operations.length; i += maxConcurrency) {
      chunks.push(operations.slice(i, i + maxConcurrency));
    }
    
    const results: T[] = [];
    const individualDurations: number[] = [];
    
    for (const chunk of chunks) {
      const chunkPromises = chunk.map(async (op) => {
        const { result, duration } = await this.measureDuration(op);
        individualDurations.push(duration);
        return result;
      });
      
      const chunkResults = await Promise.all(chunkPromises);
      results.push(...chunkResults);
    }
    
    const endTime = process.hrtime.bigint();
    const totalDuration = Number(endTime - startTime) / 1000000;
    
    return { results, totalDuration, individualDurations };
  }

  /**
   * Measure memory usage during operation
   */
  static async measureMemoryUsage<T>(operation: () => Promise<T>): Promise<{ 
    result: T; 
    duration: number;
    memoryBefore: NodeJS.MemoryUsage;
    memoryAfter: NodeJS.MemoryUsage;
    memoryDelta: NodeJS.MemoryUsage;
  }> {
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
    
    const memoryBefore = process.memoryUsage();
    const { result, duration } = await this.measureDuration(operation);
    const memoryAfter = process.memoryUsage();
    
    const memoryDelta = {
      rss: memoryAfter.rss - memoryBefore.rss,
      heapTotal: memoryAfter.heapTotal - memoryBefore.heapTotal,
      heapUsed: memoryAfter.heapUsed - memoryBefore.heapUsed,
      external: memoryAfter.external - memoryBefore.external,
      arrayBuffers: memoryAfter.arrayBuffers - memoryBefore.arrayBuffers
    };
    
    return { result, duration, memoryBefore, memoryAfter, memoryDelta };
  }

  /**
   * Benchmark multiple implementations
   */
  static async benchmark<T>(
    implementations: Record<string, () => Promise<T>>,
    iterations = 10
  ): Promise<Record<string, {
    averageDuration: number;
    minDuration: number;
    maxDuration: number;
    totalDuration: number;
    iterations: number;
    results: T[];
  }>> {
    const benchmarkResults: Record<string, any> = {};
    
    for (const [name, implementation] of Object.entries(implementations)) {
      const durations: number[] = [];
      const results: T[] = [];
      
      for (let i = 0; i < iterations; i++) {
        const { result, duration } = await this.measureDuration(implementation);
        durations.push(duration);
        results.push(result);
        
        // Small delay between iterations to avoid resource contention
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      
      benchmarkResults[name] = {
        averageDuration: durations.reduce((sum, d) => sum + d, 0) / durations.length,
        minDuration: Math.min(...durations),
        maxDuration: Math.max(...durations),
        totalDuration: durations.reduce((sum, d) => sum + d, 0),
        iterations,
        results
      };
    }
    
    return benchmarkResults;
  }

  /**
   * Load test with gradually increasing concurrency
   */
  static async loadTest<T>(
    operation: () => Promise<T>,
    maxConcurrency = 50,
    stepSize = 5,
    duration = 1000 // ms per step
  ): Promise<{
    results: Array<{
      concurrency: number;
      successCount: number;
      errorCount: number;
      averageDuration: number;
      throughput: number; // operations per second
    }>;
    breakdown: {
      peakThroughput: number;
      optimalConcurrency: number;
      errorRate: number;
    };
  }> {
    const results = [];
    let peakThroughput = 0;
    let optimalConcurrency = 1;
    let totalSuccess = 0;
    let totalErrors = 0;
    
    for (let concurrency = stepSize; concurrency <= maxConcurrency; concurrency += stepSize) {
      const startTime = Date.now();
      const endTime = startTime + duration;
      
      const operationPromises: Promise<{ success: boolean; duration: number }>[] = [];
      let completedOperations = 0;
      
      // Start initial batch
      for (let i = 0; i < concurrency; i++) {
        operationPromises.push(this.runSingleLoadTestOperation(operation));
      }
      
      // Keep operations running for the duration
      while (Date.now() < endTime) {
        const completed = await Promise.race(operationPromises.map(async (p, index) => {
          try {
            const result = await p;
            return { result, index };
          } catch (error) {
            return { result: { success: false, duration: 0 }, index };
          }
        }));
        
        completedOperations++;
        
        // Replace completed operation with new one
        operationPromises[completed.index] = this.runSingleLoadTestOperation(operation);
      }
      
      // Wait for all remaining operations to complete
      const finalResults = await Promise.allSettled(operationPromises);
      
      const successResults = finalResults
        .filter(r => r.status === 'fulfilled' && r.value.success)
        .map(r => r.status === 'fulfilled' ? r.value : null)
        .filter(Boolean) as Array<{ success: boolean; duration: number }>;
      
      const errorResults = finalResults.filter(r => 
        r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success)
      );
      
      const averageDuration = successResults.length > 0 
        ? successResults.reduce((sum, r) => sum + r.duration, 0) / successResults.length
        : 0;
      
      const throughput = (completedOperations / duration) * 1000; // ops per second
      
      if (throughput > peakThroughput) {
        peakThroughput = throughput;
        optimalConcurrency = concurrency;
      }
      
      totalSuccess += successResults.length;
      totalErrors += errorResults.length;
      
      results.push({
        concurrency,
        successCount: successResults.length,
        errorCount: errorResults.length,
        averageDuration,
        throughput
      });
    }
    
    return {
      results,
      breakdown: {
        peakThroughput,
        optimalConcurrency,
        errorRate: totalErrors / (totalSuccess + totalErrors)
      }
    };
  }

  /**
   * Helper for load test individual operations
   */
  private static async runSingleLoadTestOperation<T>(
    operation: () => Promise<T>
  ): Promise<{ success: boolean; duration: number }> {
    try {
      const { duration } = await this.measureDuration(operation);
      return { success: true, duration };
    } catch (error) {
      return { success: false, duration: 0 };
    }
  }

  /**
   * Monitor resource usage during test execution
   */
  static createResourceMonitor(interval = 100): {
    start: () => void;
    stop: () => Array<{
      timestamp: number;
      memory: NodeJS.MemoryUsage;
      cpuUsage: NodeJS.CpuUsage;
    }>;
  } {
    let monitoring = false;
    let startCpuUsage: NodeJS.CpuUsage;
    const snapshots: Array<{
      timestamp: number;
      memory: NodeJS.MemoryUsage;
      cpuUsage: NodeJS.CpuUsage;
    }> = [];
    
    return {
      start: () => {
        monitoring = true;
        startCpuUsage = process.cpuUsage();
        
        const monitor = () => {
          if (!monitoring) return;
          
          snapshots.push({
            timestamp: Date.now(),
            memory: process.memoryUsage(),
            cpuUsage: process.cpuUsage(startCpuUsage)
          });
          
          setTimeout(monitor, interval);
        };
        
        monitor();
      },
      stop: () => {
        monitoring = false;
        return snapshots;
      }
    };
  }

  /**
   * Create timeout wrapper for operations
   */
  static withTimeout<T>(
    operation: () => Promise<T>,
    timeoutMs: number,
    timeoutMessage = 'Operation timed out'
  ): Promise<T> {
    return Promise.race([
      operation(),
      new Promise<T>((_, reject) => 
        setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs)
      )
    ]);
  }

  /**
   * Analyze performance trends
   */
  static analyzePerformanceTrend(
    measurements: number[],
    threshold = 1.5 // 50% increase indicates degradation
  ): {
    trend: 'improving' | 'stable' | 'degrading';
    degradationPercentage?: number;
    recommendedAction?: string;
  } {
    if (measurements.length < 2) {
      return { trend: 'stable' };
    }
    
    const first = measurements[0];
    const last = measurements[measurements.length - 1];
    const change = (last - first) / first;
    
    if (change > threshold) {
      return {
        trend: 'degrading',
        degradationPercentage: change * 100,
        recommendedAction: 'Investigate performance degradation'
      };
    } else if (change < -0.1) { // 10% improvement
      return { trend: 'improving' };
    } else {
      return { trend: 'stable' };
    }
  }

  /**
   * Generate performance report
   */
  static generatePerformanceReport(
    testName: string,
    measurements: Array<{ operation: string; duration: number; success: boolean }>
  ): string {
    const successful = measurements.filter(m => m.success);
    const failed = measurements.filter(m => !m.success);
    
    const durations = successful.map(m => m.duration);
    const average = durations.reduce((sum, d) => sum + d, 0) / durations.length;
    const min = Math.min(...durations);
    const max = Math.max(...durations);
    const p95 = durations.sort((a, b) => a - b)[Math.floor(durations.length * 0.95)];
    
    return `
Performance Report: ${testName}
=====================================
Total Operations: ${measurements.length}
Successful: ${successful.length} (${((successful.length / measurements.length) * 100).toFixed(2)}%)
Failed: ${failed.length} (${((failed.length / measurements.length) * 100).toFixed(2)}%)

Duration Statistics (ms):
  Average: ${average.toFixed(2)}
  Minimum: ${min.toFixed(2)}
  Maximum: ${max.toFixed(2)}
  95th Percentile: ${p95.toFixed(2)}

Performance Assessment:
  ${average < 1000 ? '✅ Excellent' : average < 5000 ? '⚠️ Acceptable' : '❌ Needs Optimization'}
  ${failed.length === 0 ? '✅ No Failures' : `❌ ${failed.length} failures detected`}
    `.trim();
  }
}