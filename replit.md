# BF Fund Investor Dataroom - Reference Memo

## Overview
The BF Fund Investor Dataroom is a secure, self-hosted investor portal for Bermuda Franchise Group (BFG), built on the Papermark platform. Its purpose is to securely share confidential investment documents with verified investors, featuring email-verified access, custom branding, and detailed page-by-page analytics. The platform also includes a comprehensive e-signature system (BF Fund Sign) for handling NDAs, contracts, and legal documents. It operates under the tagline "Work Well. Play Well. Be Well." and is deployed on Replit with all premium features unlocked and billing functionalities disabled. The project's ambition is to provide a robust, user-friendly, and secure platform for managing investor relations and legal documentation.

## User Preferences
- Communication style: Simple, everyday language
- Technical level: Non-technical explanations preferred
- Focus: Security and ease of use for investors

## System Architecture
The platform is built on Next.js 14 (Pages Router) using TypeScript, Tailwind CSS, and shadcn/ui. PostgreSQL, managed via Prisma ORM, serves as the primary database for both application data and analytics. Authentication is handled by NextAuth.js, supporting magic links (via Resend) and Google OAuth for administrators. File storage utilizes Replit Object Storage with AES-256 encryption.

A critical architectural decision is the **platform-agnostic design**, ensuring all features are implemented dynamically without hardcoded IDs for datarooms, teams, links, or documents. This guarantees features work across any dataroom lifecycle event.

**Key Features:**
- **Investor Dataroom:** Secure document sharing with email-verified access and custom branding. Includes a "Quick Add" system for streamlined investor onboarding and PostgreSQL-based page-level analytics.
- **BF Fund Sign (E-Signature Platform):** Integrated e-signature system with a dashboard, document creation, recipient management, field placement editor, and audit trails. Supports sequential signing, bulk sending, in-person signing via QR codes, document expiration, and a "Correct & Resend" feature. It also includes reusable templates for efficient document creation.
- **Security Features:** Token-based access for signers, per-recipient authorization, expiration enforcement, transactional updates, audit logging, and IP-based rate limiting on the public signing API.
- **Admin/Viewer Separation:** Server-side protection using `withAdminGuard()` on admin pages prevents viewer-only users from accessing admin functionality. Viewers are redirected to `/viewer-portal` which shows their accessible datarooms. Protected pages include: dashboard, documents, datarooms, sign (all routes), and settings.

**UI/UX Decisions:**
- Custom branding replaces all "Papermark" references with "BF Fund Dataroom" or "BF Fund Sign".
- Mobile-responsive design for both admin and investor interfaces.
- Auto-adjusting text color on document/folder cards for readability.

## External Dependencies
- **PostgreSQL:** Primary database for application data and analytics.
- **Resend API:** Used for sending magic links and notification emails.
- **Replit Object Storage:** Provides encrypted (AES-256) file storage for documents.
- **pdf-lib:** Used for embedding signatures into downloaded PDFs.
- **qrcode.react:** Generates QR codes for in-person signing.
- **UPSTASH_REDIS_REST_URL:** Optional for rate limiting and session caching; graceful fallback if not configured.

## Recent Changes (January 2026)

### Authentication & Authorization Overhaul
- **Fixed Google OAuth redirect bug:** Users added via Quick Add (investors/viewers) who login with Google are now correctly redirected to the viewer portal instead of the admin dashboard.
- **Server-side admin protection:** Implemented `withAdminGuard()` wrapper in `lib/auth/admin-guard.ts` that checks for `UserTeam` membership before rendering admin pages.
- **Team auto-creation disabled for viewers:** Modified `/api/teams` to prevent auto-creating teams for viewer-only users (those in `ViewerGroupMembership` or link allowlists).
- **Viewer portal created:** New `/viewer-portal` page shows investors their accessible datarooms without admin navigation.
- **Data cleanup performed:** Removed incorrectly assigned ADMIN access from `rciesco@gmail.com` and `investors@bermudafranchisegroup.com`.

### User Role Architecture
- **Admins (Team Members):** Users with a `UserTeam` record can access the full admin interface (dashboard, documents, datarooms, sign, settings).
- **Viewers (Investors):** Users without `UserTeam` records but with dataroom access via allowlists are redirected to `/viewer-portal`. They can view shared documents but cannot manage them.
- **Authentication flow:** Login → Check `UserTeam` → If exists: admin dashboard | If not: viewer portal.

### Protected Admin Pages (Server-Side)
The following pages use `withAdminGuard()` for server-side protection:
- `/dashboard` - Main admin dashboard
- `/documents` - Document management
- `/datarooms` - Dataroom management
- `/sign` - E-signature dashboard
- `/sign/new` - Create signature document
- `/sign/bulk` - Bulk sending
- `/sign/[id]` - View signature document
- `/sign/templates` - Template management
- `/settings/general` - Team settings