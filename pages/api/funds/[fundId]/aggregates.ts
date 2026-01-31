import { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/prisma";
import { getUserWithRole, requireRole } from "@/lib/auth/with-role";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { fundId } = req.query;

    if (!fundId || typeof fundId !== "string") {
      return res.status(400).json({ message: "Fund ID required" });
    }

    const result = await getUserWithRole(req, res);
    const roleCheck = requireRole(["GP"], result);

    if (!roleCheck.allowed) {
      return res.status(roleCheck.statusCode || 403).json({
        message: roleCheck.error,
      });
    }

    const user = result.user!;

    const fund = await prisma.fund.findFirst({
      where: {
        id: fundId,
        teamId: { in: user.teamIds },
      },
      include: {
        investments: {
          include: {
            investor: {
              select: {
                id: true,
                entityName: true,
                user: { select: { name: true, email: true } },
              },
            },
          },
        },
        capitalCalls: {
          include: {
            responses: true,
          },
        },
        distributions: true,
      },
    });

    if (!fund) {
      return res.status(404).json({ message: "Fund not found" });
    }

    const manualInvestments = await (prisma as any).manualInvestment.findMany({
      where: {
        fundId,
        status: "ACTIVE",
      },
    });

    const transactions = await prisma.transaction.findMany({
      where: { fundId },
    });

    const platformCommitments = fund.investments.reduce(
      (sum, inv) => sum + Number(inv.commitmentAmount),
      0
    );
    const manualCommitments = manualInvestments.reduce(
      (sum: number, mi: any) => sum + Number(mi.commitmentAmount),
      0
    );
    const totalCommitments = platformCommitments + manualCommitments;

    const platformFunded = fund.investments.reduce(
      (sum, inv) => sum + Number(inv.fundedAmount),
      0
    );
    const manualFunded = manualInvestments.reduce(
      (sum: number, mi: any) => sum + Number(mi.fundedAmount),
      0
    );
    const totalFunded = platformFunded + manualFunded;

    const totalCapitalCalled = fund.capitalCalls.reduce(
      (sum, cc) => sum + Number(cc.amount),
      0
    );

    const totalDistributed = fund.distributions.reduce(
      (sum, d) => sum + Number(d.totalAmount),
      0
    );

    const completedTransactions = transactions.filter(
      (t) => t.status === "COMPLETED"
    );

    const totalInbound = completedTransactions
      .filter((t) => t.type === "CAPITAL_CALL")
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const totalOutbound = completedTransactions
      .filter((t) => t.type === "DISTRIBUTION")
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const pendingTransactions = transactions.filter(
      (t) => t.status === "PENDING" || t.status === "PROCESSING"
    );

    const totalInvestorCount = fund.investments.length + manualInvestments.length;

    return res.status(200).json({
      fund: {
        id: fund.id,
        name: fund.name,
        status: fund.status,
        targetRaise: fund.targetRaise.toString(),
        currentRaise: fund.currentRaise.toString(),
        closingDate: fund.closingDate,
      },
      aggregates: {
        totalCommitments: totalCommitments.toFixed(2),
        totalFunded: totalFunded.toFixed(2),
        totalCapitalCalled: totalCapitalCalled.toFixed(2),
        totalDistributed: totalDistributed.toFixed(2),
        totalInbound: totalInbound.toFixed(2),
        totalOutbound: totalOutbound.toFixed(2),
        netCashFlow: (totalInbound - totalOutbound).toFixed(2),
        platformCommitments: platformCommitments.toFixed(2),
        manualCommitments: manualCommitments.toFixed(2),
      },
      investorCount: totalInvestorCount,
      manualInvestmentCount: manualInvestments.length,
      pendingTransactionCount: pendingTransactions.length,
      investors: fund.investments.map((inv) => ({
        id: inv.investor.id,
        name: inv.investor.entityName || inv.investor.user?.name,
        email: inv.investor.user?.email,
        commitment: inv.commitmentAmount.toString(),
        funded: inv.fundedAmount.toString(),
        status: inv.status,
      })),
      manualInvestments: manualInvestments.map((mi: any) => ({
        id: mi.id,
        investorId: mi.investorId,
        documentType: mi.documentType,
        documentTitle: mi.documentTitle,
        commitment: mi.commitmentAmount.toString(),
        funded: mi.fundedAmount.toString(),
        signedDate: mi.signedDate,
        status: mi.status,
      })),
    });
  } catch (error) {
    console.error("Error fetching fund aggregates:", error);
    return res.status(500).json({ message: "Failed to fetch fund aggregates" });
  }
}
