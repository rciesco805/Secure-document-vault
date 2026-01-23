import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "../../auth/[...nextauth]";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions);

  if (!session?.user?.email) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const { fundId } = req.query;

  if (!fundId || typeof fundId !== "string") {
    return res.status(400).json({ message: "Fund ID required" });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: {
      teams: {
        include: {
          team: true,
        },
      },
    },
  });

  if (!user) {
    return res.status(401).json({ message: "User not found" });
  }

  const fund = await prisma.fund.findUnique({
    where: { id: fundId },
  });

  if (!fund) {
    return res.status(404).json({ message: "Fund not found" });
  }

  const hasAccess = user.teams.some(
    (ut) => ut.teamId === fund.teamId && ["ADMIN", "OWNER"].includes(ut.role)
  );

  if (!hasAccess) {
    return res.status(403).json({ message: "Forbidden" });
  }

  if (req.method === "GET") {
    return res.status(200).json({
      fund: {
        id: fund.id,
        name: fund.name,
        ndaGateEnabled: fund.ndaGateEnabled,
        capitalCallThresholdEnabled: fund.capitalCallThresholdEnabled,
        capitalCallThreshold: fund.capitalCallThreshold ? Number(fund.capitalCallThreshold) : null,
        callFrequency: fund.callFrequency,
        stagedCommitmentsEnabled: fund.stagedCommitmentsEnabled,
        currentRaise: Number(fund.currentRaise),
        targetRaise: Number(fund.targetRaise),
      },
    });
  }

  if (req.method === "PATCH") {
    const {
      ndaGateEnabled,
      capitalCallThresholdEnabled,
      capitalCallThreshold,
      callFrequency,
      stagedCommitmentsEnabled,
    } = req.body;

    const updateData: Record<string, any> = {};

    if (typeof ndaGateEnabled === "boolean") {
      updateData.ndaGateEnabled = ndaGateEnabled;
    }

    if (typeof capitalCallThresholdEnabled === "boolean") {
      updateData.capitalCallThresholdEnabled = capitalCallThresholdEnabled;
    }

    if (capitalCallThreshold !== undefined) {
      updateData.capitalCallThreshold = capitalCallThreshold
        ? parseFloat(capitalCallThreshold)
        : null;
    }

    if (callFrequency && ["AS_NEEDED", "QUARTERLY", "SEMI_ANNUAL", "ANNUAL"].includes(callFrequency)) {
      updateData.callFrequency = callFrequency;
    }

    if (typeof stagedCommitmentsEnabled === "boolean") {
      updateData.stagedCommitmentsEnabled = stagedCommitmentsEnabled;
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ message: "No valid fields to update" });
    }

    const updatedFund = await prisma.fund.update({
      where: { id: fundId },
      data: updateData,
    });

    await prisma.auditLog.create({
      data: {
        eventType: "FUND_SETTINGS_UPDATE",
        userId: user.id,
        teamId: fund.teamId,
        resourceType: "FUND",
        resourceId: fundId,
        ipAddress: (req.headers["x-forwarded-for"] as string)?.split(",")[0] || req.socket.remoteAddress || "",
        userAgent: req.headers["user-agent"] || "",
        metadata: {
          previousSettings: {
            ndaGateEnabled: fund.ndaGateEnabled,
            capitalCallThresholdEnabled: fund.capitalCallThresholdEnabled,
            capitalCallThreshold: fund.capitalCallThreshold ? Number(fund.capitalCallThreshold) : null,
            callFrequency: fund.callFrequency,
            stagedCommitmentsEnabled: fund.stagedCommitmentsEnabled,
          },
          newSettings: updateData,
        },
      },
    }).catch(() => {});

    return res.status(200).json({
      fund: {
        id: updatedFund.id,
        name: updatedFund.name,
        ndaGateEnabled: updatedFund.ndaGateEnabled,
        capitalCallThresholdEnabled: updatedFund.capitalCallThresholdEnabled,
        capitalCallThreshold: updatedFund.capitalCallThreshold ? Number(updatedFund.capitalCallThreshold) : null,
        callFrequency: updatedFund.callFrequency,
        stagedCommitmentsEnabled: updatedFund.stagedCommitmentsEnabled,
        currentRaise: Number(updatedFund.currentRaise),
        targetRaise: Number(updatedFund.targetRaise),
      },
    });
  }

  return res.status(405).json({ message: "Method not allowed" });
}
