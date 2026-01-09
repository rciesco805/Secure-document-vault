import { NextApiRequest, NextApiResponse } from "next";

import { getServerSession } from "next-auth";

import { errorhandler } from "@/lib/errorHandler";
import prisma from "@/lib/prisma";
import { CustomUser } from "@/lib/types";

import { authOptions } from "../../auth/[...nextauth]";

export default async function handle(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method === "PUT") {
    // DELETE /api/teams/:teamId/change-role
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).end("Unauthorized");
    }

    const { teamId } = req.query as { teamId: string };
    const userId = (session.user as CustomUser).id;

    const { userToBeChanged, role } = req.body as {
      userToBeChanged: string;
      role: "MEMBER" | "MANAGER" | "ADMIN";
    };

    try {
      const userTeam = await prisma.userTeam.findFirst({
        where: {
          teamId,
          userId,
        },
      });

      if (!userTeam) {
        return res.status(401).json("Unauthorized");
      }

      const isSuperAdmin = userTeam.role === "SUPER_ADMIN";
      const isAdmin = userTeam.role === "ADMIN" || isSuperAdmin;

      // Only ADMINs can change roles
      if (!isAdmin) {
        return res.status(403).json("Only admins can change user roles");
      }

      // Only super admin can promote someone to ADMIN
      if (role === "ADMIN" && !isSuperAdmin) {
        return res.status(403).json("Only the super admin can promote users to admin");
      }

      // Cannot change the super admin's role
      const targetUser = await prisma.userTeam.findFirst({
        where: { teamId, userId: userToBeChanged },
      });
      if (targetUser?.role === "SUPER_ADMIN") {
        return res.status(400).json("Cannot change the super admin's role");
      }

      await prisma.userTeam.update({
        where: {
          userId_teamId: {
            userId: userToBeChanged,
            teamId,
          },
        },
        data: {
          role,
        },
      });
      return res.status(204).end();
    } catch (error) {
      errorhandler(error, res);
    }
  } else {
    res.setHeader("Allow", ["PUT"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
