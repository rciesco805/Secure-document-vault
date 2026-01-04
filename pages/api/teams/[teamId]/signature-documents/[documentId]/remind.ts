import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import prisma from "@/lib/prisma";
import { sendEmail } from "@/lib/resend";
import SignatureReminderEmail from "@/components/emails/signature-reminder";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const { teamId, documentId } = req.query as {
    teamId: string;
    documentId: string;
  };

  const { recipientId } = req.body as { recipientId?: string };

  const userTeam = await prisma.userTeam.findFirst({
    where: {
      teamId,
      userId: (session.user as any).id,
    },
  });

  if (!userTeam) {
    return res.status(403).json({ message: "Forbidden" });
  }

  try {
    const document = await prisma.signatureDocument.findFirst({
      where: { id: documentId, teamId },
      include: {
        recipients: true,
        team: { select: { name: true } },
      },
    });

    if (!document) {
      return res.status(404).json({ message: "Document not found" });
    }

    if (document.status === "DRAFT") {
      return res.status(400).json({ 
        message: "Cannot send reminders for draft documents. Send the document first." 
      });
    }

    if (document.status === "COMPLETED" || document.status === "VOIDED" || document.status === "EXPIRED") {
      return res.status(400).json({ 
        message: "Cannot send reminders for completed, voided, or expired documents." 
      });
    }

    const senderName = (session.user as any).name || "BF Fund";
    const baseUrl = process.env.NEXTAUTH_URL;

    const recipientsToRemind = recipientId
      ? document.recipients.filter((r) => r.id === recipientId)
      : document.recipients.filter(
          (r) => r.status !== "SIGNED" && r.status !== "DECLINED" && r.role !== "VIEWER"
        );

    if (recipientsToRemind.length === 0) {
      return res.status(400).json({ 
        message: "No recipients need reminders" 
      });
    }

    const remindersSent: string[] = [];
    const remindersFailed: string[] = [];

    for (const recipient of recipientsToRemind) {
      if (!recipient.signingUrl) continue;

      const daysWaiting = document.sentAt
        ? Math.floor((Date.now() - new Date(document.sentAt).getTime()) / (1000 * 60 * 60 * 24))
        : undefined;

      const expirationDate = document.expirationDate
        ? new Date(document.expirationDate).toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
          })
        : undefined;

      try {
        await sendEmail({
          to: recipient.email,
          subject: `Reminder: Please sign "${document.title}"`,
          react: SignatureReminderEmail({
            recipientName: recipient.name,
            documentTitle: document.title,
            senderName,
            teamName: document.team.name,
            signingUrl: recipient.signingUrl,
            daysWaiting,
            expirationDate,
          }),
        });
        remindersSent.push(recipient.email);
      } catch (emailError) {
        console.error(`Failed to send reminder to ${recipient.email}:`, emailError);
        remindersFailed.push(recipient.email);
      }
    }

    if (remindersSent.length === 0 && remindersFailed.length > 0) {
      return res.status(500).json({ 
        message: "Failed to send all reminders",
        failed: remindersFailed,
      });
    }

    return res.status(200).json({
      message: `Reminder${remindersSent.length > 1 ? "s" : ""} sent successfully`,
      sent: remindersSent,
      failed: remindersFailed.length > 0 ? remindersFailed : undefined,
    });
  } catch (error) {
    console.error("Error sending reminders:", error);
    return res.status(500).json({ message: "Failed to send reminders" });
  }
}
