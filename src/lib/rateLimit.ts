// ── In-Memory Rate Limiter ──
// Lightweight sliding-window rate limiter for Next.js API routes.
// Uses a Map with automatic cleanup. Suitable for single-instance deployments (Render).

// ── Configurable Thresholds ──
export const RATE_LIMITS = {
  // Strict: auth endpoints (brute-force risk)
  AUTH_MAX_REQUESTS: 5,
  AUTH_WINDOW_MS: 15 * 60 * 1000,      // 15 minutes

  // Moderate: public booking/payment endpoints
  BOOKING_MAX_REQUESTS: 10,
  BOOKING_WINDOW_MS: 15 * 60 * 1000,   // 15 minutes

  // Loose: authenticated admin CRUD actions
  ADMIN_MAX_REQUESTS: 60,
  ADMIN_WINDOW_MS: 60 * 1000,          // 1 minute

  // Cleanup interval for stale entries
  CLEANUP_INTERVAL_MS: 5 * 60 * 1000,  // 5 minutes
} as const;

interface RateLimitEntry {
  timestamps: number[];
}

// Global store — persists across requests within the same server process
const stores = new Map<string, Map<string, RateLimitEntry>>();

/**
 * Returns or creates a named rate limit store.
 */
function getStore(storeName: string): Map<string, RateLimitEntry> {
  if (!stores.has(storeName)) {
    stores.set(storeName, new Map());
  }
  return stores.get(storeName)!;
}

/**
 * Periodically cleans up expired entries from all stores.
 * Runs lazily on each check call — no background timers needed.
 */
let lastCleanup = Date.now();

function cleanupIfNeeded() {
  const now = Date.now();
  if (now - lastCleanup < RATE_LIMITS.CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;

  for (const [, store] of stores) {
    for (const [key, entry] of store) {
      // Remove entries with no recent timestamps
      if (entry.timestamps.length === 0 || entry.timestamps[entry.timestamps.length - 1] < now - 30 * 60 * 1000) {
        store.delete(key);
      }
    }
  }
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

/**
 * Check and consume a rate limit slot.
 *
 * @param storeName - Logical group name (e.g. 'admin-login', 'signup')
 * @param identifier - Usually the client IP address
 * @param maxRequests - Max requests allowed in the window
 * @param windowMs - Sliding window duration in milliseconds
 */
export function checkRateLimit(
  storeName: string,
  identifier: string,
  maxRequests: number,
  windowMs: number
): RateLimitResult {
  cleanupIfNeeded();

  const store = getStore(storeName);
  const now = Date.now();
  const windowStart = now - windowMs;

  let entry = store.get(identifier);
  if (!entry) {
    entry = { timestamps: [] };
    store.set(identifier, entry);
  }

  // Remove timestamps outside the current window
  entry.timestamps = entry.timestamps.filter((t) => t > windowStart);

  if (entry.timestamps.length >= maxRequests) {
    // Calculate when the oldest request in the window will expire
    const oldestInWindow = entry.timestamps[0];
    const retryAfterMs = oldestInWindow + windowMs - now;
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.ceil(retryAfterMs / 1000),
    };
  }

  // Allow and record this request
  entry.timestamps.push(now);
  return {
    allowed: true,
    remaining: maxRequests - entry.timestamps.length,
    retryAfterSeconds: 0,
  };
}

/**
 * Extract a client IP from a Next.js request.
 * Checks x-forwarded-for (common behind reverse proxies like Render/Vercel),
 * falls back to x-real-ip, then to a generic key.
 */
export function getClientIP(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    // x-forwarded-for can contain multiple IPs; take the first (client IP)
    return forwarded.split(',')[0].trim();
  }
  return request.headers.get('x-real-ip') || 'unknown';
}
