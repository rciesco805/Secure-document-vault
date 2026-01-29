import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/prisma";
import { isAdminEmail } from "@/lib/constants/admins";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { email } = req.body;

  if (!email || typeof email !== "string") {
    return res.status(400).json({ message: "Email is required" });
  }

  const emailLower = email.toLowerCase().trim();

  try {
    const isAdmin = isAdminEmail(emailLower);
    if (isAdmin) {
      return res.status(200).json({ 
        isAuthorized: true, 
        isAdmin: true,
        message: "Admin access - you will enter as a visitor through this portal"
      });
    }

    const existingViewer = await prisma.viewer.findFirst({
      where: {
        email: { equals: emailLower, mode: "insensitive" },
        accessRevokedAt: null,
      },
      select: { id: true, email: true, teamId: true }
    });

    if (existingViewer) {
      return res.status(200).json({ 
        isAuthorized: true, 
        isAdmin: false,
        message: "Viewer access granted"
      });
    }

    const viewerWithGroups = await prisma.viewer.findFirst({
      where: {
        email: { equals: emailLower, mode: "insensitive" },
        groups: {
          some: {}
        }
      },
      select: { id: true, email: true }
    });

    if (viewerWithGroups) {
      return res.status(200).json({ 
        isAuthorized: true, 
        isAdmin: false,
        message: "Viewer group access granted"
      });
    }

    const linkWithEmail = await prisma.link.findFirst({
      where: {
        allowList: { has: emailLower },
        deletedAt: null,
        isArchived: false,
      },
      select: { id: true, name: true }
    });

    if (linkWithEmail) {
      return res.status(200).json({ 
        isAuthorized: true, 
        isAdmin: false,
        message: "Link access granted"
      });
    }

    return res.status(200).json({ 
      isAuthorized: false, 
      isAdmin: false,
      message: "Email not found in approved access list"
    });
  } catch (error) {
    console.error("[CHECK-VISITOR] Error checking authorization:", error);
    return res.status(500).json({ 
      message: "Error checking authorization",
      isAuthorized: false 
    });
  }
}
