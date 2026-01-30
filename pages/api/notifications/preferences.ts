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
      let preferences = await prisma.notificationPreference.findUnique({
        where: { userId },
      });

      if (!preferences) {
        preferences = await prisma.notificationPreference.create({
          data: { userId },
        });
      }

      return res.status(200).json(preferences);
    } catch (error) {
      errorhandler(error, res);
    }
  } else if (req.method === "PUT") {
    try {
      const data = req.body;

      const allowedFields = [
        "emailDocumentViewed",
        "emailSignatureComplete",
        "emailCapitalCall",
        "emailDistribution",
        "emailNewDocument",
        "emailWeeklyDigest",
        "pushDocumentViewed",
        "pushSignatureComplete",
        "pushCapitalCall",
        "pushDistribution",
        "pushNewDocument",
      ];

      const updateData: Record<string, boolean> = {};
      for (const field of allowedFields) {
        if (typeof data[field] === "boolean") {
          updateData[field] = data[field];
        }
      }

      const preferences = await prisma.notificationPreference.upsert({
        where: { userId },
        update: updateData,
        create: {
          userId,
          ...updateData,
        },
      });

      return res.status(200).json(preferences);
    } catch (error) {
      errorhandler(error, res);
    }
  } else {
    res.setHeader("Allow", ["GET", "PUT"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
