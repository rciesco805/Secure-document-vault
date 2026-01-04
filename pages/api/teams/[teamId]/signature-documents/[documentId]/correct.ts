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

  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const existingDoc = await prisma.signatureDocument.findFirst({
      where: { id: documentId, teamId },
      include: {
        recipients: true,
        fields: true,
      },
    });

    if (!existingDoc) {
      return res.status(404).json({ message: "Document not found" });
    }

    if (existingDoc.status === "COMPLETED") {
      return res.status(400).json({ 
        message: "Cannot correct a completed document" 
      });
    }

    if (existingDoc.status === "VOIDED") {
      return res.status(400).json({ 
        message: "Cannot correct a voided document" 
      });
    }

    if (existingDoc.status === "DRAFT") {
      return res.status(400).json({ 
        message: "Draft documents can be edited directly" 
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      await tx.signatureDocument.update({
        where: { id: documentId },
        data: {
          status: "VOIDED",
          voidedAt: new Date(),
          voidedReason: "Corrected and resent",
        },
      });

      const newDoc = await tx.signatureDocument.create({
        data: {
          title: `${existingDoc.title} (Corrected)`,
          description: existingDoc.description,
          file: existingDoc.file,
          storageType: existingDoc.storageType,
          numPages: existingDoc.numPages,
          status: "DRAFT",
          emailSubject: existingDoc.emailSubject,
          emailMessage: existingDoc.emailMessage,
          expirationDate: existingDoc.expirationDate,
          teamId: existingDoc.teamId,
          createdById: (session.user as any).id,
        },
      });

      if (existingDoc.recipients.length > 0) {
        await tx.signatureRecipient.createMany({
          data: existingDoc.recipients.map((r) => ({
            documentId: newDoc.id,
            name: r.name,
            email: r.email,
            role: r.role,
            signingOrder: r.signingOrder,
            status: "PENDING",
          })),
        });
      }

      const newRecipients = await tx.signatureRecipient.findMany({
        where: { documentId: newDoc.id },
      });

      const recipientEmailMap = new Map(
        newRecipients.map((r) => [r.email, r.id])
      );

      if (existingDoc.fields.length > 0) {
        const oldRecipients = existingDoc.recipients;
        const oldRecipientIdToEmail = new Map(
          oldRecipients.map((r) => [r.id, r.email])
        );

        await tx.signatureField.createMany({
          data: existingDoc.fields.map((f) => {
            const oldEmail = f.recipientId ? oldRecipientIdToEmail.get(f.recipientId) : null;
            const newRecipientId = oldEmail ? recipientEmailMap.get(oldEmail) : null;
            
            return {
              documentId: newDoc.id,
              recipientId: newRecipientId || null,
              type: f.type,
              pageNumber: f.pageNumber,
              x: f.x,
              y: f.y,
              width: f.width,
              height: f.height,
              label: f.label,
              placeholder: f.placeholder,
              required: f.required,
            };
          }),
        });
      }

      return newDoc;
    });

    return res.status(200).json(result);
  } catch (error) {
    console.error("Error creating corrected document:", error);
    return res.status(500).json({ message: "Failed to create corrected copy" });
  }
}
