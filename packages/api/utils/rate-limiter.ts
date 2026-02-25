/**
 * Token bucket rate limiter for OpenRouter RPM throttling.
 * Single-instance per process — no shared state needed for CLI usage.
 */

/** Sleep for ms milliseconds. */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class TokenBucketRateLimiter {
  private tokens: number;
  private lastRefillAt: number;
  private readonly rpmLimit: number;
  /** Token refill rate: tokens per millisecond */
  private readonly refillRatePerMs: number;

  constructor(rpmLimit: number) {
    this.rpmLimit = rpmLimit;
    this.tokens = rpmLimit;
    this.lastRefillAt = Date.now();
    // refill full bucket every 60 seconds
    this.refillRatePerMs = rpmLimit / 60_000;
  }

  /** Refills tokens based on elapsed time since last refill. */
  private refill(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefillAt;
    const newTokens = elapsed * this.refillRatePerMs;
    this.tokens = Math.min(this.rpmLimit, this.tokens + newTokens);
    this.lastRefillAt = now;
  }

  /**
   * Blocks until a token is available, then consumes one.
   * Polls at 100ms intervals to avoid tight spinning.
   */
  async acquire(): Promise<void> {
    while (true) {
      this.refill();
      if (this.tokens >= 1) {
        this.tokens -= 1;
        return;
      }
      // Time until next token available (in ms)
      const msUntilToken = (1 - this.tokens) / this.refillRatePerMs;
      await sleep(Math.min(msUntilToken, 100));
    }
  }

  reset(): void {
    this.tokens = this.rpmLimit;
    this.lastRefillAt = Date.now();
  }
}
