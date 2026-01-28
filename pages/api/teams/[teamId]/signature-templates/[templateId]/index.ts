import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import prisma from "@/lib/prisma";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { getFile } from "@/lib/files/get-file";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
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

  if (req.method === "GET") {
    return handleGet(req, res, teamId, templateId);
  } else if (req.method === "PUT" || req.method === "PATCH") {
    return handlePut(req, res, teamId, templateId);
  } else if (req.method === "DELETE") {
    return handleDelete(req, res, teamId, templateId);
  } else {
    return res.status(405).json({ message: "Method not allowed" });
  }
}

async function handleGet(
  req: NextApiRequest,
  res: NextApiResponse,
  teamId: string,
  templateId: string
) {
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

    let fileUrl = null;
    try {
      fileUrl = await getFile({
        type: template.storageType,
        data: template.file,
      });
    } catch (error) {
      console.error("Error getting template file URL:", error);
    }

    return res.status(200).json({
      ...template,
      fileUrl,
    });
  } catch (error) {
    console.error("Error fetching template:", error);
    return res.status(500).json({ message: "Failed to fetch template" });
  }
}

async function handlePut(
  req: NextApiRequest,
  res: NextApiResponse,
  teamId: string,
  templateId: string
) {
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

    const {
      name,
      description,
      defaultRecipients,
      fields,
      defaultEmailSubject,
      defaultEmailMessage,
      defaultExpirationDays,
    } = req.body;

    const updated = await prisma.signatureTemplate.update({
      where: { id: templateId },
      data: {
        name: name ?? template.name,
        description: description ?? template.description,
        defaultRecipients: defaultRecipients ?? template.defaultRecipients,
        fields: fields ?? template.fields,
        defaultEmailSubject: defaultEmailSubject ?? template.defaultEmailSubject,
        defaultEmailMessage: defaultEmailMessage ?? template.defaultEmailMessage,
        defaultExpirationDays: defaultExpirationDays ?? template.defaultExpirationDays,
      },
    });

    return res.status(200).json(updated);
  } catch (error) {
    console.error("Error updating template:", error);
    return res.status(500).json({ message: "Failed to update template" });
  }
}

async function handleDelete(
  req: NextApiRequest,
  res: NextApiResponse,
  teamId: string,
  templateId: string
) {
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

    await prisma.signatureTemplate.delete({
      where: { id: templateId },
    });

    return res.status(200).json({ message: "Template deleted" });
  } catch (error) {
    console.error("Error deleting template:", error);
    return res.status(500).json({ message: "Failed to delete template" });
  }
}
