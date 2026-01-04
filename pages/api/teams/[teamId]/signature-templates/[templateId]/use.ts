import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import prisma from "@/lib/prisma";
import { authOptions } from "@/pages/api/auth/[...nextauth]";

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

  const { teamId, templateId } = req.query as { teamId: string; templateId: string };

  const userTeam = await prisma.userTeam.findFirst({
    where: {
      userId: session.user.id,
      teamId,
    },
  });

  if (!userTeam) {
    return res.status(403).json({ message: "Access denied" });
  }

  try {
    const template = await prisma.signatureTemplate.findFirst({
      where: {
        id: templateId,
        teamId,
      },
    });

    if (!template) {
      return res.status(404).json({ message: "Template not found" });
    }

    const { title, description, recipients: customRecipients, emailSubject, emailMessage, expirationDate } = req.body;

    const defaultRecipients = template.defaultRecipients as any[] | null;
    const recipientsToUse = (customRecipients && Array.isArray(customRecipients) && customRecipients.length > 0)
      ? customRecipients
      : defaultRecipients;

    const document = await prisma.$transaction(async (tx) => {
      const doc = await tx.signatureDocument.create({
        data: {
          title: title || template.name,
          description: description || template.description,
          file: template.file,
          storageType: template.storageType,
          numPages: template.numPages,
          emailSubject: emailSubject || template.defaultEmailSubject,
          emailMessage: emailMessage || template.defaultEmailMessage,
          expirationDate: expirationDate || (template.defaultExpirationDays
            ? new Date(Date.now() + template.defaultExpirationDays * 24 * 60 * 60 * 1000)
            : null),
          teamId,
          createdById: session.user.id,
          status: "DRAFT",
        },
      });

      const createdRecipientIds: string[] = [];
      if (recipientsToUse && Array.isArray(recipientsToUse) && recipientsToUse.length > 0) {
        for (let i = 0; i < recipientsToUse.length; i++) {
          const r = recipientsToUse[i];
          const created = await tx.signatureRecipient.create({
            data: {
              documentId: doc.id,
              name: r.name || `Signer ${i + 1}`,
              email: r.email || "",
              role: r.role || "SIGNER",
              signingOrder: r.signingOrder || i + 1,
            },
          });
          createdRecipientIds.push(created.id);
        }
      }

      const templateFields = template.fields as any[] | null;
      if (templateFields && Array.isArray(templateFields) && templateFields.length > 0 && createdRecipientIds.length > 0) {
        const fieldsToCreate = templateFields.map((field: any) => {
          let recipientId: string | null = null;
          const recipientIndex = field.recipientIndex ?? 0;
          if (recipientIndex >= 0 && recipientIndex < createdRecipientIds.length) {
            recipientId = createdRecipientIds[recipientIndex];
          } else if (createdRecipientIds.length > 0) {
            recipientId = createdRecipientIds[0];
          }

          return {
            documentId: doc.id,
            recipientId,
            type: field.type,
            pageNumber: field.pageNumber,
            x: field.x,
            y: field.y,
            width: field.width,
            height: field.height,
            required: field.required ?? true,
            placeholder: field.placeholder,
          };
        });

        await tx.signatureField.createMany({
          data: fieldsToCreate,
        });
      }

      await tx.signatureTemplate.update({
        where: { id: templateId },
        data: { usageCount: { increment: 1 } },
      });

      return doc;
    });

    return res.status(201).json(document);
  } catch (error) {
    console.error("Error using template:", error);
    return res.status(500).json({ message: "Failed to create document from template" });
  }
}
