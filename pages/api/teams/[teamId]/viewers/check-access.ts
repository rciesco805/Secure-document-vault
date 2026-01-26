import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";

import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { errorhandler } from "@/lib/errorHandler";
import { CustomUser } from "@/lib/types";
import prisma from "@/lib/prisma";
import {
  checkCrossLogAccess,
  getAccessRevokeImpact,
  verifyBeforeGrantingAccess,
} from "@/lib/access/cross-log-verification";

export default async function handle(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).end("Unauthorized");
  }

  const { teamId } = req.query as { teamId: string };
  const { email, viewerId, action, targetDataroomId, targetGroupId } = req.body;

  const userId = (session.user as CustomUser).id;

  try {
    // Verify team membership
    const team = await prisma.team.findUnique({
      where: {
        id: teamId,
        users: {
          some: {
            userId,
          },
        },
      },
      select: { id: true },
    });

    if (!team) {
      return res.status(404).json({ message: "Team not found" });
    }

    // Handle different action types
    switch (action) {
      case "check-access": {
        // Check if email has access across all logs
        if (!email) {
          return res.status(400).json({ message: "Email is required" });
        }
        const accessCheck = await checkCrossLogAccess(teamId, email);
        return res.status(200).json(accessCheck);
      }

      case "revoke-impact": {
        // Get impact of revoking access for a viewer
        if (!viewerId) {
          return res.status(400).json({ message: "viewerId is required" });
        }
        const impact = await getAccessRevokeImpact(teamId, viewerId);
        return res.status(200).json(impact);
      }

      case "verify-grant": {
        // Verify before granting new access
        if (!email) {
          return res.status(400).json({ message: "Email is required" });
        }
        const verification = await verifyBeforeGrantingAccess(
          teamId,
          email,
          targetDataroomId,
          targetGroupId
        );
        return res.status(200).json(verification);
      }

      default:
        return res.status(400).json({
          message: "Invalid action. Use: check-access, revoke-impact, or verify-grant",
        });
    }
  } catch (error) {
    console.error("Error checking access:", error);
    errorhandler(error, res);
  }
}
