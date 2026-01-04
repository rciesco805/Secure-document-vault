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