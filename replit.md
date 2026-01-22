# BF Fund Investor Dataroom

## Overview

The BF Fund Investor Dataroom is a secure, self-hosted investor portal for Bermuda Franchise Group (BFG), deployed on Replit with a custom domain. It integrates two primary platforms:

1.  **BF Fund Dataroom**: A secure document sharing platform for investors, featuring visitor access management, one-click magic link authentication, and admin approval workflows. It enables custom branding, page-level analytics, and folder organization.
2.  **BF Fund Sign**: A DocuSign-style e-signature platform that supports signature fields, templates, bulk sending, QR signing, and comprehensive audit trails. This system is custom-built and self-hosted, drawing inspiration from OpenSign's architecture but entirely implemented within the codebase without external API dependencies.

The platform provides a comprehensive, UX-first solution for GPs managing private investments, featuring personalized investor dashboards, fundraise tracking, investment document management, and automated capital management.

## User Preferences

-   Communication style: Simple, everyday language
-   Technical level: Non-technical explanations preferred
-   Focus: Security and ease of use for investors

## Recent Changes

### January 2026
- **Pending Signatures Dashboard**: LP dashboard now shows "Action Required" section with documents awaiting signature, with direct "Sign Now" links
- **Optional NDA Gate**: Fund-level toggle for NDA/accreditation gate - admins can enable/disable per fund
- **Admin Fund Settings**: New `/settings/funds` page for managing fund-specific settings with NDA gate toggle
- **E-Sign Integration**: Completed documents auto-stored in LP vault with full audit trail
- **Signature Event Webhooks**: Internal event system for real-time tracking of signature events (viewed, signed, completed, declined) with full audit logging for 506(c) compliance
- **Accreditation Self-Ack Wizard**: 3-step guided wizard for investor accreditation verification (type selection, details, SEC-compliant checkboxes) with KYC API hooks for future integration
- **Signature Audit Reports**: New `/settings/signature-audit` page with filterable audit logs, document selection, date ranges, and CSV/HTML export for SEC 506(c) compliance reporting

## System Architecture

The platform is built on Next.js 14, utilizing a hybrid Pages and App Router approach, with TypeScript for language, Tailwind CSS and shadcn/ui for styling, and PostgreSQL with Prisma ORM for the database. Authentication is handled by NextAuth.js, and email services are powered by Resend API. File storage leverages Replit Object Storage (AES-256 encrypted) and supports S3-compatible and TUS resumable uploads.

**Core Features:**

*   **Investor Dataroom**: Secure document sharing, custom branding, folder hierarchy, page-level analytics, and custom domain support.
*   **Email Verification Flow**: Multi-step verification with OTP for secure access, persisting for one day via cookies.
*   **BF Fund Sign (E-Signature)**: Drag-and-drop field placement, multi-recipient roles (Signer, Viewer, Approver), sequential signing, bulk sending, in-person QR signing, document expiration, 'Correct & Resend' functionality, reusable templates, and detailed audit trails with embedded PDF signatures.
*   **LP Fundroom Portal**: Personalized investor dashboards with:
    - 3-step investor onboarding at `/lp/onboard` (name/email → entity → magic link verification)
    - Optional NDA/accreditation gate modal with 506(c) compliance (IP/user agent logging) - toggleable per fund
    - Per-LP document vault at `/lp/docs` storing all signed documents with view/download
    - Auto-storage of completed signature documents in LP vault via webhook
    - Pending signatures section on dashboard with "Sign Now" action buttons
    - Dashboard showing fund raise progress, capital calls, and recent documents
    - "Message GP" functionality for investor-to-GP communication
*   **Admin Fund Settings** (`/settings/funds`):
    - View all funds for team with status and investor counts
    - Toggle NDA gate on/off per fund
    - Role-based access control (ADMIN/OWNER only)
*   **Authentication**: Primarily via email magic links, with Google OAuth for admin users.
*   **Admin/Viewer Separation**: Distinct interfaces and server-side protection based on user roles (SUPER\_ADMIN, ADMIN, MANAGER, MEMBER).
*   **Hybrid Routing Architecture**: Pages Router for the main application, API routes, and viewer pages; App Router for authentication, Enterprise Edition (EE) APIs, and admin pages.
*   **Database Schema**: A comprehensive Prisma schema incorporating models for Users, Teams, Documents, Datarooms, Links, Viewers, E-signatures (SignatureDocument, SignatureRecipient, SignatureField, SignatureTemplate), LP Portal (Investor, InvestorDocument, AccreditationAck, Fund, Investment, CapitalCall, Distribution), Analytics, and Q&A. This is designed for extensibility to support future GP/LP fund management features.
*   **UI/UX**: Emphasis on a UX-first approach with mobile-responsive design using Tailwind CSS and shadcn/ui components, aiming for minimal clicks and guided wizards for critical flows.

## Project Structure

```
/
├── app/                    # App Router pages (auth, admin)
│   ├── admin/             # Admin login pages
│   ├── api/               # App Router API routes
│   └── (auth)/            # Authentication pages
├── pages/                  # Pages Router
│   ├── api/               # API routes
│   │   ├── funds/         # Fund management APIs
│   │   ├── lp/            # LP Portal APIs
│   │   ├── sign/          # E-signature APIs
│   │   └── teams/         # Team management APIs
│   ├── lp/                # LP Portal pages
│   │   ├── dashboard.tsx  # Investor dashboard
│   │   ├── docs.tsx       # Document vault
│   │   └── onboard.tsx    # Investor onboarding
│   ├── settings/          # Admin settings pages
│   │   ├── funds.tsx      # Fund settings with NDA gate toggle
│   │   └── general.tsx    # General team settings
│   └── sign/              # E-signature pages
├── components/            # React components
│   ├── sidebar/           # Navigation sidebar
│   ├── settings/          # Settings components
│   └── ui/                # UI primitives (shadcn/ui)
├── prisma/
│   └── schema/            # Prisma schema files (folder-based)
│       └── investor.prisma # Fund, Investor, Investment models
└── lib/                   # Utilities and helpers
```

## Key API Endpoints

### LP Portal
- `GET /api/lp/me` - Get investor profile, investments, capital calls, NDA gate status
- `GET /api/lp/docs` - Get investor's signed documents with signed URLs
- `GET /api/lp/pending-signatures` - Get documents awaiting signature
- `POST /api/lp/complete-gate` - Complete NDA/accreditation acknowledgment

### Fund Management
- `GET /api/teams/[teamId]/funds` - List funds for team (admin only)
- `GET /api/funds/[fundId]/settings` - Get fund settings
- `PATCH /api/funds/[fundId]/settings` - Update fund settings (NDA gate toggle)

### E-Signature
- `GET /api/sign/[token]` - Get signature document for signing
- `POST /api/sign/[token]` - Complete signature (auto-stores in LP vault)

## Database Commands

```bash
# Generate Prisma client
npx prisma generate --schema=./prisma/schema

# Push schema changes to database
npx prisma db push --schema=./prisma/schema

# Open Prisma Studio
npx prisma studio --schema=./prisma/schema
```

## Git Commands

```bash
# Push to GitHub (uses GITHUB_TOKEN secret)
GIT_ASKPASS= GIT_TERMINAL_PROMPT=0 git -c credential.helper= push https://rciesco805:${GITHUB_TOKEN}@github.com/rciesco805/Secure-document-vault.git main

# Note: GITHUB_TOKEN is stored as a Replit secret (valid for 90 days from January 2026)
```

## External Dependencies

*   **Database**: PostgreSQL (hosted on Replit)
*   **ORM**: Prisma
*   **Authentication**: NextAuth.js
*   **Email Service**: Resend API
*   **Object Storage**: Replit Object Storage (S3-compatible, TUS resumable uploads)
*   **PDF Processing**: pdf-lib, MuPDF
*   **AI (Optional)**: OpenAI API
*   **UI Primitives**: Radix UI
*   **Form Handling**: React Hook Form, Zod

## Future Roadmap

- GP Admin Panel for investor management
- Capital Call Management (create, track, notify)
- Subscription Documents with templates
- KYC/AML integration
- Multi-fund support with portfolio views
- K-1 document management
