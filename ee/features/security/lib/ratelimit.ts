import { Ratelimit } from "@upstash/ratelimit";

import { redis } from "@/lib/redis";

const hasRedis = !!redis && !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);

/**
 * Simple rate limiters for core endpoints
 * Only initialize if Redis is available
 */
export const rateLimiters = hasRedis && redis ? {
  auth: new Ratelimit({
    redis: redis,
    limiter: Ratelimit.slidingWindow(10, "20 m"),
    prefix: "rl:auth",
    enableProtection: true,
    analytics: true,
  }),
  billing: new Ratelimit({
    redis: redis,
    limiter: Ratelimit.slidingWindow(10, "20 m"),
    prefix: "rl:billing",
    enableProtection: true,
    analytics: true,
  }),
} : {
  auth: null,
  billing: null,
};

/**
 * Apply rate limiting with error handling
 * Returns success if Redis is not configured
 */
export async function checkRateLimit(
  limiter: Ratelimit | null,
  identifier: string,
): Promise<{ success: boolean; remaining?: number; error?: string }> {
  if (!limiter) {
    return { success: true, error: "Rate limiting not configured" };
  }
  try {
    const result = await limiter.limit(identifier);
    return {
      success: result.success,
      remaining: result.remaining,
    };
  } catch (error) {
    return { success: true, error: "Rate limiting unavailable" };
  }
}
