import { NextApiRequest, NextApiResponse } from "next";

import { getServerSession } from "next-auth";

import { errorhandler } from "@/lib/errorHandler";
import prisma from "@/lib/prisma";
import { isAdminRole, isSuperAdminRole } from "@/lib/team/roles";
import { CustomUser } from "@/lib/types";

import { authOptions } from "../../auth/[...nextauth]";

export default async function handle(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method === "DELETE") {
    // DELETE /api/teams/:teamId/remove-teammate
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).end("Unauthorized");
    }

    const { teamId } = req.query as { teamId: string };
    const userId = (session.user as CustomUser).id;

    const { userToBeDeleted } = req.body;

    try {
      // Check if the current user is an admin of this team
      const currentUserTeam = await prisma.userTeam.findFirst({
        where: {
          teamId,
          userId,
        },
      });

      if (!currentUserTeam || !isAdminRole(currentUserTeam.role)) {
        return res.status(403).json("Only admins can remove team members");
      }

      const isSuperAdmin = isSuperAdminRole(currentUserTeam.role);

      // Check if the user to be deleted is part of this team
      const targetUserTeam = await prisma.userTeam.findFirst({
        where: {
          teamId,
          userId: userToBeDeleted,
        },
      });

      if (!targetUserTeam) {
        return res.status(404).json("The teammate isn't part of this team");
      }

      // Only super admin can remove other admins
      if (isAdminRole(targetUserTeam.role) && !isSuperAdmin) {
        return res.status(403).json("Only the super admin can remove admins");
      }

      // Prevent removing the super admin (they must transfer role first)
      if (isSuperAdminRole(targetUserTeam.role)) {
        return res.status(400).json("Cannot remove the super admin. Transfer the role to another admin first.");
      }

      const userToDelete = await prisma.user.findUnique({
        where: { id: userToBeDeleted },
        select: { email: true },
      });

      await Promise.all([
        // update all documents owned by the user to be deleted to be owned by the team
        prisma.document.updateMany({
          where: {
            teamId,
            ownerId: userToBeDeleted,
          },
          data: {
            ownerId: null,
          },
        }),
        // delete the user from the team
        prisma.userTeam.delete({
          where: {
            userId_teamId: {
              userId: userToBeDeleted,
              teamId,
            },
          },
        }),
        // delete any pending invitations for this user's email
        ...(userToDelete?.email
          ? [
              prisma.invitation.deleteMany({
                where: {
                  teamId,
                  email: userToDelete.email,
                },
              }),
            ]
          : []),
      ]);

      return res.status(204).end();
    } catch (error) {
      errorhandler(error, res);
    }
  } else {
    res.setHeader("Allow", ["DELETE"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
