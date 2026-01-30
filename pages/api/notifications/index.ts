import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";

import prisma from "@/lib/prisma";
import { errorhandler } from "@/lib/errorHandler";

import { authOptions } from "../auth/[...nextauth]";

export default async function handle(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const userId = (session.user as any).id;

  if (req.method === "GET") {
    try {
      const { unreadOnly, limit = "50", offset = "0" } = req.query;

      const whereClause: any = { userId };
      if (unreadOnly === "true") {
        whereClause.read = false;
      }

      const [notifications, unreadCount] = await Promise.all([
        prisma.notification.findMany({
          where: whereClause,
          orderBy: { createdAt: "desc" },
          take: parseInt(limit as string, 10),
          skip: parseInt(offset as string, 10),
        }),
        prisma.notification.count({
          where: { userId, read: false },
        }),
      ]);

      return res.status(200).json({ notifications, unreadCount });
    } catch (error) {
      errorhandler(error, res);
    }
  } else if (req.method === "PATCH") {
    try {
      const { notificationIds, markAllRead } = req.body;

      if (markAllRead) {
        await prisma.notification.updateMany({
          where: { userId, read: false },
          data: { read: true },
        });
      } else if (notificationIds && Array.isArray(notificationIds)) {
        await prisma.notification.updateMany({
          where: {
            id: { in: notificationIds },
            userId,
          },
          data: { read: true },
        });
      }

      return res.status(200).json({ success: true });
    } catch (error) {
      errorhandler(error, res);
    }
  } else {
    res.setHeader("Allow", ["GET", "PATCH"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
