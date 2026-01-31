import prisma from "@/lib/prisma";
import { log } from "@/lib/utils";
import { triggerPersonaVerification } from "@/lib/persona-hooks";
import { sendWebhooks } from "@/lib/webhook/send-webhooks";
import { generateAndStoreCertificate } from "@/lib/signature/auto-certificate";

export type SignatureEventType = 
  | "signature.recipient_signed"
  | "signature.document_completed"
  | "signature.document_declined"
  | "signature.document_viewed";

export interface SignatureEventData {
  documentId: string;
  documentTitle: string;
  teamId: string;
  teamName: string;
  recipientId?: string;
  recipientName?: string;
  recipientEmail?: string;
  status: string;
  timestamp: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  allRecipients?: Array<{
    name: string;
    email: string;
    status: string;
    signedAt?: string | null;
  }>;
}

export async function emitSignatureEvent({
  event,
  data,
}: {
  event: SignatureEventType;
  data: SignatureEventData;
}) {
  try {
    // @ts-ignore - Model exists in schema, TS server may need restart
    await prisma.signatureAuditLog.create({
      data: {
        documentId: data.documentId,
        event,
        recipientId: data.recipientId || null,
        recipientEmail: data.recipientEmail || null,
        ipAddress: data.ipAddress || null,
        userAgent: data.userAgent || null,
        metadata: {
          documentTitle: data.documentTitle,
          teamName: data.teamName,
          status: data.status,
          allRecipients: data.allRecipients,
        },
      },
    });

    // Also update auditTrail JSON on the document for compliance
    await appendSignatureAuditEntry(data.documentId, {
      event,
      timestamp: data.timestamp,
      recipientEmail: data.recipientEmail || null,
      recipientName: data.recipientName || null,
      status: data.status,
      ipAddress: data.ipAddress || null,
      userAgent: data.userAgent || null,
    });

    // Dispatch to registered team webhooks
    try {
      const teamWebhooks = await prisma.webhook.findMany({
        where: {
          teamId: data.teamId,
        },
        select: {
          pId: true,
          url: true,
          secret: true,
          triggers: true,
        },
      });

      // Filter webhooks that have this event in their triggers array
      const matchingWebhooks = teamWebhooks.filter((w) => {
        const triggers = w.triggers as string[] | null;
        return triggers?.includes(event);
      });

      if (matchingWebhooks.length > 0) {
        await sendWebhooks({
          webhooks: matchingWebhooks,
          trigger: event,
          data: {
            id: data.documentId,
            documentId: data.documentId,
            name: data.documentTitle,
            teamId: data.teamId,
          } as any,
        });
      }
    } catch (webhookError) {
      console.error(`[SIGNATURE_EVENT] Webhook dispatch error:`, webhookError);
    }

    console.log(`[SIGNATURE_EVENT] ${event}:`, {
      documentId: data.documentId,
      recipientEmail: data.recipientEmail,
      status: data.status,
    });
  } catch (error) {
    log({
      message: `Error emitting signature event ${event}: ${error}`,
      type: "error",
      mention: false,
    });
  }
}

interface AuditEntry {
  event: string;
  timestamp: string;
  recipientEmail?: string | null;
  recipientName?: string | null;
  status: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}

async function appendSignatureAuditEntry(documentId: string, entry: AuditEntry) {
  try {
    const doc = await prisma.signatureDocument.findUnique({
      where: { id: documentId },
      select: { auditTrail: true },
    });

    const currentAudit = (doc?.auditTrail as { entries?: AuditEntry[] }) || { entries: [] };
    const entries = currentAudit.entries || [];
    entries.push(entry);

    await prisma.signatureDocument.update({
      where: { id: documentId },
      data: {
        auditTrail: JSON.parse(JSON.stringify({ entries })),
      },
    });
  } catch (error) {
    console.error("[AUDIT_TRAIL] Failed to append signature audit entry:", error);
  }
}

export async function onRecipientSigned({
  documentId,
  documentTitle,
  teamId,
  teamName,
  recipientId,
  recipientName,
  recipientEmail,
  ipAddress,
  userAgent,
}: {
  documentId: string;
  documentTitle: string;
  teamId: string;
  teamName: string;
  recipientId: string;
  recipientName: string;
  recipientEmail: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}) {
  await emitSignatureEvent({
    event: "signature.recipient_signed",
    data: {
      documentId,
      documentTitle,
      teamId,
      teamName,
      recipientId,
      recipientName,
      recipientEmail,
      status: "SIGNED",
      timestamp: new Date().toISOString(),
      ipAddress,
      userAgent,
    },
  });
}

export async function onDocumentCompleted({
  documentId,
  documentTitle,
  teamId,
  teamName,
  allRecipients,
}: {
  documentId: string;
  documentTitle: string;
  teamId: string;
  teamName: string;
  allRecipients: Array<{
    name: string;
    email: string;
    status: string;
    signedAt?: string | null;
  }>;
}) {
  await emitSignatureEvent({
    event: "signature.document_completed",
    data: {
      documentId,
      documentTitle,
      teamId,
      teamName,
      status: "COMPLETED",
      timestamp: new Date().toISOString(),
      allRecipients,
    },
  });

  // Auto-generate completion certificate
  try {
    const certResult = await generateAndStoreCertificate(documentId, teamId);
    if (certResult.success) {
      console.log(`[SIGNATURE_EVENT] Certificate generated for ${documentId}:`, certResult.certificateId);
    } else {
      console.error(`[SIGNATURE_EVENT] Certificate generation failed for ${documentId}:`, certResult.error);
    }
  } catch (certError) {
    console.error(`[SIGNATURE_EVENT] Certificate generation error for ${documentId}:`, certError);
  }

  // Post-subscription KYC verification: Trigger Persona for subscription documents
  // Check document metadata or title for subscription document detection
  const doc = await prisma.signatureDocument.findUnique({
    where: { id: documentId },
    select: { auditTrail: true },
  });
  
  // @ts-ignore - auditTrail may have triggerKyc field
  const auditTrailData = doc?.auditTrail as Record<string, unknown> | null;
  const explicitKycTrigger = auditTrailData?.triggerKyc === true;
  const titleBasedDetection = documentTitle.toLowerCase().includes("subscription") ||
    documentTitle.toLowerCase().includes("sub agreement") ||
    documentTitle.toLowerCase().includes("investor agreement");
  
  const shouldTriggerKyc = explicitKycTrigger || titleBasedDetection;
  
  if (shouldTriggerKyc) {
    // Trigger Persona KYC for all signers
    for (const recipient of allRecipients) {
      if (recipient.status === "SIGNED") {
        triggerPersonaVerification({
          email: recipient.email,
          name: recipient.name,
          documentId,
          teamId,
        }).catch((err) => {
          console.error(`[PERSONA] Failed to trigger KYC for ${recipient.email}:`, err);
        });
      }
    }
  }
}

export async function onDocumentDeclined({
  documentId,
  documentTitle,
  teamId,
  teamName,
  recipientId,
  recipientName,
  recipientEmail,
  ipAddress,
  userAgent,
}: {
  documentId: string;
  documentTitle: string;
  teamId: string;
  teamName: string;
  recipientId: string;
  recipientName: string;
  recipientEmail: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}) {
  await emitSignatureEvent({
    event: "signature.document_declined",
    data: {
      documentId,
      documentTitle,
      teamId,
      teamName,
      recipientId,
      recipientName,
      recipientEmail,
      status: "DECLINED",
      timestamp: new Date().toISOString(),
      ipAddress,
      userAgent,
    },
  });
}

export async function onDocumentViewed({
  documentId,
  documentTitle,
  teamId,
  teamName,
  recipientId,
  recipientName,
  recipientEmail,
  ipAddress,
  userAgent,
}: {
  documentId: string;
  documentTitle: string;
  teamId: string;
  teamName: string;
  recipientId: string;
  recipientName: string;
  recipientEmail: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}) {
  await emitSignatureEvent({
    event: "signature.document_viewed",
    data: {
      documentId,
      documentTitle,
      teamId,
      teamName,
      recipientId,
      recipientName,
      recipientEmail,
      status: "VIEWED",
      timestamp: new Date().toISOString(),
      ipAddress,
      userAgent,
    },
  });
}
