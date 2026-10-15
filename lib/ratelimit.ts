/**
 * In-memory sliding window rate limiter (10 req/min per user)
 * Mematuhi panduan SECURITY.md tanpa memerlukan infrastruktur tambahan.
 */

interface RateLimitRecord {
  timestamps: number[];
}

const rateLimitMap = new Map<string, RateLimitRecord>();
const WINDOW_MS = 60 * 1000; // 1 minit
const MAX_REQUESTS = 10; // 10 permintaan seminit

export function checkRateLimit(userId: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const record = rateLimitMap.get(userId) || { timestamps: [] };

  // Bersihkan timestamp yang melebihi tetingkap 1 minit
  const validTimestamps = record.timestamps.filter((ts) => now - ts < WINDOW_MS);

  if (validTimestamps.length >= MAX_REQUESTS) {
    return {
      allowed: false,
      remaining: 0,
    };
  }

  validTimestamps.push(now);
  rateLimitMap.set(userId, { timestamps: validTimestamps });

  return {
    allowed: true,
    remaining: MAX_REQUESTS - validTimestamps.length,
  };
}
