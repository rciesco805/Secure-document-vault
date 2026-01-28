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

  const teamId = userTeam.teamId;

  if (req.method === "GET") {
    const entities = await prisma.entity.findMany({
      where: { teamId },
      include: {
        _count: { select: { investors: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return res.status(200).json(entities);
  }

  if (req.method === "POST") {
    const { name, description, mode } = req.body;

    if (!name) {
      return res.status(400).json({ message: "Name is required" });
    }

    const entity = await prisma.entity.create({
      data: {
        teamId,
        name,
        description,
        mode: mode || "FUND",
        fundConfig: mode === "FUND" ? {} : undefined,
        startupConfig: mode === "STARTUP" ? {} : undefined,
      },
    });

    return res.status(201).json(entity);
  }

  return res.status(405).json({ message: "Method not allowed" });
}
