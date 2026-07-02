/**
 * Simple in-memory sliding window rate limiter.
 * Resets on server restart; use Redis for multi-instance deployments.
 */

interface Window { count: number; resetAt: number }

const windows = new Map<string, Window>()

/**
 * Returns true if the request is within the allowed rate.
 * @param key      Unique identifier (e.g. userId or IP)
 * @param limit    Max requests per window
 * @param windowMs Window duration in milliseconds
 */
export function checkRateLimit(key: string, limit: number, windowMs: number): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now()
  const entry = windows.get(key)

  if (!entry || now >= entry.resetAt) {
    const resetAt = now + windowMs
    windows.set(key, { count: 1, resetAt })
    return { allowed: true, remaining: limit - 1, resetAt }
  }

  if (entry.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt }
  }

  entry.count++
  return { allowed: true, remaining: limit - entry.count, resetAt: entry.resetAt }
}

/** Prune stale entries every 10 minutes to avoid memory leak */
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of windows) {
      if (now >= entry.resetAt) windows.delete(key)
    }
  }, 10 * 60 * 1000)
}
