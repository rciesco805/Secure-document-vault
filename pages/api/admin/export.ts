import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { format } from "date-fns";

export const config = {
  api: {
    responseLimit: false,
  },
};

const EXPORTABLE_MODELS = [
  "fund",
  "fundAggregate",
  "investor",
  "investment",
  "capitalCall",
  "capitalCallResponse",
  "distribution",
  "fundReport",
  "investorNote",
  "investorDocument",
  "accreditationAck",
  "bankLink",
  "transaction",
  "subscription",
  "viewAudit",
  "signatureAudit",
  "auditLog",
  "signatureConsent",
] as const;

type ExportableModel = (typeof EXPORTABLE_MODELS)[number];

interface ExportData {
  metadata: {
    exportedAt: string;
    exportedBy: string;
    teamId: string;
    schemaVersion: string;
    modelCounts: Record<string, number>;
  };
  data: Record<string, any[]>;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const session = await getServerSession(req, res, authOptions);

    if (!session?.user?.email) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { teamId, models, format: exportFormat } = req.method === "GET" ? req.query : req.body;

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

    const modelsToExport: ExportableModel[] = models
      ? (Array.isArray(models) ? models : [models]).filter((m: string) =>
          EXPORTABLE_MODELS.includes(m as ExportableModel)
        )
      : [...EXPORTABLE_MODELS];

    const exportData: ExportData = {
      metadata: {
        exportedAt: new Date().toISOString(),
        exportedBy: session.user.email,
        teamId,
        schemaVersion: "1.0.0",
        modelCounts: {},
      },
      data: {},
    };

    const funds = await prisma.fund.findMany({
      where: { teamId },
    });
    const fundIds = funds.map((f) => f.id);

    const investorIds: string[] = [];

    if (modelsToExport.includes("fund")) {
      exportData.data.funds = funds;
      exportData.metadata.modelCounts.funds = funds.length;
    }

    if (modelsToExport.includes("fundAggregate")) {
      const aggregates = await prisma.fundAggregate.findMany({
        where: { fundId: { in: fundIds } },
      });
      exportData.data.fundAggregates = aggregates;
      exportData.metadata.modelCounts.fundAggregates = aggregates.length;
    }

    if (modelsToExport.includes("investment")) {
      const investments = await prisma.investment.findMany({
        where: { fundId: { in: fundIds } },
      });
      exportData.data.investments = investments;
      exportData.metadata.modelCounts.investments = investments.length;
      investorIds.push(...investments.map((i) => i.investorId));
    }

    const uniqueInvestorIds = [...new Set(investorIds)];

    if (modelsToExport.includes("investor") && uniqueInvestorIds.length > 0) {
      const investors = await prisma.investor.findMany({
        where: { id: { in: uniqueInvestorIds } },
      });
      exportData.data.investors = investors;
      exportData.metadata.modelCounts.investors = investors.length;
    }

    if (modelsToExport.includes("capitalCall")) {
      const capitalCalls = await prisma.capitalCall.findMany({
        where: { fundId: { in: fundIds } },
      });
      exportData.data.capitalCalls = capitalCalls;
      exportData.metadata.modelCounts.capitalCalls = capitalCalls.length;
    }

    if (modelsToExport.includes("capitalCallResponse")) {
      const responses = await prisma.capitalCallResponse.findMany({
        where: { investorId: { in: uniqueInvestorIds } },
      });
      exportData.data.capitalCallResponses = responses;
      exportData.metadata.modelCounts.capitalCallResponses = responses.length;
    }

    if (modelsToExport.includes("distribution")) {
      const distributions = await prisma.distribution.findMany({
        where: { fundId: { in: fundIds } },
      });
      exportData.data.distributions = distributions;
      exportData.metadata.modelCounts.distributions = distributions.length;
    }

    if (modelsToExport.includes("fundReport")) {
      const reports = await prisma.fundReport.findMany({
        where: { fundId: { in: fundIds } },
      });
      exportData.data.fundReports = reports;
      exportData.metadata.modelCounts.fundReports = reports.length;
    }

    if (modelsToExport.includes("investorNote")) {
      const notes = await prisma.investorNote.findMany({
        where: { teamId },
      });
      exportData.data.investorNotes = notes;
      exportData.metadata.modelCounts.investorNotes = notes.length;
    }

    if (modelsToExport.includes("investorDocument") && uniqueInvestorIds.length > 0) {
      const docs = await prisma.investorDocument.findMany({
        where: { investorId: { in: uniqueInvestorIds } },
      });
      exportData.data.investorDocuments = docs;
      exportData.metadata.modelCounts.investorDocuments = docs.length;
    }

    if (modelsToExport.includes("accreditationAck") && uniqueInvestorIds.length > 0) {
      const acks = await prisma.accreditationAck.findMany({
        where: { investorId: { in: uniqueInvestorIds } },
      });
      exportData.data.accreditationAcks = acks;
      exportData.metadata.modelCounts.accreditationAcks = acks.length;
    }

    if (modelsToExport.includes("bankLink") && uniqueInvestorIds.length > 0) {
      const links = await prisma.bankLink.findMany({
        where: { investorId: { in: uniqueInvestorIds } },
        select: {
          id: true,
          investorId: true,
          plaidItemId: true,
          plaidAccountId: true,
          institutionId: true,
          institutionName: true,
          accountName: true,
          accountMask: true,
          accountType: true,
          accountSubtype: true,
          status: true,
          transferEnabled: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      exportData.data.bankLinks = links;
      exportData.metadata.modelCounts.bankLinks = links.length;
    }

    if (modelsToExport.includes("transaction") && uniqueInvestorIds.length > 0) {
      const transactions = await prisma.transaction.findMany({
        where: { investorId: { in: uniqueInvestorIds } },
      });
      exportData.data.transactions = transactions;
      exportData.metadata.modelCounts.transactions = transactions.length;
    }

    if (modelsToExport.includes("subscription") && uniqueInvestorIds.length > 0) {
      const subscriptions = await prisma.subscription.findMany({
        where: { investorId: { in: uniqueInvestorIds } },
      });
      exportData.data.subscriptions = subscriptions;
      exportData.metadata.modelCounts.subscriptions = subscriptions.length;
    }

    // Get team document IDs for view/signature audits
    const teamDocuments = await prisma.document.findMany({
      where: { teamId },
      select: { id: true },
    });
    const documentIds = teamDocuments.map((d) => d.id);

    if (modelsToExport.includes("viewAudit") && documentIds.length > 0) {
      const viewAudits = await prisma.view.findMany({
        where: { documentId: { in: documentIds } },
        select: {
          id: true,
          documentId: true,
          viewerEmail: true,
          viewerName: true,
          viewType: true,
          ipAddress: true,
          userAgent: true,
          geoCountry: true,
          geoCity: true,
          viewedAt: true,
        },
      });
      exportData.data.viewAudits = viewAudits;
      exportData.metadata.modelCounts.viewAudits = viewAudits.length;
    }

    if (modelsToExport.includes("signatureAudit") && documentIds.length > 0) {
      const signatureAudits = await prisma.signatureAuditLog.findMany({
        where: { documentId: { in: documentIds } },
        select: {
          id: true,
          documentId: true,
          recipientEmail: true,
          event: true,
          ipAddress: true,
          userAgent: true,
          metadata: true,
          createdAt: true,
        },
      });
      exportData.data.signatureAudits = signatureAudits;
      exportData.metadata.modelCounts.signatureAudits = signatureAudits.length;
    }

    if (modelsToExport.includes("auditLog")) {
      const auditLogs = await prisma.auditLog.findMany({
        where: { teamId },
        orderBy: { createdAt: "desc" },
        take: 10000, // Limit to last 10k logs
      });
      exportData.data.auditLogs = auditLogs;
      exportData.metadata.modelCounts.auditLogs = auditLogs.length;
    }

    // TODO: Add SignatureConsent model to schema when needed
    // if (modelsToExport.includes("signatureConsent") && documentIds.length > 0) {
    //   const consents = await prisma.signatureConsent.findMany({
    //     where: { documentId: { in: documentIds } },
    //   });
    //   exportData.data.signatureConsents = consents;
    //   exportData.metadata.modelCounts.signatureConsents = consents.length;
    // }

    await prisma.auditLog.create({
      data: {
        eventType: "DATA_EXPORT",
        userId: user.id,
        teamId,
        resourceType: "TEAM_DATA",
        resourceId: teamId,
        ipAddress: (req.headers["x-forwarded-for"] as string)?.split(",")[0] || req.socket.remoteAddress || "",
        userAgent: req.headers["user-agent"] || "",
        metadata: {
          models: modelsToExport,
          counts: exportData.metadata.modelCounts,
        },
      },
    }).catch(() => {});

    if (exportFormat === "csv") {
      const csvParts: string[] = [];

      for (const [modelName, records] of Object.entries(exportData.data)) {
        if (records.length === 0) continue;

        const headers = Object.keys(records[0]);
        csvParts.push(`# ${modelName.toUpperCase()}`);
        csvParts.push(headers.join(","));

        for (const record of records) {
          const row = headers.map((h) => {
            const val = record[h];
            if (val === null || val === undefined) return "";
            if (typeof val === "object") return `"${JSON.stringify(val).replace(/"/g, '""')}"`;
            return `"${String(val).replace(/"/g, '""')}"`;
          });
          csvParts.push(row.join(","));
        }
        csvParts.push("");
      }

      res.setHeader("Content-Type", "text/csv");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="fund-data-export-${format(new Date(), "yyyy-MM-dd")}.csv"`
      );
      return res.status(200).send(csvParts.join("\n"));
    }

    res.setHeader("Content-Type", "application/json");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="fund-data-export-${format(new Date(), "yyyy-MM-dd")}.json"`
    );
    return res.status(200).json(exportData);
  } catch (error: any) {
    console.error("Export error:", error);
    return res.status(500).json({ message: "Internal server error", error: error.message });
  }
}
