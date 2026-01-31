import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import prisma from "@/lib/prisma";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user?.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const investor = await prisma.investor.findFirst({
      where: { userId: session.user.id },
    });

    if (!investor) {
      return res.status(200).json({ investments: [] });
    }

    const manualInvestments = await (prisma as any).manualInvestment.findMany({
      where: {
        investorId: investor.id,
        status: "ACTIVE",
      },
      include: {
        fund: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
      },
      orderBy: { signedDate: "desc" },
    });

    const investments = manualInvestments.map((mi: any) => ({
      id: mi.id,
      fundId: mi.fundId,
      fundName: mi.fund?.name || "Unknown Fund",
      documentType: mi.documentType,
      documentTitle: mi.documentTitle,
      documentNumber: mi.documentNumber,
      commitmentAmount: mi.commitmentAmount.toString(),
      fundedAmount: mi.fundedAmount.toString(),
      unfundedAmount: mi.unfundedAmount.toString(),
      units: mi.units?.toString() || null,
      shares: mi.shares?.toString() || null,
      pricePerUnit: mi.pricePerUnit?.toString() || null,
      ownershipPercent: mi.ownershipPercent?.toString() || null,
      signedDate: mi.signedDate ? mi.signedDate.toISOString() : null,
      effectiveDate: mi.effectiveDate ? mi.effectiveDate.toISOString() : null,
      fundedDate: mi.fundedDate ? mi.fundedDate.toISOString() : null,
      transferStatus: mi.transferStatus,
      isVerified: mi.isVerified,
      notes: mi.notes,
    }));

    const totalCommitment = manualInvestments.reduce(
      (sum: number, mi: any) => sum + Number(mi.commitmentAmount),
      0
    );
    const totalFunded = manualInvestments.reduce(
      (sum: number, mi: any) => sum + Number(mi.fundedAmount),
      0
    );

    return res.status(200).json({
      investments,
      summary: {
        count: investments.length,
        totalCommitment: totalCommitment.toFixed(2),
        totalFunded: totalFunded.toFixed(2),
        totalUnfunded: (totalCommitment - totalFunded).toFixed(2),
      },
    });
  } catch (error) {
    console.error("[LP_MANUAL_INVESTMENTS] Error:", error);
    return res.status(500).json({ message: "Failed to fetch investments" });
  }
}
