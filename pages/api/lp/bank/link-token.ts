import { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/prisma";
import { createLinkToken, isPlaidConfigured } from "@/lib/plaid";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    if (!isPlaidConfigured()) {
      return res.status(503).json({ 
        message: "Payment integration not configured",
        configured: false 
      });
    }

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
        user: true,
        bankLinks: {
          where: { status: "ACTIVE" },
        },
      },
    });

    if (!investor) {
      return res.status(401).json({ message: "Investor not found" });
    }

    const linkToken = await createLinkToken(
      investor.id,
      "BF Fund"
    );

    return res.status(200).json({
      linkToken,
      hasExistingLink: investor.bankLinks.length > 0,
    });
  } catch (error) {
    console.error("Error creating Plaid link token:", error);
    return res.status(500).json({ message: "Failed to create link token" });
  }
}
