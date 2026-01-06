import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import prisma from "@/lib/prisma";
import { CustomUser } from "@/lib/types";
import { sendEmail } from "@/lib/resend";
import QuestionReply from "@/components/emails/question-reply";

export default async function handle(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { teamId, questionId } = req.query as { teamId: string; questionId: string };
  const user = session.user as CustomUser;

  const userTeam = await prisma.userTeam.findFirst({
    where: {
      userId: user.id,
      teamId,
    },
  });

  if (!userTeam) {
    return res.status(403).json({ error: "Not authorized for this team" });
  }

  if (req.method === "POST") {
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({ error: "Reply content is required" });
    }

    try {
      const question = await prisma.dataroomQuestion.findFirst({
        where: {
          id: questionId,
          teamId,
        },
        include: {
          dataroom: { select: { name: true } },
        },
      });

      if (!question) {
        return res.status(404).json({ error: "Question not found" });
      }

      const message = await prisma.dataroomQuestionMessage.create({
        data: {
          questionId,
          content,
          senderType: "ADMIN",
          senderEmail: user.email!,
          senderName: user.name,
        },
      });

      await prisma.dataroomQuestion.update({
        where: { id: questionId },
        data: { status: "ANSWERED" },
      });

      if (question.viewerEmail) {
        try {
          await sendEmail({
            to: question.viewerEmail,
            subject: `Reply to your question about ${question.dataroom?.name || "your document"}`,
            react: QuestionReply({
              viewerName: question.viewerName,
              dataroomName: question.dataroom?.name,
              originalQuestion: question.content,
              replyContent: content,
              adminName: user.name,
            }),
          });
        } catch (emailError) {
          console.error("Failed to send reply notification:", emailError);
        }
      }

      return res.status(201).json(message);
    } catch (error) {
      console.error("Error creating reply:", error);
      return res.status(500).json({ error: "Failed to create reply" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
