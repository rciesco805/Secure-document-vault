import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "./auth/[...nextauth]";

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
            accreditationAcks: {
              orderBy: { createdAt: "desc" },
              take: 1,
            },
          },
        },
      },
    });

    if (!user?.investorProfile) {
      return res.status(200).json({ 
        signed: false,
        ndaSigned: false,
        accreditationCompleted: false,
        message: "No investor profile found"
      });
    }

    const investor = user.investorProfile;
    const ndaSigned = investor.ndaSigned === true;
    const accreditationCompleted = investor.accreditationStatus !== "PENDING" && 
      investor.accreditationAcks.length > 0;

    const signed = ndaSigned && accreditationCompleted;

    return res.status(200).json({
      signed,
      ndaSigned,
      accreditationCompleted,
      accreditationStatus: investor.accreditationStatus,
      ndaSignedAt: investor.ndaSignedAt?.toISOString() || null,
      accreditationAck: accreditationCompleted ? {
        signedAt: investor.accreditationAcks[0]?.createdAt?.toISOString(),
        type: investor.accreditationAcks[0]?.accreditationType,
      } : null,
    });
  } catch (error) {
    console.error("Error checking compliance:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
