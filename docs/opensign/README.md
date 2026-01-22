# OpenSign Reference Documentation

> Official documentation for OpenSign - the open-source e-signature platform  
> Repository: https://github.com/OpenSignLabs/OpenSign  
> Docs: https://docs.opensignlabs.com/

---

## What is OpenSign?

OpenSign is a free, open-source alternative to DocuSign for secure document e-signing. It provides enterprise-grade digital signature capabilities while being fully open source under the AGPL license.

**Key Links:**
| Resource | URL |
|----------|-----|
| GitHub Repository | https://github.com/OpenSignLabs/OpenSign |
| Official Documentation | https://docs.opensignlabs.com/ |
| API Documentation | https://docs.opensignlabs.com/docs/API-docs/v1/opensign-api-v-1/ |
| Cloud Version | https://app.opensignlabs.com/ |

---

## Core Features

### Document Signing
| Feature | Description |
|---------|-------------|
| Secure PDF E-Signing | Robust encryption algorithms for maximum security and privacy |
| Unlimited Signatures | Free unlimited document signing |
| Multi-signer Support | Invite multiple signers with sequential signing enforcement |
| OTP Verification | Email unique code verification for guest signers |
| Document Annotations | Hand-drawn, uploaded images, typed, and saved signatures |

### Templates & Automation
| Feature | Description |
|---------|-------------|
| Template Creation | Create and store reusable PDF document templates |
| Bulk Sending | Send same document to multiple recipients |
| OpenSign Drive | Centralized secure vault for document storage |

### Compliance & Audit
| Feature | Description |
|---------|-------------|
| Audit Trails | Detailed logs with timestamps, IP addresses, email IDs |
| Completion Certificates | Auto-generated with full document activity logs |
| Document Expiry | Set expiration dates for documents |
| Rejection Capability | Signers can reject documents with reason |

---

## Technology Stack

| Component | Technology |
|-----------|------------|
| Frontend | React (with Vite or Create React App) |
| Backend | Node.js with Parse Server |
| Database | MongoDB |
| File Storage | S3-compatible or local storage |
| Encryption | AES encryption for documents |

---

## Data Models

### Core Entities

#### Document
The main document entity for signing:
```
Document {
  objectId: string       // Unique identifier
  title: string          // Document title
  description: string    // Optional description
  file: File             // PDF file reference
  status: string         // DRAFT, SENT, VIEWED, PARTIALLY_SIGNED, COMPLETED, DECLINED, VOIDED, EXPIRED
  expirationDate: Date   // Optional expiration
  sentAt: Date           // When sent to recipients
  completedAt: Date      // When all signatures collected
  auditTrail: Array      // Complete audit log
}
```

#### Recipient (Signer)
Recipients who need to sign or view the document:
```
Recipient {
  objectId: string       // Unique identifier
  name: string           // Recipient name
  email: string          // Email address
  role: string           // SIGNER, VIEWER, APPROVER
  signingOrder: number   // Order for sequential signing
  status: string         // PENDING, SENT, VIEWED, SIGNED, DECLINED
  viewedAt: Date         // When first viewed
  signedAt: Date         // When signed
  signingToken: string   // Secure token for signing URL
  signatureImage: string // Captured signature data
}
```

#### Field (Widget)
Fields placed on the document for recipients to fill:
```
Field {
  objectId: string       // Unique identifier
  type: string           // SIGNATURE, INITIALS, DATE, TEXT, CHECKBOX, NAME, EMAIL, COMPANY, TITLE, ADDRESS
  pageNumber: number     // Which page (1-indexed)
  x: number              // X position (percentage)
  y: number              // Y position (percentage)
  width: number          // Width (percentage)
  height: number         // Height (percentage)
  required: boolean      // Whether field is required
  value: string          // Filled value after completion
  assignedTo: Recipient  // Which recipient must fill this
}
```

#### Template
Reusable document templates:
```
Template {
  objectId: string       // Unique identifier
  name: string           // Template name
  description: string    // Optional description
  file: File             // Template PDF
  defaultRecipients: Array  // Pre-configured recipient roles
  fields: Array          // Pre-placed fields
  defaultSubject: string // Default email subject
  defaultMessage: string // Default email message
}
```

---

## Field Types

| Type | Description | Auto-filled |
|------|-------------|-------------|
| SIGNATURE | Hand-drawn or uploaded signature | No |
| INITIALS | Initials (shorter signature) | No |
| DATE_SIGNED | Date when signed | Yes (current date) |
| TEXT | Free text input | No |
| CHECKBOX | Checkbox for agreement | No |
| NAME | Signer's full name | Yes (from recipient) |
| EMAIL | Signer's email | Yes (from recipient) |
| COMPANY | Company name | No |
| TITLE | Job title | No |
| ADDRESS | Mailing address | No |

---

## Document Status Workflow

```
DRAFT
  │
  ▼ (Send to recipients)
SENT
  │
  ▼ (First recipient opens)
VIEWED
  │
  ├─────────────────────────────┐
  ▼                             ▼
PARTIALLY_SIGNED           DECLINED
  │                             │
  ▼ (All recipients sign)       ▼
COMPLETED                   (End state)
  │
  ▼
(End state - download signed PDF)

Alternative paths:
- VOIDED: Sender cancels the document
- EXPIRED: Expiration date passed
```

---

## Recipient Roles

| Role | Description |
|------|-------------|
| SIGNER | Must sign the document with signature field(s) |
| VIEWER | Only receives a copy (CC), no signature required |
| APPROVER | Must approve before other signers can proceed |

---

## Sequential Signing

OpenSign supports sequential signing order:

1. Recipients are assigned a `signingOrder` number (1, 2, 3, etc.)
2. Only the recipient with the current order receives signing notification
3. After they complete, the next recipient is notified
4. Process continues until all recipients complete

**Example:**
```
Order 1: Legal Team (APPROVER) → Must approve first
Order 2: Client (SIGNER) → Signs after legal approval
Order 3: CEO (SIGNER) → Counter-signs last
```

---

## Audit Trail

Every action on a document is logged:

```json
{
  "auditTrail": [
    {
      "action": "DOCUMENT_CREATED",
      "timestamp": "2026-01-15T10:30:00Z",
      "actor": "admin@company.com",
      "ipAddress": "192.168.1.1"
    },
    {
      "action": "DOCUMENT_SENT",
      "timestamp": "2026-01-15T10:35:00Z",
      "actor": "admin@company.com",
      "recipients": ["signer@example.com"]
    },
    {
      "action": "DOCUMENT_VIEWED",
      "timestamp": "2026-01-15T11:00:00Z",
      "actor": "signer@example.com",
      "ipAddress": "10.0.0.50",
      "userAgent": "Mozilla/5.0..."
    },
    {
      "action": "FIELD_COMPLETED",
      "timestamp": "2026-01-15T11:05:00Z",
      "actor": "signer@example.com",
      "fieldType": "SIGNATURE",
      "pageNumber": 3
    },
    {
      "action": "DOCUMENT_SIGNED",
      "timestamp": "2026-01-15T11:06:00Z",
      "actor": "signer@example.com"
    },
    {
      "action": "DOCUMENT_COMPLETED",
      "timestamp": "2026-01-15T11:06:00Z"
    }
  ]
}
```

---

## API Overview

### Authentication
All API requests require `x-api-token` header:
```
Headers:
  x-api-token: your_api_token_here
```

### Key Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| /documents | POST | Create a new document |
| /documents/{id} | GET | Get document details |
| /documents/{id}/send | POST | Send document to recipients |
| /documents/{id}/void | POST | Void/cancel a document |
| /documents/{id}/resend | POST | Resend notification to recipient |
| /templates | GET | List templates |
| /templates | POST | Create a template |

---

## BF Fund Integration Notes

The BF Fund Sign module adapts OpenSign concepts with these mappings:

| OpenSign Concept | BF Fund Implementation |
|------------------|------------------------|
| Document | `SignatureDocument` model in Prisma |
| Recipient | `SignatureRecipient` model |
| Field/Widget | `SignatureField` model |
| Template | `SignatureTemplate` model |
| Audit Trail | JSON field in SignatureDocument |
| File Storage | Replit Object Storage (not MongoDB GridFS) |
| Database | PostgreSQL (not MongoDB) |

### External ID Fields
The BF Fund models include OpenSign reference fields for potential future API integration:
- `SignatureDocument.openSignDocumentId` - External OpenSign document ID
- `SignatureDocument.openSignData` - Raw API response data
- `SignatureRecipient.openSignRecipientId` - External OpenSign recipient ID
- `SignatureRecipient.signingUrl` - OpenSign signing URL

---

## Quick Reference Links

| Topic | Documentation |
|-------|---------------|
| Getting Started | https://docs.opensignlabs.com/docs/help/intro |
| Self-Hosting | https://docs.opensignlabs.com/docs/self-host/intro |
| API Reference | https://docs.opensignlabs.com/docs/API-docs/v1/opensign-api-v-1/ |
| Installation | https://docs.opensignlabs.com/docs/contribute/INSTALLATION/ |
| GitHub Issues | https://github.com/OpenSignLabs/OpenSign/issues |
| Discord Community | https://discord.com/invite/xe9TDuyAyj |
