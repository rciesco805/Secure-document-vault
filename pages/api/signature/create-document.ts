import { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/prisma";
import { z } from "zod";
import crypto from "crypto";
import { validateApiToken } from "@/lib/api/auth/validate-api-token";
import { DocumentStorageType, SignatureFieldType } from "@prisma/client";

const RecipientSchema = z.object({
  name: z.string().min(1).max(255),
  email: z.string().email(),
  role: z.enum(["SIGNER", "VIEWER", "APPROVER"]).optional().default("SIGNER"),
  signingOrder: z.number().int().positive().optional().default(1),
  accessCode: z.string().max(50).optional(),
});

const FieldSchema = z.object({
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
  required: z.boolean().optional().default(true),
  recipientIndex: z.number().int().min(0).optional().default(0),
});

const CreateDocumentSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().max(2000).optional(),
  templateId: z.string().cuid().optional(),
  file: z.string().min(1).optional(),
  storageType: z.enum(["S3_PATH", "VERCEL_BLOB"]).optional(),
  numPages: z.number().int().positive().optional(),
  recipients: z.array(RecipientSchema).min(1),
  fields: z.array(FieldSchema).optional(),
  emailSubject: z.string().max(255).optional(),
  emailMessage: z.string().max(5000).optional(),
  expirationDays: z.number().int().positive().max(365).optional(),
  documentType: z.string().max(100).optional(),
  subscriptionAmount: z.number().positive().optional(),
  investorId: z.string().cuid().optional(),
  metadata: z.record(z.any()).optional(),
  sendNow: z.boolean().optional().default(false),
});

type FieldInput = z.infer<typeof FieldSchema>;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const auth = await validateApiToken(req.headers.authorization);
  
  if (!auth.valid || !auth.teamId || !auth.userId) {
    return res.status(401).json({ 
      error: "Unauthorized",
      message: auth.error || "Valid API token required" 
    });
  }

  const { teamId, userId } = auth;

  try {
    const validation = CreateDocumentSchema.safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json({
        error: "Validation error",
        details: validation.error.errors,
      });
    }

    const data = validation.data;
    let file = data.file;
    let storageType: DocumentStorageType = (data.storageType as DocumentStorageType) || "S3_PATH";
    let numPages = data.numPages;
    let fields: FieldInput[] = data.fields || [];

    if (data.templateId) {
      const template = await prisma.signatureTemplate.findFirst({
        where: { id: data.templateId, teamId },
      });

      if (!template) {
        return res.status(404).json({ error: "Template not found" });
      }

      file = file || template.file;
      storageType = storageType || template.storageType;
      numPages = numPages || template.numPages || undefined;
      
      if (!data.fields && template.fields) {
        fields = template.fields as FieldInput[];
      }

      await prisma.signatureTemplate.update({
        where: { id: data.templateId },
        data: { usageCount: { increment: 1 } },
      });
    }

    if (!file) {
      return res.status(400).json({ 
        error: "Validation error",
        message: "Either file or templateId with file is required" 
      });
    }

    const expirationDate = data.expirationDays 
      ? new Date(Date.now() + data.expirationDays * 24 * 60 * 60 * 1000)
      : undefined;

    const document = await prisma.signatureDocument.create({
      data: {
        title: data.title,
        description: data.description,
        file,
        storageType,
        numPages,
        status: data.sendNow ? "SENT" : "DRAFT",
        emailSubject: data.emailSubject,
        emailMessage: data.emailMessage,
        expirationDate,
        documentType: data.documentType,
        subscriptionAmount: data.subscriptionAmount,
        investorId: data.investorId,
        metadata: data.metadata,
        sentAt: data.sendNow ? new Date() : undefined,
        teamId,
        createdById: userId,
        recipients: {
          create: data.recipients.map((recipient) => ({
            name: recipient.name,
            email: recipient.email,
            role: recipient.role,
            signingOrder: recipient.signingOrder,
            accessCode: recipient.accessCode,
            signingToken: crypto.randomBytes(32).toString("hex"),
            status: data.sendNow ? "SENT" : "PENDING",
          })),
        },
      },
      include: {
        recipients: true,
      },
    });

    if (fields.length > 0) {
      const fieldData = fields.map((field) => {
        const recipientIndex = field.recipientIndex || 0;
        const recipient = document.recipients[recipientIndex];
        if (!recipient && recipientIndex >= document.recipients.length) {
          throw new Error(`Invalid recipientIndex ${recipientIndex}: only ${document.recipients.length} recipients defined`);
        }
        return {
          documentId: document.id,
          recipientId: recipient?.id,
          type: field.type as SignatureFieldType,
          pageNumber: field.pageNumber,
          x: field.x,
          y: field.y,
          width: field.width,
          height: field.height,
          label: field.label,
          placeholder: field.placeholder,
          required: field.required,
        };
      });
      await prisma.signatureField.createMany({ data: fieldData });
    }

    await prisma.signatureAuditLog.create({
      data: {
        documentId: document.id,
        event: "DOCUMENT_CREATED_VIA_API",
        metadata: {
          templateId: data.templateId,
          recipientCount: data.recipients.length,
          fieldCount: fields.length,
          sendNow: data.sendNow,
        },
      },
    });

    const signingUrls = document.recipients.map((recipient) => ({
      email: recipient.email,
      name: recipient.name,
      role: recipient.role,
      signingUrl: `/view/sign/${recipient.signingToken}`,
    }));

    return res.status(201).json({
      success: true,
      document: {
        id: document.id,
        title: document.title,
        status: document.status,
        createdAt: document.createdAt,
        expirationDate: document.expirationDate,
      },
      recipients: signingUrls,
    });
  } catch (error) {
    console.error("Create document error:", error);
    return res.status(500).json({ 
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error"
    });
  }
}
