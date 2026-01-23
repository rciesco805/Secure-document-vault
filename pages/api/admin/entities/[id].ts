import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "../../auth/[...nextauth]";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions);

  if (!session?.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const userTeam = await prisma.userTeam.findFirst({
    where: { userId: session.user.id },
    include: { team: true },
  });

  if (!userTeam || !["ADMIN", "SUPER_ADMIN"].includes(userTeam.role)) {
    return res.status(403).json({ message: "Forbidden" });
  }

  const { id } = req.query;

  if (typeof id !== "string") {
    return res.status(400).json({ message: "Invalid ID" });
  }

  const entity = await prisma.entity.findFirst({
    where: { id, teamId: userTeam.teamId },
    include: {
      investors: {
        include: {
          investor: {
            include: { user: { select: { name: true, email: true } } },
          },
        },
      },
    },
  });

  if (!entity) {
    return res.status(404).json({ message: "Entity not found" });
  }

  if (req.method === "GET") {
    return res.status(200).json(entity);
  }

  if (req.method === "PATCH") {
    const { name, description, mode, fundConfig, startupConfig } = req.body;

    const updated = await prisma.entity.updateMany({
      where: { id, teamId: userTeam.teamId },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(mode !== undefined && { mode }),
        ...(fundConfig !== undefined && { fundConfig }),
        ...(startupConfig !== undefined && { startupConfig }),
      },
    });

    if (updated.count === 0) {
      return res.status(404).json({ message: "Entity not found" });
    }

    const result = await prisma.entity.findUnique({ where: { id } });
    return res.status(200).json(result);
  }

  if (req.method === "DELETE") {
    const deleted = await prisma.entity.deleteMany({
      where: { id, teamId: userTeam.teamId },
    });

    if (deleted.count === 0) {
      return res.status(404).json({ message: "Entity not found" });
    }

    return res.status(204).end();
  }

  return res.status(405).json({ message: "Method not allowed" });
}
