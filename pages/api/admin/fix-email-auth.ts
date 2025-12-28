import { NextApiRequest, NextApiResponse } from "next";

import { getServerSession } from "next-auth";

import { authOptions } from "@/pages/api/auth/[...nextauth]";

import prisma from "@/lib/prisma";

const ADMIN_EMAILS = [
  "rciesco@gmail.com",
  "investors@bermudafranchisegroup.com",
];

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email || !ADMIN_EMAILS.includes(session.user.email)) {
    return res.status(403).json({ error: "Admin access required" });
  }

  try {
    const result = await prisma.link.updateMany({
      where: {
        emailAuthenticated: false,
      },
      data: {
        emailAuthenticated: true,
      },
    });

    const presetResult = await prisma.linkPreset.updateMany({
      where: {
        emailAuthenticated: false,
      },
      data: {
        emailAuthenticated: true,
      },
    });

    return res.status(200).json({
      message: "Successfully updated email authentication settings",
      linksUpdated: result.count,
      presetsUpdated: presetResult.count,
    });
  } catch (error) {
    console.error("Fix email auth error:", error);
    return res.status(500).json({
      error: "Failed to update settings",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
