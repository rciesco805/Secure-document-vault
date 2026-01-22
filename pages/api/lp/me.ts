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

    return res.status(200).json({
      investor: {
        id: user.investorProfile.id,
        entityName: user.investorProfile.entityName,
        ndaSigned: user.investorProfile.ndaSigned,
        accreditationStatus: user.investorProfile.accreditationStatus,
        fundData: user.investorProfile.fundData,
        signedDocs: user.investorProfile.signedDocs || [],
      },
      capitalCalls,
    });
  } catch (error: any) {
    console.error("LP me error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
