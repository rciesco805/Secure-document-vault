import { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/prisma";
import { getUserWithRole } from "@/lib/auth/with-role";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { user, error, statusCode } = await getUserWithRole(req, res);

  if (!user) {
    return res.status(statusCode || 401).json({ message: error });
  }

  if (user.role !== "GP") {
    return res.status(403).json({ message: "GP access required" });
  }

  if (!user.teamIds || user.teamIds.length === 0) {
    return res.status(403).json({ message: "No team access" });
  }

  if (req.method === "GET") {
    return handleGet(req, res, user);
  } else if (req.method === "POST") {
    return handlePost(req, res, user);
  }

  return res.status(405).json({ message: "Method not allowed" });
}

async function handleGet(req: NextApiRequest, res: NextApiResponse, user: any) {
  try {
    const { 
      limit = "25", 
      offset = "0", 
      type, 
      status, 
      fundId,
      direction 
    } = req.query;

    const teamFunds = await prisma.fund.findMany({
      where: { teamId: { in: user.teamIds } },
      select: { id: true },
    });
    const allowedFundIds = teamFunds.map((f) => f.id);

    if (allowedFundIds.length === 0) {
      return res.status(200).json({ transactions: [], total: 0, hasMore: false });
    }

    let where: any = { fundId: { in: allowedFundIds } };

    if (fundId && typeof fundId === "string" && allowedFundIds.includes(fundId)) {
      where.fundId = fundId;
    }

    if (type && typeof type === "string") {
      where.type = type;
    }

    if (status && typeof status === "string") {
      where.status = status;
    }

    if (direction === "inbound") {
      where.type = "CAPITAL_CALL";
    } else if (direction === "outbound") {
      where.type = "DISTRIBUTION";
    }

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: parseInt(limit as string),
        skip: parseInt(offset as string),
        include: {
          investor: {
            select: {
              id: true,
              entityName: true,
              user: { select: { name: true, email: true } },
            },
          },
          bankLink: {
            select: {
              institutionName: true,
              accountMask: true,
              accountType: true,
            },
          },
        },
      }),
      prisma.transaction.count({ where }),
    ]);

    const summary = await prisma.transaction.groupBy({
      by: ["type", "status"],
      where: { fundId: { in: allowedFundIds } },
      _sum: { amount: true },
      _count: true,
    });

    return res.status(200).json({
      transactions: transactions.map((t: any) => ({
        id: t.id,
        type: t.type,
        direction: t.type === "CAPITAL_CALL" ? "inbound" : "outbound",
        amount: t.amount.toString(),
        currency: t.currency,
        description: t.description,
        status: t.status,
        statusMessage: t.statusMessage,
        fundId: t.fundId,
        investor: t.investor ? {
          id: t.investor.id,
          name: t.investor.entityName || t.investor.user?.name,
          email: t.investor.user?.email,
        } : null,
        bankAccount: t.bankLink
          ? `${t.bankLink.institutionName} ••••${t.bankLink.accountMask}`
          : null,
        plaidTransferId: t.plaidTransferId,
        initiatedAt: t.initiatedAt,
        processedAt: t.processedAt,
        completedAt: t.completedAt,
        failedAt: t.failedAt,
        createdAt: t.createdAt,
      })),
      total,
      hasMore: total > parseInt(offset as string) + parseInt(limit as string),
      summary,
    });
  } catch (error) {
    console.error("Error fetching transactions:", error);
    return res.status(500).json({ message: "Failed to fetch transactions" });
  }
}

async function handlePost(req: NextApiRequest, res: NextApiResponse, user: any) {
  try {
    const { 
      type, 
      investorId, 
      fundId, 
      amount, 
      description, 
      capitalCallId, 
      distributionId,
      bankLinkId 
    } = req.body;

    if (!type || !["CAPITAL_CALL", "DISTRIBUTION"].includes(type)) {
      return res.status(400).json({ message: "Invalid transaction type" });
    }

    if (!investorId || !fundId || !amount) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const teamFunds = await prisma.fund.findMany({
      where: { teamId: { in: user.teamIds } },
      select: { id: true },
    });

    if (!teamFunds.some((f) => f.id === fundId)) {
      return res.status(403).json({ message: "Fund not in your team" });
    }

    const investor = await prisma.investor.findUnique({
      where: { id: investorId },
      include: { bankLinks: { where: { status: "ACTIVE" } } },
    });

    if (!investor) {
      return res.status(404).json({ message: "Investor not found" });
    }

    const bankLink = bankLinkId 
      ? investor.bankLinks.find((bl: any) => bl.id === bankLinkId)
      : investor.bankLinks[0];

    const transaction = await prisma.transaction.create({
      data: {
        investorId,
        bankLinkId: bankLink?.id,
        type,
        amount: parseFloat(amount),
        currency: "USD",
        description: description || (type === "CAPITAL_CALL" ? "Capital Call" : "Distribution"),
        capitalCallId,
        distributionId,
        fundId,
        transferType: type === "CAPITAL_CALL" ? "ach_debit" : "ach_credit",
        status: "PENDING",
        initiatedBy: user.userId,
        ipAddress: req.headers["x-forwarded-for"]?.toString().split(",")[0] || req.socket?.remoteAddress,
        userAgent: req.headers["user-agent"],
        auditTrail: [{
          action: "INITIATED",
          timestamp: new Date().toISOString(),
          userId: user.userId,
          details: { type, amount, fundId },
        }],
      },
    });

    return res.status(201).json({
      success: true,
      transaction: {
        id: transaction.id,
        type: transaction.type,
        amount: transaction.amount.toString(),
        status: transaction.status,
      },
    });
  } catch (error) {
    console.error("Error creating transaction:", error);
    return res.status(500).json({ message: "Failed to create transaction" });
  }
}
