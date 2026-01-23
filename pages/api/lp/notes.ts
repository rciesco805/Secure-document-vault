import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "../auth/[...nextauth]";
import { Resend } from "resend";

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

    const note = await prisma.investorNote.create({
      data: {
        investorId: user.investorProfile.id,
        teamId: defaultTeam.id,
        content: content.trim(),
        isFromInvestor: true,
      },
    });

    if (process.env.RESEND_API_KEY) {
      try {
        const resend = new Resend(process.env.RESEND_API_KEY);
        
        const teamOwner = await prisma.userTeam.findFirst({
          where: { teamId: defaultTeam.id, role: "OWNER" as any },
          include: { user: true },
        });
        
        const gpEmail = (teamOwner as any)?.user?.email || process.env.DEFAULT_GP_EMAIL;
        
        if (gpEmail) {
          await resend.emails.send({
            from: process.env.RESEND_FROM_EMAIL || "BF Fund <noreply@bffund.co>",
            to: gpEmail,
            subject: `New Message from Investor: ${user.investorProfile.entityName || session.user.email}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #1a1a1a;">New Investor Message</h2>
                <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 16px 0;">
                  <p style="margin: 0; color: #333;"><strong>From:</strong> ${user.investorProfile.entityName || "Investor"}</p>
                  <p style="margin: 8px 0 0 0; color: #333;"><strong>Email:</strong> ${session.user.email}</p>
                </div>
                <div style="background: #fff; border: 1px solid #e0e0e0; padding: 16px; border-radius: 8px;">
                  <p style="margin: 0; color: #333; white-space: pre-wrap;">${content.trim()}</p>
                </div>
                <p style="color: #666; font-size: 12px; margin-top: 24px;">
                  This message was sent via the LP Portal. Log in to respond.
                </p>
              </div>
            `,
          });
        }
      } catch (emailErr) {
        console.error("Failed to send GP notification email:", emailErr);
      }
    }

    return res.status(200).json({ 
      success: true,
      message: "Note sent successfully" 
    });
  } catch (error: any) {
    console.error("Investor note error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
