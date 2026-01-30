import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";

import prisma from "@/lib/prisma";
import { errorhandler } from "@/lib/errorHandler";
import { CustomUser } from "@/lib/types";

import { authOptions } from "../../../auth/[...nextauth]";

export default async function handle(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { teamId } = req.query as { teamId: string };
  const userId = (session.user as CustomUser).id;

  const userTeam = await prisma.userTeam.findFirst({
    where: { teamId, userId },
  });

  if (!userTeam) {
    return res.status(403).json({ error: "Access denied" });
  }

  if (req.method === "GET") {
    try {
      const { type } = req.query;

      const where: any = { teamId };
      if (type) {
        where.reportType = type;
      }

      const [templates, recentReports] = await Promise.all([
        prisma.reportTemplate.findMany({
          where,
          orderBy: { createdAt: "desc" },
        }),
        prisma.generatedReport.findMany({
          where: { teamId },
          orderBy: { createdAt: "desc" },
          take: 20,
          include: {
            template: {
              select: { name: true },
            },
          },
        }),
      ]);

      return res.status(200).json({ templates, recentReports });
    } catch (error) {
      errorhandler(error, res);
    }
  } else {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
