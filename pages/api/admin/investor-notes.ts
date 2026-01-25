import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "../auth/[...nextauth]";
import { Resend } from "resend";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const session = await getServerSession(req, res, authOptions);

    if (!session?.user?.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { teams: true },
    });

    if (!user || user.role !== "GP") {
      return res.status(403).json({ message: "GP access required" });
    }

    const teamIds = user.teams.map((t) => t.teamId);

    if (req.method === "GET") {
      return handleGet(req, res, teamIds);
    } else if (req.method === "POST") {
      return handlePost(req, res, user, teamIds);
    }

    return res.status(405).json({ message: "Method not allowed" });
  } catch (error: any) {
    console.error("Investor notes error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

async function handleGet(
  req: NextApiRequest,
  res: NextApiResponse,
  teamIds: string[]
) {
  const { teamId, investorId, limit = "50", offset = "0" } = req.query;

  const where: any = {
    teamId: teamId ? (teamId as string) : { in: teamIds },
  };

  if (investorId) {
    where.investorId = investorId as string;
  }

  const [notes, total] = await Promise.all([
    prisma.investorNote.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: parseInt(limit as string),
      skip: parseInt(offset as string),
      include: {
        investor: {
          select: {
            id: true,
            entityName: true,
            user: {
              select: { name: true, email: true },
            },
          },
        },
      },
    }),
    prisma.investorNote.count({ where }),
  ]);

  return res.status(200).json({ notes, total });
}

async function handlePost(
  req: NextApiRequest,
  res: NextApiResponse,
  user: any,
  teamIds: string[]
) {
  const { investorId, content } = req.body;

  if (!investorId || !content?.trim()) {
    return res.status(400).json({ message: "Investor ID and content are required" });
  }

  const investor = await prisma.investor.findUnique({
    where: { id: investorId },
    include: {
      user: { select: { email: true, name: true } },
      fund: { select: { teamId: true } },
    },
  });

  if (!investor) {
    return res.status(404).json({ message: "Investor not found" });
  }

  const teamId = investor.fund?.teamId || teamIds[0];

  if (!teamIds.includes(teamId)) {
    return res.status(403).json({ message: "Not authorized for this investor's team" });
  }

  const note = await prisma.investorNote.create({
    data: {
      investorId,
      teamId,
      content: content.trim(),
      isFromInvestor: false,
    },
  });

  if (process.env.RESEND_API_KEY && investor.user.email) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);

      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || "BF Fund <noreply@bffund.co>",
        to: investor.user.email,
        subject: "New Message from Your Fund Manager",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #1a1a1a;">New Message from Fund Manager</h2>
            <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 16px 0;">
              <p style="margin: 0; color: #333;"><strong>From:</strong> ${user.name || "Fund Manager"}</p>
            </div>
            <div style="background: #fff; border: 1px solid #e0e0e0; padding: 16px; border-radius: 8px;">
              <p style="margin: 0; color: #333; white-space: pre-wrap;">${content.trim()}</p>
            </div>
            <p style="color: #666; font-size: 12px; margin-top: 24px;">
              Log in to your investor portal to respond or view all communications.
            </p>
          </div>
        `,
      });
    } catch (emailErr) {
      console.error("Failed to send LP notification email:", emailErr);
    }
  }

  return res.status(200).json({
    success: true,
    note: {
      id: note.id,
      content: note.content,
      createdAt: note.createdAt,
    },
  });
}
