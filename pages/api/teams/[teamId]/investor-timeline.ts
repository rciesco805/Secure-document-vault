import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "../../auth/[...nextauth]";

interface TimelineEvent {
  id: string;
  type: "view" | "signature" | "document" | "note";
  title: string;
  description: string;
  timestamp: string;
  investorEmail?: string;
  investorName?: string;
  metadata?: {
    documentName?: string;
    pageCount?: number;
    duration?: number;
    status?: string;
    ipAddress?: string;
    country?: string;
    city?: string;
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
    const { teamId } = req.query;

    if (!session?.user?.id || !teamId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const userTeam = await prisma.userTeam.findFirst({
      where: {
        userId: session.user.id,
        teamId: teamId as string,
      },
    });

    if (!userTeam) {
      return res.status(403).json({ message: "Access denied" });
    }

    const { search, investorId, limit = "100", format } = req.query;
    const limitNum = Math.min(parseInt(limit as string) || 100, 500);

    const events: TimelineEvent[] = [];

    const viewWhere: any = {
      link: { teamId: teamId as string },
    };
    if (investorId) {
      const investor = await prisma.investor.findUnique({
        where: { id: investorId as string },
        include: { user: true },
      });
      if (investor?.user?.email) {
        viewWhere.viewerEmail = investor.user.email;
      }
    }
    if (search) {
      viewWhere.OR = [
        { viewerEmail: { contains: search as string, mode: "insensitive" } },
        { viewerName: { contains: search as string, mode: "insensitive" } },
        { document: { name: { contains: search as string, mode: "insensitive" } } },
      ];
    }

    const views = await prisma.view.findMany({
      where: viewWhere,
      include: {
        document: { select: { name: true } },
        dataroom: { select: { name: true } },
        pageViews: {
          select: { duration: true, pageNumber: true, country: true, city: true },
        },
      },
      orderBy: { viewedAt: "desc" },
      take: limitNum,
    });

    for (const view of views) {
      const totalDuration = view.pageViews.reduce((sum, pv) => sum + (pv.duration || 0), 0);
      const pageCount = view.pageViews.length;
      const geoData = view.pageViews[0];

      events.push({
        id: `view-${view.id}`,
        type: "view",
        title: view.document?.name || view.dataroom?.name || "Document View",
        description: `Viewed ${pageCount > 0 ? `${pageCount} pages` : "document"}`,
        timestamp: view.viewedAt.toISOString(),
        investorEmail: view.viewerEmail || undefined,
        investorName: view.viewerName || undefined,
        metadata: {
          documentName: view.document?.name || view.dataroom?.name,
          pageCount,
          duration: totalDuration,
          country: geoData?.country,
          city: geoData?.city,
        },
      });
    }

    const teamDocs = await prisma.signatureDocument.findMany({
      where: { teamId: teamId as string },
      select: { id: true },
    });
    const docIds = teamDocs.map((d) => d.id);

    if (docIds.length > 0) {
      const sigWhere: any = {
        documentId: { in: docIds },
      };
      if (search) {
        sigWhere.OR = [
          { recipientEmail: { contains: search as string, mode: "insensitive" } },
          { event: { contains: search as string, mode: "insensitive" } },
        ];
      }

      const signatureEvents = await prisma.signatureAuditLog.findMany({
        where: sigWhere,
        orderBy: { createdAt: "desc" },
        take: limitNum,
      });

      const eventLabels: Record<string, string> = {
        "document.created": "Document created",
        "document.sent": "Document sent",
        "document.viewed": "Document viewed",
        "recipient.signed": "Document signed",
        "recipient.declined": "Signature declined",
        "document.completed": "Document completed",
        "document.voided": "Document voided",
      };

      for (const sig of signatureEvents) {
        events.push({
          id: `sig-${sig.id}`,
          type: "signature",
          title: eventLabels[sig.event] || sig.event,
          description: sig.recipientEmail || "Signature event",
          timestamp: sig.createdAt.toISOString(),
          investorEmail: sig.recipientEmail || undefined,
          metadata: {
            status: sig.event,
            ipAddress: sig.ipAddress || undefined,
            country: sig.country || undefined,
            city: sig.city || undefined,
          },
        });
      }
    }

    events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    const finalEvents = events.slice(0, limitNum);

    if (format === "csv") {
      const csvRows = [
        ["Timestamp", "Type", "Title", "Description", "Investor Email", "IP Address", "Country", "City"].join(","),
        ...finalEvents.map((e) => [
          new Date(e.timestamp).toISOString(),
          e.type,
          `"${(e.title || "").replace(/"/g, '""')}"`,
          `"${(e.description || "").replace(/"/g, '""')}"`,
          e.investorEmail || "",
          e.metadata?.ipAddress || "",
          e.metadata?.country || "",
          e.metadata?.city || "",
        ].join(",")),
      ];
      
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename=investor-timeline-${new Date().toISOString().split("T")[0]}.csv`);
      return res.status(200).send(csvRows.join("\n"));
    }

    return res.status(200).json({
      events: finalEvents,
      total: events.length,
    });
  } catch (error: any) {
    console.error("Admin timeline fetch error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
