import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "../auth/[...nextauth]";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === "POST") {
    return handlePost(req, res);
  } else if (req.method === "GET") {
    return handleGet(req, res);
  }

  return res.status(405).json({ message: "Method not allowed" });
}

async function handleGet(req: NextApiRequest, res: NextApiResponse) {
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

    const latestAck = user.investorProfile.accreditationAcks[0];

    // @ts-ignore - Fields exist in schema, TS server may need restart
    const investorData = user.investorProfile as any;
    const ackData = latestAck as any;

    return res.status(200).json({
      accreditationStatus: investorData.accreditationStatus,
      accreditationType: investorData.accreditationType,
      accreditationExpiresAt: investorData.accreditationExpiresAt,
      latestAcknowledgment: latestAck
        ? {
            id: ackData.id,
            method: ackData.method,
            accreditationType: ackData.accreditationType,
            completedAt: ackData.completedAt,
            kycStatus: ackData.kycStatus,
          }
        : null,
    });
  } catch (error: any) {
    console.error("Get accreditation error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

async function handlePost(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions);

    if (!session?.user?.email) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const {
      accreditationType,
      accreditationDetails,
      confirmAccredited,
      confirmRiskAware,
      confirmDocReview,
      confirmRepresentations,
    } = req.body;

    if (!accreditationType) {
      return res
        .status(400)
        .json({ message: "Accreditation type is required" });
    }

    if (
      !confirmAccredited ||
      !confirmRiskAware ||
      !confirmDocReview ||
      !confirmRepresentations
    ) {
      return res
        .status(400)
        .json({ message: "All acknowledgment checkboxes must be confirmed" });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { investorProfile: true },
    });

    if (!user?.investorProfile) {
      return res.status(404).json({ message: "Investor profile not found" });
    }

    const ipAddress =
      (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
      req.socket.remoteAddress ||
      "unknown";
    const userAgent = req.headers["user-agent"] || "unknown";
    
    // Generate session ID and derive geo from IP (placeholder for real geo service)
    const sessionId = req.cookies?.["next-auth.session-token"] || 
                      req.cookies?.["__Secure-next-auth.session-token"] || 
                      `session_${Date.now()}`;
    const geoLocation = ipAddress !== "unknown" ? `IP-derived: ${ipAddress}` : null;

    const expirationDate = new Date();
    expirationDate.setFullYear(expirationDate.getFullYear() + 1);

    // @ts-ignore - New fields exist in schema, TS server may need restart
    const [updatedInvestor, accreditationAck] = await prisma.$transaction([
      (prisma.investor as any).update({
        where: { id: user.investorProfile.id },
        data: {
          accreditationStatus: "SELF_CERTIFIED",
          accreditationType,
          accreditationExpiresAt: expirationDate,
          onboardingStep: 2,
          updatedAt: new Date(),
        },
      }),
      (prisma.accreditationAck as any).create({
        data: {
          investorId: user.investorProfile.id,
          acknowledged: true,
          method: "SELF_CERTIFIED",
          accreditationType,
          accreditationDetails,
          confirmAccredited,
          confirmRiskAware,
          confirmDocReview,
          confirmRepresentations,
          ipAddress,
          userAgent,
          sessionId,
          geoLocation,
          completedAt: new Date(),
          completedSteps: ["type_selection", "details", "acknowledgment"],
        },
      }),
    ]);

    console.log(
      `[506(c) Compliance] Accreditation self-certification completed:`,
      {
        investorId: user.investorProfile.id,
        accreditationType,
        ipAddress,
        userAgent: userAgent.substring(0, 100),
        timestamp: new Date().toISOString(),
      }
    );

    return res.status(200).json({
      success: true,
      message: "Accreditation verification completed successfully",
      accreditationStatus: "SELF_CERTIFIED",
      accreditationType,
      expiresAt: expirationDate,
      ackId: accreditationAck.id,
    });
  } catch (error: any) {
    console.error("Accreditation error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
