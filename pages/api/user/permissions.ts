import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import prisma from "@/lib/prisma";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { CustomUser } from "@/lib/types";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const session = await getServerSession(req, res, authOptions);

    if (!session?.user?.email) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const user = session.user as CustomUser;

    const userTeams = await prisma.userTeam.findMany({
      where: { userId: user.id },
      select: {
        role: true,
        hasFundroomAccess: true,
        team: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    const hasDataroomAccess = userTeams.length > 0;
    const hasFundroomAccess = userTeams.some((ut) => ut.hasFundroomAccess);
    const isSuperAdmin = userTeams.some((ut) => ut.role === "ADMIN");

    return res.status(200).json({
      hasDataroomAccess,
      hasFundroomAccess: hasFundroomAccess || isSuperAdmin,
      isSuperAdmin,
      teams: userTeams.map((ut) => ({
        id: ut.team.id,
        name: ut.team.name,
        role: ut.role,
        hasFundroomAccess: ut.hasFundroomAccess || isSuperAdmin,
      })),
    });
  } catch (error) {
    console.error("Error fetching user permissions:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
