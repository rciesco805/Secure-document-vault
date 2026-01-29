import { NextApiRequest } from "next";
import prisma from "@/lib/prisma";
import { recordSignatureEvent } from "@/lib/tinybird/publish";
import { userAgentFromString } from "@/lib/utils/user-agent";
import { getIpAddress } from "@/lib/utils/ip";

export type SignatureEventType = 
  | "document.created"
  | "document.sent"
  | "document.viewed"
  | "document.downloaded"
  | "recipient.signed"
  | "recipient.declined"
  | "document.completed"
  | "document.voided"
  | "document.expired"
  | "field.completed"
  | "reminder.sent";

export interface SignatureAuditData {
  documentId: string;
  event: SignatureEventType;
  recipientId?: string | null;
  recipientEmail?: string | null;
  metadata?: Record<string, any>;
  pageNumber?: number | null;
  actionDuration?: number | null;
  sessionId?: string | null;
}

export async function logSignatureEvent(
  req: NextApiRequest,
  data: SignatureAuditData
): Promise<void> {
  try {
    const ipAddress = getIpAddress(req.headers);
    const userAgent = req.headers["user-agent"] || "";
    const referer = (req.headers["referer"] as string) || "(direct)";
    
    const ua = userAgentFromString(userAgent);
    
    // @ts-ignore - Prisma types may need regeneration after schema changes
    const auditLog = await prisma.signatureAuditLog.create({
      data: {
        documentId: data.documentId,
        event: data.event,
        recipientId: data.recipientId || null,
        recipientEmail: data.recipientEmail || null,
        ipAddress: ipAddress || null,
        userAgent: userAgent || null,
        metadata: data.metadata || undefined,
        browser: ua.browser?.name || null,
        browserVersion: ua.browser?.version || null,
        os: ua.os?.name || null,
        osVersion: ua.os?.version || null,
        device: ua.device?.type || "Desktop",
        deviceVendor: ua.device?.vendor || null,
        deviceModel: ua.device?.model || null,
        referer: referer,
        sessionId: data.sessionId || null,
        actionDuration: data.actionDuration || null,
        pageNumber: data.pageNumber || null,
      },
    });

    if (process.env.TINYBIRD_TOKEN && auditLog?.id) {
      try {
        await recordSignatureEvent({
          timestamp: new Date().toISOString(),
          event_id: auditLog.id,
          document_id: data.documentId,
          event: data.event,
          recipient_id: data.recipientId || null,
          recipient_email: data.recipientEmail || null,
          ip_address: ipAddress || null,
          session_id: data.sessionId || null,
          page_number: data.pageNumber || null,
          action_duration: data.actionDuration || null,
          device: ua.device?.type || "Desktop",
          device_model: ua.device?.model || "Unknown",
          device_vendor: ua.device?.vendor || "Unknown",
          browser: ua.browser?.name || "Unknown",
          browser_version: ua.browser?.version || "Unknown",
          os: ua.os?.name || "Unknown",
          os_version: ua.os?.version || "Unknown",
          ua: userAgent || "Unknown",
          referer: referer,
        });
      } catch (tbError) {
        console.warn("Failed to send signature event to Tinybird:", tbError);
      }
    }

    return;
  } catch (error) {
    console.error("Failed to log signature audit event:", error);
  }
}

export async function getSignatureAuditLogs(
  documentId: string,
  options?: {
    limit?: number;
    offset?: number;
    event?: string;
  }
) {
  const logs = await prisma.signatureAuditLog.findMany({
    where: {
      documentId,
      ...(options?.event ? { event: options.event } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: options?.limit || 100,
    skip: options?.offset || 0,
  });

  return logs;
}
