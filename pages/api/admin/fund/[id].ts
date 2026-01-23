import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/pages/api/auth/[...nextauth]";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user?.id) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const { id } = req.query;
    if (!id || typeof id !== "string") {
      return res.status(400).json({ error: "Fund ID required" });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        teams: {
          include: {
            team: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(403).json({ error: "User not found" });
    }

    const isGP = user.teams.some(
      (t) => t.role === "ADMIN" || t.role === "OWNER"
    );

    if (!isGP) {
      return res.status(403).json({ error: "GP access required" });
    }

    const teamIds = user.teams.map((t) => t.teamId);

    const fund = await prisma.fund.findFirst({
      where: {
        id,
        teamId: { in: teamIds },
      },
      include: {
        aggregate: true,
        investments: {
          include: {
            investor: {
              include: {
                user: {
                  select: {
                    name: true,
                    email: true,
                  },
                },
              },
            },
          },
        },
        capitalCalls: {
          orderBy: { createdAt: "desc" },
          take: 10,
        },
        distributions: {
          orderBy: { createdAt: "desc" },
          take: 10,
        },
      },
    });

    if (!fund) {
      return res.status(404).json({ error: "Fund not found" });
    }

    // Get threshold values (prioritize new fields, fallback to legacy)
    const initialThresholdEnabled = fund.initialThresholdEnabled || 
      fund.aggregate?.initialThresholdEnabled || 
      fund.capitalCallThresholdEnabled ||
      fund.aggregate?.thresholdEnabled || 
      false;
    const initialThresholdAmount = fund.initialThresholdAmount 
      ? Number(fund.initialThresholdAmount)
      : fund.aggregate?.initialThresholdAmount
        ? Number(fund.aggregate.initialThresholdAmount)
        : fund.capitalCallThreshold 
          ? Number(fund.capitalCallThreshold)
          : fund.aggregate?.thresholdAmount
            ? Number(fund.aggregate.thresholdAmount)
            : null;
    const fullAuthorizedAmount = fund.fullAuthorizedAmount
      ? Number(fund.fullAuthorizedAmount)
      : fund.aggregate?.fullAuthorizedAmount
        ? Number(fund.aggregate.fullAuthorizedAmount)
        : null;
    const totalCommitted = fund.aggregate ? Number(fund.aggregate.totalCommitted) : Number(fund.currentRaise);
    const initialThresholdMet = !initialThresholdEnabled || !initialThresholdAmount || totalCommitted >= initialThresholdAmount;

    const response = {
      id: fund.id,
      name: fund.name,
      description: fund.description,
      style: fund.style,
      status: fund.status,
      targetRaise: Number(fund.targetRaise),
      currentRaise: Number(fund.currentRaise),
      minimumInvestment: Number(fund.minimumInvestment),
      aumTarget: fund.aumTarget ? Number(fund.aumTarget) : null,
      callFrequency: fund.callFrequency,
      capitalCallThresholdEnabled: fund.capitalCallThresholdEnabled,
      capitalCallThreshold: fund.capitalCallThreshold
        ? Number(fund.capitalCallThreshold)
        : null,
      // New threshold fields
      initialThresholdEnabled,
      initialThresholdAmount,
      fullAuthorizedAmount,
      initialThresholdMet,
      stagedCommitmentsEnabled: fund.stagedCommitmentsEnabled,
      closingDate: fund.closingDate?.toISOString() || null,
      createdAt: fund.createdAt.toISOString(),
      aggregate: fund.aggregate
        ? {
            totalInbound: Number(fund.aggregate.totalInbound),
            totalOutbound: Number(fund.aggregate.totalOutbound),
            totalCommitted: Number(fund.aggregate.totalCommitted),
            thresholdEnabled: fund.aggregate.thresholdEnabled,
            thresholdAmount: fund.aggregate.thresholdAmount
              ? Number(fund.aggregate.thresholdAmount)
              : null,
            // New threshold fields in aggregate
            initialThresholdEnabled: fund.aggregate.initialThresholdEnabled,
            initialThresholdAmount: fund.aggregate.initialThresholdAmount
              ? Number(fund.aggregate.initialThresholdAmount)
              : null,
            fullAuthorizedAmount: fund.aggregate.fullAuthorizedAmount
              ? Number(fund.aggregate.fullAuthorizedAmount)
              : null,
            initialThresholdMet: fund.aggregate.initialThresholdMet,
            initialThresholdMetAt: fund.aggregate.initialThresholdMetAt?.toISOString() || null,
            fullAuthorizedProgress: fund.aggregate.fullAuthorizedProgress
              ? Number(fund.aggregate.fullAuthorizedProgress)
              : 0,
          }
        : null,
      investors: fund.investments.map((inv) => ({
        id: inv.investor.id,
        name: inv.investor.user.name || "Unknown",
        email: inv.investor.user.email || "",
        commitment: Number(inv.commitmentAmount),
        funded: Number(inv.fundedAmount),
        status: inv.status,
      })),
      capitalCalls: fund.capitalCalls.map((call) => ({
        id: call.id,
        callNumber: call.callNumber,
        amount: Number(call.amount),
        dueDate: call.dueDate.toISOString(),
        status: call.status,
      })),
      distributions: fund.distributions.map((dist) => ({
        id: dist.id,
        distributionNumber: dist.distributionNumber,
        totalAmount: Number(dist.totalAmount),
        distributionDate: dist.distributionDate.toISOString(),
        status: dist.status,
      })),
    };

    return res.status(200).json(response);
  } catch (error: any) {
    console.error("Fund details error:", error);
    return res.status(500).json({ error: "Failed to fetch fund details" });
  }
}
