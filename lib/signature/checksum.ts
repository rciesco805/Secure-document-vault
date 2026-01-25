import crypto from "crypto";

export interface SignatureChecksum {
  documentHash: string;
  signatureHash: string;
  verificationToken: string;
  algorithm: string;
  createdAt: string;
}

export function generateDocumentHash(documentContent: string | Buffer): string {
  const content = typeof documentContent === "string" 
    ? documentContent 
    : documentContent.toString("base64");
  
  return crypto
    .createHash("sha256")
    .update(content)
    .digest("hex");
}

export function generateSignatureHash(
  signerId: string,
  documentHash: string,
  signedAt: Date,
  ipAddress: string | null
): string {
  const data = `${signerId}:${documentHash}:${signedAt.toISOString()}:${ipAddress || "unknown"}`;
  
  return crypto
    .createHash("sha256")
    .update(data)
    .digest("hex");
}

export function generateVerificationToken(
  signatureHash: string,
  documentId: string
): string {
  const secret = process.env.SIGNATURE_VERIFICATION_SECRET || process.env.NEXTAUTH_SECRET || "bf-fund-sign";
  
  return crypto
    .createHmac("sha256", secret)
    .update(`${signatureHash}:${documentId}`)
    .digest("hex")
    .substring(0, 32);
}

export function createSignatureChecksum(
  signerId: string,
  documentId: string,
  documentContent: string | Buffer,
  signedAt: Date,
  ipAddress: string | null
): SignatureChecksum {
  const documentHash = generateDocumentHash(documentContent);
  const signatureHash = generateSignatureHash(signerId, documentHash, signedAt, ipAddress);
  const verificationToken = generateVerificationToken(signatureHash, documentId);

  return {
    documentHash,
    signatureHash,
    verificationToken,
    algorithm: "sha256",
    createdAt: signedAt.toISOString(),
  };
}

export function verifySignatureChecksum(
  checksum: SignatureChecksum,
  documentContent: string | Buffer,
  signerId: string,
  signedAt: Date,
  ipAddress: string | null
): boolean {
  const currentDocumentHash = generateDocumentHash(documentContent);
  
  if (currentDocumentHash !== checksum.documentHash) {
    return false;
  }

  const currentSignatureHash = generateSignatureHash(
    signerId,
    currentDocumentHash,
    signedAt,
    ipAddress
  );
  
  if (currentSignatureHash !== checksum.signatureHash) {
    return false;
  }

  return true;
}

export interface ConsentRecord {
  consentedAt: string;
  consentVersion: string;
  consentType: "ESIGN" | "ELECTRONIC_RECORDS" | "BOTH";
  ipAddress: string | null;
  userAgent: string | null;
  consentText: string;
}

export const ESIGN_CONSENT_VERSION = "1.0";

export const ESIGN_CONSENT_TEXT = `By clicking "Sign", I agree to:
1. Use electronic signatures to sign this document pursuant to the Electronic Signatures in Global and National Commerce Act (ESIGN Act) and the Uniform Electronic Transactions Act (UETA).
2. Receive and sign documents electronically.
3. Confirm I have the hardware and software required to access electronic records.
4. Understand I may request a paper copy of this document.
5. Understand I may withdraw this consent at any time by contacting the document sender.`;

export function createConsentRecord(
  ipAddress: string | null,
  userAgent: string | null,
  consentType: "ESIGN" | "ELECTRONIC_RECORDS" | "BOTH" = "BOTH"
): ConsentRecord {
  return {
    consentedAt: new Date().toISOString(),
    consentVersion: ESIGN_CONSENT_VERSION,
    consentType,
    ipAddress,
    userAgent,
    consentText: ESIGN_CONSENT_TEXT,
  };
}
