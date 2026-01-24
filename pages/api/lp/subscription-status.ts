import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "../auth/[...nextauth]";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user?.email) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        investorProfile: {
          include: {
            fund: {
              include: {
                pricingTiers: {
                  where: { isActive: true },
                  orderBy: { tranche: "asc" },
                },
              },
            },
          },
        },
      },
    });

    if (!user?.investorProfile) {
      return res.status(200).json({
        hasSubscription: false,
        canSubscribe: false,
        fund: null,
        pendingSubscription: null,
      });
    }

    const investor = user.investorProfile;
    const fund = investor.fund;

    const pendingSubscription = await prisma.subscription.findFirst({
      where: {
        investorId: investor.id,
        status: "PENDING",
      },
      include: {
        fund: true,
      },
      orderBy: { createdAt: "desc" },
    });

    let pendingSigningToken = null;
    if (pendingSubscription) {
      const doc = await prisma.signatureDocument.findUnique({
        where: { id: pendingSubscription.signatureDocumentId },
        include: {
          recipients: {
            where: { status: "PENDING" },
            take: 1,
          },
        },
      });
      if (doc?.recipients?.[0]) {
        pendingSigningToken = doc.recipients[0].signingToken;
      }
    }

    const canSubscribe =
      investor.ndaSigned &&
      (investor.accreditationStatus === "SELF_CERTIFIED" ||
        investor.accreditationStatus === "KYC_VERIFIED") &&
      fund &&
      fund.entityMode === "FUND" &&
      !pendingSubscription;

    return res.status(200).json({
      hasSubscription: !!pendingSubscription,
      canSubscribe,
      fund: fund
        ? {
            id: fund.id,
            name: fund.name,
            flatModeEnabled: fund.flatModeEnabled,
            minimumInvestment: fund.minimumInvestment.toString(),
            entityMode: fund.entityMode,
            pricingTiers: fund.pricingTiers.map((t) => ({
              id: t.id,
              tranche: t.tranche,
              pricePerUnit: t.pricePerUnit.toString(),
              unitsAvailable: t.unitsAvailable,
              unitsTotal: t.unitsTotal,
              isActive: t.isActive,
            })),
          }
        : null,
      pendingSubscription: pendingSubscription
        ? {
            id: pendingSubscription.id,
            fundName: pendingSubscription.fund?.name || "Fund",
            amount: pendingSubscription.amount.toString(),
            units: pendingSubscription.units,
            status: pendingSubscription.status,
            signingToken: pendingSigningToken,
            createdAt: pendingSubscription.createdAt.toISOString(),
          }
        : null,
      entityName: investor.entityName,
    });
  } catch (error) {
    console.error("Error fetching subscription status:", error);
    return res.status(500).json({ message: "Failed to fetch subscription status" });
  }
}
