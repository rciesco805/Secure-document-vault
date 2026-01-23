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

  try {
    const { user, error, statusCode } = await getUserWithRole(req, res);

    if (!user) {
      return res.status(statusCode || 401).json({ message: error });
    }

    if (user.role === "LP" && !user.investorId) {
      return res.status(403).json({ message: "Investor profile not found" });
    }

    const { limit = "10", offset = "0", type, fundId, investorId } = req.query;

    let where: any = {};

    if (user.role === "LP") {
      where.investorId = user.investorId;
    } else if (user.role === "GP") {
      if (!user.teamIds || user.teamIds.length === 0) {
        return res.status(403).json({ message: "No team access" });
      }

      const teamFunds = await prisma.fund.findMany({
        where: { teamId: { in: user.teamIds } },
        select: { id: true },
      });
      const allowedFundIds = teamFunds.map((f) => f.id);

      if (allowedFundIds.length === 0) {
        return res.status(200).json({ transactions: [], total: 0, hasMore: false });
      }

      if (fundId && typeof fundId === "string") {
        if (!allowedFundIds.includes(fundId)) {
          return res.status(403).json({ message: "Fund not in your team" });
        }
        where.fundId = fundId;
      } else {
        where.fundId = { in: allowedFundIds };
      }

      if (investorId && typeof investorId === "string") {
        const investorInTeamFund = await prisma.investment.findFirst({
          where: {
            investorId: investorId,
            fundId: { in: allowedFundIds },
          },
        });

        if (!investorInTeamFund) {
          return res.status(403).json({ message: "Investor not in your team funds" });
        }
        where.investorId = investorId;
      }
    }

    if (type && typeof type === "string") {
      where.type = type;
    }

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: parseInt(limit as string),
        skip: parseInt(offset as string),
        include: {
          bankLink: {
            select: {
              institutionName: true,
              accountMask: true,
            },
          },
          investor: user.role === "GP" ? {
            select: {
              id: true,
              entityName: true,
              user: {
                select: { name: true, email: true },
              },
            },
          } : false,
        },
      }),
      prisma.transaction.count({ where }),
    ]);

    return res.status(200).json({
      transactions: transactions.map((t: any) => ({
        id: t.id,
        type: t.type,
        amount: t.amount.toString(),
        currency: t.currency,
        description: t.description,
        status: t.status,
        statusMessage: t.statusMessage,
        fundId: t.fundId,
        bankAccount: t.bankLink
          ? `${t.bankLink.institutionName} ••••${t.bankLink.accountMask}`
          : null,
        ...(user.role === "GP" && t.investor && {
          investor: {
            id: t.investor.id,
            name: t.investor.entityName || t.investor.user?.name,
            email: t.investor.user?.email,
          },
        }),
        initiatedAt: t.initiatedAt,
        completedAt: t.completedAt,
        createdAt: t.createdAt,
      })),
      total,
      hasMore: total > parseInt(offset as string) + parseInt(limit as string),
    });
  } catch (error) {
    console.error("Error fetching transactions:", error);
    return res.status(500).json({ message: "Failed to fetch transactions" });
  }
}
