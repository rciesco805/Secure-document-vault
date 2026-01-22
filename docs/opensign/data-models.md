# OpenSign Data Models

> Complete data model reference for OpenSign  
> Adapted from MongoDB schema to match BF Fund's PostgreSQL/Prisma implementation

---

## Overview

OpenSign uses MongoDB for its data storage with Parse Server. The BF Fund platform adapts these models to PostgreSQL using Prisma ORM.

---

## Document Model

The core entity representing a document to be signed.

### OpenSign (MongoDB)

```javascript
{
  _id: ObjectId,
  title: String,
  description: String,
  file: {
    name: String,
    url: String,
    __type: "File"
  },
  status: String,  // "draft", "sent", "viewed", "partially_signed", "completed", "declined", "voided", "expired"
  expirationDate: Date,
  sentAt: Date,
  completedAt: Date,
  declinedAt: Date,
  voidedAt: Date,
  voidedReason: String,
  emailSubject: String,
  emailMessage: String,
  auditTrail: Array,
  createdBy: Pointer<_User>,
  createdAt: Date,
  updatedAt: Date,
  ACL: Object
}
```

### BF Fund (Prisma)

```prisma
model SignatureDocument {
  id                String                 @id @default(cuid())
  title             String
  description       String?
  file              String                 // Reference to file in storage
  storageType       DocumentStorageType    @default(S3_PATH)
  numPages          Int?
  status            SignatureDocumentStatus @default(DRAFT)
  
  // OpenSign integration
  openSignDocumentId String?               // External reference from OpenSign API
  openSignData       Json?                 // Store OpenSign API response data
  
  // Expiration and tracking
  expirationDate    DateTime?
  sentAt            DateTime?
  completedAt       DateTime?
  declinedAt        DateTime?
  voidedAt          DateTime?
  voidedReason      String?
  
  // Message sent to recipients
  emailSubject      String?
  emailMessage      String?
  
  // Audit trail
  auditTrail        Json?
  
  // Relations
  teamId            String
  team              Team                   @relation(...)
  createdById       String
  recipients        SignatureRecipient[]
  fields            SignatureField[]
  
  createdAt         DateTime               @default(now())
  updatedAt         DateTime               @updatedAt
}

enum SignatureDocumentStatus {
  DRAFT
  SENT
  VIEWED
  PARTIALLY_SIGNED
  COMPLETED
  DECLINED
  VOIDED
  EXPIRED
}
```

---

## Recipient Model

Represents a person who needs to sign, view, or approve a document.

### OpenSign (MongoDB)

```javascript
{
  _id: ObjectId,
  document: Pointer<Document>,
  name: String,
  email: String,
  phone: String,
  role: String,  // "signer", "viewer", "approver"
  signingOrder: Number,
  status: String,  // "pending", "sent", "viewed", "signed", "declined"
  viewedAt: Date,
  signedAt: Date,
  declinedAt: Date,
  declinedReason: String,
  signingToken: String,
  accessCode: String,
  ipAddress: String,
  userAgent: String,
  signatureData: String,  // Base64 signature image
  createdAt: Date,
  updatedAt: Date
}
```

### BF Fund (Prisma)

```prisma
model SignatureRecipient {
  id                String                    @id @default(cuid())
  documentId        String
  document          SignatureDocument         @relation(...)
  
  name              String
  email             String
  role              SignatureRecipientRole    @default(SIGNER)
  signingOrder      Int                       @default(1)
  
  // Status tracking
  status            SignatureRecipientStatus  @default(PENDING)
  viewedAt          DateTime?
  signedAt          DateTime?
  declinedAt        DateTime?
  declinedReason    String?
  
  // Security & verification
  signingToken      String?                   @unique
  accessCode        String?
  ipAddress         String?
  userAgent         String?
  
  // OpenSign integration
  openSignRecipientId String?
  signingUrl        String?
  
  // Signature data
  signatureImage    String?
  
  fields            SignatureField[]
  
  createdAt         DateTime                  @default(now())
  updatedAt         DateTime                  @updatedAt
}

enum SignatureRecipientRole {
  SIGNER
  VIEWER
  APPROVER
}

enum SignatureRecipientStatus {
  PENDING
  SENT
  VIEWED
  SIGNED
  DECLINED
}
```

---

## Field Model

Represents a field/widget placed on the document for recipients to fill.

### OpenSign (MongoDB)

```javascript
{
  _id: ObjectId,
  document: Pointer<Document>,
  recipient: Pointer<Recipient>,
  type: String,  // "signature", "initials", "date", "text", "checkbox", "name", "email", "company", "title", "address"
  pageNumber: Number,
  x: Number,  // Percentage of page width
  y: Number,  // Percentage of page height
  width: Number,
  height: Number,
  label: String,
  placeholder: String,
  required: Boolean,
  value: String,  // Filled value
  filledAt: Date,
  createdAt: Date,
  updatedAt: Date
}
```

### BF Fund (Prisma)

```prisma
model SignatureField {
  id                String                 @id @default(cuid())
  documentId        String
  document          SignatureDocument      @relation(...)
  recipientId       String?
  recipient         SignatureRecipient?    @relation(...)
  
  type              SignatureFieldType
  
  // Position on document
  pageNumber        Int
  x                 Float                  // X position (percentage of page width)
  y                 Float                  // Y position (percentage of page height)
  width             Float                  // Width (percentage)
  height            Float                  // Height (percentage)
  
  // Field configuration
  label             String?
  placeholder       String?
  required          Boolean                @default(true)
  
  // Filled value
  value             String?
  filledAt          DateTime?
  
  createdAt         DateTime               @default(now())
  updatedAt         DateTime               @updatedAt
}

enum SignatureFieldType {
  SIGNATURE
  INITIALS
  DATE_SIGNED
  TEXT
  CHECKBOX
  NAME
  EMAIL
  COMPANY
  TITLE
  ADDRESS
}
```

---

## Template Model

Reusable document templates with pre-configured fields and recipient roles.

### OpenSign (MongoDB)

```javascript
{
  _id: ObjectId,
  name: String,
  description: String,
  file: File,
  defaultRecipients: [
    {
      role: String,
      roleName: String,
      signingOrder: Number
    }
  ],
  fields: [
    {
      type: String,
      pageNumber: Number,
      x: Number,
      y: Number,
      width: Number,
      height: Number,
      recipientRole: String,
      required: Boolean
    }
  ],
  defaultEmailSubject: String,
  defaultEmailMessage: String,
  usageCount: Number,
  isPublic: Boolean,
  createdBy: Pointer<_User>,
  createdAt: Date,
  updatedAt: Date
}
```

### BF Fund (Prisma)

```prisma
model SignatureTemplate {
  id                String                 @id @default(cuid())
  name              String
  description       String?
  file              String
  storageType       DocumentStorageType    @default(S3_PATH)
  numPages          Int?
  
  // Default recipients (roles, not specific people)
  defaultRecipients Json?
  
  // Pre-configured fields
  fields            Json?
  
  // Default settings
  defaultEmailSubject String?
  defaultEmailMessage String?
  defaultExpirationDays Int?
  
  // Usage tracking
  usageCount        Int                    @default(0)
  
  teamId            String
  team              Team                   @relation(...)
  createdById       String
  
  isPublic          Boolean                @default(false)
  
  createdAt         DateTime               @default(now())
  updatedAt         DateTime               @updatedAt
}
```

---

## Audit Trail Structure

The audit trail is stored as a JSON array in the document:

```json
[
  {
    "action": "DOCUMENT_CREATED",
    "timestamp": "2026-01-15T10:30:00Z",
    "actor": {
      "type": "user",
      "id": "user123",
      "email": "admin@company.com",
      "name": "Admin User"
    },
    "metadata": {}
  },
  {
    "action": "DOCUMENT_SENT",
    "timestamp": "2026-01-15T10:35:00Z",
    "actor": {
      "type": "user",
      "id": "user123",
      "email": "admin@company.com"
    },
    "metadata": {
      "recipients": ["signer@example.com", "viewer@example.com"]
    }
  },
  {
    "action": "DOCUMENT_VIEWED",
    "timestamp": "2026-01-15T11:00:00Z",
    "actor": {
      "type": "recipient",
      "email": "signer@example.com",
      "name": "John Signer"
    },
    "metadata": {
      "ipAddress": "192.168.1.100",
      "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)...",
      "location": "San Francisco, CA, US"
    }
  },
  {
    "action": "FIELD_COMPLETED",
    "timestamp": "2026-01-15T11:05:00Z",
    "actor": {
      "type": "recipient",
      "email": "signer@example.com"
    },
    "metadata": {
      "fieldType": "SIGNATURE",
      "fieldId": "field123",
      "pageNumber": 3
    }
  },
  {
    "action": "RECIPIENT_SIGNED",
    "timestamp": "2026-01-15T11:06:00Z",
    "actor": {
      "type": "recipient",
      "email": "signer@example.com"
    },
    "metadata": {
      "ipAddress": "192.168.1.100"
    }
  },
  {
    "action": "DOCUMENT_COMPLETED",
    "timestamp": "2026-01-15T11:06:00Z",
    "actor": {
      "type": "system"
    },
    "metadata": {
      "signedFileUrl": "https://storage.example.com/signed.pdf"
    }
  }
]
```

### Audit Action Types

| Action | Description |
|--------|-------------|
| DOCUMENT_CREATED | Document was created |
| DOCUMENT_SENT | Document was sent to recipients |
| DOCUMENT_VIEWED | A recipient viewed the document |
| FIELD_COMPLETED | A recipient filled in a field |
| RECIPIENT_SIGNED | A recipient completed all their fields |
| DOCUMENT_COMPLETED | All recipients finished signing |
| DOCUMENT_DECLINED | A recipient declined to sign |
| DOCUMENT_VOIDED | Sender cancelled the document |
| DOCUMENT_EXPIRED | Document expired |
| REMINDER_SENT | Reminder email was sent |
| DOCUMENT_DOWNLOADED | Signed PDF was downloaded |

---

## Field Position Coordinate System

Fields use percentage-based coordinates relative to the PDF page:

```
┌──────────────────────────────────────┐
│ (0,0)                         (100,0) │
│                                       │
│     ┌─────────────────┐              │
│     │  Signature      │              │
│     │  Field          │              │
│     │  x=15, y=60     │              │
│     │  w=30, h=10     │              │
│     └─────────────────┘              │
│                                       │
│ (0,100)                     (100,100) │
└──────────────────────────────────────┘
```

- **x**: Horizontal position from left edge (0-100%)
- **y**: Vertical position from top edge (0-100%)
- **width**: Field width as percentage of page width
- **height**: Field height as percentage of page height

This percentage-based system ensures fields scale correctly across different PDF sizes and display resolutions.
