import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import prisma from "@/lib/prisma";
import { CustomUser } from "@/lib/types";
import { isAdminEmail } from "@/lib/constants/admins";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const user = session.user as CustomUser;
  const userEmail = user.email!.toLowerCase();
  const { teamId } = req.query as { teamId: string };

  if (!isAdminEmail(userEmail)) {
    const userTeam = await prisma.userTeam.findFirst({
      where: { teamId, userId: user.id },
    });
    if (!userTeam) {
      return res.status(403).json({ message: "Forbidden" });
    }
  }

  if (req.method === "GET") {
    try {
      const { status = "PENDING" } = req.query as { status?: string };

      const accessRequests = await prisma.accessRequest.findMany({
        where: {
          teamId,
          status: status as any,
        },
        include: {
          link: {
            select: {
              id: true,
              name: true,
              dataroom: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      return res.status(200).json(accessRequests);
    } catch (error) {
      console.error("Failed to fetch access requests:", error);
      return res.status(500).json({ message: "Failed to fetch access requests" });
    }
  }

  return res.status(405).json({ message: "Method not allowed" });
}
