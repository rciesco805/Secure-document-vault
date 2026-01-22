import { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/prisma";
import { exchangePublicToken, getAccounts, getItem, getInstitution, isPlaidConfigured } from "@/lib/plaid";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    if (!isPlaidConfigured()) {
      return res.status(503).json({ message: "Payment integration not configured" });
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
    });

    if (!investor) {
      return res.status(401).json({ message: "Investor not found" });
    }

    const { publicToken, accountId, metadata } = req.body;

    if (!publicToken || !accountId) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const { accessToken, itemId } = await exchangePublicToken(publicToken);

    const accounts = await getAccounts(accessToken);
    const selectedAccount = accounts.find((a) => a.account_id === accountId);

    if (!selectedAccount) {
      return res.status(400).json({ message: "Selected account not found" });
    }

    const item = await getItem(accessToken);
    let institutionName = metadata?.institution?.name;
    
    if (!institutionName && item.institution_id) {
      try {
        const institution = await getInstitution(item.institution_id);
        institutionName = institution.name;
      } catch (e) {
        console.error("Error fetching institution:", e);
      }
    }

    const existingLink = await prisma.bankLink.findFirst({
      where: {
        investorId: investor.id,
        status: "ACTIVE",
      },
    });

    if (existingLink) {
      await prisma.bankLink.update({
        where: { id: existingLink.id },
        data: { status: "DISCONNECTED" },
      });
    }

    const bankLink = await prisma.bankLink.create({
      data: {
        investorId: investor.id,
        plaidItemId: itemId,
        plaidAccessToken: accessToken,
        plaidAccountId: accountId,
        institutionId: item.institution_id,
        institutionName: institutionName,
        accountName: selectedAccount.name,
        accountMask: selectedAccount.mask,
        accountType: selectedAccount.type,
        accountSubtype: selectedAccount.subtype,
        status: "ACTIVE",
        transferEnabled: true,
        lastSyncAt: new Date(),
      },
    });

    return res.status(200).json({
      success: true,
      bankLink: {
        id: bankLink.id,
        institutionName: bankLink.institutionName,
        accountName: bankLink.accountName,
        accountMask: bankLink.accountMask,
        accountType: bankLink.accountType,
      },
    });
  } catch (error) {
    console.error("Error connecting bank account:", error);
    return res.status(500).json({ message: "Failed to connect bank account" });
  }
}
