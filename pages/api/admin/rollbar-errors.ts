import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import prisma from "@/lib/prisma";

interface RollbarItem {
  id: number;
  counter: number;
  environment: string;
  framework: string;
  hash: string;
  level: string;
  occurrences: number;
  status: string;
  title: string;
  unique_occurrences: number;
  first_occurrence_timestamp: number;
  last_occurrence_timestamp: number;
  total_occurrences: number;
}

interface RollbarOccurrence {
  id: number;
  timestamp: number;
  level: string;
  environment: string;
  body: {
    trace?: {
      exception?: {
        class: string;
        message: string;
      };
      frames?: Array<{
        filename: string;
        lineno: number;
        method: string;
      }>;
    };
    message?: {
      body: string;
    };
  };
  request?: {
    url: string;
    method: string;
    user_ip: string;
  };
  client?: {
    javascript?: {
      browser: string;
    };
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const userTeam = await prisma.userTeam.findFirst({
    where: {
      user: { email: session.user.email },
      role: { in: ["OWNER", "ADMIN", "SUPER_ADMIN"] },
      status: "ACTIVE",
    },
  });

  if (!userTeam) {
    return res.status(403).json({ error: "Admin access required" });
  }

  const readToken = process.env.ROLLBAR_READ_TOKEN;
  if (!readToken) {
    return res.status(500).json({ error: "Rollbar read token not configured" });
  }

  try {
    const { type = "items", limit = "20", level, environment = "production" } = req.query;

    if (type === "items") {
      const params = new URLSearchParams({
        access_token: readToken,
        status: "active",
        level: (level as string) || "error",
        environment: environment as string,
      });

      const response = await fetch(
        `https://api.rollbar.com/api/1/items?${params.toString()}`
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("[ROLLBAR] API error:", response.status, errorText);
        return res.status(response.status).json({ 
          error: "Failed to fetch from Rollbar",
          details: errorText 
        });
      }

      const data = await response.json();
      const items: RollbarItem[] = data.result?.items || [];

      const formattedItems = items.slice(0, parseInt(limit as string)).map((item) => ({
        id: item.id,
        counter: item.counter,
        level: item.level,
        title: item.title,
        environment: item.environment,
        occurrences: item.total_occurrences || item.occurrences,
        status: item.status,
        firstSeen: new Date(item.first_occurrence_timestamp * 1000).toISOString(),
        lastSeen: new Date(item.last_occurrence_timestamp * 1000).toISOString(),
        rollbarUrl: `https://rollbar.com/item/${item.counter}`,
      }));

      return res.status(200).json({
        success: true,
        count: formattedItems.length,
        items: formattedItems,
      });
    }

    if (type === "occurrences") {
      const { itemId } = req.query;
      if (!itemId) {
        return res.status(400).json({ error: "itemId required for occurrences" });
      }

      const params = new URLSearchParams({
        access_token: readToken,
      });

      const response = await fetch(
        `https://api.rollbar.com/api/1/item/${itemId}/instances?${params.toString()}`
      );

      if (!response.ok) {
        const errorText = await response.text();
        return res.status(response.status).json({ 
          error: "Failed to fetch occurrences",
          details: errorText 
        });
      }

      const data = await response.json();
      const occurrences: RollbarOccurrence[] = data.result?.instances || [];

      const formattedOccurrences = occurrences.slice(0, parseInt(limit as string)).map((occ) => ({
        id: occ.id,
        timestamp: new Date(occ.timestamp * 1000).toISOString(),
        level: occ.level,
        environment: occ.environment,
        message: occ.body?.trace?.exception?.message || occ.body?.message?.body || "Unknown error",
        exceptionClass: occ.body?.trace?.exception?.class,
        url: occ.request?.url,
        browser: occ.client?.javascript?.browser,
        userIp: occ.request?.user_ip,
        frames: occ.body?.trace?.frames?.slice(0, 5).map((f) => ({
          file: f.filename,
          line: f.lineno,
          method: f.method,
        })),
      }));

      return res.status(200).json({
        success: true,
        count: formattedOccurrences.length,
        occurrences: formattedOccurrences,
      });
    }

    return res.status(400).json({ error: "Invalid type parameter" });
  } catch (error) {
    console.error("[ROLLBAR] Error fetching errors:", error);
    return res.status(500).json({ 
      error: "Failed to fetch Rollbar errors",
      message: error instanceof Error ? error.message : "Unknown error"
    });
  }
}
