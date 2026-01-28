import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/pages/api/auth/[...nextauth]";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const { teamId, documentId } = req.query as {
    teamId: string;
    documentId: string;
  };

  try {
    const userTeam = await prisma.userTeam.findFirst({
      where: {
        userId: session.user.id,
        teamId,
      },
    });

    if (!userTeam) {
      return res.status(403).json({ message: "Access denied" });
    }

    const document = await prisma.signatureDocument.findFirst({
      where: {
        id: documentId,
        teamId,
      },
      select: {
        id: true,
        title: true,
        status: true,
        createdAt: true,
        sentAt: true,
        completedAt: true,
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
            ipAddress: true,
            userAgent: true,
          },
          orderBy: { signingOrder: "asc" },
        },
      },
    });

    if (!document) {
      return res.status(404).json({ message: "Document not found" });
    }

    // @ts-ignore - Model exists in schema, TS server may need restart
    const auditLogs = await prisma.signatureAuditLog.findMany({
      where: { documentId },
      orderBy: { createdAt: "asc" },
    });

    const auditTrail: Array<{ event: string; timestamp: string; details: Record<string, any> }> = [
      {
        event: "Document Created",
        timestamp: document.createdAt.toISOString(),
        details: { title: document.title },
      },
    ];

    if (document.sentAt) {
      auditTrail.push({
        event: "Document Sent",
        timestamp: document.sentAt.toISOString(),
        details: {
          recipients: document.recipients.map((r) => ({
            name: r.name,
            email: r.email,
          })),
        },
      });
    }

    for (const recipient of document.recipients) {
      if (recipient.viewedAt) {
        auditTrail.push({
          event: "Document Viewed",
          timestamp: recipient.viewedAt.toISOString(),
          details: {
            recipientName: recipient.name,
            recipientEmail: recipient.email,
            ipAddress: recipient.ipAddress,
            userAgent: recipient.userAgent,
          },
        });
      }

      if (recipient.signedAt) {
        auditTrail.push({
          event: "Document Signed",
          timestamp: recipient.signedAt.toISOString(),
          details: {
            recipientName: recipient.name,
            recipientEmail: recipient.email,
            ipAddress: recipient.ipAddress,
            userAgent: recipient.userAgent,
          },
        });
      }

      if (recipient.declinedAt) {
        auditTrail.push({
          event: "Document Declined",
          timestamp: recipient.declinedAt.toISOString(),
          details: {
            recipientName: recipient.name,
            recipientEmail: recipient.email,
          },
        });
      }
    }

    if (document.completedAt) {
      auditTrail.push({
        event: "Document Completed",
        timestamp: document.completedAt.toISOString(),
        details: {
          allSigners: document.recipients
            .filter((r) => r.status === "SIGNED")
            .map((r) => ({ name: r.name, email: r.email })),
        },
      });
    }

    auditTrail.sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    return res.status(200).json({
      document: {
        id: document.id,
        title: document.title,
        status: document.status,
      },
      auditTrail,
      auditLogs,
      rawLogs: auditLogs,
    });
  } catch (error) {
    console.error("Error fetching audit log:", error);
    return res.status(500).json({ message: "Failed to fetch audit log" });
  }
}
