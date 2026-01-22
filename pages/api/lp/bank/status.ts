import { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/prisma";
import { isPlaidConfigured } from "@/lib/plaid";

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
      include: {
        bankLinks: {
          where: { status: "ACTIVE" },
          select: {
            id: true,
            institutionName: true,
            accountName: true,
            accountMask: true,
            accountType: true,
            status: true,
            transferEnabled: true,
            lastSyncAt: true,
            createdAt: true,
          },
        },
      },
    });

    if (!investor) {
      return res.status(401).json({ message: "Investor not found" });
    }

    const activeBankLink = investor.bankLinks[0] || null;

    return res.status(200).json({
      configured: isPlaidConfigured(),
      hasBankLink: !!activeBankLink,
      bankLink: activeBankLink,
    });
  } catch (error) {
    console.error("Error fetching bank status:", error);
    return res.status(500).json({ message: "Failed to fetch bank status" });
  }
}
