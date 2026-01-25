import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "../auth/[...nextauth]";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const session = await getServerSession(req, res, authOptions);

    if (!session?.user?.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { teams: true },
    });

    if (!user || user.role !== "GP") {
      return res.status(403).json({ message: "GP access required" });
    }

    const { fundId } = req.query;

    if (!fundId) {
      return res.status(400).json({ message: "Fund ID is required" });
    }

    const teamIds = user.teams.map((t) => t.teamId);

    const fund = await prisma.fund.findFirst({
      where: {
        id: fundId as string,
        teamId: { in: teamIds },
      },
      include: {
        aggregate: true,
      },
    });

    if (!fund) {
      return res.status(404).json({ message: "Fund not found" });
    }

    const investments = await prisma.investment.findMany({
      where: { fundId: fundId as string },
      include: {
        investor: {
          include: {
            user: { select: { name: true, email: true } },
          },
        },
      },
    });

    const capitalCalls = await prisma.capitalCall.findMany({
      where: { fundId: fundId as string },
      include: {
        responses: true,
      },
    });

    const distributions = await prisma.distribution.findMany({
      where: { fundId: fundId as string },
    });

    const transactions = await prisma.transaction.findMany({
      where: { fundId: fundId as string },
    });

    const totalCommitted = investments.reduce(
      (sum, inv) => sum + Number(inv.commitmentAmount),
      0
    );

    const totalCalled = capitalCalls.reduce(
      (sum, call) => sum + Number(call.amount),
      0
    );

    const totalFunded = investments.reduce(
      (sum, inv) => sum + Number(inv.fundedAmount),
      0
    );

    const totalDistributed = distributions.reduce(
      (sum, dist) => sum + Number(dist.totalAmount),
      0
    );

    const uncalledCapital = totalCommitted - totalCalled;
    const netPosition = totalFunded - totalDistributed;
    const fundedPercentage = totalCommitted > 0 ? (totalFunded / totalCommitted) * 100 : 0;

    const statusCounts: Record<string, { count: number; amount: number }> = {};
    for (const inv of investments) {
      const status = inv.status;
      if (!statusCounts[status]) {
        statusCounts[status] = { count: 0, amount: 0 };
      }
      statusCounts[status].count++;
      statusCounts[status].amount += Number(inv.commitmentAmount);
    }

    const byStatus = Object.entries(statusCounts).map(([status, data]) => ({
      status,
      count: data.count,
      amount: data.amount,
    }));

    const investorCapital = investments.map((inv) => {
      const calledAmount = capitalCalls.reduce((sum, call) => {
        const response = call.responses.find((r) => r.investorId === inv.investorId);
        return sum + (response ? Number(response.amountDue) : 0);
      }, 0);

      const fundedAmount = Number(inv.fundedAmount);
      const commitmentAmount = Number(inv.commitmentAmount);

      const investorDistributed = transactions
        .filter((t) => t.investorId === inv.investorId && t.type === "DISTRIBUTION" && t.status === "COMPLETED")
        .reduce((sum, t) => sum + Number(t.amount), 0);

      return {
        id: inv.investor.id,
        name: inv.investor.user?.name || "",
        email: inv.investor.user?.email || "",
        entityName: inv.investor.entityName,
        commitment: commitmentAmount,
        called: calledAmount,
        funded: fundedAmount,
        distributed: investorDistributed,
        uncalled: commitmentAmount - calledAmount,
        fundedPct: commitmentAmount > 0 ? (fundedAmount / commitmentAmount) * 100 : 0,
      };
    });

    return res.status(200).json({
      metrics: {
        totalCommitted,
        totalCalled,
        totalFunded,
        totalDistributed,
        uncalledCapital,
        netPosition,
        fundedPercentage,
        investorCount: investments.length,
        averageCommitment: investments.length > 0 ? totalCommitted / investments.length : 0,
        byStatus,
      },
      investors: investorCapital,
    });
  } catch (error: any) {
    console.error("Capital tracking error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
