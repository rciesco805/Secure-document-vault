import { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/prisma";
import { getFile } from "@/lib/files/get-file";
import { sendEmail } from "@/lib/resend";
import SignatureCompletedEmail from "@/components/emails/signature-completed";
import { sendToNextSigners } from "@/pages/api/teams/[teamId]/signature-documents/[documentId]/send";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { token } = req.query as { token: string };

  if (!token) {
    return res.status(400).json({ message: "Token is required" });
  }

  if (req.method === "GET") {
    return handleGet(req, res, token);
  } else if (req.method === "POST") {
    return handlePost(req, res, token);
  } else {
    return res.status(405).json({ message: "Method not allowed" });
  }
}

async function handleGet(
  req: NextApiRequest,
  res: NextApiResponse,
  token: string
) {
  try {
    const recipient = await prisma.signatureRecipient.findUnique({
      where: { signingToken: token },
      include: {
        document: {
          include: {
            fields: {
              orderBy: [{ pageNumber: "asc" }, { y: "asc" }],
            },
            team: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    if (!recipient) {
      return res.status(404).json({ message: "Invalid or expired signing link" });
    }

    const { document } = recipient;

    if (document.expirationDate && new Date(document.expirationDate) < new Date()) {
      return res.status(410).json({ message: "This signing link has expired" });
    }

    if (document.status === "VOIDED") {
      return res.status(410).json({ message: "This document has been voided" });
    }

    if (document.status === "EXPIRED") {
      return res.status(410).json({ message: "This document has expired" });
    }

    if (document.status === "COMPLETED") {
      return res.status(400).json({ message: "This document has already been completed" });
    }

    if (recipient.status === "SIGNED") {
      return res.status(400).json({ 
        message: "You have already signed this document",
        alreadySigned: true 
      });
    }

    if (recipient.status === "DECLINED") {
      return res.status(400).json({ message: "You have declined this document" });
    }

    const recipientFields = document.fields.filter(
      (f) => f.recipientId === recipient.id
    );

    let fileUrl = null;
    try {
      const fileResult = await getFile({ 
        type: document.storageType, 
        data: document.file 
      });
      fileUrl = fileResult?.url || null;
    } catch (error) {
      console.error("Error getting file URL:", error);
    }

    if (recipient.status === "PENDING" || recipient.status === "SENT") {
      await prisma.signatureRecipient.update({
        where: { id: recipient.id },
        data: {
          status: "VIEWED",
          viewedAt: new Date(),
        },
      });

      if (document.status === "SENT") {
        await prisma.signatureDocument.update({
          where: { id: document.id },
          data: { status: "VIEWED" },
        });
      }
    }

    return res.status(200).json({
      recipient: {
        id: recipient.id,
        name: recipient.name,
        email: recipient.email,
        role: recipient.role,
        status: recipient.status === "PENDING" || recipient.status === "SENT" 
          ? "VIEWED" 
          : recipient.status,
      },
      document: {
        id: document.id,
        title: document.title,
        description: document.description,
        numPages: document.numPages,
        teamName: document.team.name,
        fileUrl,
        expirationDate: document.expirationDate,
      },
      fields: recipientFields.map((f) => ({
        id: f.id,
        type: f.type,
        pageNumber: f.pageNumber,
        x: f.x,
        y: f.y,
        width: f.width,
        height: f.height,
        required: f.required,
        placeholder: f.placeholder,
        value: f.value,
      })),
    });
  } catch (error) {
    console.error("Error fetching signing document:", error);
    return res.status(500).json({ message: "Failed to load document" });
  }
}

async function handlePost(
  req: NextApiRequest,
  res: NextApiResponse,
  token: string
) {
  try {
    const { fields, signatureImage, declined, declinedReason } = req.body;

    const recipient = await prisma.signatureRecipient.findUnique({
      where: { signingToken: token },
      include: {
        document: {
          include: {
            recipients: true,
            fields: true,
            team: {
              select: {
                name: true,
              },
            },
            owner: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!recipient) {
      return res.status(404).json({ message: "Invalid signing link" });
    }

    const { document } = recipient;

    if (document.expirationDate && new Date(document.expirationDate) < new Date()) {
      return res.status(410).json({ message: "This signing link has expired" });
    }

    if (document.status === "VOIDED" || document.status === "EXPIRED") {
      return res.status(410).json({ message: "This document is no longer available for signing" });
    }

    if (document.status === "COMPLETED") {
      return res.status(400).json({ message: "This document has already been completed" });
    }

    if (recipient.status === "SIGNED") {
      return res.status(400).json({ message: "You have already signed this document" });
    }

    if (recipient.status === "DECLINED") {
      return res.status(400).json({ message: "You have already declined this document" });
    }

    const ipAddress = (req.headers["x-forwarded-for"] as string)?.split(",")[0] 
      || req.socket.remoteAddress 
      || null;
    const userAgent = req.headers["user-agent"] || null;

    if (declined) {
      await prisma.$transaction(async (tx) => {
        await tx.signatureRecipient.update({
          where: { id: recipient.id },
          data: {
            status: "DECLINED",
            declinedAt: new Date(),
            declinedReason: declinedReason || null,
            ipAddress,
            userAgent,
          },
        });

        await tx.signatureDocument.update({
          where: { id: document.id },
          data: {
            status: "DECLINED",
            declinedAt: new Date(),
          },
        });
      });

      return res.status(200).json({ 
        message: "Document declined",
        status: "DECLINED" 
      });
    }

    const recipientFields = document.fields.filter(
      (f) => f.recipientId === recipient.id
    );
    const recipientFieldIds = new Set(recipientFields.map((f) => f.id));

    const requiredSignatureFields = recipientFields.filter(
      (f) => f.type === "SIGNATURE" && f.required
    );
    if (requiredSignatureFields.length > 0 && !signatureImage) {
      return res.status(400).json({ 
        message: "Signature is required to complete signing" 
      });
    }

    if (fields && Array.isArray(fields)) {
      for (const field of fields) {
        if (!recipientFieldIds.has(field.id)) {
          return res.status(403).json({ 
            message: "You can only update fields assigned to you" 
          });
        }
      }
    }

    for (const rf of recipientFields) {
      if (rf.required && rf.type !== "SIGNATURE" && rf.type !== "CHECKBOX") {
        const submittedField = fields?.find((f: any) => f.id === rf.id);
        if (!submittedField?.value && !rf.value) {
          if (rf.type === "NAME" || rf.type === "EMAIL" || rf.type === "DATE_SIGNED") {
            continue;
          }
          return res.status(400).json({ 
            message: `Please fill in all required fields before signing` 
          });
        }
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      if (fields && Array.isArray(fields)) {
        for (const field of fields) {
          if (recipientFieldIds.has(field.id)) {
            await tx.signatureField.update({
              where: { id: field.id },
              data: {
                value: field.value,
                filledAt: new Date(),
              },
            });
          }
        }
      }

      await tx.signatureRecipient.update({
        where: { id: recipient.id },
        data: {
          status: "SIGNED",
          signedAt: new Date(),
          signatureImage: signatureImage || null,
          ipAddress,
          userAgent,
        },
      });

      const allRecipients = await tx.signatureRecipient.findMany({
        where: { documentId: document.id },
      });

      const signersAndApprovers = allRecipients.filter(
        (r) => r.role === "SIGNER" || r.role === "APPROVER"
      );
      
      const allSigned = signersAndApprovers.every((r) => r.status === "SIGNED");
      const hasDeclined = allRecipients.some((r) => r.status === "DECLINED");

      let newStatus = document.status;
      if (allSigned && !hasDeclined) {
        newStatus = "COMPLETED";
        await tx.signatureDocument.update({
          where: { id: document.id },
          data: {
            status: "COMPLETED",
            completedAt: new Date(),
          },
        });
      } else if (!hasDeclined) {
        const signedCount = allRecipients.filter((r) => r.status === "SIGNED").length;
        if (signedCount > 0) {
          newStatus = "PARTIALLY_SIGNED";
          await tx.signatureDocument.update({
            where: { id: document.id },
            data: { status: "PARTIALLY_SIGNED" },
          });
        }
      }

      return { allSigned, newStatus, allRecipients };
    });

    if (result.allSigned && result.newStatus === "COMPLETED") {
      const completedAt = new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

      const signersList = result.allRecipients
        .filter((r) => r.status === "SIGNED")
        .map((r) => `${r.name} (${r.email})`);

      const baseUrl = process.env.NEXTAUTH_URL;

      const emailPromises: Promise<any>[] = [];

      for (const r of result.allRecipients) {
        emailPromises.push(
          sendEmail({
            to: r.email,
            subject: `Completed: ${document.title}`,
            react: SignatureCompletedEmail({
              recipientName: r.name,
              documentTitle: document.title,
              teamName: document.team.name,
              completedAt,
              signersList,
            }),
          }).catch((err) => {
            console.error(`Failed to send completion email to ${r.email}:`, err);
          })
        );
      }

      if (document.owner?.email) {
        emailPromises.push(
          sendEmail({
            to: document.owner.email,
            subject: `Document Completed: ${document.title}`,
            react: SignatureCompletedEmail({
              recipientName: document.owner.name || "Document Owner",
              documentTitle: document.title,
              teamName: document.team.name,
              completedAt,
              signersList,
              documentUrl: baseUrl ? `${baseUrl}/sign/${document.id}` : undefined,
            }),
          }).catch((err) => {
            console.error(`Failed to send completion email to owner:`, err);
          })
        );
      }

      await Promise.all(emailPromises);
    } else {
      const owner = await prisma.user.findFirst({
        where: { id: document.createdById },
        select: { name: true },
      });
      await sendToNextSigners(
        document.id,
        document.team.name,
        owner?.name || "BF Fund"
      );
    }

    return res.status(200).json({
      message: "Document signed successfully",
      status: result.newStatus,
    });
  } catch (error) {
    console.error("Error processing signature:", error);
    return res.status(500).json({ message: "Failed to process signature" });
  }
}
