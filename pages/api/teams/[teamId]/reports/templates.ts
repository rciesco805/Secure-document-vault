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

  const isAdmin = ["OWNER", "ADMIN", "SUPER_ADMIN"].includes(userTeam.role);

  if (req.method === "POST") {
    if (!isAdmin) {
      return res.status(403).json({ error: "Admin access required" });
    }

    try {
      const { name, description, reportType, config, schedule } = req.body;

      if (!name || !reportType || !config) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const template = await prisma.reportTemplate.create({
        data: {
          teamId,
          name,
          description,
          reportType,
          config,
          schedule,
          createdById: userId,
        },
      });

      return res.status(201).json(template);
    } catch (error) {
      errorhandler(error, res);
    }
  } else if (req.method === "PUT") {
    if (!isAdmin) {
      return res.status(403).json({ error: "Admin access required" });
    }

    try {
      const { id, name, description, config, schedule, isDefault } = req.body;

      if (!id) {
        return res.status(400).json({ error: "Template ID required" });
      }

      const template = await prisma.reportTemplate.update({
        where: { id, teamId },
        data: {
          name,
          description,
          config,
          schedule,
          isDefault,
        },
      });

      return res.status(200).json(template);
    } catch (error) {
      errorhandler(error, res);
    }
  } else if (req.method === "DELETE") {
    if (!isAdmin) {
      return res.status(403).json({ error: "Admin access required" });
    }

    try {
      const { id } = req.query;

      if (!id) {
        return res.status(400).json({ error: "Template ID required" });
      }

      await prisma.reportTemplate.delete({
        where: { id: id as string, teamId },
      });

      return res.status(200).json({ success: true });
    } catch (error) {
      errorhandler(error, res);
    }
  } else {
    res.setHeader("Allow", ["POST", "PUT", "DELETE"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
