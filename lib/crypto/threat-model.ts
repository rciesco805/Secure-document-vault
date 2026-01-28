export const THREAT_MODEL = {
  name: "BF Fund Investor Dataroom Security Threat Model",
  version: "1.0.0",
  lastUpdated: "2026-01-28",

  assets: [
    {
      id: "A1",
      name: "Investor PII",
      description: "Personal identifiable information including names, emails, SSN, addresses",
      sensitivity: "HIGH",
      protections: ["Encryption at rest", "Access control", "Audit logging"],
    },
    {
      id: "A2",
      name: "Signature Data",
      description: "Electronic signatures, signature images, consent records",
      sensitivity: "HIGH",
      protections: ["Client-side encryption", "Server-side encryption", "Checksums"],
    },
    {
      id: "A3",
      name: "Fund Documents",
      description: "Subscription agreements, K-1s, side letters, offering memoranda",
      sensitivity: "CRITICAL",
      protections: ["PDF encryption", "Access control", "Watermarking", "Audit trail"],
    },
    {
      id: "A4",
      name: "Authentication Credentials",
      description: "Passwords, session tokens, magic links",
      sensitivity: "CRITICAL",
      protections: ["Hashing (PBKDF2/SHA-256)", "Token expiration", "Rate limiting"],
    },
    {
      id: "A5",
      name: "Financial Data",
      description: "Investment amounts, bank account info, transaction records",
      sensitivity: "CRITICAL",
      protections: ["Encryption", "PCI compliance", "Plaid tokenization"],
    },
  ],

  threats: [
    {
      id: "T1",
      category: "SPOOFING",
      name: "Identity Spoofing",
      description: "Attacker impersonates legitimate investor or admin",
      likelihood: "MEDIUM",
      impact: "HIGH",
      mitigations: [
        "Magic link authentication with expiration",
        "Email verification",
        "KYC/AML verification via Persona",
        "Database-backed sessions",
      ],
    },
    {
      id: "T2",
      category: "TAMPERING",
      name: "Document Tampering",
      description: "Unauthorized modification of signed documents",
      likelihood: "LOW",
      impact: "CRITICAL",
      mitigations: [
        "SHA-256 document checksums",
        "Signature verification",
        "PDF encryption",
        "Immutable audit logs",
      ],
    },
    {
      id: "T3",
      category: "REPUDIATION",
      name: "Signature Repudiation",
      description: "Signer denies having signed a document",
      likelihood: "MEDIUM",
      impact: "HIGH",
      mitigations: [
        "ESIGN/UETA consent capture",
        "IP address logging",
        "User agent tracking",
        "Timestamp authority (future)",
        "Comprehensive audit trail",
      ],
    },
    {
      id: "T4",
      category: "INFORMATION_DISCLOSURE",
      name: "Data Breach",
      description: "Unauthorized access to sensitive documents or PII",
      likelihood: "MEDIUM",
      impact: "CRITICAL",
      mitigations: [
        "AES-256-GCM encryption at rest",
        "TLS 1.3 in transit",
        "Role-based access control",
        "Client-side encryption option",
      ],
    },
    {
      id: "T5",
      category: "DENIAL_OF_SERVICE",
      name: "Service Unavailability",
      description: "Platform becomes unavailable during critical signing periods",
      likelihood: "LOW",
      impact: "HIGH",
      mitigations: [
        "Replit infrastructure redundancy",
        "Rate limiting",
        "Input validation",
      ],
    },
    {
      id: "T6",
      category: "ELEVATION_OF_PRIVILEGE",
      name: "Privilege Escalation",
      description: "LP gains GP access or accesses other investors' data",
      likelihood: "LOW",
      impact: "CRITICAL",
      mitigations: [
        "Role-based middleware protection",
        "Team-scoped data access",
        "Token scope validation",
        "Cross-log access verification",
      ],
    },
  ],

  securityControls: {
    encryption: {
      atRest: {
        algorithm: "AES-256-GCM",
        keyDerivation: "PBKDF2 with 100,000 iterations",
        keyStorage: "Environment secrets (NEXT_PRIVATE_DOCUMENT_PASSWORD_KEY)",
      },
      inTransit: {
        protocol: "TLS 1.3",
        certificates: "Managed by Replit/Cloudflare",
      },
      clientSide: {
        algorithm: "AES-GCM-256",
        keyDerivation: "PBKDF2 via Web Crypto API",
        purpose: "E2E encryption for signature data",
      },
      pdf: {
        library: "pdf-lib-plus-encrypt",
        standard: "PDF 2.0 encryption",
        permissions: "Configurable (print, copy, modify)",
      },
    },

    authentication: {
      methods: ["Magic links", "Google OAuth", "API tokens"],
      sessionManagement: "Database-backed sessions via @auth/prisma-adapter",
      tokenFormat: "SHA-256 hashed tokens with prefix (pmk_)",
    },

    authorization: {
      model: "Role-Based Access Control (RBAC)",
      roles: ["GP (Admin)", "LP (Investor)", "Viewer"],
      enforcement: "Middleware + API route guards",
    },

    auditLogging: {
      events: [
        "Document views",
        "Signature events",
        "Login attempts",
        "API calls",
        "Permission changes",
      ],
      retention: "Indefinite (SEC compliance)",
      protection: "onDelete: Restrict constraints",
    },

    inputValidation: {
      framework: "Zod schema validation",
      patterns: "ReDoS protection for regex",
      sanitization: "HTML escaping, SQL parameterization (Prisma)",
    },
  },

  complianceRequirements: [
    {
      regulation: "SEC Rule 506(c)",
      requirements: [
        "Accreditation verification",
        "Audit trail maintenance",
        "Document retention",
      ],
      status: "IMPLEMENTED",
    },
    {
      regulation: "ESIGN Act / UETA",
      requirements: [
        "Consumer consent capture",
        "Electronic record integrity",
        "Signature attribution",
      ],
      status: "IMPLEMENTED",
    },
    {
      regulation: "SOC 2 Type II",
      requirements: [
        "Access controls",
        "Encryption",
        "Audit logging",
        "Incident response",
      ],
      status: "PARTIAL",
    },
  ],

  futureEnhancements: [
    {
      feature: "Hardware Security Module (HSM) Integration",
      priority: "HIGH",
      description: "Store encryption keys in FIPS 140-2 compliant HSM",
    },
    {
      feature: "Certificate Authority Integration",
      priority: "MEDIUM",
      description: "Digital signatures with X.509 certificates",
    },
    {
      feature: "Timestamp Authority (TSA)",
      priority: "MEDIUM",
      description: "RFC 3161 compliant timestamping for legal validity",
    },
    {
      feature: "Zero-Knowledge Proofs",
      priority: "LOW",
      description: "Prove accreditation without revealing underlying data",
    },
  ],
};

export function getThreatsByCategory(category: string) {
  return THREAT_MODEL.threats.filter((t) => t.category === category);
}

export function getHighImpactThreats() {
  return THREAT_MODEL.threats.filter(
    (t) => t.impact === "HIGH" || t.impact === "CRITICAL"
  );
}

export function getSecurityControlSummary() {
  return {
    encryptionAlgorithms: [
      THREAT_MODEL.securityControls.encryption.atRest.algorithm,
      THREAT_MODEL.securityControls.encryption.clientSide.algorithm,
    ],
    authenticationMethods: THREAT_MODEL.securityControls.authentication.methods,
    complianceStatus: THREAT_MODEL.complianceRequirements.map((c) => ({
      regulation: c.regulation,
      status: c.status,
    })),
  };
}

export type ThreatCategory =
  | "SPOOFING"
  | "TAMPERING"
  | "REPUDIATION"
  | "INFORMATION_DISCLOSURE"
  | "DENIAL_OF_SERVICE"
  | "ELEVATION_OF_PRIVILEGE";

export type Sensitivity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
