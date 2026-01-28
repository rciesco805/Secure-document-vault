import { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/prisma";

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyPrefix?: string;
  skipFailedRequests?: boolean;
  onLimitReached?: (ip: string, endpoint: string) => void;
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

const DEFAULT_CONFIG: RateLimitConfig = {
  windowMs: 15 * 60 * 1000,
  maxRequests: 5,
  keyPrefix: "rl",
};

function cleanupExpiredEntries() {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }
}

setInterval(cleanupExpiredEntries, 60 * 1000);

function getClientIp(req: NextApiRequest): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") {
    return forwarded.split(",")[0].trim();
  }
  if (Array.isArray(forwarded)) {
    return forwarded[0];
  }
  return req.socket?.remoteAddress || "unknown";
}

export function createRateLimiter(config: Partial<RateLimitConfig> = {}) {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  return async function rateLimitMiddleware(
    req: NextApiRequest,
    res: NextApiResponse
  ): Promise<boolean> {
    const ip = getClientIp(req);
    const endpoint = req.url || "unknown";
    const key = `${finalConfig.keyPrefix}:${ip}:${endpoint}`;
    const now = Date.now();

    let entry = rateLimitStore.get(key);

    if (!entry || entry.resetTime < now) {
      entry = {
        count: 1,
        resetTime: now + finalConfig.windowMs,
      };
      rateLimitStore.set(key, entry);
    } else {
      entry.count++;
    }

    const remaining = Math.max(0, finalConfig.maxRequests - entry.count);
    const resetIn = Math.ceil((entry.resetTime - now) / 1000);

    res.setHeader("X-RateLimit-Limit", finalConfig.maxRequests);
    res.setHeader("X-RateLimit-Remaining", remaining);
    res.setHeader("X-RateLimit-Reset", resetIn);

    if (entry.count > finalConfig.maxRequests) {
      if (finalConfig.onLimitReached) {
        finalConfig.onLimitReached(ip, endpoint);
      }

      await logRateLimitViolation(ip, endpoint);

      res.status(429).json({
        error: "Too many requests",
        message: `Rate limit exceeded. Try again in ${resetIn} seconds.`,
        retryAfter: resetIn,
      });
      return false;
    }

    return true;
  };
}

async function logRateLimitViolation(ip: string, endpoint: string) {
  try {
    await prisma.signatureAuditLog.create({
      data: {
        documentId: "SECURITY_LOG",
        event: "RATE_LIMIT_EXCEEDED",
        ipAddress: ip,
        metadata: {
          endpoint,
          timestamp: new Date().toISOString(),
          severity: "WARNING",
        } as object,
      },
    });
  } catch {
  }
}

export const signatureRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 5,
  keyPrefix: "sig",
  onLimitReached: (ip, endpoint) => {
    console.warn(`[SECURITY] Rate limit exceeded: ${ip} on ${endpoint}`);
  },
});

export const authRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  maxRequests: 10,
  keyPrefix: "auth",
  onLimitReached: (ip, endpoint) => {
    console.warn(`[SECURITY] Auth rate limit exceeded: ${ip} on ${endpoint}`);
  },
});

export const apiRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 100,
  keyPrefix: "api",
});

export const strictRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  maxRequests: 3,
  keyPrefix: "strict",
  onLimitReached: (ip, endpoint) => {
    console.error(`[SECURITY] Strict rate limit exceeded: ${ip} on ${endpoint}`);
  },
});

export function withRateLimit(
  handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void>,
  limiter = apiRateLimiter
) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const allowed = await limiter(req, res);
    if (!allowed) return;
    return handler(req, res);
  };
}
