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
            investments: {
              include: {
                fund: true,
              },
            },
            capitalCalls: {
              include: {
                capitalCall: {
                  include: {
                    fund: true,
                  },
                },
              },
            },
            documents: {
              orderBy: { createdAt: "desc" },
              take: 10,
            },
            accreditationAcks: {
              orderBy: { createdAt: "desc" },
              take: 1,
            },
          },
        },
      },
    });

    if (!user?.investorProfile) {
      return res.status(404).json({ message: "Investor profile not found" });
    }

    const capitalCalls = user.investorProfile.capitalCalls.map((ccr) => ({
      id: ccr.id,
      callNumber: ccr.capitalCall.callNumber,
      amount: ccr.amountDue.toString(),
      dueDate: ccr.capitalCall.dueDate.toISOString(),
      status: ccr.status,
      fundName: ccr.capitalCall.fund.name,
    }));

    const investments = user.investorProfile.investments || [];
    const ndaGateEnabled = investments.length > 0
      ? investments.some((inv: any) => inv.fund?.ndaGateEnabled !== false)
      : true;

    // Get Persona KYC status using raw query (new fields may not be in Prisma types)
    const personaData = await prisma.$queryRaw<Array<{
      personaStatus: string;
      personaVerifiedAt: Date | null;
    }>>`
      SELECT "personaStatus", "personaVerifiedAt"
      FROM "Investor"
      WHERE id = ${user.investorProfile.id}
      LIMIT 1
    `;
    const kycInfo = personaData[0] || { personaStatus: "NOT_STARTED", personaVerifiedAt: null };

    // Check accreditation acknowledgment completion
    const latestAck = user.investorProfile.accreditationAcks[0];
    const accreditationComplete = latestAck?.acknowledged === true && latestAck?.completedAt !== null;

    // Calculate gate completion progress
    const gateProgress = {
      ndaCompleted: user.investorProfile.ndaSigned,
      accreditationCompleted: accreditationComplete,
      completionPercentage: 
        (user.investorProfile.ndaSigned ? 50 : 0) + 
        (accreditationComplete ? 50 : 0),
    };

    return res.status(200).json({
      investor: {
        id: user.investorProfile.id,
        entityName: user.investorProfile.entityName,
        ndaSigned: user.investorProfile.ndaSigned,
        ndaSignedAt: user.investorProfile.ndaSignedAt?.toISOString() || null,
        accreditationStatus: user.investorProfile.accreditationStatus,
        accreditationType: user.investorProfile.accreditationType,
        fundData: user.investorProfile.fundData,
        signedDocs: user.investorProfile.signedDocs || [],
        documents: user.investorProfile.documents || [],
        kycStatus: kycInfo.personaStatus,
        kycVerifiedAt: kycInfo.personaVerifiedAt?.toISOString() || null,
        accreditationAck: latestAck ? {
          completedAt: latestAck.completedAt?.toISOString() || null,
          accreditationType: latestAck.accreditationType,
          method: latestAck.method,
        } : null,
      },
      capitalCalls,
      ndaGateEnabled,
      gateProgress,
    });
  } catch (error: any) {
    console.error("LP me error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
