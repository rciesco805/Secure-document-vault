import prisma from "@/lib/prisma";
import { log } from "@/lib/utils";
import { triggerPersonaVerification } from "@/lib/persona-hooks";

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

  // Post-subscription KYC verification: Trigger Persona for subscription documents
  // Check document metadata or title for subscription document detection
  const doc = await prisma.signatureDocument.findUnique({
    where: { id: documentId },
    select: { metadata: true },
  });
  
  // @ts-ignore - metadata may have triggerKyc field
  const explicitKycTrigger = doc?.metadata?.triggerKyc === true;
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
