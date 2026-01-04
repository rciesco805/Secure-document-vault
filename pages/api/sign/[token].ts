import { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/prisma";
import { getFile } from "@/lib/files/get-file";

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

    if (document.status === "VOIDED") {
      return res.status(410).json({ message: "This document has been voided" });
    }

    if (document.status === "EXPIRED") {
      return res.status(410).json({ message: "This document has expired" });
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
          },
        },
      },
    });

    if (!recipient) {
      return res.status(404).json({ message: "Invalid signing link" });
    }

    if (recipient.status === "SIGNED") {
      return res.status(400).json({ message: "Already signed" });
    }

    const ipAddress = (req.headers["x-forwarded-for"] as string)?.split(",")[0] 
      || req.socket.remoteAddress 
      || null;
    const userAgent = req.headers["user-agent"] || null;

    if (declined) {
      await prisma.signatureRecipient.update({
        where: { id: recipient.id },
        data: {
          status: "DECLINED",
          declinedAt: new Date(),
          declinedReason: declinedReason || null,
          ipAddress,
          userAgent,
        },
      });

      await prisma.signatureDocument.update({
        where: { id: recipient.document.id },
        data: {
          status: "DECLINED",
          declinedAt: new Date(),
        },
      });

      return res.status(200).json({ 
        message: "Document declined",
        status: "DECLINED" 
      });
    }

    if (fields && Array.isArray(fields)) {
      for (const field of fields) {
        await prisma.signatureField.update({
          where: { id: field.id },
          data: {
            value: field.value,
            filledAt: new Date(),
          },
        });
      }
    }

    await prisma.signatureRecipient.update({
      where: { id: recipient.id },
      data: {
        status: "SIGNED",
        signedAt: new Date(),
        signatureImage: signatureImage || null,
        ipAddress,
        userAgent,
      },
    });

    const allRecipients = recipient.document.recipients;
    const signersAndApprovers = allRecipients.filter(
      (r) => r.role === "SIGNER" || r.role === "APPROVER"
    );
    
    const updatedRecipients = await prisma.signatureRecipient.findMany({
      where: { documentId: recipient.document.id },
    });
    
    const allSigned = signersAndApprovers.every((r) => {
      const updated = updatedRecipients.find((ur) => ur.id === r.id);
      return updated?.status === "SIGNED";
    });

    if (allSigned) {
      await prisma.signatureDocument.update({
        where: { id: recipient.document.id },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
        },
      });
    } else {
      const signedCount = updatedRecipients.filter(
        (r) => r.status === "SIGNED"
      ).length;
      
      if (signedCount > 0) {
        await prisma.signatureDocument.update({
          where: { id: recipient.document.id },
          data: { status: "PARTIALLY_SIGNED" },
        });
      }
    }

    return res.status(200).json({
      message: "Document signed successfully",
      status: allSigned ? "COMPLETED" : "PARTIALLY_SIGNED",
    });
  } catch (error) {
    console.error("Error processing signature:", error);
    return res.status(500).json({ message: "Failed to process signature" });
  }
}
