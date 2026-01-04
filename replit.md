# BF Fund Investor Dataroom - Reference Memo

## Overview
The BF Fund Investor Dataroom is a secure, self-hosted investor portal for Bermuda Franchise Group (BFG), built on the Papermark platform. Its purpose is to securely share confidential investment documents with verified investors, featuring email-verified access, custom branding, and detailed page-by-page analytics. The platform also includes a comprehensive e-signature system (BF Fund Sign) for handling NDAs, contracts, and legal documents. It operates under the tagline "Work Well. Play Well. Be Well." and is deployed on Replit with all premium features unlocked and billing functionalities disabled.

## Recent Changes
- **2026-01-04:** Fixed bulk send API to use correct field name for file storage
- **2026-01-04:** Added PDF preview to prepare page using iframe with signed URLs
- **2026-01-04:** Added `fileUrl` to document API response for PDF preview
- **2026-01-04:** Implemented typed signature as default with draw signature as alternative
- **2026-01-04:** Added all 9 signature field types to field placement editor
- **2026-01-04:** Completed Correct & Resend feature for sent documents

## User Preferences
- Communication style: Simple, everyday language
- Technical level: Non-technical explanations preferred
- Focus: Security and ease of use for investors

## System Architecture
The platform is built on Next.js 14 (Pages Router) using TypeScript, Tailwind CSS, and shadcn/ui. PostgreSQL, managed via Prisma ORM, serves as the primary database for both application data and analytics. Authentication is handled by NextAuth.js, supporting magic links (via Resend) and Google OAuth for administrators. File storage utilizes Replit Object Storage with AES-256 encryption.

A critical architectural decision is the **platform-agnostic design**, ensuring all features are implemented dynamically without hardcoded IDs for datarooms, teams, links, or documents. This guarantees features work across any dataroom lifecycle event. Key features include a "Quick Add" system for streamlined investor onboarding, PostgreSQL-based page-level analytics, and an integrated e-signature platform ("BF Fund Sign") with a dashboard, document creation, recipient management, and field placement editor.

**UI/UX Decisions:**
- Custom branding replaces all "Papermark" references with "BF Fund Dataroom".
- Mobile-responsive design for both admin and investor interfaces.
- Auto-adjusting text color on document/folder cards for readability.

## External Dependencies
- **PostgreSQL:** Primary database for application data and analytics.
- **Resend API:** Used for sending magic links and notification emails.
- **Replit Object Storage:** Provides encrypted (AES-256) file storage for documents.
- **pdf-lib:** Used for embedding signatures into downloaded PDFs.
- **qrcode.react:** Generates QR codes for in-person signing.
- **UPSTASH_REDIS_REST_URL:** Optional for rate limiting and session caching; graceful fallback if not configured.

---

## BF Fund Sign - E-Signature Platform

### Implementation Status
All phases complete. The e-signature platform is fully functional with:
- **Phase 1:** Database schema, dashboard, document creation, recipient management, field placement editor
- **Phase 2:** Public signing workflow with secure token-based access, signature canvas, email notifications
- **Phase 3:** Completion notifications, audit trails, PDF download with embedded signatures, reminders, sequential signing
- **Phase 4:** Bulk sending, in-person signing via QR codes, document expiration, edit/correct features, typed signatures

### Key Files

#### Pages
| File | Description |
|------|-------------|
| `pages/sign/index.tsx` | Signature dashboard with document listing |
| `pages/sign/new.tsx` | Create new signature document |
| `pages/sign/bulk.tsx` | Bulk send to multiple recipients |
| `pages/sign/[id]/index.tsx` | Document detail with recipients and audit trail |
| `pages/sign/[id]/prepare.tsx` | Field placement editor with PDF preview |
| `pages/view/sign/[token].tsx` | Public signing page (no auth required) |

#### APIs
| File | Description |
|------|-------------|
| `pages/api/teams/[teamId]/signature-documents/index.ts` | List/create documents |
| `pages/api/teams/[teamId]/signature-documents/[documentId]/index.ts` | Get/update/delete document |
| `pages/api/teams/[teamId]/signature-documents/[documentId]/send.ts` | Send for signature |
| `pages/api/teams/[teamId]/signature-documents/[documentId]/remind.ts` | Send reminder emails |
| `pages/api/teams/[teamId]/signature-documents/[documentId]/download.ts` | Download signed PDF |
| `pages/api/teams/[teamId]/signature-documents/[documentId]/correct.ts` | Correct & resend |
| `pages/api/teams/[teamId]/signature-documents/bulk.ts` | Bulk send |
| `pages/api/sign/[token].ts` | Public signing API |

#### Components
| File | Description |
|------|-------------|
| `components/signature/audit-trail.tsx` | Audit trail with event history |
| `components/signature/qr-code-dialog.tsx` | QR code for in-person signing |
| `components/emails/signature-request.tsx` | Signature request email |
| `components/emails/signature-completed.tsx` | Completion notification email |
| `components/emails/signature-reminder.tsx` | Reminder email |

#### Schema
| File | Description |
|------|-------------|
| `prisma/schema/signature.prisma` | Database models for signatures |
| `lib/swr/use-signature-documents.ts` | SWR hooks and TypeScript types |

### Database Schema

#### SignatureDocument
- `id`, `title`, `description`, `file` (storage key), `storageType`
- `numPages`, `status`, `expirationDate`
- `sentAt`, `completedAt`, `declinedAt`, `voidedAt`, `voidedReason`
- `emailSubject`, `emailMessage`, `auditTrail`
- Relations: `team`, `recipients`, `fields`

#### SignatureRecipient
- `id`, `documentId`, `name`, `email`, `role`, `signingOrder`
- `status`, `viewedAt`, `signedAt`, `declinedAt`, `declinedReason`
- `signingToken` (unique), `signingUrl`, `accessCode`
- `ipAddress`, `userAgent`, `signatureImage`

#### SignatureField
- `id`, `documentId`, `recipientId`, `type`
- `pageNumber`, `x`, `y`, `width`, `height` (percentages)
- `required`, `placeholder`, `value`, `signedAt`

### Document Statuses
| Status | Description |
|--------|-------------|
| DRAFT | Created but not sent |
| SENT | Sent to recipients |
| VIEWED | At least one recipient viewed |
| PARTIALLY_SIGNED | Some recipients signed |
| COMPLETED | All recipients signed |
| DECLINED | A recipient declined |
| VOIDED | Sender cancelled |
| EXPIRED | Passed expiration date |

### Recipient Statuses
| Status | Description |
|--------|-------------|
| PENDING | Not yet sent |
| SENT | Email sent |
| VIEWED | Opened signing page |
| SIGNED | Completed signing |
| DECLINED | Declined to sign |

### Signature Field Types
The field placement editor supports 9 field types:
| Type | Description | Auto-filled |
|------|-------------|-------------|
| SIGNATURE | Signature capture (typed or drawn) | No |
| INITIALS | Initials capture | No |
| DATE_SIGNED | Date of signing | Yes (current date) |
| NAME | Signer's full name | Yes (from recipient) |
| EMAIL | Signer's email | Yes (from recipient) |
| TITLE | Job title | No |
| COMPANY | Company name | No |
| TEXT | Free-form text input | No |
| CHECKBOX | Checkbox for agreements | No |

### Signing Methods
The public signing page offers two signature methods:
1. **Typed Signature (Default):** Enter name, rendered in cursive font (Dancing Script)
2. **Draw Signature:** Draw signature on canvas with mouse/touch

Both methods generate a PNG image stored as base64 in the recipient's `signatureImage` field.

### Signing Flow
1. Admin creates document and uploads PDF
2. Admin adds recipients with roles and signing order
3. Admin places signature fields on document pages using visual editor
4. Admin clicks "Send for Signature"
5. System sends emails to lowest signing order first (sequential signing)
6. Recipients receive email with secure, unique signing link
7. Recipients view document and complete their fields
8. System validates required fields and updates status
9. After each signer completes, next signers receive their emails
10. When all sign, document status becomes COMPLETED
11. All parties receive completion notification email

### Security Features
- **Token-based access:** Unique 32-character tokens for each recipient
- **Per-recipient authorization:** Can only update own fields
- **Expiration enforcement:** Blocks signing after expiration date
- **Transactional updates:** Data integrity on sign operations
- **Audit logging:** IP address, user agent, timestamps for all actions
- **No authentication required:** Signers don't need accounts

### Email Notifications
All emails are branded "BF Fund Sign" with consistent styling:
- **Signature Request:** Sent when document is ready for signing
- **Signature Reminder:** Manual reminder from admin
- **Signature Completed:** Sent to all parties when document is complete

### Features

#### Sequential Signing
- Signing order numbers displayed as badges on recipient avatars
- Recipients sorted by signing order in UI
- Only lowest order signers receive initial emails
- Next signers automatically notified after previous complete
- Enabled by default when sending documents

#### Bulk Sending
- Send same document to multiple recipients (each gets own copy)
- Access via "Bulk Send" button on dashboard
- CSV import: upload file with name, email columns
- Each document created in SENT status immediately
- Ideal for company-wide policies, annual acknowledgments

#### In-Person Signing
- Generate QR codes for recipients to sign on their phone
- Available for sent documents with unsigned recipients
- Select recipient, generate QR code
- Download QR as PNG or copy signing link
- Perfect for meetings, in-person contract signings

#### Document Expiration
- Set optional expiration date when creating document
- API returns HTTP 410 after expiration
- Signing page shows "Document Expired" with clock icon
- Message instructs signer to contact sender

#### PDF Preview
- Prepare page shows actual PDF document in iframe
- Document API returns signed URL via `fileUrl` field
- Fields overlay on top of PDF for accurate placement

#### Document Editing
- Edit Details option in dropdown menu
- Change title, description, email subject/message
- Available for non-completed, non-voided documents

#### Correct & Resend
- Available for sent documents (not completed/voided)
- Creates new draft copy with "(Corrected)" suffix
- Preserves all recipients (reset to pending)
- Preserves all field placements with correct recipient mapping
- Automatically voids original with reason "Corrected and resent"
- Admin can edit corrected draft before resending

#### Audit Trail
- Visual timeline of all document events
- Events: created, sent, viewed, signed, declined, completed, voided
- Shows actor name, timestamp, IP address, device info
- Expandable details for each event
- Displayed on document detail page

#### Download Signed PDF
- Download button on document detail page
- Uses pdf-lib to embed signatures into PDF
- Signature images positioned at exact field coordinates
- Text fields (name, date, etc.) also embedded
- Audit trail summary appended to document

### Branding
- All pages display "BF Fund Sign" branding
- Header: Shield icon + "BF Fund Sign" text
- Footer: "Powered by BF Fund Dataroom | Secure Document Signing"
- Page titles include "BF Fund Sign" suffix
- Email templates use "BF Fund Sign" header

---

## Dataroom Features (Existing)

### Quick Add System
- Streamlined investor onboarding
- Magic link authentication via Resend
- Google OAuth for administrators

### Analytics
- PostgreSQL-based page-level tracking
- View time, page visits, document engagement
- No external analytics dependencies required

### File Storage
- Replit Object Storage with AES-256 encryption
- Supports PDF documents
- Signed URLs for secure access
