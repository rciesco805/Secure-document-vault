import prisma from "@/lib/prisma";
import { log } from "@/lib/utils";

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
