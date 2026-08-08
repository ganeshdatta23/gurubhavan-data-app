/** Simple in-memory rate limiter for login (single-instance / small deploys). */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export type RateLimitResult =
  | { ok: true; remaining: number }
  | { ok: false; retryAfterSec: number };

/**
 * Allow `limit` attempts per `windowMs` for a given key (e.g. IP or username).
 * Returns remaining attempts on success, or seconds until the window resets.
 */
export function checkRateLimit(key: string, limit = 8, windowMs = 15 * 60 * 1000): RateLimitResult {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1 };
  }

  if (existing.count >= limit) {
    return { ok: false, retryAfterSec: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)) };
  }

  existing.count += 1;
  buckets.set(key, existing);
  return { ok: true, remaining: limit - existing.count };
}

export function clearRateLimit(key: string) {
  buckets.delete(key);
}
