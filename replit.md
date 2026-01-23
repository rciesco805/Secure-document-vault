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
    - **2-Step Accreditation Wizard**: NDA acceptance → SEC 506(c) criteria confirmation ($200K income or $1M net worth) with IP/timestamp logging
    - Optional NDA/accreditation gate modal with 506(c) compliance (IP/user agent logging) - toggleable per fund
    - Per-LP document vault at `/lp/docs` storing all signed documents with view/download
    - Auto-storage of completed signature documents in LP vault via webhook
    - Pending signatures section on dashboard with "Sign Now" action buttons
    - Dashboard showing fund raise progress, capital calls, and recent documents
    - "Message GP" functionality for investor-to-GP communication
    - Persona KYC/AML verification with embedded popup flow and status tracking
    - **Plaid Bank Connect**: One-click bank account linking at `/lp/bank-connect` for capital calls and distributions
*   **Admin Fund Settings** (`/settings/funds`):
    - View all funds for team with status and investor counts
    - Toggle NDA gate on/off per fund
    - Role-based access control (ADMIN/OWNER only)
*   **GP Admin Dashboard** (`/admin/fund`):
    - Summary cards: Total Raised, Total Distributed, Total Commitments, Total Investors
    - Recharts visualizations: Bar chart (Raised vs Distributed), Pie chart (Fund Allocation)
    - Funds table with progress indicators
    - Fund-wide transaction table with anonymized investor data (Prisma groupBy for compliance)
    - Transaction summary by investor with aggregated totals
    - Bulk Action Wizard: Create capital calls or distributions with pro-rata or equal allocation
*   **Authentication**: Primarily via email magic links, with Google OAuth for admin users.
*   **User Role-Based Access Control (LP/GP)**:
    - `UserRole` enum on User model: `LP` (default for investors) and `GP` (fund managers)
    - LP users: Filtered to own data only (transactions, documents scoped to investorId)
    - GP users: Full access to fund aggregates within their teams (team-scoped authorization)
    - Role-checking utility at `lib/auth/with-role.ts` for API route protection
    - Fund aggregates endpoint at `/api/funds/[fundId]/aggregates` (GP-only)
*   **Admin/Viewer Separation**: Distinct interfaces and server-side protection based on user roles (SUPER\_ADMIN, ADMIN, MANAGER, MEMBER).
*   **Hybrid Routing Architecture**: Pages Router for the main application, API routes, and viewer pages; App Router for authentication, Enterprise Edition (EE) APIs, and admin pages.
*   **Database Schema**: A comprehensive Prisma schema incorporating models for Users, Teams, Documents, Datarooms, Links, Viewers, E-signatures (SignatureDocument, SignatureRecipient, SignatureField, SignatureTemplate), LP Portal (Investor, InvestorDocument, AccreditationAck, Fund, Investment, CapitalCall, Distribution, BankLink, Transaction), Analytics, and Q&A. This is designed for extensibility to support future GP/LP fund management features.
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

### Bank Connect (Plaid)
- `POST /api/lp/bank/link-token` - Create Plaid Link token for bank connection
- `POST /api/lp/bank/connect` - Exchange public token and store bank link
- `GET /api/lp/bank/status` - Get investor's bank connection status
- `GET /api/lp/transactions` - Get investor's transaction history (LP: own data, GP: team-scoped)

### Webhooks
- `POST /api/webhooks/persona` - Persona KYC webhook (requires signature verification)

### Fund Management
- `GET /api/teams/[teamId]/funds` - List funds for team (admin only)
- `GET /api/funds/[fundId]/settings` - Get fund settings
- `PATCH /api/funds/[fundId]/settings` - Update fund settings (NDA gate toggle)
- `GET /api/funds/[fundId]/aggregates` - Fund aggregates with investor data (GP-only, team-scoped)

### Data Migration (AWS RDS/S3)
- `POST /api/admin/export` - Export all fund data as JSON/CSV (admin only)
- `POST /api/admin/export-blobs` - Export blob manifest with signed URLs for S3 migration
- `POST /api/admin/import` - Import data from JSON export (supports dry run)
- Admin UI: `/settings/data-migration` - Export/Import wizard with model selection

### E-Signature
- `GET /api/sign/[token]` - Get signature document for signing
- `POST /api/sign/[token]` - Complete signature (auto-stores in LP vault)

### Subscriptions (Admin Push)
- `POST /api/subscriptions/create` - GP creates subscription doc with amount, pushes for LP signing
- `GET /api/teams/[teamId]/investors` - List investors for team (for admin dropdowns)
- Admin UI: `/admin/subscriptions/new` - Upload PDF, select investor, enter amount, push for signing
- `GET /api/sign/status` - Real-time signature status polling (requires auth)

### E-Sign Webhooks
- `POST /api/webhooks/esign` - Receive e-sign events (HMAC-SHA256 verified)
  - Events: `document.viewed`, `document.signed`, `document.declined`, `document.completed`
  - Security: Requires `ESIGN_WEBHOOK_SECRET` in production
  - Headers: `x-esign-signature` for HMAC verification

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
npm run test:e2e       # E2E flow tests
```

### Test Coverage
- **Sign Routes (12 tests)**: E2E tests calling actual API handler with Prisma mocks
- **Auth Flows (6 tests)**: Logic tests for magic link, session, OTP validation
- **Dataroom Gates (15 tests)**: Logic tests for NDA, accreditation, KYC gates
- **Role Access (20 tests)**: LP/GP role filtering, team scoping, authentication
- **Admin Fund Dashboard (19 tests)**: GP aggregates, anonymization, bulk actions, validation
- **Data Migration (11 tests)**: Export/import endpoints, blob manifest, audit logging, ID mapping
- **E2E Flows (61 tests)**:
  - LP Onboarding: Registration, entity selection, magic link verification
  - NDA Gate: 2-step accreditation wizard, SEC 506(c) compliance logging
  - E-Sign Wizard: Document upload, recipients, field placement, signing, completion
  - Compliance Hooks: Webhooks, email notifications, audit trail export

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
# IMPORTANT: Always pull before pushing to avoid conflicts

# Step 1: Pull remote changes first (required before pushing)
GIT_ASKPASS= GIT_TERMINAL_PROMPT=0 git -c credential.helper= pull --rebase https://rciesco805:${GITHUB_TOKEN}@github.com/rciesco805/Secure-document-vault.git main

# Step 2: Push to GitHub
GIT_ASKPASS= GIT_TERMINAL_PROMPT=0 git -c credential.helper= push https://rciesco805:${GITHUB_TOKEN}@github.com/rciesco805/Secure-document-vault.git main

# One-liner (pull then push):
GIT_ASKPASS= GIT_TERMINAL_PROMPT=0 git -c credential.helper= pull --rebase https://rciesco805:${GITHUB_TOKEN}@github.com/rciesco805/Secure-document-vault.git main && GIT_ASKPASS= GIT_TERMINAL_PROMPT=0 git -c credential.helper= push https://rciesco805:${GITHUB_TOKEN}@github.com/rciesco805/Secure-document-vault.git main

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
| Persona | KYC/AML verification | `PERSONA_API_KEY`, `PERSONA_TEMPLATE_ID`, `PERSONA_WEBHOOK_SECRET`, `PERSONA_ENVIRONMENT_ID`, `PERSONA_CLIENT_ID` (sandbox) |
| Plaid | Bank connect & ACH transfers | `PLAID_CLIENT_ID`, `PLAID_SECRET`, `PLAID_ENV`, `PLAID_WEBHOOK_URL` |
| Tinybird | Real-time analytics | `TINYBIRD_TOKEN` |
| Google | Admin OAuth | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` |
| OpenAI | AI features (optional) | `OPENAI_API_KEY` |
| Stripe | Payments (optional/future) | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` |

See [DOCUMENTATION.md](./DOCUMENTATION.md) for complete setup instructions.

## Upcoming: Plaid Payment Integration

**Phase 2 Implementation Roadmap** (Post E-Sign/Subscription flows):

1. **Bank Connect Wizard** (`/lp/bank-connect`)
   - Plaid Link UI for one-click bank connection
   - Post-NDA gate access
   - Store tokens in new `BankLink` Prisma model

2. **Capital Calls (Inbound)**
   - GP triggers from admin dashboard
   - ACH debit via Plaid Transfer API
   - LP confirmation flow with transaction tracking

3. **Distributions (Outbound)**
   - GP bulk-push for all investors
   - Batch ACH credits to connected bank accounts

4. **New Prisma Models**
   - `BankLink`: investorId, plaidToken, accountId, status
   - `Transaction`: amount, type (inbound/outbound), status, method, audit
   - `FundAggregate`: totalInbound, totalOutbound, currentBalance

5. **Dashboard Updates**
   - LP: Transaction history, balance tracking, "Connect Bank" CTA
   - GP: Fund aggregates, bulk distribution wizard, charts
