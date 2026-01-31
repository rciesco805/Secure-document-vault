import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import prisma from "@/lib/prisma";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { CustomUser } from "@/lib/types";

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
      return res.status(401).json({ message: "Not authenticated" });
    }

    const user = session.user as CustomUser;

    // Get user's team memberships with fundroom access flag
    const userTeams = await prisma.userTeam.findMany({
      where: { userId: user.id },
      select: {
        teamId: true,
        role: true,
        hasFundroomAccess: true,
      },
    });

    if (userTeams.length === 0) {
      return res.status(403).json({
        message: "You need to be a team member to access the fund dashboard",
      });
    }

    // Check if user has fundroom access (either explicitly or as super admin)
    const isSuperAdmin = userTeams.some((ut) => ut.role === "ADMIN");
    const hasFundroomAccess = userTeams.some((ut) => ut.hasFundroomAccess) || isSuperAdmin;

    if (!hasFundroomAccess) {
      return res.status(403).json({
        message: "You don't have access to the fundroom. Please contact your administrator.",
      });
    }

    const teamIds = userTeams.map((ut) => ut.teamId);

    const funds = await prisma.fund.findMany({
      where: { teamId: { in: teamIds } },
      include: {
        investments: true,
        distributions: true,
        capitalCalls: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const fundIds = funds.map((f) => f.id);
    const manualInvestments = await (prisma as any).manualInvestment.findMany({
      where: {
        fundId: { in: fundIds },
        status: "ACTIVE",
      },
    });

    const manualByFund = new Map<string, typeof manualInvestments>();
    manualInvestments.forEach((mi: any) => {
      if (!manualByFund.has(mi.fundId)) {
        manualByFund.set(mi.fundId, []);
      }
      manualByFund.get(mi.fundId)!.push(mi);
    });

    let totalRaised = 0;
    let totalDistributed = 0;
    let totalCommitments = 0;
    let totalInvestors = new Set<string>();

    const fundData = funds.map((fund) => {
      const fundManualInvestments = manualByFund.get(fund.id) || [];

      const platformCommitments = fund.investments.reduce(
        (sum, inv) => sum + Number(inv.commitmentAmount),
        0
      );
      const manualCommitments = fundManualInvestments.reduce(
        (sum: number, mi: any) => sum + Number(mi.commitmentAmount),
        0
      );
      const commitments = platformCommitments + manualCommitments;

      const platformFunded = fund.investments.reduce(
        (sum, inv) => sum + Number(inv.fundedAmount),
        0
      );
      const manualFunded = fundManualInvestments.reduce(
        (sum: number, mi: any) => sum + Number(mi.fundedAmount),
        0
      );
      const funded = platformFunded + manualFunded;

      const distributed = fund.distributions.reduce(
        (sum, d) => sum + Number(d.totalAmount),
        0
      );

      totalRaised += funded;
      totalDistributed += distributed;
      totalCommitments += commitments;
      fund.investments.forEach((inv) => totalInvestors.add(inv.investorId));
      fundManualInvestments.forEach((mi: any) => totalInvestors.add(mi.investorId));

      const fundInvestorIds = new Set<string>();
      fund.investments.forEach((inv) => fundInvestorIds.add(inv.investorId));
      fundManualInvestments.forEach((mi: any) => fundInvestorIds.add(mi.investorId));
      const totalInvestorCount = fundInvestorIds.size;

      return {
        id: fund.id,
        name: fund.name,
        status: fund.status,
        targetRaise: Number(fund.targetRaise),
        currentRaise: Number(fund.currentRaise),
        commitments,
        funded,
        distributed,
        investorCount: totalInvestorCount,
        capitalCallCount: fund.capitalCalls.length,
        distributionCount: fund.distributions.length,
        closingDate: fund.closingDate,
        progress: Number(fund.targetRaise) > 0
          ? Math.round((funded / Number(fund.targetRaise)) * 100)
          : 0,
        manualInvestmentCount: fundManualInvestments.length,
      };
    });

    const chartData = fundData.map((f) => ({
      name: f.name.length > 15 ? f.name.slice(0, 15) + "..." : f.name,
      raised: f.funded,
      distributed: f.distributed,
      target: f.targetRaise,
    }));

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

    const anonymizeInvestor = (investorId: string, entityName: string | null): string => {
      const name = entityName || "Investor";
      if (name.length <= 3) return name[0] + "***";
      return name.slice(0, 2) + "***" + name.slice(-1);
    };

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
