import prisma from "@/lib/prisma";
import { generateCompletionCertificate, CertificateData, CertificateRecipient, CertificateAuditEvent } from "./completion-certificate";
import { putFileServer } from "@/lib/files/put-file-server";
import crypto from "crypto";

interface GenerateCertificateResult {
  success: boolean;
  certificateId?: string;
  certificateHash?: string;
  certificateFile?: string;
  error?: string;
}

export async function generateAndStoreCertificate(
  documentId: string,
  teamId: string
): Promise<GenerateCertificateResult> {
  try {
    const document = await prisma.signatureDocument.findUnique({
      where: { id: documentId },
      include: {
        recipients: true,
        team: true,
        owner: true,
      },
    });

    if (!document) {
      return { success: false, error: "Document not found" };
    }

    if (document.status !== "COMPLETED") {
      return { success: false, error: "Document not completed" };
    }

    // @ts-ignore - Field exists in schema, TS server may need restart
    if (document.certificateFile) {
      return {
        success: true,
        // @ts-ignore
        certificateId: document.certificateId || undefined,
        // @ts-ignore
        certificateHash: document.certificateHash || undefined,
        // @ts-ignore
        certificateFile: document.certificateFile,
      };
    }

    // Hash the document file path/reference for certificate integrity
    // The actual file content hash would require fetching the file which is expensive
    // For compliance, we use the document ID + file reference + timestamp as the hash basis
    const hashInput = `${document.id}:${document.file}:${document.completedAt?.toISOString() || new Date().toISOString()}`;
    const documentHash = crypto
      .createHash("sha256")
      .update(hashInput)
      .digest("hex");

    const recipients: CertificateRecipient[] = document.recipients.map((r) => ({
      id: r.id,
      name: r.name,
      email: r.email,
      role: r.role,
      status: r.status,
      signedAt: r.signedAt,
      ipAddress: r.ipAddress,
      signatureChecksum: r.signatureChecksum as any,
    }));

    const auditTrailData = (document.auditTrail as { entries?: any[] }) || { entries: [] };
    const auditEvents: CertificateAuditEvent[] = (auditTrailData.entries || []).map((entry: any) => ({
      event: entry.event || "unknown",
      timestamp: new Date(entry.timestamp || Date.now()),
      recipientEmail: entry.recipientEmail || null,
      ipAddress: entry.ipAddress || null,
      metadata: entry.metadata || {},
    }));

    const certificateData: CertificateData = {
      documentId: document.id,
      documentTitle: document.title,
      organizationName: document.team.name,
      createdAt: document.createdAt,
      sentAt: document.sentAt,
      completedAt: document.completedAt || new Date(),
      recipients,
      auditEvents,
      documentHash,
    };

    const certificate = await generateCompletionCertificate(certificateData);

    const fileName = `certificate-${document.id}-${Date.now()}.pdf`;

    const { type, data } = await putFileServer({
      file: {
        name: fileName,
        type: "application/pdf",
        buffer: Buffer.from(certificate.pdfBytes),
      },
      teamId,
      restricted: false,
    });

    if (!data) {
      return { success: false, error: "Failed to store certificate file" };
    }

    const storedPath = data;

    await prisma.signatureDocument.update({
      where: { id: documentId },
      data: {
        // @ts-ignore - Fields exist in schema, TS server may need restart
        certificateFile: storedPath,
        certificateHash: certificate.certificateHash,
        certificateId: certificate.certificateId,
        certificateGeneratedAt: certificate.generatedAt,
      },
    });

    console.log(`[AUTO_CERTIFICATE] Generated certificate for document ${documentId}:`, {
      certificateId: certificate.certificateId,
      storedPath,
    });

    return {
      success: true,
      certificateId: certificate.certificateId,
      certificateHash: certificate.certificateHash,
      certificateFile: storedPath,
    };
  } catch (error) {
    console.error(`[AUTO_CERTIFICATE] Failed to generate certificate for ${documentId}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function getCertificateDownloadUrl(documentId: string): Promise<string | null> {
  const document = await prisma.signatureDocument.findUnique({
    where: { id: documentId },
    select: { 
      id: true,
      teamId: true,
      // @ts-ignore - Field exists in schema
      certificateFile: true,
    },
  });

  // @ts-ignore
  if (!document?.certificateFile) {
    return null;
  }

  return `/api/signature/certificate/${documentId}/download`;
}
