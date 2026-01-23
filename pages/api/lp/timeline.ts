import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "../auth/[...nextauth]";

interface TimelineEvent {
  id: string;
  type: "view" | "signature" | "document" | "note";
  title: string;
  description: string;
  timestamp: string;
  metadata?: {
    documentName?: string;
    pageCount?: number;
    duration?: number;
    status?: string;
    ipAddress?: string;
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const session = await getServerSession(req, res, authOptions);

    if (!session?.user?.email) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { search, limit = "50" } = req.query;
    const limitNum = Math.min(parseInt(limit as string) || 50, 100);

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { investorProfile: true },
    });

    if (!user?.investorProfile) {
      return res.status(404).json({ message: "Investor profile not found" });
    }

    const investorEmail = session.user.email;
    const events: TimelineEvent[] = [];

    const views = await prisma.view.findMany({
      where: {
        viewerEmail: investorEmail,
        ...(search ? {
          OR: [
            { document: { name: { contains: search as string, mode: "insensitive" } } },
            { dataroom: { name: { contains: search as string, mode: "insensitive" } } },
          ],
        } : {}),
      },
      include: {
        document: { select: { name: true } },
        dataroom: { select: { name: true } },
        pageViews: {
          select: { duration: true, pageNumber: true },
        },
      },
      orderBy: { viewedAt: "desc" },
      take: limitNum,
    });

    for (const view of views) {
      const totalDuration = view.pageViews.reduce((sum, pv) => sum + (pv.duration || 0), 0);
      const pageCount = view.pageViews.length;
      
      events.push({
        id: `view-${view.id}`,
        type: "view",
        title: view.document?.name || view.dataroom?.name || "Document View",
        description: view.dataroom 
          ? `Viewed dataroom${pageCount > 0 ? ` (${pageCount} pages)` : ""}`
          : `Viewed document${pageCount > 0 ? ` (${pageCount} pages)` : ""}`,
        timestamp: view.viewedAt.toISOString(),
        metadata: {
          documentName: view.document?.name || view.dataroom?.name,
          pageCount,
          duration: totalDuration,
        },
      });
    }

    const signatureEvents = await prisma.signatureAuditLog.findMany({
      where: {
        recipientEmail: investorEmail,
        ...(search ? {
          OR: [
            { event: { contains: search as string, mode: "insensitive" } },
          ],
        } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: limitNum,
    });

    for (const sig of signatureEvents) {
      const eventLabels: Record<string, string> = {
        "document.viewed": "Viewed signature document",
        "recipient.signed": "Signed document",
        "recipient.declined": "Declined to sign",
        "document.completed": "Document completed",
        "document.sent": "Received document for signature",
      };

      events.push({
        id: `sig-${sig.id}`,
        type: "signature",
        title: eventLabels[sig.event] || sig.event,
        description: sig.recipientEmail || "Signature event",
        timestamp: sig.createdAt.toISOString(),
        metadata: {
          status: sig.event,
          ipAddress: sig.ipAddress || undefined,
        },
      });
    }

    const investorDocs = await prisma.investorDocument.findMany({
      where: {
        investorId: user.investorProfile.id,
        ...(search ? {
          title: { contains: search as string, mode: "insensitive" },
        } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: limitNum,
    });

    for (const doc of investorDocs) {
      events.push({
        id: `doc-${doc.id}`,
        type: "document",
        title: doc.title,
        description: doc.signedAt ? `Signed on ${new Date(doc.signedAt).toLocaleDateString()}` : doc.documentType,
        timestamp: doc.createdAt.toISOString(),
        metadata: {
          documentName: doc.title,
          status: doc.signedAt ? "signed" : "pending",
        },
      });
    }

    events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return res.status(200).json({
      events: events.slice(0, limitNum),
      total: events.length,
    });
  } catch (error: any) {
    console.error("Timeline fetch error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
