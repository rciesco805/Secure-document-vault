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

  if (req.method === "POST") {
    try {
      const { endpoint, p256dh, auth, userAgent } = req.body;

      if (!endpoint || !p256dh || !auth) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const subscription = await prisma.pushSubscription.upsert({
        where: { endpoint },
        update: {
          p256dh,
          auth,
          userAgent,
          userId,
        },
        create: {
          endpoint,
          p256dh,
          auth,
          userAgent,
          userId,
        },
      });

      return res.status(200).json({ success: true, id: subscription.id });
    } catch (error) {
      errorhandler(error, res);
    }
  } else if (req.method === "DELETE") {
    try {
      const { endpoint } = req.body;

      if (!endpoint) {
        return res.status(400).json({ error: "Endpoint required" });
      }

      await prisma.pushSubscription.deleteMany({
        where: {
          endpoint,
          userId,
        },
      });

      return res.status(200).json({ success: true });
    } catch (error) {
      errorhandler(error, res);
    }
  } else {
    res.setHeader("Allow", ["POST", "DELETE"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
