import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";

import { errorhandler } from "@/lib/errorHandler";
import prisma from "@/lib/prisma";
import { CustomUser } from "@/lib/types";

import { authOptions } from "../auth/[...nextauth]";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { key } = req.body as { key: string };

  if (!key) {
    return res.status(400).json({ error: "Key is required" });
  }

  try {
    const userId = (session.user as CustomUser).id;

    // Find the document/version that matches this file path
    // Replit storage paths: /objects/documents/{uuid}/{filename}
    const document = await prisma.document.findFirst({
      where: { file: key },
      select: { teamId: true },
    });

    const documentVersion = !document
      ? await prisma.documentVersion.findFirst({
          where: { file: key },
          select: { document: { select: { teamId: true } } },
        })
      : null;

    const teamId = document?.teamId || documentVersion?.document?.teamId;

    if (!teamId) {
      return res.status(404).json({ error: "Document not found" });
    }

    // Verify user belongs to the team that owns this document
    const userTeam = await prisma.userTeam.findFirst({
      where: {
        userId,
        teamId,
      },
    });

    if (!userTeam) {
      return res
        .status(403)
        .json({ error: "Forbidden: You are not a member of this team" });
    }

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/file/replit-get`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.INTERNAL_API_KEY}`,
        },
        body: JSON.stringify({ key }),
      },
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        error: `Request failed with status ${response.status}`,
      }));
      return res.status(response.status).json(error);
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    console.error("Proxy error:", error);
    return errorhandler(error, res);
  }
}
