import { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/prisma";
import { nanoid } from "nanoid";
import { sendEmail } from "@/lib/resend";
import NewQuestion from "@/components/emails/new-question";

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

      if (documentId && view.documentId && documentId !== view.documentId) {
        return res.status(400).json({ error: "Document ID does not match the view" });
      }
      if (dataroomId && view.dataroomId && dataroomId !== view.dataroomId) {
        return res.status(400).json({ error: "Dataroom ID does not match the view" });
      }
      if (linkId && view.linkId && linkId !== view.linkId) {
        return res.status(400).json({ error: "Link ID does not match the view" });
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
        include: {
          document: { select: { name: true } },
          dataroom: { select: { id: true, name: true } },
        },
      });

      const AUTHORIZED_ADMIN_EMAILS = [
        "rciesco@gmail.com",
        "investors@bermudafranchisegroup.com",
      ];

      for (const adminEmail of AUTHORIZED_ADMIN_EMAILS) {
        try {
          await sendEmail({
            to: adminEmail,
            subject: `New Question from ${dataroomQuestion.viewerName || dataroomQuestion.viewerEmail}`,
            react: NewQuestion({
              questionId: dataroomQuestion.id,
              dataroomId: dataroomQuestion.dataroom?.id,
              dataroomName: dataroomQuestion.dataroom?.name || undefined,
              viewerEmail: dataroomQuestion.viewerEmail,
              viewerName: dataroomQuestion.viewerName,
              questionContent: dataroomQuestion.content,
              pageNumber: dataroomQuestion.pageNumber,
              documentName: dataroomQuestion.document?.name,
            }),
          });
        } catch (emailError) {
          console.error("Failed to send email notification:", emailError);
        }
      }

      return res.status(201).json(dataroomQuestion);
    } catch (error) {
      console.error("Error creating question:", error);
      return res.status(500).json({ error: "Failed to create question" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
