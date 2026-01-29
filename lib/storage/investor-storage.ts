import crypto from "crypto";
import { getStorageProvider } from "./providers";
import type { StorageProvider } from "./providers/types";

let cachedProvider: StorageProvider | null = null;

function getProvider(): StorageProvider {
  if (!cachedProvider) {
    cachedProvider = getStorageProvider();
  }
  return cachedProvider;
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
  const provider = getProvider();
  const path = getInvestorStoragePath(investorId, `documents/${docType}/${filename}`);
  
  const contentBuffer = typeof content === "string" ? Buffer.from(content, "base64") : content;
  
  const result = await provider.put(path, contentBuffer, {
    encrypt: true,
    contentType: getContentType(filename),
  });
  
  return { path, hash: result.hash };
}

export async function uploadInvestorSignature(
  investorId: string,
  docType: string,
  signatureDataUrl: string
): Promise<{ path: string; hash: string }> {
  const provider = getProvider();
  
  const base64Data = signatureDataUrl.replace(/^data:image\/\w+;base64,/, "");
  const signatureBuffer = Buffer.from(base64Data, "base64");
  
  const path = getInvestorSignaturePath(investorId, docType);
  
  const result = await provider.put(path, signatureBuffer, {
    encrypt: true,
    contentType: "image/png",
  });
  
  return { path, hash: result.hash };
}

export async function getInvestorDocument(path: string): Promise<Buffer | null> {
  try {
    const provider = getProvider();
    return await provider.get(path, { decrypt: true });
  } catch (error) {
    console.error("Error downloading investor document:", error);
    return null;
  }
}

export async function getInvestorDocumentUrl(path: string): Promise<string | null> {
  try {
    const provider = getProvider();
    const data = await provider.get(path, { decrypt: true });
    
    if (!data) return null;
    
    const base64 = data.toString("base64");
    const ext = path.split(".").pop()?.toLowerCase() || "pdf";
    const mimeType = ext === "pdf" ? "application/pdf" : `image/${ext}`;
    
    return `data:${mimeType};base64,${base64}`;
  } catch (error) {
    console.error("Error getting investor document URL:", error);
    return null;
  }
}

export async function getInvestorDocumentSignedUrl(
  path: string,
  expiresIn: number = 3600
): Promise<string | null> {
  try {
    const provider = getProvider();
    return await provider.getSignedUrl(path, { expiresIn, method: "GET" });
  } catch (error) {
    console.error("Error getting signed URL:", error);
    return null;
  }
}

export async function listInvestorDocuments(investorId: string): Promise<string[]> {
  try {
    const provider = getProvider();
    const prefix = `investors/${investorId}/documents/`;
    const result = await provider.list({ prefix });
    return result.keys;
  } catch (error) {
    console.error("Error listing investor documents:", error);
    return [];
  }
}

export async function deleteInvestorDocument(path: string): Promise<boolean> {
  try {
    const provider = getProvider();
    return await provider.delete(path);
  } catch (error) {
    console.error("Error deleting investor document:", error);
    return false;
  }
}

export function verifyDocumentIntegrity(content: Buffer, expectedHash: string): boolean {
  const actualHash = crypto.createHash("sha256").update(content).digest("hex");
  return actualHash === expectedHash;
}

export async function copyInvestorDocument(
  sourcePath: string,
  destPath: string
): Promise<boolean> {
  try {
    const provider = getProvider();
    return await provider.copy(sourcePath, destPath);
  } catch (error) {
    console.error("Error copying investor document:", error);
    return false;
  }
}

export async function investorDocumentExists(path: string): Promise<boolean> {
  try {
    const provider = getProvider();
    return await provider.exists(path);
  } catch {
    return false;
  }
}

function getContentType(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "pdf":
      return "application/pdf";
    case "png":
      return "image/png";
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "gif":
      return "image/gif";
    case "doc":
      return "application/msword";
    case "docx":
      return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    default:
      return "application/octet-stream";
  }
}

export function resetStorageProvider(): void {
  cachedProvider = null;
}

export { getProvider as getStorageProvider };
