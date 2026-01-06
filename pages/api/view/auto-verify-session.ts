import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import prisma from "@/lib/prisma";
import { authOptions } from "@/pages/api/auth/[...nextauth]";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    
    if (!session?.user?.email) {
      return res.status(401).json({ verified: false, error: "Not authenticated" });
    }

    const { email, linkId } = req.body;

    if (!email || !linkId) {
      return res.status(400).json({ verified: false, error: "Missing required fields" });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const sessionEmail = session.user.email.toLowerCase().trim();
    
    if (normalizedEmail !== sessionEmail) {
      return res.status(403).json({ verified: false, error: "Email mismatch" });
    }

    const link = await prisma.link.findUnique({
      where: { id: linkId },
      select: {
        id: true,
        emailProtected: true,
        emailAuthenticated: true,
        allowList: true,
        groupId: true,
        audienceType: true,
        dataroom: {
          select: {
            id: true,
            teamId: true,
          },
        },
      },
    });

    if (!link) {
      return res.status(404).json({ verified: false, error: "Link not found" });
    }

    let hasAccess = false;

    if (link.audienceType === "GROUP" && link.groupId) {
      const membership = await prisma.viewerGroupMembership.findFirst({
        where: {
          group: {
            id: link.groupId,
          },
          viewer: {
            email: normalizedEmail,
          },
        },
      });
      
      if (membership) {
        hasAccess = true;
      }
    }

    if (!hasAccess && link.allowList && link.allowList.length > 0) {
      const normalizedAllowList = link.allowList.map((e: string) => e.toLowerCase().trim());
      if (normalizedAllowList.includes(normalizedEmail)) {
        hasAccess = true;
      }
    }

    if (!hasAccess && link.dataroom?.teamId) {
      const viewer = await prisma.viewer.findFirst({
        where: {
          email: normalizedEmail,
          teamId: link.dataroom.teamId,
        },
      });

      if (viewer) {
        const dataroomMembership = await prisma.viewerGroupMembership.findFirst({
          where: {
            viewerId: viewer.id,
            group: {
              dataroomId: link.dataroom.id,
            },
          },
        });
        if (dataroomMembership) {
          hasAccess = true;
        }
      }
    }

    if (hasAccess) {
      return res.status(200).json({ verified: true, email: normalizedEmail });
    }

    return res.status(403).json({ verified: false, error: "No access to this dataroom" });
  } catch (error) {
    console.error("Auto-verify session error:", error);
    return res.status(500).json({ verified: false, error: "Internal server error" });
  }
}
