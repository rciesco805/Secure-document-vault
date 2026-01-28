export * from "./rate-limiter";
export * from "./anomaly-detection";

export const SECURITY_CONFIG = {
  rateLimits: {
    signature: {
      windowMs: 15 * 60 * 1000,
      maxRequests: 5,
      description: "5 signature attempts per 15 minutes",
    },
    auth: {
      windowMs: 60 * 60 * 1000,
      maxRequests: 10,
      description: "10 auth attempts per hour",
    },
    api: {
      windowMs: 60 * 1000,
      maxRequests: 100,
      description: "100 API calls per minute",
    },
    strict: {
      windowMs: 60 * 60 * 1000,
      maxRequests: 3,
      description: "3 attempts per hour for sensitive operations",
    },
  },
  anomalyThresholds: {
    maxIps: 5,
    maxUserAgents: 3,
    rapidAccessCount: 10,
    rapidAccessWindow: 60 * 1000,
  },
  severityLevels: {
    LOW: "Informational, no immediate action",
    MEDIUM: "Monitor, may require investigation",
    HIGH: "Immediate investigation required",
    CRITICAL: "Block access and alert admin",
  },
};

export const SECURITY_BEST_PRACTICES = `
# Security Rate Limiting & Anomaly Detection

## Rate Limiting

All sensitive endpoints are protected with rate limiting:

| Endpoint Type | Window | Max Requests |
|---------------|--------|--------------|
| Signature     | 15 min | 5            |
| Auth          | 1 hour | 10           |
| API           | 1 min  | 100          |
| Strict        | 1 hour | 3            |

Usage:
\`\`\`typescript
import { withRateLimit, signatureRateLimiter } from "@/lib/security";

export default withRateLimit(handler, signatureRateLimiter);
\`\`\`

## Anomaly Detection

The system monitors for:
- Multiple IPs from single user (> 5 IPs)
- Rapid location changes
- Unusual access times (2-5 AM)
- Excessive requests
- Suspicious user agents

Critical/High severity alerts block access automatically.

## Audit Logging

All security events are logged to SignatureAuditLog:
- RATE_LIMIT_EXCEEDED
- ANOMALY_MULTIPLE_IPS
- ANOMALY_EXCESSIVE_REQUESTS
- SECURITY_ALERT_SENT
`;
