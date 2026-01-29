import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/prisma";

interface HealthResponse {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  version: string;
  uptime: number;
  checks: {
    database: {
      status: "up" | "down";
      latencyMs?: number;
    };
    storage: {
      status: "up" | "down" | "not_configured";
      provider?: string;
    };
  };
}

const startTime = Date.now();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<HealthResponse>
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).end();
  }

  const checks: HealthResponse["checks"] = {
    database: { status: "down" },
    storage: { status: "not_configured" },
  };

  let overallStatus: HealthResponse["status"] = "healthy";

  const dbStart = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = {
      status: "up",
      latencyMs: Date.now() - dbStart,
    };
  } catch {
    checks.database = { status: "down" };
    overallStatus = "unhealthy";
  }

  const storageProvider = process.env.STORAGE_PROVIDER;
  if (storageProvider) {
    checks.storage = { 
      status: "up",
      provider: storageProvider,
    };
  }

  if (checks.database.status === "down") {
    overallStatus = "unhealthy";
  } else if (checks.storage.status === "not_configured") {
    overallStatus = "degraded";
  }

  const statusCode = overallStatus === "unhealthy" ? 503 : 200;

  res.status(statusCode).json({
    status: overallStatus,
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || "1.0.0",
    uptime: Math.floor((Date.now() - startTime) / 1000),
    checks,
  });
}
