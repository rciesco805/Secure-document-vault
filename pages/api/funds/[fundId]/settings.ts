import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "../../auth/[...nextauth]";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions);

  if (!session?.user?.email) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const { fundId } = req.query;

  if (!fundId || typeof fundId !== "string") {
    return res.status(400).json({ message: "Fund ID required" });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: {
      teams: {
        include: {
          team: true,
        },
      },
    },
  });

  if (!user) {
    return res.status(401).json({ message: "User not found" });
  }

  const fund = await prisma.fund.findUnique({
    where: { id: fundId },
  });

  if (!fund) {
    return res.status(404).json({ message: "Fund not found" });
  }

  const hasAccess = user.teams.some(
    (ut) => ut.teamId === fund.teamId && ["ADMIN", "OWNER"].includes(ut.role)
  );

  if (!hasAccess) {
    return res.status(403).json({ message: "Forbidden" });
  }

  if (req.method === "GET") {
    return res.status(200).json({
      fund: {
        id: fund.id,
        name: fund.name,
        ndaGateEnabled: fund.ndaGateEnabled,
      },
    });
  }

  if (req.method === "PATCH") {
    const { ndaGateEnabled } = req.body;

    if (typeof ndaGateEnabled !== "boolean") {
      return res.status(400).json({ message: "ndaGateEnabled must be a boolean" });
    }

    const updatedFund = await prisma.fund.update({
      where: { id: fundId },
      data: { ndaGateEnabled },
    });

    return res.status(200).json({
      fund: {
        id: updatedFund.id,
        name: updatedFund.name,
        ndaGateEnabled: updatedFund.ndaGateEnabled,
      },
    });
  }

  return res.status(405).json({ message: "Method not allowed" });
}
