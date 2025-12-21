import { NextApiRequest, NextApiResponse } from "next";

import { getLimits } from "@/ee/limits/server";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { getServerSession } from "next-auth/next";

import prisma from "@/lib/prisma";
import { CustomUser } from "@/lib/types";

export default async function handle(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method === "GET") {
    // GET /api/:teamId/limits
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).end("Unauthorized");
    }

    const { teamId } = req.query as { teamId: string };
    const userId = (session.user as CustomUser).id;

    try {
      // TODO: move this to a cache layer
      const team = await prisma.team.findUnique({
        where: {
          id: teamId,
          users: {
            some: {
              userId: userId,
            },
          },
        },
        select: {
          plan: true,
        },
      });

      const limits = await getLimits({ teamId, userId });

      // Self-hosted: always enable all features
      return res.status(200).json({
        ...limits,
        conversationsInDataroom: true,
        dataroomUpload: true,
      });
    } catch (error) {
      return res.status(500).json((error as Error).message);
    }
  } else {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
