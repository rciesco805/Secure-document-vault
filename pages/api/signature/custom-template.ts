import { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { validateApiToken } from "@/lib/api/auth/validate-api-token";

const CreateTemplateSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  file: z.string().min(1),
  storageType: z.enum(["S3_PATH", "VERCEL_BLOB"]).optional(),
  numPages: z.number().int().positive().optional(),
  defaultRecipients: z.array(z.object({
    role: z.enum(["SIGNER", "VIEWER", "APPROVER"]),
    name: z.string().optional(),
    email: z.string().email().optional(),
    signingOrder: z.number().int().positive().optional(),
  })).optional(),
  fields: z.array(z.object({
    type: z.enum([
      "SIGNATURE", "INITIALS", "DATE_SIGNED", "TEXT", 
      "CHECKBOX", "NAME", "EMAIL", "COMPANY", "TITLE", "ADDRESS"
    ]),
    pageNumber: z.number().int().positive(),
    x: z.number().min(0).max(100),
    y: z.number().min(0).max(100),
    width: z.number().min(0).max(100),
    height: z.number().min(0).max(100),
    label: z.string().max(255).optional(),
    placeholder: z.string().max(255).optional(),
    required: z.boolean().optional(),
    recipientIndex: z.number().int().min(0).optional(),
  })).optional(),
  defaultEmailSubject: z.string().max(255).optional(),
  defaultEmailMessage: z.string().max(5000).optional(),
  defaultExpirationDays: z.number().int().positive().max(365).optional(),
  isPublic: z.boolean().optional(),
});

const UpdateTemplateSchema = CreateTemplateSchema.partial().extend({
  id: z.string().cuid(),
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const auth = await validateApiToken(req.headers.authorization);
  
  if (!auth.valid || !auth.teamId || !auth.userId) {
    return res.status(401).json({ 
      error: "Unauthorized",
      message: auth.error || "Valid API token required. Get a token from /api/teams/{teamId}/tokens" 
    });
  }

  const { teamId, userId } = auth;

  try {
    switch (req.method) {
      case "GET":
        return await handleGet(req, res, teamId);
      case "POST":
        return await handlePost(req, res, teamId, userId);
      case "PUT":
        return await handlePut(req, res, teamId);
      case "DELETE":
        return await handleDelete(req, res, teamId);
      default:
        return res.status(405).json({ error: "Method not allowed" });
    }
  } catch (error) {
    console.error("Signature API error:", error);
    return res.status(500).json({ 
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error"
    });
  }
}

async function handleGet(
  req: NextApiRequest,
  res: NextApiResponse,
  teamId: string
) {
  const { id, page = "1", limit = "20" } = req.query;

  if (id && typeof id === "string") {
    const template = await prisma.signatureTemplate.findFirst({
      where: { id, teamId },
    });
    
    if (!template) {
      return res.status(404).json({ error: "Template not found" });
    }

    await logTemplateAction(template.id, "TEMPLATE_VIEWED_VIA_API", { templateId: id });
    
    return res.status(200).json(template);
  }

  const pageNum = Math.max(1, parseInt(page as string, 10));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10)));
  const skip = (pageNum - 1) * limitNum;

  const [templates, total] = await Promise.all([
    prisma.signatureTemplate.findMany({
      where: { teamId },
      orderBy: { createdAt: "desc" },
      skip,
      take: limitNum,
      select: {
        id: true,
        name: true,
        description: true,
        numPages: true,
        usageCount: true,
        isPublic: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.signatureTemplate.count({ where: { teamId } }),
  ]);

  return res.status(200).json({
    templates,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
    },
  });
}

async function handlePost(
  req: NextApiRequest,
  res: NextApiResponse,
  teamId: string,
  userId: string
) {
  const validation = CreateTemplateSchema.safeParse(req.body);
  
  if (!validation.success) {
    return res.status(400).json({
      error: "Validation error",
      details: validation.error.errors,
    });
  }

  const data = validation.data;

  const template = await prisma.signatureTemplate.create({
    data: {
      name: data.name,
      description: data.description,
      file: data.file,
      storageType: data.storageType || "S3_PATH",
      numPages: data.numPages,
      defaultRecipients: data.defaultRecipients,
      fields: data.fields,
      defaultEmailSubject: data.defaultEmailSubject,
      defaultEmailMessage: data.defaultEmailMessage,
      defaultExpirationDays: data.defaultExpirationDays,
      isPublic: data.isPublic ?? false,
      teamId,
      createdById: userId,
    },
  });

  await logTemplateAction(template.id, "TEMPLATE_CREATED_VIA_API", { 
    templateName: data.name,
    fieldCount: data.fields?.length || 0,
    recipientCount: data.defaultRecipients?.length || 0,
  });

  return res.status(201).json({
    success: true,
    template,
  });
}

async function handlePut(
  req: NextApiRequest,
  res: NextApiResponse,
  teamId: string
) {
  const validation = UpdateTemplateSchema.safeParse(req.body);
  
  if (!validation.success) {
    return res.status(400).json({
      error: "Validation error",
      details: validation.error.errors,
    });
  }

  const { id, ...data } = validation.data;

  const existing = await prisma.signatureTemplate.findFirst({
    where: { id, teamId },
  });

  if (!existing) {
    return res.status(404).json({ error: "Template not found" });
  }

  const updateData: Record<string, unknown> = {};
  if (data.name) updateData.name = data.name;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.file) updateData.file = data.file;
  if (data.storageType) updateData.storageType = data.storageType;
  if (data.numPages) updateData.numPages = data.numPages;
  if (data.defaultRecipients !== undefined) updateData.defaultRecipients = data.defaultRecipients;
  if (data.fields !== undefined) updateData.fields = data.fields;
  if (data.defaultEmailSubject !== undefined) updateData.defaultEmailSubject = data.defaultEmailSubject;
  if (data.defaultEmailMessage !== undefined) updateData.defaultEmailMessage = data.defaultEmailMessage;
  if (data.defaultExpirationDays !== undefined) updateData.defaultExpirationDays = data.defaultExpirationDays;
  if (data.isPublic !== undefined) updateData.isPublic = data.isPublic;

  const template = await prisma.signatureTemplate.update({
    where: { id },
    data: updateData,
  });

  await logTemplateAction(id, "TEMPLATE_UPDATED_VIA_API", { 
    updatedFields: Object.keys(updateData),
  });

  return res.status(200).json({
    success: true,
    template,
  });
}

async function handleDelete(
  req: NextApiRequest,
  res: NextApiResponse,
  teamId: string
) {
  const { id } = req.query;

  if (!id || typeof id !== "string") {
    return res.status(400).json({ error: "Template ID required" });
  }

  const existing = await prisma.signatureTemplate.findFirst({
    where: { id, teamId },
  });

  if (!existing) {
    return res.status(404).json({ error: "Template not found" });
  }

  await prisma.signatureTemplate.delete({
    where: { id },
  });

  await logTemplateAction(id, "TEMPLATE_DELETED_VIA_API", { 
    templateName: existing.name,
  });

  return res.status(200).json({
    success: true,
    message: "Template deleted",
  });
}

async function logTemplateAction(templateId: string, event: string, metadata: Record<string, unknown>) {
  try {
    await prisma.signatureAuditLog.create({
      data: {
        documentId: templateId,
        event,
        metadata: metadata as object,
      },
    });
  } catch {
  }
}
