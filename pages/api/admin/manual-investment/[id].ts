import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const { id } = req.query;
  if (!id || typeof id !== "string") {
    return res.status(400).json({ message: "Investment ID required" });
  }

  const userTeam = await prisma.userTeam.findFirst({
    where: {
      userId: session.user.id,
      role: { in: ["OWNER", "ADMIN", "SUPER_ADMIN"] },
    },
  });

  if (!userTeam) {
    return res.status(403).json({ message: "Access denied. Admin role required." });
  }

  const teamId = userTeam.teamId;

  const existingInvestment = await (prisma as any).manualInvestment.findFirst({
    where: { id, teamId },
  });

  if (!existingInvestment) {
    return res.status(404).json({ message: "Investment not found" });
  }

  if (req.method === "GET") {
    return handleGet(res, existingInvestment);
  } else if (req.method === "PUT") {
    return handlePut(req, res, id, teamId, session.user.id, existingInvestment);
  } else if (req.method === "DELETE") {
    return handleDelete(req, res, id, teamId, session.user.id);
  } else {
    return res.status(405).json({ message: "Method not allowed" });
  }
}

async function handleGet(res: NextApiResponse, investment: any) {
  return res.status(200).json({ investment });
}

async function handlePut(
  req: NextApiRequest,
  res: NextApiResponse,
  id: string,
  teamId: string,
  userId: string,
  existingInvestment: any
) {
  try {
    const updateData: any = {};
    const allowedFields = [
      "documentType",
      "documentTitle",
      "documentNumber",
      "commitmentAmount",
      "fundedAmount",
      "units",
      "shares",
      "pricePerUnit",
      "ownershipPercent",
      "signedDate",
      "effectiveDate",
      "fundedDate",
      "maturityDate",
      "transferMethod",
      "transferStatus",
      "transferDate",
      "transferRef",
      "bankName",
      "accountLast4",
      "notes",
      "status",
      "isVerified",
    ];

    const decimalFields = [
      "commitmentAmount",
      "fundedAmount",
      "units",
      "shares",
      "pricePerUnit",
      "ownershipPercent",
    ];

    const dateFields = [
      "signedDate",
      "effectiveDate",
      "fundedDate",
      "maturityDate",
      "transferDate",
    ];

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        if (decimalFields.includes(field) && req.body[field] !== null) {
          updateData[field] = new Prisma.Decimal(req.body[field]);
        } else if (dateFields.includes(field) && req.body[field]) {
          updateData[field] = new Date(req.body[field]);
        } else {
          updateData[field] = req.body[field];
        }
      }
    }

    if (updateData.commitmentAmount !== undefined || updateData.fundedAmount !== undefined) {
      const commitment = updateData.commitmentAmount || existingInvestment.commitmentAmount;
      const funded = updateData.fundedAmount || existingInvestment.fundedAmount;
      updateData.unfundedAmount = new Prisma.Decimal(commitment).minus(new Prisma.Decimal(funded));
    }

    if (updateData.isVerified === true && !existingInvestment.isVerified) {
      updateData.verifiedBy = userId;
      updateData.verifiedAt = new Date();
    }

    const existingAudit = existingInvestment.auditTrail || {};
    updateData.auditTrail = {
      ...existingAudit,
      updates: [
        ...(existingAudit.updates || []),
        {
          by: userId,
          at: new Date().toISOString(),
          changes: Object.keys(updateData).filter((k) => k !== "auditTrail"),
          ip: req.headers["x-forwarded-for"] || req.socket.remoteAddress,
        },
      ],
    };

    const investment = await (prisma as any).manualInvestment.update({
      where: { id },
      data: updateData,
      include: {
        investor: {
          include: {
            user: { select: { name: true, email: true } },
          },
        },
        fund: { select: { id: true, name: true } },
      },
    });

    await prisma.auditLog.create({
      data: {
        teamId,
        eventType: "MANUAL_INVESTMENT_UPDATED",
        resourceType: "MANUAL_INVESTMENT",
        resourceId: id,
        userId,
        metadata: {
          changes: Object.keys(updateData).filter((k) => k !== "auditTrail"),
        },
        ipAddress: (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || null,
        userAgent: req.headers["user-agent"] || null,
      },
    });

    return res.status(200).json({ investment });
  } catch (error) {
    console.error("[MANUAL_INVESTMENT_PUT] Error:", error);
    return res.status(500).json({ message: "Failed to update investment" });
  }
}

async function handleDelete(
  req: NextApiRequest,
  res: NextApiResponse,
  id: string,
  teamId: string,
  userId: string
) {
  try {
    await (prisma as any).manualInvestment.delete({
      where: { id },
    });

    await prisma.auditLog.create({
      data: {
        teamId,
        eventType: "MANUAL_INVESTMENT_DELETED",
        resourceType: "MANUAL_INVESTMENT",
        resourceId: id,
        userId,
        metadata: {},
        ipAddress: (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || null,
        userAgent: req.headers["user-agent"] || null,
      },
    });

    return res.status(200).json({ message: "Investment deleted" });
  } catch (error) {
    console.error("[MANUAL_INVESTMENT_DELETE] Error:", error);
    return res.status(500).json({ message: "Failed to delete investment" });
  }
}
