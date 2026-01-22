# BF Fund Platform - Complete Technical Overview

**Prepared for External Review**  
**Platform:** Bermuda Franchise Group Investor Portal  
**Production URL:** https://dataroom.bermudafranchisegroup.com  
**Last Updated:** January 2026

---

## Executive Summary

The BF Fund Platform is a secure, self-hosted investor portal consisting of two integrated systems:

1. **BF Fund Dataroom** - Secure document sharing for investors with visitor access management, magic link authentication, and admin approval workflows
2. **BF Fund Sign** - Full e-signature platform with signature fields, templates, bulk sending, QR signing, and audit trails

The platform is designed specifically for accredited investors, providing enterprise-grade security while maintaining ease of use.

### Platform Origin
The platform is based on the open-source [Papermark](https://github.com/mfts/papermark) project (secure document sharing), extended with custom features for BF Fund including:
- Custom-built e-signature system (BF Fund Sign)
- Magic link authentication for investors
- Access request workflows
- Custom branding and domain
- Q&A system for investor communication

### Important Technical Note
The e-signature system is **fully native/built-in** - it does not use external services like DocuSign or OpenSign. The database schema contains optional `openSignDocumentId` and `openSignData` fields as placeholders for potential future external integration, but these are not currently used. All signature capture, field management, and PDF embedding is handled by custom code within this codebase.

---

## Platform Components

### 1. BF Fund Dataroom

#### Core Capabilities
| Feature | Description |
|---------|-------------|
| Secure Document Sharing | Share sensitive documents with investors via secure links |
| Custom Branding | Company logo, colors, welcome messages, and custom domains |
| Folder Organization | Hierarchical folder structure with drag-and-drop |
| Multi-Format Support | PDFs, images, videos, Excel spreadsheets |
| Page-Level Analytics | Track exactly which pages each investor viewed |
| Custom Domains | Use your own domain (dataroom.bermudafranchisegroup.com) |

#### Access Control Features
| Feature | Description |
|---------|-------------|
| Magic Link Authentication | One-click secure access via email |
| Email Verification | Optional OTP verification for additional security |
| Allow/Deny Lists | Control access by specific emails or domains |
| Viewer Groups | Organize investors into groups with specific permissions |
| Permission Templates | Pre-configured access levels for different investor tiers |
| Access Requests | Investors can request access, admins approve/deny |
| Link Expiration | Automatic link expiry after set time period |
| Password Protection | Optional password layer on links |

#### Viewer Experience
| Feature | Description |
|---------|-------------|
| Welcome Screen | Customizable splash screen with personal message |
| Suggested Viewing | Highlight recommended documents for new viewers |
| Q&A System | Investors can leave private notes or ask questions |
| Download Controls | Per-document download permissions |
| Watermarking | Dynamic watermarks with viewer email |
| Screenshot Protection | Optional screenshot blocking |

### 2. BF Fund Sign (E-Signature Platform)

**Implementation:** Fully native/built-in e-signature system (no external API dependencies)

#### Technical Implementation Details
| Component | File Location | Description |
|-----------|--------------|-------------|
| Admin Dashboard | `pages/sign/index.tsx` (295 lines) | Document list, status tracking |
| Create Document | `pages/sign/new.tsx` (431 lines) | Upload PDF, add fields, recipients |
| Bulk Send | `pages/sign/bulk.tsx` | Send to multiple recipients |
| Templates | `pages/sign/templates/` | Reusable document templates |
| Signing API | `pages/api/sign/[token].ts` (431 lines) | Handle signing flow, validation |
| Document CRUD | `pages/api/teams/[teamId]/signature-documents/` | Create, read, update, delete |
| Field Management | `.../signature-documents/[documentId]/fields.ts` | Manage signature fields |
| Send Emails | `.../signature-documents/[documentId]/send.ts` | Send signing requests |
| Reminders | `.../signature-documents/[documentId]/remind.ts` | Send reminder emails |
| Corrections | `.../signature-documents/[documentId]/correct.ts` | Correct and resend |
| Download | `.../signature-documents/[documentId]/download.ts` | Download signed PDFs |
| Audit Trail UI | `components/signature/audit-trail.tsx` | Display audit history |
| QR Signing | `components/signature/qr-code-dialog.tsx` | In-person QR codes |
| Database Schema | `prisma/schema/signature.prisma` (196 lines) | Full data models |

#### Document Preparation
| Feature | Description |
|---------|-------------|
| PDF Upload | Upload documents for signing |
| Drag-and-Drop Fields | Visual field placement editor |
| Multiple Recipients | Add multiple signers, viewers, approvers |
| Sequential Signing | Control signing order (e.g., investor first, then admin) |
| Field Types | Signature, initials, date, text, checkbox, name, email, company, title, address |

#### Signing Workflow
| Feature | Description |
|---------|-------------|
| Email Notifications | Automatic emails when documents need signing |
| Mobile-Friendly | Sign from any device |
| QR Code Signing | In-person signing via QR codes |
| Bulk Sending | Send same document to multiple recipients |
| Correct & Resend | Fix errors and resend to recipients |
| Expiration | Set deadlines for signature completion |

#### Templates & Automation
| Feature | Description |
|---------|-------------|
| Reusable Templates | Create templates for frequently-used documents |
| Saved Recipients | Pre-configured recipient roles |
| Default Messages | Standard email subjects and messages |

#### Compliance & Audit
| Feature | Description |
|---------|-------------|
| Complete Audit Trail | Every action logged with timestamp and IP |
| Signed PDF Download | Final document with embedded signatures |
| Certificate of Completion | Audit log included in final document |

#### Database Models (signature.prisma)
```
SignatureDocument     - Documents requiring signatures
  - id, title, description, file, status
  - expirationDate, sentAt, completedAt
  - emailSubject, emailMessage
  - auditTrail (JSON)
  - teamId, createdById

SignatureRecipient    - Recipients with roles
  - name, email, role (SIGNER/VIEWER/APPROVER)
  - signingOrder, status
  - signingToken (unique secure URL)
  - signedAt, viewedAt, declinedAt
  - ipAddress, userAgent (audit)
  - signatureImage (captured signature)

SignatureField        - Fields placed on documents
  - type (SIGNATURE/INITIALS/DATE/TEXT/etc.)
  - pageNumber, x, y, width, height
  - label, placeholder, required
  - value, filledAt

SignatureTemplate     - Reusable templates
  - name, description, file
  - defaultRecipients (JSON)
  - fields (JSON)
  - defaultEmailSubject/Message
```

---

## Security Architecture

### Authentication Methods
| Method | Usage |
|--------|-------|
| Email Magic Links | Primary authentication for investors |
| Google OAuth | Admin-only authentication |
| Session Management | Secure session tokens with expiration |
| OTP Verification | Optional two-factor via email |

### Data Protection
| Feature | Description |
|--------|-------------|
| AES-256 Encryption | All files encrypted at rest |
| HTTPS Only | All traffic encrypted in transit |
| Secure File Storage | Replit Object Storage with encryption |
| Token-Based Access | Per-recipient authorization tokens |
| IP Logging | Track access locations |

### Access Control Hierarchy
```
SUPER_ADMIN
    |
  ADMIN
    |
 MANAGER
    |
  MEMBER
```

Only two authorized admins:
- rciesco@gmail.com
- investors@bermudafranchisegroup.com

---

## Technical Architecture

### Technology Stack
| Component | Technology |
|-----------|------------|
| Framework | Next.js 14 (React) |
| Language | TypeScript |
| Database | PostgreSQL |
| ORM | Prisma |
| Authentication | NextAuth.js |
| File Storage | Replit Object Storage (encrypted) |
| Email Service | Resend API |
| PDF Processing | pdf-lib, MuPDF |
| AI Features | OpenAI API |
| UI Framework | Tailwind CSS, shadcn/ui, Radix UI |

### Database Schema (40+ Models)

#### Core Entities
- **User** - Platform users (admins and authenticated viewers)
- **Team** - Organization entity, owns all resources
- **UserTeam** - User-team membership with roles

#### Document Management
- **Document** - Uploaded documents
- **DocumentVersion** - Version history
- **DocumentPage** - Individual pages for viewing
- **Folder** - Document organization

#### Dataroom System
- **Dataroom** - Secure document collections
- **DataroomDocument** - Documents within dataroom
- **DataroomFolder** - Folder hierarchy
- **DataroomBrand** - Branding and welcome screen

#### Access Control
- **Link** - Shareable links with settings
- **Domain** - Custom domains
- **Viewer** - External viewers (investors)
- **ViewerGroup** - Groups for access control
- **ViewerGroupMembership** - Group membership
- **ViewerGroupAccessControls** - Granular permissions
- **PermissionGroup** - Permission templates
- **AccessRequest** - Pending access requests

#### E-Signature
- **SignatureDocument** - Documents requiring signatures
- **SignatureRecipient** - Recipients with roles (Signer, Viewer, Approver)
- **SignatureField** - Fields placed on documents
- **SignatureTemplate** - Reusable templates

#### Analytics
- **View** - Document/dataroom view events
- **PageView** - Page-level tracking with duration
- **Reaction** - Viewer reactions

#### Q&A System
- **ViewerNote** - Private notes from viewers
- **DataroomQuestion** - Questions from viewers to admins
- **DataroomFaqItem** - FAQ items

---

## File Storage Architecture

### Storage Backends
| Backend | Purpose |
|---------|---------|
| Replit Object Storage | Primary encrypted storage |
| S3-Compatible | AWS S3 endpoint support |
| TUS Protocol | Resumable uploads for large files |

### Supported File Types
- PDF documents
- Images (PNG, JPG, GIF)
- Videos (MP4, MOV)
- Excel spreadsheets (XLSX, XLS)

---

## API Architecture

### Pages Router APIs (Main Application)
| Category | Endpoints |
|----------|-----------|
| Authentication | NextAuth, account management, passkeys |
| Teams | Documents, datarooms, links, domains, billing |
| Files | Browser upload, S3, TUS resumable, Notion |
| Viewer | Verification, access, analytics |
| E-Signature | Documents, recipients, templates |

### App Router APIs (Modern Features)
| Category | Endpoints |
|----------|-----------|
| Cron Jobs | Domain verification, scheduled tasks |
| Analytics | Views, dataroom analytics |
| System | Webhooks, integrations, feature flags |

### Enterprise APIs
| Category | Endpoints |
|----------|-----------|
| AI Features | Chat, vector stores, document analysis |
| Workflows | Document workflows, entry points |
| FAQs | FAQ management |

---

## User Flows

### Investor Access Flow
```
1. Admin creates link to dataroom
2. Admin shares link with investor
3. Investor clicks link
4. (Optional) Email verification via OTP
5. (Optional) Welcome screen display
6. Investor views documents
7. Analytics recorded for each page view
```

### E-Signature Flow
```
1. Admin uploads document
2. Admin adds signature fields
3. Admin adds recipients
4. Admin sends for signature
5. Recipients receive email notification
6. Recipients click to view document
7. Recipients complete required fields
8. Recipients sign
9. All parties receive completed document
10. Audit trail recorded throughout
```

### Access Request Flow
```
1. Visitor requests access via login page
2. Admin receives notification
3. Admin reviews request
4. Admin approves/denies
5. If approved, visitor receives magic link
6. Visitor gains immediate access
```

---

## Deployment

| Setting | Value |
|---------|-------|
| Platform | Replit |
| Custom Domain | dataroom.bermudafranchisegroup.com |
| Database | Replit PostgreSQL |
| Port | 5000 |
| SSL | Automatic (Replit) |

---

## Future Roadmap: Personalized Investor Portal

### Planned Features
1. **Unique Login per Investor** - Each investor gets personalized dashboard
2. **Fund Raise Tracking** - Real-time fundraising progress and commitments
3. **Investment Document Management**
   - Subscription agreements
   - Capital call notices
   - Distribution notices
   - K-1 tax documents
   - Quarterly/annual reports
4. **Investor Communication** - Secure messaging and announcements

### Database Extensions (Planned)
- Investor profile data
- Investment commitment tracking
- Capital contribution history
- Document categorization per investor

---

## Summary

The BF Fund Platform provides a complete solution for investor relations:

**What's Built:**
- Secure document dataroom with custom branding
- Full e-signature capabilities
- Magic link authentication
- Admin approval workflows
- Page-level analytics
- Q&A system for investor communication
- Custom domain support
- Mobile-friendly interface

**Security Highlights:**
- AES-256 encryption
- Token-based access control
- Comprehensive audit logging
- Role-based permissions
- Two authorized admin accounts only

**Technical Foundation:**
- Modern React/Next.js architecture
- PostgreSQL database with 40+ models
- Multiple file storage backends
- Enterprise-grade authentication

The platform is production-ready and deployed at https://dataroom.bermudafranchisegroup.com

---

*Document prepared for external review. Contains technical specifications for the BF Fund Investor Portal.*
