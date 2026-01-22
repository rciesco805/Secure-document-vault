import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { format } from "date-fns";

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

    const { teamId } = req.query;
    const { documentId, startDate, endDate, format: exportFormat } = req.query;

    if (!teamId || typeof teamId !== "string") {
      return res.status(400).json({ message: "Team ID required" });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        teams: {
          where: { teamId },
          include: { team: true },
        },
      },
    });

    if (!user?.teams?.[0]) {
      return res.status(403).json({ message: "Not a member of this team" });
    }

    const userRole = user.teams[0].role;
    if (!["ADMIN", "OWNER"].includes(userRole)) {
      return res.status(403).json({ message: "Admin access required" });
    }

    const whereClause: any = {};

    if (documentId && typeof documentId === "string") {
      whereClause.documentId = documentId;
    }

    if (startDate && typeof startDate === "string") {
      whereClause.createdAt = {
        ...whereClause.createdAt,
        gte: new Date(startDate),
      };
    }

    if (endDate && typeof endDate === "string") {
      whereClause.createdAt = {
        ...whereClause.createdAt,
        lte: new Date(endDate + "T23:59:59.999Z"),
      };
    }

    const documents = await prisma.signatureDocument.findMany({
      where: { teamId },
      select: { id: true, title: true },
    });

    const documentMap = new Map(documents.map((d) => [d.id, d.title]));

    if (!documentId) {
      whereClause.documentId = { in: documents.map((d) => d.id) };
    }

    // @ts-ignore - Model exists in schema
    const auditLogs = await prisma.signatureAuditLog.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      take: 10000,
    });

    if (exportFormat === "csv") {
      const csvRows = [
        [
          "Timestamp",
          "Document",
          "Event",
          "Recipient Email",
          "IP Address",
          "User Agent",
        ].join(","),
      ];

      for (const log of auditLogs) {
        const row = [
          format(new Date(log.createdAt), "yyyy-MM-dd HH:mm:ss"),
          `"${(documentMap.get(log.documentId) || log.documentId).replace(/"/g, '""')}"`,
          log.event,
          log.recipientEmail || "",
          log.ipAddress || "",
          `"${(log.userAgent || "").replace(/"/g, '""').substring(0, 100)}"`,
        ];
        csvRows.push(row.join(","));
      }

      const csv = csvRows.join("\n");

      res.setHeader("Content-Type", "text/csv");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="signature-audit-${format(new Date(), "yyyy-MM-dd")}.csv"`
      );
      return res.status(200).send(csv);
    }

    if (exportFormat === "pdf") {
      let html = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Signature Audit Report</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 40px; }
            h1 { color: #059669; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; }
            th { background-color: #f3f4f6; }
            .header { display: flex; justify-content: space-between; align-items: center; }
            .meta { color: #666; font-size: 14px; }
            .footer { margin-top: 40px; font-size: 12px; color: #666; border-top: 1px solid #ddd; padding-top: 20px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Signature Audit Report</h1>
          </div>
          <p class="meta">Generated: ${format(new Date(), "MMMM d, yyyy 'at' h:mm a")}</p>
          <p class="meta">Total Events: ${auditLogs.length}</p>
          
          <table>
            <tr>
              <th>Timestamp</th>
              <th>Document</th>
              <th>Event</th>
              <th>Recipient</th>
              <th>IP Address</th>
            </tr>
      `;

      for (const log of auditLogs.slice(0, 500)) {
        html += `
          <tr>
            <td>${format(new Date(log.createdAt), "MMM d, yyyy HH:mm:ss")}</td>
            <td>${documentMap.get(log.documentId) || log.documentId}</td>
            <td>${log.event}</td>
            <td>${log.recipientEmail || "-"}</td>
            <td>${log.ipAddress || "-"}</td>
          </tr>
        `;
      }

      html += `
          </table>
          <div class="footer">
            <p><strong>SEC 506(c) Compliance Notice:</strong> This audit trail is maintained for regulatory compliance purposes. 
            All signature events are logged with full IP address, timestamp, and user agent information to establish 
            "reasonable steps" verification of accredited investor status.</p>
            <p>Report generated by BF Fund Sign - ${format(new Date(), "yyyy-MM-dd'T'HH:mm:ss'Z'")}</p>
          </div>
        </body>
        </html>
      `;

      res.setHeader("Content-Type", "text/html");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="signature-audit-${format(new Date(), "yyyy-MM-dd")}.html"`
      );
      return res.status(200).send(html);
    }

    return res.status(200).json({
      auditLogs: auditLogs.map((log: any) => ({
        ...log,
        documentTitle: documentMap.get(log.documentId),
      })),
      totalCount: auditLogs.length,
      exportedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Export audit error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
