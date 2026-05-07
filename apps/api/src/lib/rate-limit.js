/**
 * createRateLimiter({ windowMs, max })
 *
 * Fixed-window in-memory rate limiter.
 * Returns { check(ip), reset(ip) }
 *
 * check(ip) → { allowed: boolean, retryAfterSec: number }
 *
 * MVP için yeterli. Yatay scale gerekirse Redis tabanlıya yükseltilmeli.
 */
function createRateLimiter({ windowMs = 900_000, max = 60 } = {}) {
  // Map<ip, { count: number, resetAt: number }>
  const windows = new Map();

  // Süresi dolmuş kayıtları her windowMs'de bir temizle
  const timer = setInterval(() => {
    const now = Date.now();
    for (const [ip, entry] of windows) {
      if (entry.resetAt <= now) windows.delete(ip);
    }
  }, windowMs);

  // Event loop'u tutmasın
  if (timer.unref) timer.unref();

  function check(ip) {
    const now = Date.now();
    let entry = windows.get(ip);

    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + windowMs };
      windows.set(ip, entry);
    }

    entry.count += 1;

    if (entry.count > max) {
      return {
        allowed: false,
        retryAfterSec: Math.ceil((entry.resetAt - now) / 1000)
      };
    }

    return { allowed: true, retryAfterSec: 0 };
  }

  function reset(ip) {
    windows.delete(ip);
  }

  return { check, reset };
}

module.exports = { createRateLimiter };
