import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import crypto from "crypto";
import prisma from "@/lib/prisma";
import { authOptions } from "../auth/[...nextauth]";
import { sendEmail } from "@/lib/resend";
import { apiRateLimiter } from "@/lib/security/rate-limiter";
import AccreditationConfirmedEmail from "@/components/emails/accreditation-confirmed";

interface CompleteGateBody {
  ndaAccepted: boolean;
  ndaSignature?: string;
  accreditationType?: string;
  confirmIncome?: boolean;
  confirmNetWorth?: boolean;
  confirmAccredited?: boolean;
  confirmRiskAware?: boolean;
  resendConfirmation?: boolean;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const allowed = await apiRateLimiter(req, res);
  if (!allowed) return;

  try {
    const session = await getServerSession(req, res, authOptions);

    if (!session?.user?.email) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { 
      ndaAccepted, 
      ndaSignature,
      accreditationType,
      confirmIncome,
      confirmNetWorth,
      confirmAccredited,
      confirmRiskAware,
      resendConfirmation,
    } = req.body as CompleteGateBody;

    // Handle resend confirmation request
    if (resendConfirmation) {
      try {
        await sendEmail({
          to: session.user.email,
          subject: "Accreditation Confirmation - BF Fund",
          react: AccreditationConfirmedEmail({
            investorName: session.user.name || "Investor",
            email: session.user.email,
            accreditationType: "Resent Confirmation",
            completedAt: new Date().toISOString(),
          }),
        });
        return res.status(200).json({ success: true, message: "Confirmation resent" });
      } catch (emailError) {
        console.error("Failed to resend confirmation:", emailError);
        return res.status(500).json({ message: "Failed to resend confirmation" });
      }
    }

    if (!ndaAccepted) {
      return res.status(400).json({ 
        message: "NDA acceptance is required" 
      });
    }

    // Validate signature is present and within size limits (max 500KB base64)
    if (!ndaSignature || typeof ndaSignature !== "string") {
      return res.status(400).json({ 
        message: "Signature is required" 
      });
    }

    const maxSignatureSize = 500 * 1024; // 500KB
    if (ndaSignature.length > maxSignatureSize) {
      return res.status(400).json({ 
        message: "Signature data exceeds maximum allowed size" 
      });
    }

    // Validate signature is a valid data URL
    if (!ndaSignature.startsWith("data:image/png;base64,")) {
      return res.status(400).json({ 
        message: "Invalid signature format" 
      });
    }

    if (!confirmAccredited || !confirmRiskAware) {
      return res.status(400).json({ 
        message: "Accreditation confirmation is required" 
      });
    }

    if (!confirmIncome && !confirmNetWorth) {
      return res.status(400).json({ 
        message: "At least one accreditation criterion (income or net worth) must be selected" 
      });
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
    const timestamp = new Date();

    const signedDocsData = user.investorProfile.signedDocs || [];
    // Create signature hash for integrity verification
    const signatureHash = crypto
      .createHash("sha256")
      .update(ndaSignature)
      .digest("hex");

    const ndaRecord = {
      type: "NDA",
      signedAt: timestamp.toISOString(),
      ipAddress,
      userAgent,
      signature: "captured",
      signatureHash,
      signatureData: ndaSignature,
    };

    const accreditationRecord = {
      type: "ACCREDITATION_ACK",
      signedAt: timestamp.toISOString(),
      accreditationType: accreditationType || (confirmIncome && confirmNetWorth ? "INCOME_AND_NET_WORTH" : confirmIncome ? "INCOME" : "NET_WORTH"),
      criteria: {
        income: confirmIncome || false,
        netWorth: confirmNetWorth || false,
      },
      ipAddress,
      userAgent,
    };

    await prisma.$transaction([
      prisma.investor.update({
        where: { id: user.investorProfile.id },
        data: {
          ndaSigned: true,
          ndaSignedAt: timestamp,
          accreditationStatus: "SELF_CERTIFIED",
          accreditationType: accreditationType || (confirmIncome && confirmNetWorth ? "INCOME_AND_NET_WORTH" : confirmIncome ? "INCOME" : "NET_WORTH"),
          signedDocs: [...(signedDocsData as any[]), ndaRecord, accreditationRecord],
        },
      }),
      prisma.accreditationAck.create({
        data: {
          investorId: user.investorProfile.id,
          acknowledged: true,
          method: "SELF_CERTIFIED",
          accreditationType: accreditationType || (confirmIncome && confirmNetWorth ? "INCOME_AND_NET_WORTH" : confirmIncome ? "INCOME" : "NET_WORTH"),
          accreditationDetails: {
            incomeQualification: confirmIncome || false,
            netWorthQualification: confirmNetWorth || false,
            incomeThreshold: "$200K individual / $300K joint",
            netWorthThreshold: "$1M excluding primary residence",
          },
          confirmAccredited: confirmAccredited || false,
          confirmRiskAware: confirmRiskAware || false,
          confirmDocReview: true,
          confirmRepresentations: true,
          ipAddress,
          userAgent,
          completedAt: timestamp,
          completedSteps: {
            step1_nda: { completed: true, timestamp: timestamp.toISOString() },
            step2_accreditation: { completed: true, timestamp: timestamp.toISOString() },
          },
        },
      }),
    ]);

    // Send confirmation email
    const finalAccreditationType = accreditationType || (confirmIncome && confirmNetWorth ? "INCOME_AND_NET_WORTH" : confirmIncome ? "INCOME" : "NET_WORTH");
    
    try {
      await sendEmail({
        to: session.user.email,
        subject: "Accreditation Confirmed - BF Fund",
        react: AccreditationConfirmedEmail({
          investorName: session.user.name || "Investor",
          email: session.user.email,
          accreditationType: finalAccreditationType,
          completedAt: timestamp.toISOString(),
        }),
      });
    } catch (emailError) {
      console.error("Failed to send confirmation email:", emailError);
    }

    return res.status(200).json({ 
      success: true,
      message: "Verification completed successfully" 
    });
  } catch (error: any) {
    console.error("Complete gate error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
