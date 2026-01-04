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
  if (!session?.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const { teamId } = req.query;
  if (typeof teamId !== "string") {
    return res.status(400).json({ message: "Invalid team ID" });
  }

  try {
    const team = await prisma.team.findFirst({
      where: {
        id: teamId,
        users: {
          some: {
            userId: (session.user as any).id,
          },
        },
      },
    });

    if (!team) {
      return res.status(404).json({ message: "Team not found" });
    }

    const {
      title,
      description,
      file,
      storageType,
      emailSubject,
      emailMessage,
      recipients,
    } = req.body;

    if (!title || !file || !recipients || recipients.length === 0) {
      return res.status(400).json({
        message: "Title, file, and at least one recipient are required",
      });
    }

    const fileUrl = typeof file === "string" ? file : (file?.url || file?.key || "");
    const numPages = typeof file === "object" ? (file?.numPages || 1) : 1;
    const resolvedStorageType = storageType || "REPLIT";

    if (!fileUrl) {
      return res.status(400).json({
        message: "Invalid file data",
      });
    }

    const senderName = (session.user as any).name || "BF Fund";
    const baseUrl = process.env.NEXTAUTH_URL || `https://${req.headers.host}`;

    const createdDocuments = [];

    for (const recipient of recipients) {
      if (!recipient.name || !recipient.email) continue;

      const signingToken = nanoid(32);
      const signingUrl = `${baseUrl}/view/sign/${signingToken}`;

      const document = await prisma.signatureDocument.create({
        data: {
          title: `${title} - ${recipient.name}`,
          description,
          file: fileUrl,
          storageType: resolvedStorageType,
          numPages,
          emailSubject,
          emailMessage,
          status: "SENT",
          sentAt: new Date(),
          teamId,
          createdById: (session.user as any).id,
          recipients: {
            create: {
              name: recipient.name,
              email: recipient.email,
              role: "SIGNER",
              signingOrder: 1,
              status: "SENT",
              signingToken,
              signingUrl,
            },
          },
        },
        include: {
          recipients: true,
        },
      });

      try {
        await sendEmail({
          to: recipient.email,
          subject: emailSubject || `Please sign: ${title}`,
          react: SignatureRequestEmail({
            recipientName: recipient.name,
            documentTitle: title,
            senderName,
            teamName: team.name,
            message: emailMessage || undefined,
            signingUrl,
          }),
        });
      } catch (emailError) {
        console.error(`Failed to send email to ${recipient.email}:`, emailError);
      }

      createdDocuments.push(document);
    }

    return res.status(201).json({
      message: `Created ${createdDocuments.length} documents`,
      count: createdDocuments.length,
      documents: createdDocuments,
    });
  } catch (error) {
    console.error("Error creating bulk documents:", error);
    return res.status(500).json({ message: "Failed to create documents" });
  }
}
