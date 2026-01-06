import { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/prisma";
import { nanoid } from "nanoid";

export default async function handle(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === "POST") {
    const { viewId, content, documentId, dataroomId, linkId, pageNumber, viewerEmail, viewerName } = req.body;

    if (!viewId || !content) {
      return res.status(400).json({ error: "View ID and question content are required" });
    }

    try {
      const view = await prisma.view.findUnique({
        where: { id: viewId },
        include: { link: true },
      });

      if (!view) {
        return res.status(404).json({ error: "View not found" });
      }

      const viewer = view.viewerId 
        ? await prisma.viewer.findUnique({ where: { id: view.viewerId } })
        : null;

      const replyToken = nanoid(32);

      const dataroomQuestion = await prisma.dataroomQuestion.create({
        data: {
          content,
          viewId,
          viewerId: viewer?.id,
          viewerEmail: viewerEmail || view.viewerEmail || "",
          viewerName: viewerName || view.viewerName,
          documentId,
          dataroomId,
          linkId: linkId || view.linkId!,
          pageNumber,
          teamId: view.teamId!,
          status: "OPEN",
          replyToken,
        },
      });

      return res.status(201).json(dataroomQuestion);
    } catch (error) {
      console.error("Error creating question:", error);
      return res.status(500).json({ error: "Failed to create question" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
