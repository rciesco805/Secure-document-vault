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
    const { dataroomId, linkId, limit = "50", offset = "0" } = req.query;

    try {
      const where: any = { teamId };
      if (dataroomId) where.dataroomId = dataroomId;
      if (linkId) where.linkId = linkId;

      const notes = await prisma.viewerNote.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: parseInt(limit as string),
        skip: parseInt(offset as string),
        include: {
          document: { select: { id: true, name: true } },
          dataroom: { select: { id: true, name: true } },
          link: { select: { id: true, name: true } },
        },
      });

      const total = await prisma.viewerNote.count({ where });

      return res.status(200).json({ notes, total });
    } catch (error) {
      console.error("Error fetching notes:", error);
      return res.status(500).json({ error: "Failed to fetch notes" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
