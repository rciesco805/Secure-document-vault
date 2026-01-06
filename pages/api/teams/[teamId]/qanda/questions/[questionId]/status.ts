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

  const { teamId, questionId } = req.query as { teamId: string; questionId: string };
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

  if (req.method === "PATCH") {
    const { status } = req.body;

    if (!status || !["OPEN", "ANSWERED", "CLOSED"].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    try {
      const question = await prisma.dataroomQuestion.update({
        where: {
          id: questionId,
          teamId,
        },
        data: {
          status,
          resolvedAt: status === "CLOSED" ? new Date() : null,
        },
      });

      return res.status(200).json(question);
    } catch (error) {
      console.error("Error updating question status:", error);
      return res.status(500).json({ error: "Failed to update status" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
