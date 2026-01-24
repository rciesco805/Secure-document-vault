import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";

import { authOptions } from "../../auth/[...nextauth]";
import prisma from "@/lib/prisma";
import { errorhandler } from "@/lib/errorHandler";
import { CustomUser } from "@/lib/types";
import { isAdminRole } from "@/lib/team/roles";

export default async function handle(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "PUT") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).end("Unauthorized");
  }

  const { teamId } = req.query as { teamId: string };
  const { userId, hasFundroomAccess } = req.body;

  if (!userId || typeof hasFundroomAccess !== "boolean") {
    return res.status(400).json({ error: "Missing userId or hasFundroomAccess" });
  }

  try {
    const currentUser = await prisma.userTeam.findUnique({
      where: {
        userId_teamId: {
          userId: (session.user as CustomUser).id,
          teamId,
        },
      },
    });

    if (!currentUser || !isAdminRole(currentUser.role)) {
      return res.status(403).json({ error: "Only admins can change fundroom access" });
    }

    const targetUser = await prisma.userTeam.findUnique({
      where: {
        userId_teamId: {
          userId,
          teamId,
        },
      },
    });

    if (!targetUser) {
      return res.status(404).json({ error: "User not found in team" });
    }

    if (targetUser.role === "ADMIN") {
      return res.status(400).json({ error: "Super admins always have fundroom access" });
    }

    await prisma.userTeam.update({
      where: {
        userId_teamId: {
          userId,
          teamId,
        },
      },
      data: {
        hasFundroomAccess,
      },
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    errorhandler(error, res);
  }
}
