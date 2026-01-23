import type { NextApiRequest } from "next";
import UAParser from "ua-parser-js";

export interface ViewAuditData {
  ipAddress: string | null;
  userAgent: string | null;
  geoCountry: string | null;
  geoCity: string | null;
  geoRegion: string | null;
  deviceType: string | null;
  browserName: string | null;
  osName: string | null;
  referrer: string | null;
}

export function extractViewAuditData(req: NextApiRequest): ViewAuditData {
  const forwarded = req.headers["x-forwarded-for"];
  const ipAddress = typeof forwarded === "string" 
    ? forwarded.split(",")[0].trim() 
    : req.socket?.remoteAddress || null;

  const userAgent = req.headers["user-agent"] || null;
  const referrer = req.headers["referer"] || null;

  let deviceType: string | null = null;
  let browserName: string | null = null;
  let osName: string | null = null;

  if (userAgent) {
    try {
      const parser = new UAParser(userAgent);
      const result = parser.getResult();
      
      deviceType = result.device?.type || "desktop";
      browserName = result.browser?.name || null;
      osName = result.os?.name || null;
    } catch {
      deviceType = "unknown";
    }
  }

  const geoCountry = (req.headers["cf-ipcountry"] as string) || 
                     (req.headers["x-vercel-ip-country"] as string) || null;
  const geoCity = (req.headers["x-vercel-ip-city"] as string) || null;
  const geoRegion = (req.headers["x-vercel-ip-country-region"] as string) || null;

  return {
    ipAddress,
    userAgent,
    geoCountry,
    geoCity,
    geoRegion,
    deviceType: deviceType || "Desktop",
    browserName,
    osName,
    referrer,
  };
}

export function formatAuditTimestamp(date: Date = new Date()): string {
  return date.toISOString();
}

export function createAuditMetadata(action: string, details?: Record<string, unknown>) {
  return {
    action,
    timestamp: formatAuditTimestamp(),
    ...details,
  };
}
