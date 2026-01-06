import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import prisma from "@/lib/prisma";
import { CustomUser } from "@/lib/types";

export default async function handle(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { teamId } = req.query as { teamId: string };
  const userId = (session.user as CustomUser).id;

  const userTeam = await prisma.userTeam.findFirst({
    where: {
      userId,
      teamId,
    },
  });

  if (!userTeam) {
    return res.status(403).json({ error: "Not authorized for this team" });
  }

  if (req.method === "GET") {
    const { dataroomId, linkId, status, limit = "50", offset = "0" } = req.query;

    try {
      const where: any = { teamId };
      if (dataroomId) where.dataroomId = dataroomId;
      if (linkId) where.linkId = linkId;
      if (status) where.status = status;

      const questions = await prisma.dataroomQuestion.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: parseInt(limit as string),
        skip: parseInt(offset as string),
        include: {
          document: { select: { id: true, name: true } },
          dataroom: { select: { id: true, name: true } },
          link: { select: { id: true, name: true } },
          messages: {
            orderBy: { createdAt: "asc" },
          },
        },
      });

      const total = await prisma.dataroomQuestion.count({ where });

      return res.status(200).json({ questions, total });
    } catch (error) {
      console.error("Error fetching questions:", error);
      return res.status(500).json({ error: "Failed to fetch questions" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
