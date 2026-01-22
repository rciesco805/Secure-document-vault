import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "../auth/[...nextauth]";
import { sendEmail } from "@/lib/emails/send-email";

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

    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ message: "Note content is required" });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { investorProfile: true },
    });

    if (!user?.investorProfile) {
      return res.status(404).json({ message: "Investor profile not found" });
    }

    const defaultTeam = await prisma.team.findFirst({
      orderBy: { createdAt: "asc" },
    });

    if (!defaultTeam) {
      return res.status(500).json({ message: "No team configured" });
    }

    await prisma.investorNote.create({
      data: {
        investorId: user.investorProfile.id,
        teamId: defaultTeam.id,
        content: content.trim(),
        isFromInvestor: true,
      },
    });

    return res.status(200).json({ 
      success: true,
      message: "Note sent successfully" 
    });
  } catch (error: any) {
    console.error("Investor note error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
