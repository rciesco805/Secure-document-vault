export * from "./client-encryption";
export * from "./pdf-encryption";
export * from "./secure-storage";
export * from "./threat-model";

export const CRYPTO_CONFIG = {
  algorithms: {
    symmetric: "AES-256-GCM",
    hash: "SHA-256",
    keyDerivation: "PBKDF2",
  },
  keyLengths: {
    aes: 256,
    iv: 128,
    salt: 256,
  },
  iterations: {
    pbkdf2: 100000,
  },
  pdf: {
    encryptionStandard: "AES-256",
    defaultPermissions: {
      printing: "highResolution",
      copying: false,
      modifying: false,
    },
  },
};

export const SECURITY_DOCUMENTATION = `
# BF Fund Dataroom Security Architecture

## Overview
The platform implements defense-in-depth security with multiple layers of protection
for investor data, signature information, and fund documents.

## Encryption Layers

### 1. Transport Layer (TLS 1.3)
All data in transit is encrypted using TLS 1.3 via Replit's managed infrastructure.

### 2. Client-Side Encryption (Web Crypto API)
- Algorithm: AES-256-GCM
- Key Derivation: PBKDF2 with 100,000 iterations
- Use Case: E2E encryption of signature data before upload
- Location: lib/crypto/client-encryption.ts

### 3. Server-Side Encryption (Node.js Crypto)
- Algorithm: AES-256-GCM with authentication tags
- Key Source: NEXT_PRIVATE_DOCUMENT_PASSWORD_KEY
- Use Case: Encryption at rest for stored documents
- Location: lib/crypto/secure-storage.ts

### 4. PDF-Level Encryption
- Library: pdf-lib-plus-encrypt
- Standard: PDF 2.0 encryption
- Features: User/owner passwords, permission controls
- Location: lib/crypto/pdf-encryption.ts

## Threat Model
See lib/crypto/threat-model.ts for the complete STRIDE-based threat analysis.

## Key Management
- Development: Keys stored in Replit Secrets
- Production: Environment variables in deployment config
- Future: HSM integration for FIPS 140-2 compliance

## Audit Trail
All cryptographic operations are logged to SignatureAuditLog with:
- Timestamp
- Algorithm used
- Document checksums
- Actor identification

## Compliance
- SEC Rule 506(c): Accreditation verification, audit trails
- ESIGN/UETA: Consent capture, signature attribution
- SOC 2: Access controls, encryption, logging (partial)
`;
