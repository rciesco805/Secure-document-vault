import { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { validateApiToken } from "@/lib/api/auth/validate-api-token";

const VoidDocumentSchema = z.object({
  documentId: z.string().cuid(),
  reason: z.string().min(1).max(500),
  notifyRecipients: z.boolean().optional().default(true),
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const auth = await validateApiToken(req.headers.authorization);
  
  if (!auth.valid || !auth.teamId) {
    return res.status(401).json({ 
      error: "Unauthorized",
      message: auth.error || "Valid API token required" 
    });
  }

  const { teamId } = auth;

  try {
    const validation = VoidDocumentSchema.safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json({
        error: "Validation error",
        details: validation.error.errors,
      });
    }

    const { documentId, reason, notifyRecipients } = validation.data;

    const document = await prisma.signatureDocument.findFirst({
      where: { id: documentId, teamId },
      include: {
        recipients: true,
      },
    });

    if (!document) {
      return res.status(404).json({ error: "Document not found" });
    }

    if (document.status === "COMPLETED") {
      return res.status(400).json({ 
        error: "Cannot void completed document",
        message: "Documents that have been fully signed cannot be voided"
      });
    }

    if (document.status === "VOIDED") {
      return res.status(400).json({ 
        error: "Document already voided" 
      });
    }

    await prisma.signatureDocument.update({
      where: { id: documentId },
      data: {
        status: "VOIDED",
        voidedAt: new Date(),
        voidedReason: reason,
      },
    });

    await prisma.signatureAuditLog.create({
      data: {
        documentId,
        event: "DOCUMENT_VOIDED_VIA_API",
        metadata: {
          reason,
          notifyRecipients,
          previousStatus: document.status,
        },
      },
    });

    return res.status(200).json({
      success: true,
      message: "Document voided successfully",
      notifyRecipients,
    });
  } catch (error) {
    console.error("Void document error:", error);
    return res.status(500).json({ 
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error"
    });
  }
}
