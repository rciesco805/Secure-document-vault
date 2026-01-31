import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";

type ManualInvestmentWhereInput = {
  teamId?: string;
  fundId?: string;
  investorId?: string;
  status?: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) {
    return res.status(401).json({ message: "Unauthorized" });
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

  if (req.method === "GET") {
    return handleGet(req, res, teamId);
  } else if (req.method === "POST") {
    return handlePost(req, res, teamId, session.user.id);
  } else {
    return res.status(405).json({ message: "Method not allowed" });
  }
}

async function handleGet(
  req: NextApiRequest,
  res: NextApiResponse,
  teamId: string
) {
  try {
    const { fundId, investorId, status } = req.query;

    const where: ManualInvestmentWhereInput = { teamId };
    if (fundId && typeof fundId === "string") where.fundId = fundId;
    if (investorId && typeof investorId === "string") where.investorId = investorId;
    if (status && typeof status === "string") where.status = status;

    const investments = await (prisma as any).manualInvestment.findMany({
      where,
      include: {
        investor: {
          include: {
            user: { select: { name: true, email: true } },
          },
        },
        fund: { select: { id: true, name: true } },
      },
      orderBy: { signedDate: "desc" },
    });

    return res.status(200).json({ investments });
  } catch (error) {
    console.error("[MANUAL_INVESTMENT_GET] Error:", error);
    return res.status(500).json({ message: "Failed to fetch investments" });
  }
}

async function handlePost(
  req: NextApiRequest,
  res: NextApiResponse,
  teamId: string,
  userId: string
) {
  try {
    const {
      investorId,
      fundId,
      documentType,
      documentTitle,
      documentNumber,
      commitmentAmount,
      fundedAmount,
      units,
      shares,
      pricePerUnit,
      ownershipPercent,
      signedDate,
      effectiveDate,
      fundedDate,
      maturityDate,
      transferMethod,
      transferStatus,
      transferDate,
      transferRef,
      bankName,
      accountLast4,
      notes,
    } = req.body;

    if (!investorId || !fundId || !documentType || !documentTitle || !commitmentAmount || !signedDate) {
      return res.status(400).json({
        message: "Missing required fields: investorId, fundId, documentType, documentTitle, commitmentAmount, signedDate",
      });
    }

    const investor = await prisma.investor.findUnique({
      where: { id: investorId },
      include: { team: { select: { id: true } } },
    });

    if (!investor) {
      return res.status(404).json({ message: "Investor not found" });
    }

    if (investor.teamId !== teamId) {
      return res.status(403).json({ message: "Investor does not belong to your team" });
    }

    const fund = await prisma.fund.findFirst({
      where: { id: fundId, teamId },
    });

    if (!fund) {
      return res.status(404).json({ message: "Fund not found or access denied" });
    }

    const investment = await (prisma as any).manualInvestment.create({
      data: {
        investorId,
        fundId,
        teamId,
        documentType,
        documentTitle,
        documentNumber: documentNumber || null,
        commitmentAmount: new Prisma.Decimal(commitmentAmount),
        fundedAmount: fundedAmount ? new Prisma.Decimal(fundedAmount) : new Prisma.Decimal(0),
        unfundedAmount: fundedAmount
          ? new Prisma.Decimal(commitmentAmount).minus(new Prisma.Decimal(fundedAmount))
          : new Prisma.Decimal(commitmentAmount),
        units: units ? new Prisma.Decimal(units) : null,
        shares: shares ? new Prisma.Decimal(shares) : null,
        pricePerUnit: pricePerUnit ? new Prisma.Decimal(pricePerUnit) : null,
        ownershipPercent: ownershipPercent ? new Prisma.Decimal(ownershipPercent) : null,
        signedDate: new Date(signedDate),
        effectiveDate: effectiveDate ? new Date(effectiveDate) : null,
        fundedDate: fundedDate ? new Date(fundedDate) : null,
        maturityDate: maturityDate ? new Date(maturityDate) : null,
        transferMethod: transferMethod || null,
        transferStatus: transferStatus || "PENDING",
        transferDate: transferDate ? new Date(transferDate) : null,
        transferRef: transferRef || null,
        bankName: bankName || null,
        accountLast4: accountLast4 || null,
        notes: notes || null,
        addedBy: userId,
        auditTrail: {
          created: {
            by: userId,
            at: new Date().toISOString(),
            ip: req.headers["x-forwarded-for"] || req.socket.remoteAddress,
          },
        },
      },
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
        eventType: "MANUAL_INVESTMENT_CREATED",
        resourceType: "MANUAL_INVESTMENT",
        resourceId: investment.id,
        userId,
        metadata: {
          investorId,
          fundId,
          documentType,
          commitmentAmount,
          fundedAmount: fundedAmount || 0,
        },
        ipAddress: (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || null,
        userAgent: req.headers["user-agent"] || null,
      },
    });

    return res.status(201).json({ investment });
  } catch (error) {
    console.error("[MANUAL_INVESTMENT_POST] Error:", error);
    return res.status(500).json({ message: "Failed to create investment record" });
  }
}
