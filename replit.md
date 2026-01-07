# BF Fund Investor Dataroom - Project Documentation

## Overview

The BF Fund Investor Dataroom is a secure, self-hosted investor portal for Bermuda Franchise Group (BFG). It provides a secure dataroom for document sharing with verified investors, a DocuSign-style e-signature platform (BF Fund Sign) for legal documents, an Admin Portal for management by authorized team members, and a Viewer Portal for read-only investor access. The project aims to "Work Well. Play Well. Be Well." and is deployed on Replit with a custom domain.

## User Preferences

- Communication style: Simple, everyday language
- Technical level: Non-technical explanations preferred
- Focus: Security and ease of use for investors

## System Architecture

The platform is built on Next.js 14 (Pages Router) using TypeScript, Tailwind CSS, and shadcn/ui. It utilizes a platform-agnostic design, ensuring dynamic implementation without hardcoded IDs.

**UI/UX Decisions:**
- Custom branding ("BF Fund Dataroom" or "BF Fund Sign")
- Mobile-responsive design
- Auto-adjusting text color for readability
- Dark theme throughout

**Technical Implementations & Feature Specifications:**

*   **Investor Dataroom:** Secure, email-verified document sharing with custom branding, "Quick Add" investor onboarding, and PostgreSQL-based page-level analytics.
*   **BF Fund Sign (E-Signature Platform):** Document creation, recipient management (signers, viewers, approvers), draggable field placement editor with various field types (Signature, Initials, Date, Text, Checkbox, Name, Email, Title, Company, Address), required field indicators, sequential signing, bulk sending, in-person signing via QR codes, document expiration, "Correct & Resend," reusable templates, audit trails, and PDF download with embedded signatures.
*   **Security Features:** Token-based access, per-recipient authorization, expiration enforcement, transactional database updates, comprehensive audit logging, and IP-based rate limiting.
*   **Admin/Viewer Separation:** Users with a `UserTeam` record access the Admin Dashboard; users without a `UserTeam` record (investors) are redirected to a read-only Viewer Portal. Server-side protection (`withAdminGuard()`) is implemented for all admin pages.
*   **Q&A System:** Enables viewers to "Leave a Note" or "Ask a Question" privately, with context tracking (document, dataroom, page number). Admins can manage questions, reply, and track status (OPEN, ANSWERED, CLOSED), with email notifications for both parties.
*   **Welcome Screen:** Configurable welcome modal for first-time visitors to a dataroom, featuring a personal note, suggested viewing guidance, and a reorderable list of recommended documents.
*   **Magic Link Direct Dataroom Redirect:** Magic links now directly guide viewers to their approved dataroom, bypassing intermediate portals for a streamlined experience.

**System Design Choices:**

*   **Frontend:** Next.js 14, TypeScript, Tailwind CSS, shadcn/ui.
*   **Database:** Replit PostgreSQL (primary) with Prisma ORM. Supabase PostgreSQL is configured for backup.
*   **Authentication:** NextAuth.js with email magic links (one-click access) and Google OAuth for administrators.
*   **Storage:** Replit Object Storage with AES-256 encryption.
*   **Email:** Resend API.

## External Dependencies

*   **PostgreSQL:** Primary database for application data and analytics.
*   **Resend API:** Used for magic links and notification emails.
*   **Replit Object Storage:** Provides encrypted (AES-256) file storage.
*   **pdf-lib:** Utilized for embedding signatures into downloaded PDFs.
*   **qrcode.react:** Generates QR codes for in-person signing.
*   **UPSTASH_REDIS_REST_URL:** Configurable for rate limiting and session caching.