import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/pages/api/auth/[...nextauth]";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "50mb",
    },
  },
};

interface ImportData {
  metadata: {
    exportedAt: string;
    exportedBy: string;
    teamId: string;
    schemaVersion: string;
    modelCounts: Record<string, number>;
  };
  data: {
    funds?: any[];
    investors?: any[];
    investments?: any[];
    capitalCalls?: any[];
    capitalCallResponses?: any[];
    distributions?: any[];
    fundReports?: any[];
    investorNotes?: any[];
    investorDocuments?: any[];
    accreditationAcks?: any[];
    bankLinks?: any[];
    transactions?: any[];
    subscriptions?: any[];
  };
}

interface ImportResult {
  success: boolean;
  imported: Record<string, number>;
  skipped: Record<string, number>;
  errors: { model: string; error: string }[];
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const session = await getServerSession(req, res, authOptions);

    if (!session?.user?.email) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { teamId, data, dryRun } = req.body;

    if (!teamId || typeof teamId !== "string") {
      return res.status(400).json({ message: "Team ID required" });
    }

    if (!data || typeof data !== "object") {
      return res.status(400).json({ message: "Import data required" });
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

    const importData = data as ImportData;
    const result: ImportResult = {
      success: true,
      imported: {},
      skipped: {},
      errors: [],
    };

    const idMappings: Record<string, Record<string, string>> = {
      funds: {},
      investors: {},
      capitalCalls: {},
      distributions: {},
    };

    if (importData.data.funds && importData.data.funds.length > 0) {
      result.imported.funds = 0;
      result.skipped.funds = 0;

      for (const fund of importData.data.funds) {
        try {
          const existing = await prisma.fund.findFirst({
            where: { teamId, name: fund.name },
          });

          if (existing) {
            idMappings.funds[fund.id] = existing.id;
            result.skipped.funds++;
            continue;
          }

          if (!dryRun) {
            const created = await prisma.fund.create({
              data: {
                teamId,
                name: fund.name,
                description: fund.description,
                targetRaise: fund.targetRaise,
                minimumInvestment: fund.minimumInvestment,
                currentRaise: fund.currentRaise || 0,
                status: fund.status || "RAISING",
                closingDate: fund.closingDate ? new Date(fund.closingDate) : null,
                ndaGateEnabled: fund.ndaGateEnabled ?? true,
              },
            });
            idMappings.funds[fund.id] = created.id;
          }
          result.imported.funds++;
        } catch (err: any) {
          result.errors.push({ model: "fund", error: err.message });
        }
      }
    }

    if (importData.data.investors && importData.data.investors.length > 0) {
      result.imported.investors = 0;
      result.skipped.investors = 0;

      for (const investor of importData.data.investors) {
        try {
          const existing = await prisma.investor.findUnique({
            where: { id: investor.id },
          });

          if (existing) {
            idMappings.investors[investor.id] = existing.id;
            result.skipped.investors++;
            continue;
          }

          const existingByUser = await prisma.investor.findUnique({
            where: { userId: investor.userId },
          });

          if (existingByUser) {
            idMappings.investors[investor.id] = existingByUser.id;
            result.skipped.investors++;
            continue;
          }

          if (!dryRun) {
            const userExists = await prisma.user.findUnique({
              where: { id: investor.userId },
            });

            if (!userExists) {
              result.skipped.investors++;
              continue;
            }

            const created = await prisma.investor.create({
              data: {
                userId: investor.userId,
                entityName: investor.entityName,
                entityType: investor.entityType || "INDIVIDUAL",
                taxId: investor.taxId,
                address: investor.address,
                phone: investor.phone,
                accreditationStatus: investor.accreditationStatus || "PENDING",
                accreditationType: investor.accreditationType,
                ndaSigned: investor.ndaSigned ?? false,
                onboardingStep: investor.onboardingStep || 0,
              },
            });
            idMappings.investors[investor.id] = created.id;
          }
          result.imported.investors++;
        } catch (err: any) {
          result.errors.push({ model: "investor", error: err.message });
        }
      }
    }

    if (importData.data.investments && importData.data.investments.length > 0) {
      result.imported.investments = 0;
      result.skipped.investments = 0;

      for (const investment of importData.data.investments) {
        try {
          const fundId = idMappings.funds[investment.fundId] || investment.fundId;
          const investorId = idMappings.investors[investment.investorId] || investment.investorId;

          const existing = await prisma.investment.findUnique({
            where: { fundId_investorId: { fundId, investorId } },
          });

          if (existing) {
            result.skipped.investments++;
            continue;
          }

          if (!dryRun) {
            await prisma.investment.create({
              data: {
                fundId,
                investorId,
                commitmentAmount: investment.commitmentAmount,
                fundedAmount: investment.fundedAmount || 0,
                status: investment.status || "COMMITTED",
                subscriptionDate: investment.subscriptionDate
                  ? new Date(investment.subscriptionDate)
                  : null,
              },
            });
          }
          result.imported.investments++;
        } catch (err: any) {
          result.errors.push({ model: "investment", error: err.message });
        }
      }
    }

    if (importData.data.capitalCalls && importData.data.capitalCalls.length > 0) {
      result.imported.capitalCalls = 0;
      result.skipped.capitalCalls = 0;

      for (const call of importData.data.capitalCalls) {
        try {
          const fundId = idMappings.funds[call.fundId] || call.fundId;

          const existing = await prisma.capitalCall.findFirst({
            where: { fundId, callNumber: call.callNumber },
          });

          if (existing) {
            idMappings.capitalCalls[call.id] = existing.id;
            result.skipped.capitalCalls++;
            continue;
          }

          if (!dryRun) {
            const created = await prisma.capitalCall.create({
              data: {
                fundId,
                callNumber: call.callNumber,
                amount: call.amount,
                purpose: call.purpose,
                dueDate: new Date(call.dueDate),
                status: call.status || "PENDING",
              },
            });
            idMappings.capitalCalls[call.id] = created.id;
          }
          result.imported.capitalCalls++;
        } catch (err: any) {
          result.errors.push({ model: "capitalCall", error: err.message });
        }
      }
    }

    if (importData.data.distributions && importData.data.distributions.length > 0) {
      result.imported.distributions = 0;
      result.skipped.distributions = 0;

      for (const dist of importData.data.distributions) {
        try {
          const fundId = idMappings.funds[dist.fundId] || dist.fundId;

          const existing = await prisma.distribution.findFirst({
            where: { fundId, distributionNumber: dist.distributionNumber },
          });

          if (existing) {
            idMappings.distributions[dist.id] = existing.id;
            result.skipped.distributions++;
            continue;
          }

          if (!dryRun) {
            const created = await prisma.distribution.create({
              data: {
                fundId,
                distributionNumber: dist.distributionNumber,
                totalAmount: dist.totalAmount,
                distributionType: dist.distributionType || "DIVIDEND",
                distributionDate: new Date(dist.distributionDate),
                status: dist.status || "PENDING",
              },
            });
            idMappings.distributions[dist.id] = created.id;
          }
          result.imported.distributions++;
        } catch (err: any) {
          result.errors.push({ model: "distribution", error: err.message });
        }
      }
    }

    if (importData.data.transactions && importData.data.transactions.length > 0) {
      result.imported.transactions = 0;
      result.skipped.transactions = 0;

      for (const tx of importData.data.transactions) {
        try {
          const investorId = idMappings.investors[tx.investorId] || tx.investorId;

          if (!dryRun) {
            await prisma.transaction.create({
              data: {
                investorId,
                type: tx.type,
                amount: tx.amount,
                currency: tx.currency || "USD",
                description: tx.description,
                capitalCallId: tx.capitalCallId
                  ? idMappings.capitalCalls[tx.capitalCallId] || tx.capitalCallId
                  : null,
                distributionId: tx.distributionId
                  ? idMappings.distributions[tx.distributionId] || tx.distributionId
                  : null,
                fundId: tx.fundId ? idMappings.funds[tx.fundId] || tx.fundId : null,
                status: tx.status || "PENDING",
                statusMessage: tx.statusMessage,
              },
            });
          }
          result.imported.transactions++;
        } catch (err: any) {
          result.errors.push({ model: "transaction", error: err.message });
        }
      }
    }

    if (importData.data.subscriptions && importData.data.subscriptions.length > 0) {
      result.imported.subscriptions = 0;
      result.skipped.subscriptions = 0;

      for (const sub of importData.data.subscriptions) {
        try {
          const investorId = idMappings.investors[sub.investorId] || sub.investorId;
          const fundId = sub.fundId ? idMappings.funds[sub.fundId] || sub.fundId : null;

          const existing = await prisma.subscription.findFirst({
            where: { investorId, signatureDocumentId: sub.signatureDocumentId },
          });

          if (existing) {
            result.skipped.subscriptions++;
            continue;
          }

          if (!dryRun) {
            await prisma.subscription.create({
              data: {
                investorId,
                fundId,
                signatureDocumentId: sub.signatureDocumentId,
                amount: sub.amount,
                status: sub.status || "PENDING",
              },
            });
          }
          result.imported.subscriptions++;
        } catch (err: any) {
          result.errors.push({ model: "subscription", error: err.message });
        }
      }
    }

    await prisma.auditLog.create({
      data: {
        eventType: "DATA_IMPORT",
        userId: user.id,
        teamId,
        resourceType: "TEAM_DATA",
        resourceId: teamId,
        ipAddress: (req.headers["x-forwarded-for"] as string)?.split(",")[0] || req.socket.remoteAddress || "",
        userAgent: req.headers["user-agent"] || "",
        metadata: {
          dryRun: dryRun || false,
          imported: result.imported,
          skipped: result.skipped,
          errorCount: result.errors.length,
        },
      },
    }).catch(() => {});

    result.success = result.errors.length === 0;

    return res.status(200).json(result);
  } catch (error: any) {
    console.error("Import error:", error);
    return res.status(500).json({ message: "Internal server error", error: error.message });
  }
}
