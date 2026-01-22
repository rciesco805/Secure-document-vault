# BF Fund Investor Dataroom

> **Full Documentation**: See [DOCUMENTATION.md](./DOCUMENTATION.md) for complete setup guides, API reference, and integration details.

## Overview

A comprehensive 506(c) fund GP/LP management suite with:
- **Investor Dataroom**: Secure document sharing with folder organization and analytics
- **BF Fund Sign**: Self-hosted e-signature platform (DocuSign-style, no external dependencies)
- **LP Fundroom Portal**: Personalized investor dashboards with onboarding and document vault
- **KYC/AML Verification**: Post-subscription identity verification via Persona API
- **Compliance Tools**: SEC 506(c) audit trails, accreditation verification, signature logging

## User Preferences

- Communication: Simple, everyday language
- Technical level: Non-technical explanations preferred
- Focus: Security and ease of use for investors

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
    - Persona KYC/AML verification with embedded popup flow and status tracking
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
- `GET /api/lp/me` - Get investor profile, investments, capital calls, NDA gate status, KYC status
- `GET /api/lp/docs` - Get investor's signed documents with signed URLs
- `GET /api/lp/pending-signatures` - Get documents awaiting signature
- `POST /api/lp/complete-gate` - Complete NDA/accreditation acknowledgment
- `GET /api/lp/kyc` - Get KYC verification status
- `POST /api/lp/kyc` - Start or resume Persona KYC verification

### Webhooks
- `POST /api/webhooks/persona` - Persona KYC webhook (requires signature verification)

### Fund Management
- `GET /api/teams/[teamId]/funds` - List funds for team (admin only)
- `GET /api/funds/[fundId]/settings` - Get fund settings
- `PATCH /api/funds/[fundId]/settings` - Update fund settings (NDA gate toggle)

### E-Signature
- `GET /api/sign/[token]` - Get signature document for signing
- `POST /api/sign/[token]` - Complete signature (auto-stores in LP vault)

## Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test:watch

# Run tests with coverage
npm test:coverage

# Run specific test suites
npm run test:sign      # Signing flow tests
npm run test:auth      # Authentication tests
npm run test:datarooms # Dataroom gate tests
```

### Test Coverage
- **Sign Routes (12 tests)**: E2E tests calling actual API handler with Prisma mocks
- **Auth Flows (6 tests)**: Logic tests for magic link, session, OTP validation
- **Dataroom Gates (15 tests)**: Logic tests for NDA, accreditation, KYC gates

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

## Technology Stack

| Category | Technology |
|----------|------------|
| Framework | Next.js 14, TypeScript, React 18 |
| Database | PostgreSQL + Prisma ORM |
| Auth | NextAuth.js (magic links, Google OAuth) |
| Email | Resend API |
| Storage | Replit Object Storage (AES-256, TUS uploads) |
| PDF | pdf-lib, MuPDF, react-pdf |
| KYC/AML | Persona API |
| UI | Tailwind CSS, shadcn/ui, Radix UI |
| Forms | React Hook Form, Zod |

## Integrations

| Service | Purpose | Env Variables |
|---------|---------|---------------|
| Resend | Transactional emails | `RESEND_API_KEY` |
| Persona | KYC/AML verification | `PERSONA_API_KEY`, `PERSONA_TEMPLATE_ID`, `PERSONA_WEBHOOK_SECRET`, `PERSONA_ENVIRONMENT_ID` |
| Google | Admin OAuth | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` |
| OpenAI | AI features (optional) | `OPENAI_API_KEY` |
| Stripe | Payments (optional) | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` |

See [DOCUMENTATION.md](./DOCUMENTATION.md) for complete setup instructions.
