import { logger } from "@/infra/logger"

type CircuitState = "closed" | "open" | "half-open"

interface CircuitBreakerOptions {
  name: string
  failureThreshold?: number   /* failures in window before opening */
  windowMs?: number           /* rolling window for failure count */
  cooldownMs?: number         /* how long to stay open before half-open */
}

export class CircuitBreaker {
  private state: CircuitState = "closed"
  private failures = 0
  private lastFailureTime = 0
  private readonly opts: Required<CircuitBreakerOptions>

  constructor(opts: CircuitBreakerOptions) {
    this.opts = {
      failureThreshold: opts.failureThreshold ?? 5,
      windowMs:         opts.windowMs         ?? 60_000,
      cooldownMs:       opts.cooldownMs        ?? 30_000,
      name:             opts.name,
    }
  }

  async call<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === "open") {
      const elapsed = Date.now() - this.lastFailureTime
      if (elapsed < this.opts.cooldownMs) {
        throw new Error(`Circuit breaker "${this.opts.name}" is OPEN — failing fast`)
      }
      this.state = "half-open"
      logger.warn({ circuit: this.opts.name }, "Circuit breaker entering half-open")
    }

    try {
      const result = await fn()
      this.onSuccess()
      return result
    } catch (err) {
      this.onFailure()
      throw err
    }
  }

  private onSuccess() {
    this.failures = 0
    if (this.state !== "closed") {
      logger.info({ circuit: this.opts.name }, "Circuit breaker closed")
      this.state = "closed"
    }
  }

  private onFailure() {
    const now = Date.now()
    if (now - this.lastFailureTime > this.opts.windowMs) {
      this.failures = 0
    }
    this.failures++
    this.lastFailureTime = now

    if (this.failures >= this.opts.failureThreshold) {
      this.state = "open"
      logger.error(
        { circuit: this.opts.name, failures: this.failures },
        "Circuit breaker OPENED"
      )
    }
  }

  get isOpen() { return this.state === "open" }
}
