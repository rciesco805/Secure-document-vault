import crypto from "crypto";
import prisma from "@/lib/prisma";

const ALGORITHM = "aes-256-gcm";
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const TAG_LENGTH = 16;
const SALT_LENGTH = 32;

function getEncryptionKey(): Buffer {
  const keyBase = process.env.NEXT_PRIVATE_DOCUMENT_PASSWORD_KEY || process.env.NEXTAUTH_SECRET;
  if (!keyBase) {
    throw new Error("Encryption key not configured");
  }
  return crypto.createHash("sha256").update(keyBase).digest();
}

export interface EncryptedPayload {
  ciphertext: string;
  iv: string;
  authTag: string;
  version: number;
}

export function encryptServerSide(data: Buffer | string): EncryptedPayload {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  const dataBuffer = typeof data === "string" ? Buffer.from(data, "utf-8") : data;
  const encrypted = Buffer.concat([cipher.update(dataBuffer), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return {
    ciphertext: encrypted.toString("base64"),
    iv: iv.toString("base64"),
    authTag: authTag.toString("base64"),
    version: 1,
  };
}

export function decryptServerSide(payload: EncryptedPayload): Buffer {
  const key = getEncryptionKey();
  const iv = Buffer.from(payload.iv, "base64");
  const authTag = Buffer.from(payload.authTag, "base64");
  const ciphertext = Buffer.from(payload.ciphertext, "base64");

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

export function encryptToString(data: string): string {
  const payload = encryptServerSide(data);
  return JSON.stringify(payload);
}

export function decryptFromString(encryptedString: string): string {
  const payload = JSON.parse(encryptedString) as EncryptedPayload;
  return decryptServerSide(payload).toString("utf-8");
}

export async function storeEncryptedSignature(
  documentId: string,
  recipientId: string,
  signatureData: string,
  metadata?: Record<string, unknown>
): Promise<string> {
  const encrypted = encryptServerSide(signatureData);
  
  const record = await prisma.signatureAuditLog.create({
    data: {
      documentId,
      recipientId,
      event: "SIGNATURE_DATA_ENCRYPTED",
      metadata: {
        encryptedPayload: encrypted as object,
        encryptionVersion: 1,
        algorithm: ALGORITHM,
        ...(metadata || {}),
      } as object,
    },
  });

  return record.id;
}

export async function retrieveEncryptedSignature(
  auditLogId: string
): Promise<string | null> {
  const record = await prisma.signatureAuditLog.findUnique({
    where: { id: auditLogId },
  });

  if (!record?.metadata) {
    return null;
  }

  const metadata = record.metadata as Record<string, unknown>;
  const encryptedPayload = metadata.encryptedPayload as EncryptedPayload;

  if (!encryptedPayload) {
    return null;
  }

  return decryptServerSide(encryptedPayload).toString("utf-8");
}

export function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const actualSalt = salt || crypto.randomBytes(SALT_LENGTH).toString("hex");
  const hash = crypto.pbkdf2Sync(password, actualSalt, 100000, 64, "sha512").toString("hex");
  return { hash, salt: actualSalt };
}

export function verifyPassword(password: string, storedHash: string, salt: string): boolean {
  const { hash } = hashPassword(password, salt);
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(storedHash));
}

export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString("hex");
}

export function computeDocumentChecksum(data: Buffer | Uint8Array): string {
  return crypto.createHash("sha256").update(data).digest("hex");
}

export function verifyDocumentChecksum(data: Buffer | Uint8Array, expectedChecksum: string): boolean {
  const actualChecksum = computeDocumentChecksum(data);
  return crypto.timingSafeEqual(Buffer.from(actualChecksum), Buffer.from(expectedChecksum));
}

export interface DocumentIntegrityData {
  checksum: string;
  encryptedAt: string;
  algorithm: string;
  version: number;
}

export function createDocumentIntegrityRecord(
  pdfBytes: Buffer | Uint8Array
): DocumentIntegrityData {
  return {
    checksum: computeDocumentChecksum(pdfBytes),
    encryptedAt: new Date().toISOString(),
    algorithm: ALGORITHM,
    version: 1,
  };
}

export function verifyDocumentIntegrity(
  pdfBytes: Buffer | Uint8Array,
  integrityData: DocumentIntegrityData
): boolean {
  return verifyDocumentChecksum(pdfBytes, integrityData.checksum);
}

export async function encryptAndStorePDF(
  pdfBytes: Buffer,
  documentId: string,
  recipientId?: string
): Promise<{ encryptedData: EncryptedPayload; integrityData: DocumentIntegrityData }> {
  const integrityData = createDocumentIntegrityRecord(pdfBytes);
  const encryptedData = encryptServerSide(pdfBytes);

  await prisma.signatureAuditLog.create({
    data: {
      documentId,
      recipientId,
      event: "DOCUMENT_ENCRYPTED",
      metadata: {
        checksum: integrityData.checksum,
        encryptedAt: integrityData.encryptedAt,
        algorithm: integrityData.algorithm,
        sizeBytes: pdfBytes.length,
      },
    },
  });

  return { encryptedData, integrityData };
}
