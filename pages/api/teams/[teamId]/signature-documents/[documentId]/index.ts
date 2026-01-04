import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import prisma from "@/lib/prisma";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
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

  if (req.method === "GET") {
    return handleGet(res, teamId, documentId);
  } else if (req.method === "PUT") {
    return handlePut(req, res, teamId, documentId);
  } else if (req.method === "DELETE") {
    return handleDelete(res, teamId, documentId);
  } else {
    return res.status(405).json({ message: "Method not allowed" });
  }
}

async function handleGet(
  res: NextApiResponse,
  teamId: string,
  documentId: string
) {
  try {
    const document = await prisma.signatureDocument.findFirst({
      where: {
        id: documentId,
        teamId,
      },
      include: {
        recipients: {
          orderBy: { signingOrder: "asc" },
        },
        fields: {
          orderBy: [{ pageNumber: "asc" }, { y: "asc" }],
        },
      },
    });

    if (!document) {
      return res.status(404).json({ message: "Document not found" });
    }

    return res.status(200).json(document);
  } catch (error) {
    console.error("Error fetching signature document:", error);
    return res.status(500).json({ message: "Failed to fetch document" });
  }
}

async function handlePut(
  req: NextApiRequest,
  res: NextApiResponse,
  teamId: string,
  documentId: string
) {
  try {
    const {
      title,
      description,
      emailSubject,
      emailMessage,
      status,
      expirationDate,
      voidedReason,
    } = req.body;

    const existingDoc = await prisma.signatureDocument.findFirst({
      where: { id: documentId, teamId },
    });

    if (!existingDoc) {
      return res.status(404).json({ message: "Document not found" });
    }

    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (emailSubject !== undefined) updateData.emailSubject = emailSubject;
    if (emailMessage !== undefined) updateData.emailMessage = emailMessage;
    if (expirationDate !== undefined)
      updateData.expirationDate = expirationDate ? new Date(expirationDate) : null;

    if (status !== undefined) {
      updateData.status = status;
      if (status === "SENT" && !existingDoc.sentAt) {
        updateData.sentAt = new Date();
      }
      if (status === "COMPLETED") {
        updateData.completedAt = new Date();
      }
      if (status === "VOIDED") {
        updateData.voidedAt = new Date();
        updateData.voidedReason = voidedReason || null;
      }
      if (status === "DECLINED") {
        updateData.declinedAt = new Date();
      }
    }

    const document = await prisma.signatureDocument.update({
      where: { id: documentId },
      data: updateData,
      include: {
        recipients: {
          orderBy: { signingOrder: "asc" },
        },
        fields: true,
      },
    });

    return res.status(200).json(document);
  } catch (error) {
    console.error("Error updating signature document:", error);
    return res.status(500).json({ message: "Failed to update document" });
  }
}

async function handleDelete(
  res: NextApiResponse,
  teamId: string,
  documentId: string
) {
  try {
    const document = await prisma.signatureDocument.findFirst({
      where: { id: documentId, teamId },
    });

    if (!document) {
      return res.status(404).json({ message: "Document not found" });
    }

    if (document.status !== "DRAFT") {
      return res.status(400).json({
        message: "Only draft documents can be deleted. Use void for sent documents.",
      });
    }

    await prisma.signatureDocument.delete({
      where: { id: documentId },
    });

    return res.status(200).json({ message: "Document deleted" });
  } catch (error) {
    console.error("Error deleting signature document:", error);
    return res.status(500).json({ message: "Failed to delete document" });
  }
}
