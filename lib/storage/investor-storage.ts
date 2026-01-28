import { Client } from "@replit/object-storage";
import crypto from "crypto";

let storageClient: Client | null = null;

function getStorageClient(): Client {
  if (!storageClient) {
    storageClient = new Client();
  }
  return storageClient;
}

export function getInvestorStoragePath(investorId: string, filename: string): string {
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `investors/${investorId}/${sanitizedFilename}`;
}

export function getInvestorDocumentPath(investorId: string, docType: string, docId: string): string {
  const timestamp = Date.now();
  return `investors/${investorId}/documents/${docType}/${docId}_${timestamp}`;
}

export function getInvestorSignaturePath(investorId: string, docType: string): string {
  const timestamp = Date.now();
  return `investors/${investorId}/signatures/${docType}_${timestamp}`;
}

export async function uploadInvestorDocument(
  investorId: string,
  docType: string,
  content: Buffer | string,
  filename: string
): Promise<{ path: string; hash: string }> {
  const client = getStorageClient();
  const path = getInvestorStoragePath(investorId, `documents/${docType}/${filename}`);
  
  const contentBuffer = typeof content === "string" ? Buffer.from(content, "base64") : content;
  const hash = crypto.createHash("sha256").update(contentBuffer).digest("hex");
  
  await client.uploadFromBytes(path, contentBuffer);
  
  return { path, hash };
}

export async function uploadInvestorSignature(
  investorId: string,
  docType: string,
  signatureDataUrl: string
): Promise<{ path: string; hash: string }> {
  const client = getStorageClient();
  
  const base64Data = signatureDataUrl.replace(/^data:image\/\w+;base64,/, "");
  const signatureBuffer = Buffer.from(base64Data, "base64");
  const hash = crypto.createHash("sha256").update(signatureBuffer).digest("hex");
  
  const path = getInvestorSignaturePath(investorId, docType);
  await client.uploadFromBytes(path, signatureBuffer);
  
  return { path, hash };
}

export async function getInvestorDocument(path: string): Promise<Buffer | null> {
  try {
    const client = getStorageClient();
    const result = await client.downloadAsBytes(path);
    return result.ok ? Buffer.from(result.value as Uint8Array) : null;
  } catch (error) {
    console.error("Error downloading investor document:", error);
    return null;
  }
}

export async function getInvestorDocumentUrl(path: string): Promise<string | null> {
  try {
    const client = getStorageClient();
    const result = await client.downloadAsBytes(path);
    if (!result.ok) return null;
    
    const base64 = Buffer.from(result.value as Uint8Array).toString("base64");
    const ext = path.split(".").pop()?.toLowerCase() || "pdf";
    const mimeType = ext === "pdf" ? "application/pdf" : `image/${ext}`;
    
    return `data:${mimeType};base64,${base64}`;
  } catch (error) {
    console.error("Error getting investor document URL:", error);
    return null;
  }
}

export async function listInvestorDocuments(investorId: string): Promise<string[]> {
  try {
    const client = getStorageClient();
    const prefix = `investors/${investorId}/documents/`;
    const result = await client.list({ prefix });
    
    if (!result.ok) return [];
    return result.value.map((obj: any) => obj.key);
  } catch (error) {
    console.error("Error listing investor documents:", error);
    return [];
  }
}

export async function deleteInvestorDocument(path: string): Promise<boolean> {
  try {
    const client = getStorageClient();
    const result = await client.delete(path);
    return result.ok;
  } catch (error) {
    console.error("Error deleting investor document:", error);
    return false;
  }
}

export function verifyDocumentIntegrity(content: Buffer, expectedHash: string): boolean {
  const actualHash = crypto.createHash("sha256").update(content).digest("hex");
  return actualHash === expectedHash;
}
