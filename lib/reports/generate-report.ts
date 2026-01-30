import prisma from "@/lib/prisma";
import { ReportType, Prisma } from "@prisma/client";

interface GenerateReportParams {
  teamId: string;
  reportType: ReportType;
  config?: Prisma.JsonValue;
}

interface ReportConfig {
  dateRange?: {
    start?: string;
    end?: string;
  };
  filters?: Record<string, unknown>;
  groupBy?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  limit?: number;
}

export async function generateReportData({
  teamId,
  reportType,
  config,
}: GenerateReportParams): Promise<Prisma.JsonValue> {
  const reportConfig = (config as ReportConfig) || {};
  const { dateRange, limit = 1000 } = reportConfig;

  const dateFilter: { gte?: Date; lte?: Date } = {};
  if (dateRange?.start) {
    dateFilter.gte = new Date(dateRange.start);
  }
  if (dateRange?.end) {
    dateFilter.lte = new Date(dateRange.end);
  }

  switch (reportType) {
    case "INVESTOR_SUMMARY":
      return generateInvestorSummary(teamId, dateFilter, limit);

    case "CAPITAL_ACTIVITY":
      return generateCapitalActivity(teamId, dateFilter, limit);

    case "DOCUMENT_ANALYTICS":
      return generateDocumentAnalytics(teamId, dateFilter, limit);

    case "VISITOR_ANALYTICS":
      return generateVisitorAnalytics(teamId, dateFilter, limit);

    case "SIGNATURE_STATUS":
      return generateSignatureStatus(teamId, dateFilter, limit);

    case "FUND_PERFORMANCE":
      return generateFundPerformance(teamId, dateFilter);

    case "COMPLIANCE_AUDIT":
      return generateComplianceAudit(teamId, dateFilter, limit);

    case "CUSTOM":
      return generateCustomReport(teamId, reportConfig);

    default:
      throw new Error(`Unknown report type: ${reportType}`);
  }
}

async function generateInvestorSummary(
  teamId: string,
  dateFilter: { gte?: Date; lte?: Date },
  limit: number
): Promise<Prisma.JsonValue> {
  const investors = await prisma.investor.findMany({
    where: {
      fund: { teamId },
      ...(dateFilter.gte || dateFilter.lte ? { createdAt: dateFilter } : {}),
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      fund: {
        select: {
          id: true,
          name: true,
        },
      },
      investments: true,
    },
    take: limit,
    orderBy: { createdAt: "desc" },
  });

  const summary = {
    totalInvestors: investors.length,
    byAccreditationStatus: {} as Record<string, number>,
    totalCommitment: 0,
    investors: investors.map((inv) => ({
      id: inv.id,
      name: inv.user?.name || inv.entityName || "Unknown",
      email: inv.user?.email,
      accreditationStatus: inv.accreditationStatus,
      entityType: inv.entityType,
      createdAt: inv.createdAt,
      fundName: inv.fund?.name,
      investmentCount: inv.investments?.length || 0,
    })),
  };

  investors.forEach((inv) => {
    const accStatus = inv.accreditationStatus || "UNKNOWN";
    summary.byAccreditationStatus[accStatus] =
      (summary.byAccreditationStatus[accStatus] || 0) + 1;
  });

  return summary as unknown as Prisma.JsonValue;
}

async function generateCapitalActivity(
  teamId: string,
  dateFilter: { gte?: Date; lte?: Date },
  limit: number
): Promise<Prisma.JsonValue> {
  const [capitalCalls, distributions] = await Promise.all([
    prisma.capitalCall.findMany({
      where: {
        fund: { teamId },
        ...(dateFilter.gte || dateFilter.lte ? { createdAt: dateFilter } : {}),
      },
      include: {
        fund: { select: { id: true, name: true } },
      },
      take: limit,
      orderBy: { createdAt: "desc" },
    }),
    prisma.distribution.findMany({
      where: {
        fund: { teamId },
        ...(dateFilter.gte || dateFilter.lte ? { createdAt: dateFilter } : {}),
      },
      include: {
        fund: { select: { id: true, name: true } },
      },
      take: limit,
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const totalCalled = capitalCalls.reduce(
    (sum, cc) => sum + Number(cc.amount || 0),
    0
  );
  const totalDistributed = distributions.reduce(
    (sum, d) => sum + Number(d.totalAmount || 0),
    0
  );

  return {
    summary: {
      totalCapitalCalls: capitalCalls.length,
      totalDistributions: distributions.length,
      totalCalled,
      totalDistributed,
      netCashFlow: totalDistributed - totalCalled,
    },
    capitalCalls: capitalCalls.map((cc) => ({
      id: cc.id,
      fundName: cc.fund?.name,
      dueDate: cc.dueDate,
      amount: cc.amount,
      status: cc.status,
      callNumber: cc.callNumber,
    })),
    distributions: distributions.map((d) => ({
      id: d.id,
      fundName: d.fund?.name,
      distributionDate: d.distributionDate,
      totalAmount: d.totalAmount,
      distributionType: d.distributionType,
      distributionNumber: d.distributionNumber,
    })),
  } as unknown as Prisma.JsonValue;
}

async function generateDocumentAnalytics(
  teamId: string,
  dateFilter: { gte?: Date; lte?: Date },
  limit: number
): Promise<Prisma.JsonValue> {
  const documents = await prisma.document.findMany({
    where: {
      teamId,
      ...(dateFilter.gte || dateFilter.lte ? { createdAt: dateFilter } : {}),
    },
    include: {
      _count: {
        select: {
          views: true,
          versions: true,
        },
      },
    },
    take: limit,
    orderBy: { createdAt: "desc" },
  });

  const views = await prisma.view.findMany({
    where: {
      document: { teamId },
      ...(dateFilter.gte || dateFilter.lte ? { viewedAt: dateFilter } : {}),
    },
    select: {
      id: true,
      viewedAt: true,
      documentId: true,
    },
    take: limit * 10,
    orderBy: { viewedAt: "desc" },
  });

  const totalViews = views.length;

  return {
    summary: {
      totalDocuments: documents.length,
      totalViews,
    },
    documents: documents.map((doc) => ({
      id: doc.id,
      name: doc.name,
      type: doc.type,
      createdAt: doc.createdAt,
      viewCount: doc._count.views,
      versionCount: doc._count.versions,
    })),
    recentViews: views.slice(0, 100).map((v) => ({
      id: v.id,
      documentId: v.documentId,
      viewedAt: v.viewedAt,
    })),
  } as unknown as Prisma.JsonValue;
}

async function generateVisitorAnalytics(
  teamId: string,
  dateFilter: { gte?: Date; lte?: Date },
  limit: number
): Promise<Prisma.JsonValue> {
  const visitors = await prisma.viewer.findMany({
    where: {
      teamId,
      ...(dateFilter.gte || dateFilter.lte ? { createdAt: dateFilter } : {}),
    },
    include: {
      _count: {
        select: {
          views: true,
        },
      },
    },
    take: limit,
    orderBy: { createdAt: "desc" },
  });

  const views = await prisma.view.findMany({
    where: {
      link: { document: { teamId } },
      ...(dateFilter.gte || dateFilter.lte ? { viewedAt: dateFilter } : {}),
    },
    select: {
      id: true,
      viewerEmail: true,
      viewedAt: true,
      verified: true,
    },
    take: limit * 5,
    orderBy: { viewedAt: "desc" },
  });

  const uniqueEmails = new Set(views.map((v) => v.viewerEmail).filter(Boolean));
  const verifiedViews = views.filter((v) => v.verified).length;

  return {
    summary: {
      totalVisitors: visitors.length,
      totalViews: views.length,
      uniqueViewerEmails: uniqueEmails.size,
      verifiedViews,
      verificationRate:
        views.length > 0
          ? Math.round((verifiedViews / views.length) * 100)
          : 0,
    },
    visitors: visitors.map((v) => ({
      id: v.id,
      email: v.email,
      createdAt: v.createdAt,
      viewCount: v._count.views,
    })),
    recentViews: views.slice(0, 100).map((v) => ({
      id: v.id,
      email: v.viewerEmail,
      viewedAt: v.viewedAt,
      verified: v.verified,
    })),
  } as unknown as Prisma.JsonValue;
}

async function generateSignatureStatus(
  teamId: string,
  dateFilter: { gte?: Date; lte?: Date },
  limit: number
): Promise<Prisma.JsonValue> {
  const signatureDocuments = await prisma.signatureDocument.findMany({
    where: {
      teamId,
      ...(dateFilter.gte || dateFilter.lte ? { createdAt: dateFilter } : {}),
    },
    include: {
      recipients: {
        select: {
          id: true,
          email: true,
          name: true,
          status: true,
          signedAt: true,
        },
      },
    },
    take: limit,
    orderBy: { createdAt: "desc" },
  });

  const statusCounts: Record<string, number> = {};

  signatureDocuments.forEach((sd) => {
    const status = sd.status;
    statusCounts[status] = (statusCounts[status] || 0) + 1;
  });

  const totalRecipients = signatureDocuments.reduce(
    (sum, sd) => sum + sd.recipients.length,
    0
  );
  const signedRecipients = signatureDocuments.reduce(
    (sum, sd) => sum + sd.recipients.filter((r) => r.signedAt).length,
    0
  );

  return {
    summary: {
      totalDocuments: signatureDocuments.length,
      byStatus: statusCounts,
      totalRecipients,
      signedRecipients,
      completionRate:
        totalRecipients > 0
          ? Math.round((signedRecipients / totalRecipients) * 100)
          : 0,
    },
    documents: signatureDocuments.map((sd) => ({
      id: sd.id,
      title: sd.title,
      status: sd.status,
      createdAt: sd.createdAt,
      expirationDate: sd.expirationDate,
      recipientCount: sd.recipients.length,
      signedCount: sd.recipients.filter((r) => r.signedAt).length,
      recipients: sd.recipients.map((r) => ({
        email: r.email,
        name: r.name,
        status: r.status,
        signedAt: r.signedAt,
      })),
    })),
  } as unknown as Prisma.JsonValue;
}

async function generateFundPerformance(
  teamId: string,
  dateFilter: { gte?: Date; lte?: Date }
): Promise<Prisma.JsonValue> {
  const funds = await prisma.fund.findMany({
    where: {
      teamId,
      ...(dateFilter.gte || dateFilter.lte ? { createdAt: dateFilter } : {}),
    },
    include: {
      investors: true,
      capitalCalls: true,
      distributions: true,
    },
  });

  return {
    summary: {
      totalFunds: funds.length,
    },
    funds: funds.map((fund) => {
      const investorCount = fund.investors.length;
      const totalCalled = fund.capitalCalls.reduce(
        (sum: number, cc) => sum + Number(cc.amount || 0),
        0
      );
      const totalDistributed = fund.distributions.reduce(
        (sum: number, d) => sum + Number(d.totalAmount || 0),
        0
      );

      return {
        id: fund.id,
        name: fund.name,
        status: fund.status,
        investorCount,
        totalCalled,
        totalDistributed,
        netCashFlow: totalDistributed - totalCalled,
      };
    }),
  } as unknown as Prisma.JsonValue;
}

async function generateComplianceAudit(
  teamId: string,
  dateFilter: { gte?: Date; lte?: Date },
  limit: number
): Promise<Prisma.JsonValue> {
  const investors = await prisma.investor.findMany({
    where: {
      fund: { teamId },
    },
    select: {
      id: true,
      entityName: true,
      accreditationStatus: true,
      accreditationExpiresAt: true,
      entityType: true,
      personaStatus: true,
      createdAt: true,
      user: {
        select: {
          email: true,
        },
      },
    },
    take: limit,
    orderBy: { createdAt: "desc" },
  });

  const auditLogs = await prisma.auditLog.findMany({
    where: {
      teamId,
      ...(dateFilter.gte || dateFilter.lte ? { createdAt: dateFilter } : {}),
    },
    select: {
      id: true,
      eventType: true,
      resourceType: true,
      resourceId: true,
      createdAt: true,
      userId: true,
    },
    take: limit,
    orderBy: { createdAt: "desc" },
  });

  const accreditationExpiringSoon = investors.filter((inv) => {
    if (!inv.accreditationExpiresAt) return false;
    const expiresIn =
      new Date(inv.accreditationExpiresAt).getTime() - Date.now();
    const thirtyDays = 30 * 24 * 60 * 60 * 1000;
    return expiresIn > 0 && expiresIn < thirtyDays;
  });

  const pendingKyc = investors.filter(
    (inv) => inv.personaStatus === "PENDING" || inv.personaStatus === "NEEDS_REVIEW"
  );

  return {
    summary: {
      totalInvestors: investors.length,
      accreditedCount: investors.filter(
        (i) => i.accreditationStatus === "VERIFIED" || i.accreditationStatus === "KYC_VERIFIED"
      ).length,
      accreditationExpiringSoon: accreditationExpiringSoon.length,
      pendingKycCount: pendingKyc.length,
      auditLogCount: auditLogs.length,
    },
    accreditationExpiring: accreditationExpiringSoon.map((inv) => ({
      id: inv.id,
      name: inv.entityName,
      email: inv.user?.email,
      expiresAt: inv.accreditationExpiresAt,
    })),
    pendingKyc: pendingKyc.map((inv) => ({
      id: inv.id,
      name: inv.entityName,
      email: inv.user?.email,
      personaStatus: inv.personaStatus,
    })),
    recentAuditLogs: auditLogs.slice(0, 50).map((log) => ({
      id: log.id,
      eventType: log.eventType,
      resourceType: log.resourceType,
      resourceId: log.resourceId,
      createdAt: log.createdAt,
    })),
  } as unknown as Prisma.JsonValue;
}

async function generateCustomReport(
  teamId: string,
  config: ReportConfig
): Promise<Prisma.JsonValue> {
  return {
    message: "Custom reports require specific configuration",
    teamId,
    config,
    generatedAt: new Date().toISOString(),
  } as unknown as Prisma.JsonValue;
}
