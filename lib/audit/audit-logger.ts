import { NextApiRequest } from "next";
import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";

export type AuditEventType =
  | "DOCUMENT_VIEWED"
  | "DOCUMENT_DOWNLOADED"
  | "DOCUMENT_SIGNED"
  | "DOCUMENT_COMPLETED"
  | "DOCUMENT_DECLINED"
  | "SUBSCRIPTION_CREATED"
  | "SUBSCRIPTION_SIGNED"
  | "SUBSCRIPTION_PAYMENT_INITIATED"
  | "SUBSCRIPTION_PAYMENT_COMPLETED"
  | "SUBSCRIPTION_PAYMENT_FAILED"
  | "SUBSCRIPTION_PAYMENT_RECORDED"
  | "ACCREDITATION_SUBMITTED"
  | "ACCREDITATION_APPROVED"
  | "ACCREDITATION_REJECTED"
  | "ACCREDITATION_AUTO_APPROVED"
  | "NDA_SIGNED"
  | "CAPITAL_CALL_CREATED"
  | "CAPITAL_CALL_PAID"
  | "DISTRIBUTION_CREATED"
  | "DISTRIBUTION_COMPLETED"
  | "INVESTOR_CREATED"
  | "INVESTOR_UPDATED"
  | "KYC_INITIATED"
  | "KYC_COMPLETED"
  | "KYC_FAILED"
  | "BANK_ACCOUNT_LINKED"
  | "BANK_ACCOUNT_REMOVED"
  | "USER_LOGIN"
  | "USER_LOGOUT"
  | "ADMIN_ACTION"
  | "CERTIFICATE_GENERATED"
  | "CERTIFICATE_DOWNLOADED";

export type ResourceType =
  | "Document"
  | "SignatureDocument"
  | "Subscription"
  | "Transaction"
  | "Investor"
  | "Fund"
  | "User"
  | "Accreditation"
  | "CapitalCall"
  | "Distribution"
  | "BankLink"
  | "Certificate";

export interface AuditLogData {
  eventType: AuditEventType;
  userId?: string | null;
  teamId?: string | null;
  resourceType?: ResourceType;
  resourceId?: string;
  metadata?: Record<string, any>;
  ipAddress?: string | null;
  userAgent?: string | null;
}

function getIpFromHeaders(headers: Headers | { [key: string]: string | string[] | undefined }): string | null {
  if (headers instanceof Headers) {
    return headers.get("x-forwarded-for")?.split(",")[0].trim() || 
           headers.get("x-real-ip") ||
           null;
  }
  const forwarded = headers["x-forwarded-for"];
  if (forwarded) {
    const ip = Array.isArray(forwarded) ? forwarded[0] : forwarded;
    return ip.split(",")[0].trim();
  }
  const realIp = headers["x-real-ip"];
  if (realIp) {
    return Array.isArray(realIp) ? realIp[0] : realIp;
  }
  return null;
}

function getUserAgent(headers: Headers | { [key: string]: string | string[] | undefined }): string | null {
  if (headers instanceof Headers) {
    return headers.get("user-agent");
  }
  const ua = headers["user-agent"];
  return ua ? (Array.isArray(ua) ? ua[0] : ua) : null;
}

export async function logAuditEvent(data: AuditLogData): Promise<string | null> {
  try {
    const auditLog = await prisma.auditLog.create({
      data: {
        eventType: data.eventType,
        userId: data.userId || null,
        teamId: data.teamId || null,
        resourceType: data.resourceType || null,
        resourceId: data.resourceId || null,
        metadata: data.metadata || undefined,
        ipAddress: data.ipAddress || null,
        userAgent: data.userAgent || null,
      },
    });
    return auditLog.id;
  } catch (error) {
    console.error("Failed to create audit log:", error);
    return null;
  }
}

export async function logAuditEventFromRequest(
  req: NextApiRequest | NextRequest,
  data: Omit<AuditLogData, "ipAddress" | "userAgent">
): Promise<string | null> {
  const headers = req instanceof NextRequest ? req.headers : req.headers;
  const ipAddress = getIpFromHeaders(headers as any);
  const userAgent = getUserAgent(headers as any);
  
  return logAuditEvent({
    ...data,
    ipAddress,
    userAgent,
  });
}

export async function logViewEvent(
  req: NextApiRequest | NextRequest,
  options: {
    userId?: string | null;
    teamId?: string | null;
    documentId: string;
    viewerEmail?: string | null;
    linkId?: string | null;
  }
): Promise<string | null> {
  return logAuditEventFromRequest(req, {
    eventType: "DOCUMENT_VIEWED",
    userId: options.userId,
    teamId: options.teamId,
    resourceType: "Document",
    resourceId: options.documentId,
    metadata: {
      viewerEmail: options.viewerEmail,
      linkId: options.linkId,
      timestamp: new Date().toISOString(),
    },
  });
}

export async function logSignEvent(
  req: NextApiRequest | NextRequest,
  options: {
    userId?: string | null;
    teamId?: string | null;
    documentId: string;
    signerEmail: string;
    signerName?: string | null;
    recipientId?: string | null;
  }
): Promise<string | null> {
  return logAuditEventFromRequest(req, {
    eventType: "DOCUMENT_SIGNED",
    userId: options.userId,
    teamId: options.teamId,
    resourceType: "SignatureDocument",
    resourceId: options.documentId,
    metadata: {
      signerEmail: options.signerEmail,
      signerName: options.signerName,
      recipientId: options.recipientId,
      timestamp: new Date().toISOString(),
    },
  });
}

export async function logSubscriptionEvent(
  req: NextApiRequest | NextRequest,
  options: {
    eventType: "SUBSCRIPTION_CREATED" | "SUBSCRIPTION_SIGNED";
    userId?: string | null;
    teamId?: string | null;
    subscriptionId: string;
    investorId: string;
    fundId: string;
    amount: string | number;
  }
): Promise<string | null> {
  return logAuditEventFromRequest(req, {
    eventType: options.eventType,
    userId: options.userId,
    teamId: options.teamId,
    resourceType: "Subscription",
    resourceId: options.subscriptionId,
    metadata: {
      investorId: options.investorId,
      fundId: options.fundId,
      amount: options.amount.toString(),
      timestamp: new Date().toISOString(),
    },
  });
}

export async function logPaymentEvent(
  req: NextApiRequest | NextRequest,
  options: {
    eventType: "SUBSCRIPTION_PAYMENT_INITIATED" | "SUBSCRIPTION_PAYMENT_COMPLETED" | "SUBSCRIPTION_PAYMENT_FAILED" | "SUBSCRIPTION_PAYMENT_RECORDED";
    userId?: string | null;
    teamId?: string | null;
    transactionId: string;
    subscriptionId?: string | null;
    investorId: string;
    fundId?: string | null;
    amount: string | number;
    plaidTransferId?: string | null;
    failureReason?: string | null;
  }
): Promise<string | null> {
  return logAuditEventFromRequest(req, {
    eventType: options.eventType,
    userId: options.userId,
    teamId: options.teamId,
    resourceType: "Transaction",
    resourceId: options.transactionId,
    metadata: {
      subscriptionId: options.subscriptionId,
      investorId: options.investorId,
      fundId: options.fundId,
      amount: options.amount.toString(),
      plaidTransferId: options.plaidTransferId,
      failureReason: options.failureReason,
      timestamp: new Date().toISOString(),
    },
  });
}

export async function logAccreditationEvent(
  req: NextApiRequest | NextRequest,
  options: {
    eventType: "ACCREDITATION_SUBMITTED" | "ACCREDITATION_APPROVED" | "ACCREDITATION_REJECTED" | "ACCREDITATION_AUTO_APPROVED";
    userId?: string | null;
    teamId?: string | null;
    investorId: string;
    accreditationType?: string | null;
    commitmentAmount?: number | null;
    autoApproved?: boolean;
    reason?: string | null;
  }
): Promise<string | null> {
  return logAuditEventFromRequest(req, {
    eventType: options.eventType,
    userId: options.userId,
    teamId: options.teamId,
    resourceType: "Accreditation",
    resourceId: options.investorId,
    metadata: {
      accreditationType: options.accreditationType,
      commitmentAmount: options.commitmentAmount,
      autoApproved: options.autoApproved,
      reason: options.reason,
      timestamp: new Date().toISOString(),
    },
  });
}

export async function logCertificateEvent(
  req: NextApiRequest | NextRequest,
  options: {
    eventType: "CERTIFICATE_GENERATED" | "CERTIFICATE_DOWNLOADED";
    userId?: string | null;
    teamId?: string | null;
    documentId: string;
    certificateId?: string | null;
  }
): Promise<string | null> {
  return logAuditEventFromRequest(req, {
    eventType: options.eventType,
    userId: options.userId,
    teamId: options.teamId,
    resourceType: "Certificate",
    resourceId: options.documentId,
    metadata: {
      certificateId: options.certificateId,
      timestamp: new Date().toISOString(),
    },
  });
}
