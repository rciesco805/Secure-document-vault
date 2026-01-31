import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "../auth/[...nextauth]";
import { logAccreditationEvent } from "@/lib/audit/audit-logger";

const HIGH_VALUE_THRESHOLD = 200000;

function shouldAutoApprove(
  commitmentAmount: number,
  fundMinimum: number,
  allCheckboxesConfirmed: boolean
): { autoApprove: boolean; needsReview: boolean; reason: string } {
  const isHighValue = commitmentAmount >= HIGH_VALUE_THRESHOLD;
  // If fund has no minimum set (0), high-value investors auto-approve
  const meetsMinimum = fundMinimum > 0 ? commitmentAmount >= fundMinimum : isHighValue;
  
  if (!allCheckboxesConfirmed) {
    return { autoApprove: false, needsReview: true, reason: "Not all acknowledgments confirmed" };
  }
  
  // High-value investors always auto-approve with self-attestation
  if (isHighValue) {
    return { autoApprove: true, needsReview: false, reason: "High-value commitment with self-attestation" };
  }
  
  // Meets fund minimum with self-attestation
  if (meetsMinimum && fundMinimum > 0) {
    return { autoApprove: true, needsReview: false, reason: "Minimum commitment met with self-attestation" };
  }
  
  // Below threshold - flag for manual review
  return { autoApprove: false, needsReview: true, reason: "Below high-value threshold, requires manual review" };
}

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
            fund: true,
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

    const minimumInvestment = investorData.fund?.minimumInvestment 
      ? parseFloat(investorData.fund.minimumInvestment.toString()) 
      : 0;
    const eligibleForSimplifiedPath = minimumInvestment >= HIGH_VALUE_THRESHOLD;

    return res.status(200).json({
      accreditationStatus: investorData.accreditationStatus,
      accreditationType: investorData.accreditationType,
      accreditationExpiresAt: investorData.accreditationExpiresAt,
      highValueThreshold: HIGH_VALUE_THRESHOLD,
      eligibleForSimplifiedPath,
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
      useSimplifiedPath,
      intendedCommitment,
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
      include: { 
        investorProfile: {
          include: { fund: true },
        },
      },
    });

    if (!user?.investorProfile) {
      return res.status(404).json({ message: "Investor profile not found" });
    }

    const ipAddress =
      (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
      req.socket.remoteAddress ||
      "unknown";
    const userAgent = req.headers["user-agent"] || "unknown";
    
    const sessionId = req.cookies?.["next-auth.session-token"] || 
                      req.cookies?.["__Secure-next-auth.session-token"] || 
                      `session_${Date.now()}`;
    const geoLocation = ipAddress !== "unknown" ? `IP-derived: ${ipAddress}` : null;

    const expirationDate = new Date();
    expirationDate.setFullYear(expirationDate.getFullYear() + 1);

    const commitmentAmount = parseFloat(intendedCommitment) || 0;
    const fundMinimum = user.investorProfile.fund?.minimumInvestment 
      ? parseFloat(user.investorProfile.fund.minimumInvestment.toString()) 
      : 0;
    
    const allCheckboxesConfirmed = confirmAccredited && confirmRiskAware && confirmDocReview && confirmRepresentations;
    const approvalDecision = shouldAutoApprove(commitmentAmount, fundMinimum, allCheckboxesConfirmed);
    
    const isHighValueInvestor = commitmentAmount >= HIGH_VALUE_THRESHOLD || fundMinimum >= HIGH_VALUE_THRESHOLD;
    const verificationMethod = useSimplifiedPath && isHighValueInvestor 
      ? "SELF_ATTEST_HIGH_VALUE" 
      : "SELF_CERTIFIED";

    const accreditationStatus = approvalDecision.autoApprove ? "SELF_CERTIFIED" : "PENDING";

    // @ts-ignore - New fields exist in schema, TS server may need restart
    const [updatedInvestor, accreditationAck] = await prisma.$transaction([
      (prisma.investor as any).update({
        where: { id: user.investorProfile.id },
        data: {
          accreditationStatus,
          accreditationType,
          accreditationExpiresAt: approvalDecision.autoApprove ? expirationDate : null,
          onboardingStep: approvalDecision.autoApprove ? 2 : 1,
          updatedAt: new Date(),
        },
      }),
      (prisma.accreditationAck as any).create({
        data: {
          investorId: user.investorProfile.id,
          acknowledged: true,
          method: verificationMethod,
          accreditationType,
          accreditationDetails: {
            ...accreditationDetails,
            intendedCommitment: commitmentAmount,
            simplifiedPathUsed: useSimplifiedPath && isHighValueInvestor,
            highValueThreshold: HIGH_VALUE_THRESHOLD,
            approvalReason: approvalDecision.reason,
          },
          confirmAccredited,
          confirmRiskAware,
          confirmDocReview,
          confirmRepresentations,
          autoApproved: approvalDecision.autoApprove,
          needsManualReview: approvalDecision.needsReview,
          minimumCommitmentMet: commitmentAmount >= fundMinimum && fundMinimum > 0,
          commitmentAmount: commitmentAmount > 0 ? commitmentAmount.toString() : null,
          ipAddress,
          userAgent,
          sessionId,
          geoLocation,
          completedAt: approvalDecision.autoApprove ? new Date() : null,
          completedSteps: useSimplifiedPath && isHighValueInvestor
            ? ["high_value_attestation", "acknowledgment"]
            : ["type_selection", "details", "acknowledgment"],
        },
      }),
    ]);

    console.log(
      `[506(c) Compliance] Accreditation ${verificationMethod} completed:`,
      {
        investorId: user.investorProfile.id,
        accreditationType,
        verificationMethod,
        intendedCommitment: commitmentAmount,
        isHighValueInvestor,
        autoApproved: approvalDecision.autoApprove,
        needsManualReview: approvalDecision.needsReview,
        approvalReason: approvalDecision.reason,
        ipAddress,
        userAgent: userAgent.substring(0, 100),
        timestamp: new Date().toISOString(),
      }
    );

    await logAccreditationEvent(req, {
      eventType: approvalDecision.autoApprove ? "ACCREDITATION_AUTO_APPROVED" : "ACCREDITATION_SUBMITTED",
      userId: user.id,
      teamId: user.investorProfile.fund?.teamId || null,
      investorId: user.investorProfile.id,
      accreditationType,
      commitmentAmount,
      autoApproved: approvalDecision.autoApprove,
      reason: approvalDecision.reason,
    });

    return res.status(200).json({
      success: true,
      message: approvalDecision.autoApprove
        ? isHighValueInvestor && useSimplifiedPath
          ? "Simplified accreditation completed for high-value commitment"
          : "Accreditation verification completed successfully"
        : "Accreditation submitted for review",
      accreditationStatus,
      accreditationType,
      verificationMethod,
      expiresAt: approvalDecision.autoApprove ? expirationDate : null,
      ackId: accreditationAck.id,
      simplifiedPathUsed: useSimplifiedPath && isHighValueInvestor,
      autoApproved: approvalDecision.autoApprove,
      needsManualReview: approvalDecision.needsReview,
      approvalReason: approvalDecision.reason,
    });
  } catch (error: any) {
    console.error("Accreditation error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
