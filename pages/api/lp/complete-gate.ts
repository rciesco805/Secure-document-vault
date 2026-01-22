import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "../auth/[...nextauth]";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const session = await getServerSession(req, res, authOptions);

    if (!session?.user?.email) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { ndaAccepted, accreditationAck } = req.body;

    if (!ndaAccepted || !accreditationAck) {
      return res.status(400).json({ 
        message: "Both NDA and accreditation acknowledgment are required" 
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

    const signedDocsData = user.investorProfile.signedDocs || [];
    const ndaRecord = {
      type: "NDA",
      signedAt: new Date().toISOString(),
      ipAddress,
      userAgent,
    };

    await prisma.$transaction([
      prisma.investor.update({
        where: { id: user.investorProfile.id },
        data: {
          ndaSigned: true,
          ndaSignedAt: new Date(),
          accreditationStatus: "SELF_CERTIFIED",
          signedDocs: [...(signedDocsData as any[]), ndaRecord],
        },
      }),
      prisma.accreditationAck.create({
        data: {
          investorId: user.investorProfile.id,
          acknowledged: true,
          method: "SELF_CERTIFIED",
          ipAddress,
          userAgent,
        },
      }),
    ]);

    return res.status(200).json({ 
      success: true,
      message: "Verification completed successfully" 
    });
  } catch (error: any) {
    console.error("Complete gate error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
