import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";

import prisma from "@/lib/prisma";
import { CustomUser } from "@/lib/types";
import { authOptions } from "@/lib/auth/auth-options";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const user = session.user as CustomUser;
  const { fundId } = req.query;

  const userTeam = await prisma.userTeam.findFirst({
    where: { userId: user.id },
    include: { team: true },
  });

  if (!userTeam) {
    return res.status(403).json({ error: "No team access" });
  }

  if (!["ADMIN", "OWNER"].includes(userTeam.role)) {
    return res.status(403).json({ error: "Admin access required" });
  }

  const fundWhere = fundId
    ? { id: fundId as string, teamId: userTeam.teamId }
    : { teamId: userTeam.teamId };

  const funds = await prisma.fund.findMany({
    where: fundWhere,
    include: {
      aggregate: true,
      investments: {
        include: {
          investor: {
            include: {
              user: {
                select: { name: true, email: true },
              },
            },
          },
        },
      },
      distributions: {
        where: { status: "COMPLETED" },
      },
    },
  });

  const waterfallData = funds.map((fund) => {
    const customSettings = (fund.customSettings as any) || {};
    const preferredReturn = customSettings.preferredReturn || 8;
    const carriedInterest = customSettings.carriedInterest || 20;
    const catchUpPercentage = customSettings.catchUpPercentage || 100;
    const hurdleRate = customSettings.hurdleRate || 0;

    const totalCapitalContributed = fund.investments.reduce(
      (sum, inv) => sum + Number(inv.fundedAmount),
      0
    );

    const totalDistributions = fund.distributions.reduce(
      (sum, d) => sum + Number(d.totalAmount),
      0
    );

    const totalProceeds = totalDistributions;

    const prefReturnAmount = totalCapitalContributed * (preferredReturn / 100);
    let remainingProceeds = totalProceeds;

    const returnOfCapital = Math.min(remainingProceeds, totalCapitalContributed);
    remainingProceeds -= returnOfCapital;

    const preferredReturnPaid = Math.min(remainingProceeds, prefReturnAmount);
    remainingProceeds -= preferredReturnPaid;

    const profitAfterPref = remainingProceeds;
    const targetGPCatchUp = (returnOfCapital + preferredReturnPaid + profitAfterPref) * (carriedInterest / 100);
    const gpCatchUp = Math.min(remainingProceeds, targetGPCatchUp);
    remainingProceeds -= gpCatchUp;

    const lpCarriedInterest = remainingProceeds * ((100 - carriedInterest) / 100);
    const gpCarriedInterest = remainingProceeds * (carriedInterest / 100);

    const tiers = [
      {
        name: "Return of Capital",
        type: "return_of_capital",
        lpShare: 100,
        gpShare: 0,
        amount: returnOfCapital,
        lpAmount: returnOfCapital,
        gpAmount: 0,
      },
      {
        name: `Preferred Return (${preferredReturn}%)`,
        type: "preferred_return",
        lpShare: 100,
        gpShare: 0,
        amount: preferredReturnPaid,
        lpAmount: preferredReturnPaid,
        gpAmount: 0,
      },
      {
        name: "GP Catch-Up",
        type: "catch_up",
        lpShare: 0,
        gpShare: 100,
        amount: gpCatchUp,
        lpAmount: 0,
        gpAmount: gpCatchUp,
      },
      {
        name: `Carried Interest (${100 - carriedInterest}/${carriedInterest})`,
        type: "carried_interest",
        lpShare: 100 - carriedInterest,
        gpShare: carriedInterest,
        amount: lpCarriedInterest + gpCarriedInterest,
        lpAmount: lpCarriedInterest,
        gpAmount: gpCarriedInterest,
      },
    ];

    const totalLP = returnOfCapital + preferredReturnPaid + lpCarriedInterest;
    const totalGP = gpCatchUp + gpCarriedInterest;

    const investorBreakdown = fund.investments.map((inv) => {
      const ownershipPct = totalCapitalContributed > 0
        ? Number(inv.fundedAmount) / totalCapitalContributed
        : 0;

      return {
        investorId: inv.investorId,
        investorName: inv.investor.entityName || inv.investor.user.name || inv.investor.user.email,
        capitalContributed: Number(inv.fundedAmount),
        commitment: Number(inv.commitmentAmount),
        ownershipPercentage: ownershipPct * 100,
        estimatedDistribution: totalLP * ownershipPct,
        returnOfCapital: returnOfCapital * ownershipPct,
        preferredReturn: preferredReturnPaid * ownershipPct,
        profitShare: lpCarriedInterest * ownershipPct,
        multiple: Number(inv.fundedAmount) > 0
          ? (totalLP * ownershipPct) / Number(inv.fundedAmount)
          : 0,
      };
    });

    return {
      fundId: fund.id,
      fundName: fund.name,
      status: fund.status,
      config: {
        preferredReturn,
        carriedInterest,
        catchUpPercentage,
        hurdleRate,
      },
      summary: {
        totalCapitalContributed,
        totalProceeds,
        totalLP,
        totalGP,
        lpMultiple: totalCapitalContributed > 0 ? totalLP / totalCapitalContributed : 0,
        lpSharePercentage: totalProceeds > 0 ? (totalLP / totalProceeds) * 100 : 0,
        gpSharePercentage: totalProceeds > 0 ? (totalGP / totalProceeds) * 100 : 0,
      },
      tiers,
      investorBreakdown,
    };
  });

  return res.status(200).json({
    funds: waterfallData,
    generatedAt: new Date().toISOString(),
  });
}
