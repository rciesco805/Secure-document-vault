import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "../../auth/[...nextauth]";
import { CustomUser } from "@/lib/types";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const user = session.user as CustomUser;

    const adminTeam = await prisma.userTeam.findFirst({
      where: {
        userId: user.id,
        role: { in: ["OWNER", "ADMIN", "SUPER_ADMIN"] },
        status: "ACTIVE",
      },
      include: {
        team: true,
      },
    });

    if (!adminTeam) {
      return res.status(403).json({ message: "Admin access required" });
    }

    const { 
      format = "json",
      startDate,
      endDate,
      eventType,
      resourceType,
      limit = "1000",
    } = req.query;

    const where: any = {
      OR: [
        { teamId: adminTeam.teamId },
        {
          user: {
            teams: {
              some: { teamId: adminTeam.teamId },
            },
          },
        },
      ],
    };

    if (startDate) {
      where.createdAt = {
        ...where.createdAt,
        gte: new Date(startDate as string),
      };
    }

    if (endDate) {
      where.createdAt = {
        ...where.createdAt,
        lte: new Date(endDate as string),
      };
    }

    if (eventType) {
      where.eventType = eventType;
    }

    if (resourceType) {
      where.resourceType = resourceType;
    }

    const auditLogs = await prisma.auditLog.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: Math.min(parseInt(limit as string, 10), 10000),
    });

    const formattedLogs = auditLogs.map(log => ({
      id: log.id,
      timestamp: log.createdAt.toISOString(),
      eventType: log.eventType,
      resourceType: log.resourceType,
      resourceId: log.resourceId,
      user: log.user ? {
        id: log.user.id,
        name: log.user.name,
        email: log.user.email,
      } : null,
      ipAddress: log.ipAddress,
      userAgent: log.userAgent,
      metadata: log.metadata,
    }));

    if (format === "csv") {
      const csvHeaders = [
        "ID",
        "Timestamp",
        "Event Type",
        "Resource Type",
        "Resource ID",
        "User ID",
        "User Name",
        "User Email",
        "IP Address",
        "User Agent",
      ].join(",");

      const csvRows = formattedLogs.map(log => [
        log.id,
        log.timestamp,
        log.eventType,
        log.resourceType || "",
        log.resourceId || "",
        log.user?.id || "",
        `"${(log.user?.name || "").replace(/"/g, '""')}"`,
        log.user?.email || "",
        log.ipAddress || "",
        `"${(log.userAgent || "").replace(/"/g, '""')}"`,
      ].join(","));

      const csv = [csvHeaders, ...csvRows].join("\n");

      res.setHeader("Content-Type", "text/csv");
      res.setHeader(
        "Content-Disposition", 
        `attachment; filename="audit-log-${new Date().toISOString().split("T")[0]}.csv"`
      );
      return res.send(csv);
    }

    res.setHeader("Content-Type", "application/json");
    if (req.query.download === "true") {
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="audit-log-${new Date().toISOString().split("T")[0]}.json"`
      );
    }

    return res.status(200).json({
      success: true,
      count: formattedLogs.length,
      exportedAt: new Date().toISOString(),
      team: {
        id: adminTeam.team.id,
        name: adminTeam.team.name,
      },
      filters: {
        startDate: startDate || null,
        endDate: endDate || null,
        eventType: eventType || null,
        resourceType: resourceType || null,
      },
      logs: formattedLogs,
    });
  } catch (error: any) {
    console.error("Error exporting audit logs:", error);
    return res.status(500).json({
      message: error.message || "Failed to export audit logs",
    });
  }
}
