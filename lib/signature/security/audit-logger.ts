import prisma from "@/lib/prisma";
import { headers } from "next/headers";

export type SignatureAuditEvent =
  | "DOCUMENT_CREATED"
  | "DOCUMENT_SENT"
  | "DOCUMENT_VIEWED"
  | "DOCUMENT_DOWNLOADED"
  | "DOCUMENT_PRINTED"
  | "DOCUMENT_VOIDED"
  | "DOCUMENT_COMPLETED"
  | "DOCUMENT_EXPIRED"
  | "RECIPIENT_ADDED"
  | "RECIPIENT_REMOVED"
  | "RECIPIENT_REMINDED"
  | "FIELD_CREATED"
  | "FIELD_MODIFIED"
  | "FIELD_DELETED"
  | "FIELD_FILLED"
  | "FIELD_VALIDATED"
  | "SIGNATURE_STARTED"
  | "SIGNATURE_COMPLETED"
  | "SIGNATURE_DECLINED"
  | "CONSENT_CAPTURED"
  | "ACCESS_CODE_VERIFIED"
  | "PLUGIN_EXECUTED"
  | "CUSTOM_FIELD_ACTION"
  | "SECURITY_VIOLATION"
  | "CONFIG_VALIDATION_FAILED";

export interface AuditLogData {
  documentId: string;
  event: SignatureAuditEvent;
  recipientId?: string;
  recipientEmail?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
  pageNumber?: number;
  sessionId?: string;
  actionDuration?: number;
}

export interface GeoData {
  country?: string;
  city?: string;
  region?: string;
}

export interface DeviceData {
  browser?: string;
  browserVersion?: string;
  os?: string;
  osVersion?: string;
  device?: string;
  deviceVendor?: string;
  deviceModel?: string;
}

function parseUserAgent(userAgent: string): DeviceData {
  const deviceData: DeviceData = {
    device: "Desktop",
  };

  if (/Mobile|Android|iPhone|iPad/.test(userAgent)) {
    deviceData.device = "Mobile";
  } else if (/Tablet|iPad/.test(userAgent)) {
    deviceData.device = "Tablet";
  }

  const browserMatch = userAgent.match(/(Chrome|Firefox|Safari|Edge|Opera)\/([0-9.]+)/);
  if (browserMatch) {
    deviceData.browser = browserMatch[1];
    deviceData.browserVersion = browserMatch[2];
  }

  const osMatch = userAgent.match(/(Windows NT|Mac OS X|Linux|Android|iOS)[^\s);]*/);
  if (osMatch) {
    deviceData.os = osMatch[1].replace(/_/g, " ");
  }

  return deviceData;
}

export async function logSignatureAudit(data: AuditLogData): Promise<void> {
  try {
    const deviceData = data.userAgent ? parseUserAgent(data.userAgent) : {};

    await prisma.signatureAuditLog.create({
      data: {
        documentId: data.documentId,
        event: data.event,
        recipientId: data.recipientId,
        recipientEmail: data.recipientEmail,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        metadata: data.metadata ? JSON.parse(JSON.stringify(data.metadata)) : undefined,
        pageNumber: data.pageNumber,
        sessionId: data.sessionId,
        actionDuration: data.actionDuration,
        browser: deviceData.browser,
        browserVersion: deviceData.browserVersion,
        os: deviceData.os,
        osVersion: deviceData.osVersion,
        device: deviceData.device,
        deviceVendor: deviceData.deviceVendor,
        deviceModel: deviceData.deviceModel,
      },
    });
  } catch (error) {
    console.error("Failed to create signature audit log:", error);
  }
}

export async function logCustomFieldAction(
  documentId: string,
  fieldId: string,
  fieldType: string,
  action: string,
  recipientId?: string,
  recipientEmail?: string,
  metadata?: Record<string, unknown>,
  req?: { headers: Headers }
): Promise<void> {
  const ipAddress = req?.headers?.get("x-forwarded-for")?.split(",")[0] || 
                    req?.headers?.get("x-real-ip") || 
                    undefined;
  const userAgent = req?.headers?.get("user-agent") || undefined;

  await logSignatureAudit({
    documentId,
    event: "CUSTOM_FIELD_ACTION",
    recipientId,
    recipientEmail,
    ipAddress,
    userAgent,
    metadata: {
      fieldId,
      fieldType,
      action,
      ...metadata,
    },
  });
}

export async function logSecurityViolation(
  documentId: string,
  violation: string,
  details: Record<string, unknown>,
  req?: { headers: Headers }
): Promise<void> {
  const ipAddress = req?.headers?.get("x-forwarded-for")?.split(",")[0] || 
                    req?.headers?.get("x-real-ip") || 
                    undefined;
  const userAgent = req?.headers?.get("user-agent") || undefined;

  await logSignatureAudit({
    documentId,
    event: "SECURITY_VIOLATION",
    ipAddress,
    userAgent,
    metadata: {
      violation,
      ...details,
      timestamp: new Date().toISOString(),
    },
  });

  console.warn(`Security violation for document ${documentId}: ${violation}`, details);
}

export async function logConfigValidationFailure(
  documentId: string,
  configType: string,
  errors: string[],
  attemptedConfig?: unknown
): Promise<void> {
  await logSignatureAudit({
    documentId,
    event: "CONFIG_VALIDATION_FAILED",
    metadata: {
      configType,
      errors,
      attemptedConfig: JSON.stringify(attemptedConfig).substring(0, 1000),
      timestamp: new Date().toISOString(),
    },
  });
}

export async function getAuditTrailForDocument(
  documentId: string
): Promise<Array<{
  id: string;
  event: string;
  recipientEmail: string | null;
  ipAddress: string | null;
  metadata: unknown;
  createdAt: Date;
}>> {
  return prisma.signatureAuditLog.findMany({
    where: { documentId },
    select: {
      id: true,
      event: true,
      recipientEmail: true,
      ipAddress: true,
      metadata: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  });
}

export async function generateComplianceReport(
  documentId: string
): Promise<{
  documentId: string;
  totalEvents: number;
  eventsByType: Record<string, number>;
  timeline: Array<{
    timestamp: Date;
    event: string;
    actor: string | null;
    details: unknown;
  }>;
  securityEvents: number;
  complianceStatus: "compliant" | "review_required" | "non_compliant";
}> {
  const logs = await prisma.signatureAuditLog.findMany({
    where: { documentId },
    orderBy: { createdAt: "asc" },
  });

  const eventsByType: Record<string, number> = {};
  let securityEvents = 0;

  for (const log of logs) {
    eventsByType[log.event] = (eventsByType[log.event] || 0) + 1;
    if (log.event === "SECURITY_VIOLATION") {
      securityEvents++;
    }
  }

  const timeline = logs.map((log: typeof logs[number]) => ({
    timestamp: log.createdAt,
    event: log.event,
    actor: log.recipientEmail,
    details: log.metadata,
  }));

  let complianceStatus: "compliant" | "review_required" | "non_compliant" = "compliant";
  if (securityEvents > 0) {
    complianceStatus = securityEvents > 3 ? "non_compliant" : "review_required";
  }

  return {
    documentId,
    totalEvents: logs.length,
    eventsByType,
    timeline,
    securityEvents,
    complianceStatus,
  };
}
