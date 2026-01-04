# BF Fund Investor Dataroom - Reference Memo

## Overview
The BF Fund Investor Dataroom is a secure, self-hosted investor portal for Bermuda Franchise Group (BFG), built on the Papermark platform. Its purpose is to securely share confidential investment documents with verified investors, featuring email-verified access, custom branding, and detailed page-by-page analytics. The platform also includes a comprehensive e-signature system (BF Fund Sign) for handling NDAs, contracts, and legal documents. It operates under the tagline "Work Well. Play Well. Be Well." and is deployed on Replit with all premium features unlocked and billing functionalities disabled.

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
- **UPSTASH_REDIS_REST_URL:** Optional for rate limiting and session caching; graceful fallback if not configured.
- **OpenSign (API - Future Integration):** Considered for legally compliant e-signatures and certificate generation, requires `OPENSIGN_API_TOKEN`. (Currently, the e-signature platform is self-contained).

## BF Fund Sign - E-Signature Platform

### Implementation Status
- **Phase 1 (Complete):** Database schema, dashboard, document creation, recipient management, field placement editor
- **Phase 2 (Complete):** Public signing workflow with secure token-based access, signature canvas, email notifications
- **Phase 3 (Complete):** Completion notification emails, audit trail view, download signed documents with embedded signatures

### Key Files
- `pages/sign/[id]/index.tsx` - Document detail page with recipient management and audit trail
- `pages/sign/[id]/prepare.tsx` - Field placement editor for positioning signature fields
- `pages/view/sign/[token].tsx` - Public signing page (no auth required)
- `pages/api/sign/[token].ts` - API for retrieving/submitting signatures
- `pages/api/teams/[teamId]/signature-documents/[documentId]/send.ts` - Send document for signing
- `pages/api/teams/[teamId]/signature-documents/[documentId]/download.ts` - Download signed PDF with embedded signatures
- `components/signature/audit-trail.tsx` - Audit trail component showing document history
- `components/emails/signature-request.tsx` - Email template for signature requests
- `components/emails/signature-completed.tsx` - Email template for completion notifications
- `prisma/schema/signature.prisma` - Database schema

### Signing Flow
1. Admin creates document and adds recipients
2. Admin places signature fields on document pages
3. Admin clicks "Send for Signature"
4. System generates unique signing tokens per recipient
5. Recipients receive email with secure signing link
6. Recipients view document and draw signature
7. System validates required fields and updates status
8. Document status: DRAFT → SENT → VIEWED → PARTIALLY_SIGNED → COMPLETED

### Security Features
- Token-based access (no authentication required for signers)
- Per-recipient field authorization (can only update own fields)
- Expiration date enforcement
- Transactional updates for data integrity
- IP address and user agent logging for audit trail