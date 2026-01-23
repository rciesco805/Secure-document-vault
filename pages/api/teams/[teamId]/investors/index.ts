import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/pages/api/auth/[...nextauth]";

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
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { teamId } = req.query as { teamId: string };

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        teams: {
          where: { teamId },
        },
      },
    });

    if (!user?.teams?.[0]) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const funds = await prisma.fund.findMany({
      where: { teamId },
      select: { id: true },
    });

    const fundIds = funds.map((f) => f.id);

    const investments = await prisma.investment.findMany({
      where: { fundId: { in: fundIds } },
      include: {
        investor: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
      distinct: ["investorId"],
    });

    const investors = investments.map((inv) => ({
      id: inv.investor.id,
      entityName: inv.investor.entityName,
      entityType: inv.investor.entityType,
      ndaSigned: inv.investor.ndaSigned,
      accreditationStatus: inv.investor.accreditationStatus,
      user: inv.investor.user
        ? {
            id: inv.investor.user.id,
            name: inv.investor.user.name,
            email: inv.investor.user.email,
          }
        : null,
    }));

    return res.status(200).json({ investors });
  } catch (error) {
    console.error("Error fetching investors:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
