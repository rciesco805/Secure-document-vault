import { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/prisma";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const investorToken = req.cookies["lp-session"];
    if (!investorToken) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const investor = await prisma.investor.findFirst({
      where: {
        user: {
          sessions: {
            some: {
              sessionToken: investorToken,
            },
          },
        },
      },
    });

    if (!investor) {
      return res.status(401).json({ message: "Investor not found" });
    }

    const { limit = "10", offset = "0", type } = req.query;

    const where: any = {
      investorId: investor.id,
    };

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
        },
      }),
      prisma.transaction.count({ where }),
    ]);

    return res.status(200).json({
      transactions: transactions.map((t) => ({
        id: t.id,
        type: t.type,
        amount: t.amount.toString(),
        currency: t.currency,
        description: t.description,
        status: t.status,
        statusMessage: t.statusMessage,
        bankAccount: t.bankLink
          ? `${t.bankLink.institutionName} ••••${t.bankLink.accountMask}`
          : null,
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
