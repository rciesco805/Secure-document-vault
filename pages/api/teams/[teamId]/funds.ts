import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "../../auth/[...nextauth]";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const session = await getServerSession(req, res, authOptions);

  if (!session?.user?.email) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const { teamId } = req.query;

  if (!teamId || typeof teamId !== "string") {
    return res.status(400).json({ message: "Team ID required" });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        teams: {
          where: { teamId },
        },
      },
    });

    if (!user || user.teams.length === 0) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const userRole = user.teams[0].role;
    if (!["ADMIN", "OWNER"].includes(userRole)) {
      return res.status(403).json({ message: "Admin access required" });
    }

    const funds = await prisma.fund.findMany({
      where: { teamId },
      include: {
        _count: {
          select: { investments: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return res.status(200).json({
      funds: funds.map((fund) => ({
        id: fund.id,
        name: fund.name,
        description: fund.description,
        status: fund.status,
        ndaGateEnabled: fund.ndaGateEnabled,
        targetRaise: fund.targetRaise.toString(),
        currentRaise: fund.currentRaise.toString(),
        _count: fund._count,
      })),
    });
  } catch (error: any) {
    console.error("Error fetching funds:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
