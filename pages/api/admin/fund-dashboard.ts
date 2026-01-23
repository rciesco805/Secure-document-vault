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
    const result = await getUserWithRole(req, res);
    const roleCheck = requireRole(["GP"], result);

    if (!roleCheck.allowed) {
      return res.status(roleCheck.statusCode || 403).json({
        message: roleCheck.error,
      });
    }

    const user = result.user!;

    if (!user.teamIds || user.teamIds.length === 0) {
      return res.status(200).json({
        funds: [],
        totals: {
          totalRaised: "0.00",
          totalDistributed: "0.00",
          totalCommitments: "0.00",
          totalInvestors: 0,
          totalFunds: 0,
        },
        chartData: [],
      });
    }

    const funds = await prisma.fund.findMany({
      where: { teamId: { in: user.teamIds } },
      include: {
        investments: true,
        distributions: true,
        capitalCalls: true,
      },
      orderBy: { createdAt: "desc" },
    });

    let totalRaised = 0;
    let totalDistributed = 0;
    let totalCommitments = 0;
    let totalInvestors = new Set<string>();

    const fundData = funds.map((fund) => {
      const commitments = fund.investments.reduce(
        (sum, inv) => sum + Number(inv.commitmentAmount),
        0
      );
      const funded = fund.investments.reduce(
        (sum, inv) => sum + Number(inv.fundedAmount),
        0
      );
      const distributed = fund.distributions.reduce(
        (sum, d) => sum + Number(d.totalAmount),
        0
      );

      totalRaised += funded;
      totalDistributed += distributed;
      totalCommitments += commitments;
      fund.investments.forEach((inv) => totalInvestors.add(inv.investorId));

      return {
        id: fund.id,
        name: fund.name,
        status: fund.status,
        targetRaise: Number(fund.targetRaise),
        currentRaise: Number(fund.currentRaise),
        commitments,
        funded,
        distributed,
        investorCount: fund.investments.length,
        capitalCallCount: fund.capitalCalls.length,
        distributionCount: fund.distributions.length,
        closingDate: fund.closingDate,
        progress: Number(fund.targetRaise) > 0
          ? Math.round((funded / Number(fund.targetRaise)) * 100)
          : 0,
      };
    });

    const chartData = fundData.map((f) => ({
      name: f.name.length > 15 ? f.name.slice(0, 15) + "..." : f.name,
      raised: f.funded,
      distributed: f.distributed,
      target: f.targetRaise,
    }));

    const fundIds = funds.map((f) => f.id);
    const transactions = await prisma.transaction.findMany({
      where: { fundId: { in: fundIds } },
      include: {
        investor: { select: { id: true, entityName: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    const transactionsByInvestor = await prisma.transaction.groupBy({
      by: ["investorId", "type"],
      where: { fundId: { in: fundIds } },
      _sum: { amount: true },
      _count: { id: true },
    });

    const investorIds = [...new Set(transactionsByInvestor.map((t) => t.investorId))];
    const investors = await prisma.investor.findMany({
      where: { id: { in: investorIds } },
      select: { id: true, entityName: true },
    });
    const investorMap = new Map(investors.map((i) => [i.id, i.entityName]));

    function anonymizeInvestor(investorId: string, entityName: string | null): string {
      const name = entityName || "Investor";
      if (name.length <= 3) return name[0] + "***";
      return name.slice(0, 2) + "***" + name.slice(-1);
    }

    const investorIdMap = new Map<string, string>();
    let investorCounter = 1;
    investorIds.forEach((id) => {
      investorIdMap.set(id, `INV-${String(investorCounter++).padStart(3, "0")}`);
    });

    const aggregatedTransactions = transactionsByInvestor.map((t) => ({
      investorId: investorIdMap.get(t.investorId) || "INV-000",
      investorName: anonymizeInvestor(t.investorId, investorMap.get(t.investorId) || null),
      type: t.type,
      totalAmount: Number(t._sum.amount || 0),
      count: t._count.id,
    }));

    const recentTransactions = transactions.slice(0, 50).map((t, index) => ({
      id: t.id,
      investorId: `INV-${String(index + 1).padStart(3, "0")}`,
      investorName: anonymizeInvestor(t.investorId, t.investor?.entityName || null),
      type: t.type,
      amount: Number(t.amount),
      status: t.status,
      createdAt: t.createdAt,
    }));

    return res.status(200).json({
      funds: fundData,
      totals: {
        totalRaised: totalRaised.toFixed(2),
        totalDistributed: totalDistributed.toFixed(2),
        totalCommitments: totalCommitments.toFixed(2),
        totalInvestors: totalInvestors.size,
        totalFunds: funds.length,
      },
      chartData,
      transactions: recentTransactions,
      transactionSummary: aggregatedTransactions,
    });
  } catch (error) {
    console.error("Error fetching fund dashboard:", error);
    return res.status(500).json({ message: "Failed to fetch fund dashboard" });
  }
}
