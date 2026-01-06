import { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/prisma";

export default async function handle(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === "POST") {
    const { viewId, content, documentId, dataroomId, linkId, pageNumber, viewerEmail, viewerName } = req.body;

    if (!viewId || !content) {
      return res.status(400).json({ error: "View ID and content are required" });
    }

    try {
      const view = await prisma.view.findUnique({
        where: { id: viewId },
        include: { link: true },
      });

      if (!view) {
        return res.status(404).json({ error: "View not found" });
      }

      const note = await prisma.viewerNote.create({
        data: {
          content,
          viewId,
          viewerEmail: viewerEmail || view.viewerEmail,
          viewerName: viewerName || view.viewerName,
          documentId,
          dataroomId,
          linkId: linkId || view.linkId!,
          pageNumber,
          teamId: view.teamId!,
        },
      });

      return res.status(201).json(note);
    } catch (error) {
      console.error("Error creating viewer note:", error);
      return res.status(500).json({ error: "Failed to create note" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
