// Lightweight in-memory rate limiter for API routes. Best-effort: serverless
// instances are ephemeral and not shared, so this throttles abusive bursts per
// warm instance rather than providing global guarantees. For hard global limits
// use a shared store (e.g. Upstash Redis).
const buckets = new Map();

export function rateLimit(key, { limit = 20, windowMs = 60_000 } = {}) {
  const now = Date.now();
  const entry = buckets.get(key);
  if (!entry || now > entry.reset) {
    buckets.set(key, { count: 1, reset: now + windowMs });
    return { ok: true, remaining: limit - 1 };
  }
  entry.count += 1;
  if (entry.count > limit) {
    return { ok: false, retryAfter: Math.ceil((entry.reset - now) / 1000) };
  }
  return { ok: true, remaining: limit - entry.count };
}

export function clientIp(req) {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  return req.headers.get('x-real-ip') || 'unknown';
}

// Occasionally drop expired buckets so the map can't grow unbounded.
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of buckets) if (now > v.reset) buckets.delete(k);
}, 300_000).unref?.();
