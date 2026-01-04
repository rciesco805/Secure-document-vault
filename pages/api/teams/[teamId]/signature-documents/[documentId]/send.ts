import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import prisma from "@/lib/prisma";
import { nanoid } from "nanoid";
import { sendEmail } from "@/lib/resend";
import SignatureRequestEmail from "@/components/emails/signature-request";

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

    if (document.status !== "DRAFT") {
      return res.status(400).json({ 
        message: "Document has already been sent" 
      });
    }

    if (document.recipients.length === 0) {
      return res.status(400).json({ 
        message: "Add at least one recipient before sending" 
      });
    }

    const senderName = (session.user as any).name || "BF Fund";
    const baseUrl = process.env.NEXTAUTH_URL || `https://${req.headers.host}`;

    for (const recipient of document.recipients) {
      const signingToken = nanoid(32);
      const signingUrl = `${baseUrl}/view/sign/${signingToken}`;

      await prisma.signatureRecipient.update({
        where: { id: recipient.id },
        data: {
          signingToken,
          signingUrl,
          status: "SENT",
        },
      });

      if (recipient.role !== "VIEWER") {
        try {
          await sendEmail({
            to: recipient.email,
            subject: document.emailSubject || `Please sign: ${document.title}`,
            react: SignatureRequestEmail({
              recipientName: recipient.name,
              documentTitle: document.title,
              senderName,
              teamName: document.team.name,
              message: document.emailMessage || undefined,
              signingUrl,
            }),
          });
        } catch (emailError) {
          console.error(`Failed to send email to ${recipient.email}:`, emailError);
        }
      }
    }

    const updatedDocument = await prisma.signatureDocument.update({
      where: { id: documentId },
      data: {
        status: "SENT",
        sentAt: new Date(),
      },
      include: {
        recipients: { orderBy: { signingOrder: "asc" } },
        fields: true,
      },
    });

    return res.status(200).json({
      message: "Document sent successfully",
      document: updatedDocument,
    });
  } catch (error) {
    console.error("Error sending document:", error);
    return res.status(500).json({ message: "Failed to send document" });
  }
}
