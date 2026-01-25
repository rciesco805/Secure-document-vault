import { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/prisma";
import { getUserWithRole } from "@/lib/auth/with-role";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { user, error, statusCode } = await getUserWithRole(req, res);

  if (!user || user.role !== "GP") {
    return res.status(statusCode || 403).json({ message: error || "GP access required" });
  }

  if (!user.teamIds || user.teamIds.length === 0) {
    return res.status(403).json({ message: "No team access" });
  }

  try {
    const { fundId, includeDeductions = "true", period } = req.query;

    const funds = await prisma.fund.findMany({
      where: fundId 
        ? { id: fundId as string, teamId: { in: user.teamIds } }
        : { teamId: { in: user.teamIds } },
      include: {
        aggregate: true,
        investments: {
          where: { status: { in: ["COMMITTED", "ACTIVE", "FUNDED"] } },
        },
        capitalCalls: {
          where: { status: "COMPLETED" },
        },
        distributions: {
          where: { status: "COMPLETED" },
        },
      },
    });

    const aumReports = funds.map((fund: any) => {
      const totalCommitted = fund.investments.reduce(
        (sum: number, inv: any) => sum + parseFloat(inv.commitmentAmount.toString()),
        0
      );

      const totalFunded = fund.investments.reduce(
        (sum: number, inv: any) => sum + parseFloat(inv.fundedAmount.toString()),
        0
      );

      const totalDistributed = fund.distributions.reduce(
        (sum: number, dist: any) => sum + parseFloat(dist.totalAmount.toString()),
        0
      );

      const grossAUM = totalFunded;

      let deductions = {
        managementFees: 0,
        performanceFees: 0,
        organizationalFees: 0,
        expenses: 0,
        total: 0,
      };

      if (includeDeductions === "true") {
        deductions = calculateDeductions(fund, grossAUM);
      }

      const netAUM = grossAUM - deductions.total;

      const unrealizedGains = 0;
      const realizedGains = 0;

      const nav = netAUM + unrealizedGains;

      const fundAgeMo = Math.floor(
        (Date.now() - new Date(fund.createdAt).getTime()) / (1000 * 60 * 60 * 24 * 30)
      );

      return {
        fundId: fund.id,
        fundName: fund.name,
        entityMode: fund.entityMode,
        status: fund.status,
        metrics: {
          totalCommitted,
          totalFunded,
          totalDistributed,
          grossAUM,
          netAUM,
          nav,
          unrealizedGains,
          realizedGains,
        },
        deductions,
        ratios: {
          fundedRatio: totalCommitted > 0 ? (totalFunded / totalCommitted) * 100 : 0,
          distributedRatio: totalFunded > 0 ? (totalDistributed / totalFunded) * 100 : 0,
          expenseRatio: grossAUM > 0 ? (deductions.total / grossAUM) * 100 : 0,
        },
        investorCount: fund.investments.length,
        capitalCallsCount: fund.capitalCalls.length,
        distributionsCount: fund.distributions.length,
        fundAgeMo,
        thresholds: {
          initialEnabled: fund.initialThresholdEnabled,
          initialAmount: fund.initialThresholdAmount?.toString(),
          initialMet: fund.aggregate?.initialThresholdMet || false,
          fullAuthorized: fund.fullAuthorizedAmount?.toString(),
          progress: fund.aggregate?.fullAuthorizedProgress?.toString() || "0",
        },
        asOf: new Date().toISOString(),
      };
    });

    const aggregateTotals = aumReports.reduce(
      (totals: any, report: any) => ({
        totalCommitted: totals.totalCommitted + report.metrics.totalCommitted,
        totalFunded: totals.totalFunded + report.metrics.totalFunded,
        totalDistributed: totals.totalDistributed + report.metrics.totalDistributed,
        grossAUM: totals.grossAUM + report.metrics.grossAUM,
        netAUM: totals.netAUM + report.metrics.netAUM,
        totalDeductions: totals.totalDeductions + report.deductions.total,
        investorCount: totals.investorCount + report.investorCount,
      }),
      {
        totalCommitted: 0,
        totalFunded: 0,
        totalDistributed: 0,
        grossAUM: 0,
        netAUM: 0,
        totalDeductions: 0,
        investorCount: 0,
      }
    );

    return res.status(200).json({
      funds: aumReports,
      aggregate: aggregateTotals,
      fundCount: aumReports.length,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error generating AUM report:", error);
    return res.status(500).json({ message: "Failed to generate AUM report" });
  }
}

function calculateDeductions(fund: any, grossAUM: number) {
  const fundAgeYears = (Date.now() - new Date(fund.createdAt).getTime()) / (1000 * 60 * 60 * 24 * 365);
  
  const mgmtFeeRate = 0.02;
  const managementFees = grossAUM * mgmtFeeRate * fundAgeYears;

  let performanceFees = 0;
  const carriedInterest = 0.20;
  const hurdleRate = 0.08;
  
  const organizationalFees = grossAUM * 0.005;
  const expenses = grossAUM * 0.003;

  const total = managementFees + performanceFees + organizationalFees + expenses;

  return {
    managementFees: Math.round(managementFees * 100) / 100,
    performanceFees: Math.round(performanceFees * 100) / 100,
    organizationalFees: Math.round(organizationalFees * 100) / 100,
    expenses: Math.round(expenses * 100) / 100,
    total: Math.round(total * 100) / 100,
  };
}
