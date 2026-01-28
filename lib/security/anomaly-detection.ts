import { NextApiRequest } from "next";
import prisma from "@/lib/prisma";

interface UserAccessPattern {
  userId: string;
  ips: Set<string>;
  userAgents: Set<string>;
  lastAccess: number;
  accessCount: number;
  locations: Set<string>;
}

interface AnomalyAlert {
  type: AnomalyType;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  userId: string;
  details: Record<string, unknown>;
  timestamp: Date;
}

type AnomalyType =
  | "MULTIPLE_IPS"
  | "RAPID_LOCATION_CHANGE"
  | "UNUSUAL_TIME"
  | "EXCESSIVE_REQUESTS"
  | "SUSPICIOUS_USER_AGENT"
  | "IMPOSSIBLE_TRAVEL";

const userPatterns = new Map<string, UserAccessPattern>();
const PATTERN_TTL = 24 * 60 * 60 * 1000;
const MAX_IPS_THRESHOLD = 5;
const MAX_USER_AGENTS_THRESHOLD = 3;
const RAPID_ACCESS_THRESHOLD = 10;
const RAPID_ACCESS_WINDOW = 60 * 1000;

const recentAccess = new Map<string, number[]>();

function cleanupPatterns() {
  const now = Date.now();
  for (const [userId, pattern] of userPatterns.entries()) {
    if (now - pattern.lastAccess > PATTERN_TTL) {
      userPatterns.delete(userId);
    }
  }
  for (const [key, times] of recentAccess.entries()) {
    const filtered = times.filter((t) => now - t < RAPID_ACCESS_WINDOW);
    if (filtered.length === 0) {
      recentAccess.delete(key);
    } else {
      recentAccess.set(key, filtered);
    }
  }
}

setInterval(cleanupPatterns, 5 * 60 * 1000);

function getClientInfo(req: NextApiRequest) {
  const forwarded = req.headers["x-forwarded-for"];
  let ip: string;
  if (typeof forwarded === "string") {
    ip = forwarded.split(",")[0].trim();
  } else if (Array.isArray(forwarded)) {
    ip = forwarded[0];
  } else {
    ip = req.socket?.remoteAddress || "unknown";
  }

  const userAgent = req.headers["user-agent"] || "unknown";
  const country = (req.headers["cf-ipcountry"] as string) || "unknown";

  return { ip, userAgent, country };
}

export async function detectAnomalies(
  req: NextApiRequest,
  userId: string
): Promise<AnomalyAlert[]> {
  const alerts: AnomalyAlert[] = [];
  const { ip, userAgent, country } = getClientInfo(req);
  const now = Date.now();

  let pattern = userPatterns.get(userId);
  if (!pattern) {
    pattern = {
      userId,
      ips: new Set(),
      userAgents: new Set(),
      lastAccess: now,
      accessCount: 0,
      locations: new Set(),
    };
    userPatterns.set(userId, pattern);
  }

  pattern.ips.add(ip);
  pattern.userAgents.add(userAgent);
  pattern.locations.add(country);
  pattern.accessCount++;
  pattern.lastAccess = now;

  if (pattern.ips.size > MAX_IPS_THRESHOLD) {
    alerts.push({
      type: "MULTIPLE_IPS",
      severity: pattern.ips.size > 10 ? "CRITICAL" : "HIGH",
      userId,
      details: {
        ipCount: pattern.ips.size,
        recentIps: Array.from(pattern.ips).slice(-5),
        currentIp: ip,
      },
      timestamp: new Date(),
    });
  }

  if (pattern.userAgents.size > MAX_USER_AGENTS_THRESHOLD) {
    alerts.push({
      type: "SUSPICIOUS_USER_AGENT",
      severity: "MEDIUM",
      userId,
      details: {
        userAgentCount: pattern.userAgents.size,
        currentUserAgent: userAgent,
      },
      timestamp: new Date(),
    });
  }

  const accessKey = `${userId}:${ip}`;
  const accessTimes = recentAccess.get(accessKey) || [];
  accessTimes.push(now);
  recentAccess.set(accessKey, accessTimes);

  const recentCount = accessTimes.filter(
    (t) => now - t < RAPID_ACCESS_WINDOW
  ).length;
  if (recentCount > RAPID_ACCESS_THRESHOLD) {
    alerts.push({
      type: "EXCESSIVE_REQUESTS",
      severity: recentCount > 50 ? "CRITICAL" : "HIGH",
      userId,
      details: {
        requestCount: recentCount,
        windowSeconds: RAPID_ACCESS_WINDOW / 1000,
        ip,
      },
      timestamp: new Date(),
    });
  }

  const hour = new Date().getHours();
  if (hour >= 2 && hour <= 5) {
    alerts.push({
      type: "UNUSUAL_TIME",
      severity: "LOW",
      userId,
      details: {
        hour,
        ip,
        country,
      },
      timestamp: new Date(),
    });
  }

  if (pattern.locations.size > 2) {
    alerts.push({
      type: "RAPID_LOCATION_CHANGE",
      severity: "HIGH",
      userId,
      details: {
        locations: Array.from(pattern.locations),
        currentLocation: country,
      },
      timestamp: new Date(),
    });
  }

  if (alerts.length > 0) {
    await logAnomalies(alerts);
  }

  return alerts;
}

async function logAnomalies(alerts: AnomalyAlert[]) {
  try {
    await Promise.all(
      alerts.map((alert) =>
        prisma.signatureAuditLog.create({
          data: {
            documentId: "SECURITY_LOG",
            event: `ANOMALY_${alert.type}`,
            metadata: {
              severity: alert.severity,
              userId: alert.userId,
              details: alert.details as object,
              timestamp: alert.timestamp.toISOString(),
            } as object,
          },
        })
      )
    );
  } catch {
  }
}

export async function checkAndAlertAnomalies(
  req: NextApiRequest,
  userId: string
): Promise<{ allowed: boolean; alerts: AnomalyAlert[] }> {
  const alerts = await detectAnomalies(req, userId);

  const criticalAlerts = alerts.filter((a) => a.severity === "CRITICAL");
  if (criticalAlerts.length > 0) {
    await sendSecurityAlert(criticalAlerts);
    return { allowed: false, alerts };
  }

  const highAlerts = alerts.filter((a) => a.severity === "HIGH");
  if (highAlerts.length >= 2) {
    await sendSecurityAlert(highAlerts);
    return { allowed: false, alerts };
  }

  return { allowed: true, alerts };
}

async function sendSecurityAlert(alerts: AnomalyAlert[]) {
  const message = alerts
    .map(
      (a) =>
        `[${a.severity}] ${a.type} for user ${a.userId}: ${JSON.stringify(a.details)}`
    )
    .join("\n");

  console.error(`[SECURITY ALERT]\n${message}`);

  try {
    await prisma.signatureAuditLog.create({
      data: {
        documentId: "SECURITY_LOG",
        event: "SECURITY_ALERT_SENT",
        metadata: {
          alertCount: alerts.length,
          alerts: alerts.map((a) => ({
            type: a.type,
            severity: a.severity,
            userId: a.userId,
          })),
          timestamp: new Date().toISOString(),
        } as object,
      },
    });
  } catch {
  }
}

export function getUserAccessPattern(userId: string): UserAccessPattern | undefined {
  return userPatterns.get(userId);
}

export function clearUserPattern(userId: string): void {
  userPatterns.delete(userId);
}

export type { AnomalyAlert, AnomalyType };
