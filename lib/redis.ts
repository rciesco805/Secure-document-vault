import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const hasRedisConfig = !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);

export const redis = hasRedisConfig 
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL as string,
      token: process.env.UPSTASH_REDIS_REST_TOKEN as string,
    })
  : null;

const hasLockerRedisConfig = !!(process.env.UPSTASH_REDIS_REST_LOCKER_URL && process.env.UPSTASH_REDIS_REST_LOCKER_TOKEN);

export const lockerRedisClient = hasLockerRedisConfig
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_LOCKER_URL as string,
      token: process.env.UPSTASH_REDIS_REST_LOCKER_TOKEN as string,
    })
  : null;

const noopRatelimiter = {
  limit: async (_key: string) => ({
    success: true,
    limit: 999999,
    remaining: 999999,
    reset: Date.now() + 60000,
  }),
};

export const ratelimit = (
  requests: number = 10,
  seconds:
    | `${number} ms`
    | `${number} s`
    | `${number} m`
    | `${number} h`
    | `${number} d` = "10 s",
) => {
  if (!redis) {
    return noopRatelimiter;
  }
  return new Ratelimit({
    redis: redis,
    limiter: Ratelimit.slidingWindow(requests, seconds),
    analytics: true,
    prefix: "bffund",
  });
};
