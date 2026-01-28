import { encryptPDF, generateDocumentPassword, PDFEncryptionOptions } from "@/lib/crypto/pdf-encryption";
import { encryptServerSide, decryptServerSide, computeDocumentChecksum, EncryptedPayload } from "@/lib/crypto/secure-storage";
import prisma from "@/lib/prisma";
import { getFile, GetFileOptions } from "@/lib/files/get-file";
import { DocumentStorageType } from "@prisma/client";

export interface EncryptedDocumentResult {
  encryptedStorageKey: string;
  documentPassword: string;
  checksum: string;
  encryptedAt: Date;
  originalStorageKey: string;
}

export interface SignatureEncryptionMetadata {
  encrypted: boolean;
  algorithm: string;
  checksum: string;
  encryptedAt: string;
  encryptedFile?: string;
  encryptedPassword?: EncryptedPayload;
  version: number;
}

const ENCRYPTION_VERSION = 1;
const ENCRYPTION_ALGORITHM = "AES-256-GCM";

export async function encryptSignatureImage(
  signatureImage: string,
  documentId: string,
  recipientId: string
): Promise<{ encryptedData: EncryptedPayload; checksum: string }> {
  const signatureBuffer = Buffer.from(signatureImage, "base64");
  const checksum = computeDocumentChecksum(signatureBuffer);
  const encryptedData = encryptServerSide(signatureBuffer);

  await prisma.signatureAuditLog.create({
    data: {
      documentId,
      recipientId,
      event: "SIGNATURE_IMAGE_ENCRYPTED",
      metadata: {
        checksum,
        algorithm: ENCRYPTION_ALGORITHM,
        version: ENCRYPTION_VERSION,
        encryptedAt: new Date().toISOString(),
      } as object,
    },
  });

  return { encryptedData, checksum };
}

export async function decryptSignatureImage(
  encryptedPayload: EncryptedPayload
): Promise<string> {
  const decrypted = decryptServerSide(encryptedPayload);
  return decrypted.toString("base64");
}

export async function encryptCompletedDocument(
  documentId: string,
  storageType: DocumentStorageType,
  storageKey: string,
  options?: {
    userPassword?: string;
    permissions?: PDFEncryptionOptions["permissions"];
  }
): Promise<EncryptedDocumentResult> {
  const fileUrl = await getFile({ type: storageType, data: storageKey } as GetFileOptions);
  const response = await fetch(fileUrl);
  const pdfBuffer = Buffer.from(await response.arrayBuffer());

  const documentPassword = options?.userPassword || generateDocumentPassword();

  const encryptedPdfBytes = await encryptPDF(pdfBuffer, {
    userPassword: documentPassword,
    permissions: options?.permissions || {
      printing: "highResolution",
      copying: false,
      modifying: false,
      annotating: false,
    },
  });

  const checksum = computeDocumentChecksum(encryptedPdfBytes);
  const encryptedStorageKey = `encrypted/${documentId}-${Date.now()}.pdf`;
  const encryptedAt = new Date();

  await prisma.signatureAuditLog.create({
    data: {
      documentId,
      event: "DOCUMENT_ENCRYPTED",
      metadata: {
        originalStorageKey: storageKey,
        encryptedStorageKey,
        checksum,
        algorithm: "PDF-AES-256",
        version: ENCRYPTION_VERSION,
        encryptedAt: encryptedAt.toISOString(),
        hasPassword: true,
      } as object,
    },
  });

  return {
    encryptedStorageKey,
    documentPassword,
    checksum,
    encryptedAt,
    originalStorageKey: storageKey,
  };
}

export async function storeEncryptedPassword(
  documentId: string,
  password: string,
  recipientId?: string
): Promise<void> {
  const encryptedPassword = encryptServerSide(password);

  const document = await prisma.signatureDocument.findUnique({
    where: { id: documentId },
    select: { metadata: true },
  });

  const existingMetadata = (document?.metadata as Record<string, unknown>) || {};

  await prisma.signatureDocument.update({
    where: { id: documentId },
    data: {
      metadata: {
        ...existingMetadata,
        encryption: {
          passwordEncrypted: true,
          encryptedPassword: encryptedPassword as object,
          algorithm: ENCRYPTION_ALGORITHM,
          version: ENCRYPTION_VERSION,
        },
      } as object,
    },
  });

  await prisma.signatureAuditLog.create({
    data: {
      documentId,
      recipientId,
      event: "PASSWORD_STORED_ENCRYPTED",
      metadata: {
        algorithm: ENCRYPTION_ALGORITHM,
        version: ENCRYPTION_VERSION,
        timestamp: new Date().toISOString(),
      } as object,
    },
  });
}

export async function retrieveDocumentPassword(
  documentId: string
): Promise<string | null> {
  const document = await prisma.signatureDocument.findUnique({
    where: { id: documentId },
    select: { metadata: true },
  });

  if (!document?.metadata) {
    return null;
  }

  const metadata = document.metadata as {
    encryption?: {
      passwordEncrypted?: boolean;
      encryptedPassword?: EncryptedPayload;
    };
  };

  if (!metadata.encryption?.passwordEncrypted || !metadata.encryption?.encryptedPassword) {
    return null;
  }

  const decrypted = decryptServerSide(metadata.encryption.encryptedPassword);
  return decrypted.toString("utf-8");
}

export async function processDocumentCompletion(
  documentId: string,
  options?: {
    encrypt?: boolean;
    generatePassword?: boolean;
  }
): Promise<{
  success: boolean;
  encryptedDocument?: EncryptedDocumentResult;
  error?: string;
}> {
  try {
    const document = await prisma.signatureDocument.findUnique({
      where: { id: documentId },
      select: {
        id: true,
        file: true,
        storageType: true,
        status: true,
        metadata: true,
      },
    });

    if (!document) {
      return { success: false, error: "Document not found" };
    }

    if (document.status !== "COMPLETED") {
      return { success: false, error: "Document is not completed" };
    }

    if (!options?.encrypt) {
      return { success: true };
    }

    const encryptedDocument = await encryptCompletedDocument(
      document.id,
      document.storageType,
      document.file
    );

    const existingMetadata = (document.metadata as Record<string, unknown>) || {};

    await prisma.signatureDocument.update({
      where: { id: documentId },
      data: {
        metadata: {
          ...existingMetadata,
          encryption: {
            ...((existingMetadata.encryption as object) || {}),
            encryptedFile: encryptedDocument.encryptedStorageKey,
            checksum: encryptedDocument.checksum,
            encryptedAt: encryptedDocument.encryptedAt.toISOString(),
          },
        } as object,
      },
    });

    if (options.generatePassword) {
      await storeEncryptedPassword(document.id, encryptedDocument.documentPassword);
    }

    return { success: true, encryptedDocument };
  } catch (error) {
    console.error("Failed to process document completion:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export function createEncryptionMetadata(
  checksum: string,
  encrypted: boolean = true
): SignatureEncryptionMetadata {
  return {
    encrypted,
    algorithm: ENCRYPTION_ALGORITHM,
    checksum,
    encryptedAt: new Date().toISOString(),
    version: ENCRYPTION_VERSION,
  };
}

export async function verifyDocumentIntegrity(
  documentId: string,
  pdfBytes: Buffer | Uint8Array
): Promise<boolean> {
  const document = await prisma.signatureDocument.findUnique({
    where: { id: documentId },
    select: { metadata: true },
  });

  const metadata = document?.metadata as { encryption?: { checksum?: string } } | null;

  if (!metadata?.encryption?.checksum) {
    return true;
  }

  const currentChecksum = computeDocumentChecksum(pdfBytes);
  return currentChecksum === metadata.encryption.checksum;
}

export async function getEncryptedSignatureForStorage(
  signatureImage: string,
  documentId: string,
  recipientId: string
): Promise<{ storedValue: string; checksum: string }> {
  const { encryptedData, checksum } = await encryptSignatureImage(
    signatureImage,
    documentId,
    recipientId
  );

  return {
    storedValue: JSON.stringify(encryptedData),
    checksum,
  };
}

export async function decryptStoredSignature(
  storedValue: string
): Promise<string> {
  const encryptedData = JSON.parse(storedValue) as EncryptedPayload;
  return decryptSignatureImage(encryptedData);
}
