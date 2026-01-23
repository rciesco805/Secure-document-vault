import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import prisma from "@/lib/prisma";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const session = await getServerSession(req, res, authOptions);
  const userId = (session?.user as { id?: string })?.id;
  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const { documentId, teamId, since } = req.query as {
    documentId?: string;
    teamId?: string;
    since?: string;
  };

  try {
    const sinceDate = since ? new Date(since) : new Date(Date.now() - 24 * 60 * 60 * 1000);

    if (documentId) {
      const document = await prisma.signatureDocument.findUnique({
        where: { id: documentId },
        include: {
          recipients: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              status: true,
              viewedAt: true,
              signedAt: true,
              declinedAt: true,
            },
            orderBy: { signingOrder: "asc" },
          },
          team: {
            select: { id: true },
          },
        },
      });

      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }

      // Verify user has access to this document's team
      const userTeam = await prisma.userTeam.findFirst({
        where: {
          userId,
          teamId: document.team.id,
        },
      });

      if (!userTeam) {
        return res.status(403).json({ message: "Access denied" });
      }

      const recentEvents = await prisma.signatureAuditLog.findMany({
        where: {
          documentId,
          createdAt: { gte: sinceDate },
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      });

      return res.status(200).json({
        document: {
          id: document.id,
          title: document.title,
          status: document.status,
          completedAt: document.completedAt,
          declinedAt: document.declinedAt,
        },
        recipients: document.recipients,
        recentEvents: recentEvents.map((e) => ({
          id: e.id,
          event: e.event,
          recipientEmail: e.recipientEmail,
          createdAt: e.createdAt,
          metadata: e.metadata,
        })),
        lastUpdated: new Date().toISOString(),
      });
    }

    if (teamId) {
      const userTeam = await prisma.userTeam.findFirst({
        where: {
          userId,
          teamId,
        },
      });

      if (!userTeam) {
        return res.status(403).json({ message: "Access denied" });
      }

      const recentDocuments = await prisma.signatureDocument.findMany({
        where: {
          teamId,
          OR: [
            { status: { in: ["SENT", "VIEWED", "PARTIALLY_SIGNED"] } },
            { completedAt: { gte: sinceDate } },
            { declinedAt: { gte: sinceDate } },
          ],
        },
        include: {
          recipients: {
            select: {
              id: true,
              name: true,
              email: true,
              status: true,
            },
          },
          _count: {
            select: { recipients: true },
          },
        },
        orderBy: { updatedAt: "desc" },
        take: 20,
      });

      const recentEvents = await prisma.signatureAuditLog.findMany({
        where: {
          createdAt: { gte: sinceDate },
          documentId: {
            in: recentDocuments.map((d) => d.id),
          },
        },
        orderBy: { createdAt: "desc" },
        take: 100,
      });

      const statusCounts = {
        pending: 0,
        signed: 0,
        completed: 0,
        declined: 0,
      };

      for (const doc of recentDocuments) {
        if (doc.status === "COMPLETED") statusCounts.completed++;
        else if (doc.status === "DECLINED") statusCounts.declined++;
        else if (doc.status === "PARTIALLY_SIGNED") statusCounts.signed++;
        else statusCounts.pending++;
      }

      return res.status(200).json({
        documents: recentDocuments.map((d) => ({
          id: d.id,
          title: d.title,
          status: d.status,
          recipientCount: d._count.recipients,
          signedCount: d.recipients.filter((r) => r.status === "SIGNED").length,
          updatedAt: d.updatedAt,
        })),
        recentEvents: recentEvents.map((e) => ({
          id: e.id,
          documentId: e.documentId,
          event: e.event,
          recipientEmail: e.recipientEmail,
          createdAt: e.createdAt,
        })),
        statusCounts,
        lastUpdated: new Date().toISOString(),
      });
    }

    return res.status(400).json({ message: "documentId or teamId required" });
  } catch (error) {
    console.error("[SIGN_STATUS] Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
