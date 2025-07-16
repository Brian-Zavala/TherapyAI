/**
 * Exponential Backoff Implementation
 * Handles retry logic with increasing delays
 */

export interface ExponentialBackoffOptions {
  initialDelay: number;
  maxDelay: number;
  maxAttempts: number;
  multiplier?: number;
  jitter?: boolean;
}

export class ExponentialBackoff {
  private options: Required<ExponentialBackoffOptions>;
  private attemptCount: number;
  private lastAttemptTime: number;

  constructor(options: ExponentialBackoffOptions) {
    this.options = {
      multiplier: 2,
      jitter: true,
      ...options,
    };
    this.attemptCount = 0;
    this.lastAttemptTime = 0;
  }

  shouldRetry(): boolean {
    return this.attemptCount < this.options.maxAttempts;
  }

  getNextDelay(): number {
    if (!this.shouldRetry()) {
      return -1; // No more retries
    }

    const delay = Math.min(
      this.options.initialDelay * Math.pow(this.options.multiplier, this.attemptCount),
      this.options.maxDelay
    );

    // Add jitter to prevent thundering herd
    const jitteredDelay = this.options.jitter
      ? delay * (0.5 + Math.random() * 0.5)
      : delay;

    this.attemptCount++;
    this.lastAttemptTime = Date.now();

    return Math.round(jitteredDelay);
  }

  reset(): void {
    this.attemptCount = 0;
    this.lastAttemptTime = 0;
  }

  getAttemptCount(): number {
    return this.attemptCount;
  }

  getTimeUntilNextAttempt(): number {
    if (!this.shouldRetry() || this.lastAttemptTime === 0) {
      return 0;
    }

    const nextDelay = this.getNextDelay();
    const timeSinceLastAttempt = Date.now() - this.lastAttemptTime;
    
    return Math.max(0, nextDelay - timeSinceLastAttempt);
  }
}