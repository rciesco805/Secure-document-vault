# BF Fund Investor Dataroom

## Overview

A comprehensive 506(c) fund GP/LP management suite designed to streamline investor relations and compliance. It offers secure document sharing, self-hosted e-signature capabilities, personalized investor portals, and integrated KYC/AML verification. The platform aims to provide a robust, compliant, and user-friendly experience for both fund managers and limited partners. Key capabilities include investor onboarding, accreditation verification, secure document vaults, and comprehensive compliance audit trails.

## User Preferences

- Communication: Simple, everyday language
- Technical level: Non-technical explanations preferred
- Focus: Security and ease of use for investors

## Recent Changes (January 2026)

### Phase 2 Additions (Latest)
- **KYC Post-Bank Enforcement**: Transactions API now requires KYC verification before initiating any capital calls or distributions
- **AML Screening Hooks**: Built-in AML compliance screening with risk scoring, velocity limits ($100k single, $250k daily, 5+ transactions/day triggers), and audit logging
- **Expanded Data Portability**: `/api/admin/export` now includes viewAudit, signatureAudit, auditLog, and signatureConsent models
- **Quick Actions CTAs**: Prominent action buttons on LP dashboard for Invest, Sign NDA, Verify Status, Link Bank, and Sign Documents
- **ESIGN/UETA Legal Compliance**: Full ESIGN Act and UETA compliance for electronic signatures with consent capture, SHA-256 checksums of actual PDF bytes, and signature verification endpoint
- **Consent Capture**: Explicit consent requirement before signing with stored consent records (timestamp, version, consent text, IP address)
- **Signature Verification**: New `/api/sign/verify/[token]` endpoint with rate limiting to verify signature integrity and compliance
- **Plaid Transfers API**: Full inbound/outbound ACH transfer flow via `/api/transactions` with KYC/AML gating and webhook handler at `/api/webhooks/plaid`
- **Webhook Security**: Plaid webhook verification (JWT signature, timestamp, body hash) with idempotent event processing to prevent double-counting
- **Entity Fee/Tier Configuration**: Extended Entity model with `feeConfig` (management fees, carried interest, hurdle rates), `tierConfig` (investor tiers with discounts), and `customSettings` JSON fields
- **AUM Reporting**: New `/api/admin/reports/aum` endpoint with gross/net AUM, NAV, fee deductions (management, performance, organizational, expenses), and fund ratios
- **Real-time Wizard Progress**: `/api/lp/wizard-progress` tracks 7 onboarding steps with prerequisites validation (NDA → Accreditation → KYC required before completion)
- **Mobile Viewport Tests**: 30 additional tests for device detection, responsive UI, touch interactions
- **API Error Path Tests**: 110 tests for transaction/subscription validation, auth utilities, and audit utilities
- **CRM Timeline UI**: Admin timeline view showing investor activity (views, signatures, documents, notes) with search/filter and CSV export
- **Capital Tracking Dashboard**: Comprehensive committed capital metrics with charts, investor-level breakdown, and real-time data
- **Bulk Action Wizard**: 5-step wizard for capital calls and distributions with percentage/fixed allocation modes
- **Compliance Audit Dashboard**: `/pages/admin/audit.tsx` with event filtering, date range search, pagination, and CSV/HTML export
- **PWA Support**: Service worker, manifest, offline page, and install prompt for mobile-first experience
- **GP Notes Reply**: Admin API for replying to investor notes with email notifications
- **1434+ Passing Tests**: Comprehensive E2E coverage including Transaction KYC enforcement, AML screening thresholds, and audit logging tests

### Phase 1 Features
- **Unified Admin Access Control with Hub Navigation**: `/hub` landing page for admins, `hasFundroomAccess` field for permission-based access
- **LP/Dataroom Cross-Navigation**: Seamless navigation between Fundroom and Dataroom
- **Subscription Modal with Multi-Tier Pricing**: Unit-based pricing, blended pricing, Review→Sign flow
- **FundPricingTier Model**: Tiered pricing with first-come tier deduction
- **LP Portal UI Polish**: Skeleton loading, tooltips, animations, progress bars
- **Real-time Dashboard Updates**: 30-second auto-refresh polling
- **View Audit Extension**: Comprehensive audit fields for 506(c) compliance
- **Self-hosted E-Signature**: Custom React drag-drop field placement (OpenSign removed)
- **Form D Compliance**: Filing date tracking, amendment reminders
- **Dual Threshold System**: Initial Closing vs Full Authorized Amount
- **EntityMode Enum**: FUND vs STARTUP modes for Phase 3 expansion

## System Architecture

The platform is built on Next.js 14, using a hybrid Pages and App Router architecture with TypeScript. Styling is managed with Tailwind CSS and shadcn/ui. PostgreSQL with Prisma ORM serves as the database, and NextAuth.js handles authentication. Email services are provided by Resend API, and file storage utilizes Replit Object Storage, supporting S3-compatible and TUS resumable uploads.

**Core Features and Design:**

*   **Investor Dataroom**: Provides secure, branded document sharing with folder hierarchies and page-level analytics.
*   **BF Fund Sign (E-Signature)**: A fully self-hosted e-signature solution featuring:
    - Custom React drag-and-drop field placement (no external APIs)
    - Multi-recipient workflows (Signer, Viewer, Approver)
    - Sequential signing with configurable order
    - Bulk sending and reusable templates
    - Detailed audit trails with embedded PDF signatures using pdf-lib
    - ESIGN Act / UETA compliance with consent capture and SHA-256 checksums
    - Signature verification API for third-party integrity checks
*   **LP Fundroom Portal**: Offers personalized investor dashboards including:
    - 3-step onboarding process
    - 2-step accreditation wizard with SEC 506(c) compliance logging
    - Per-LP document vault for signed documents
    - Persona KYC/AML verification (iframe embed, post-NDA/pre-subscription)
    - Plaid bank account linking for capital calls/distributions
*   **Admin and GP Dashboards**: Features include:
    - Fund settings with NDA gate toggling
    - Comprehensive fund overviews with financial aggregates (Total Raised, Distributed, Commitments)
    - Recharts visualizations
    - Bulk action wizard for capital calls or distributions
    - **Dual Threshold System**: Initial Closing Threshold (gates capital calls until met) vs Full Authorized Amount (progress tracking only) with color-coded UI cards and tooltips
    - **Form D Compliance**: Filing date tracking, annual amendment reminders, state notice requirements
    - **Entity Mode**: Fund model supports `FUND` (traditional LP/GP with units, capital calls, distributions) or `STARTUP` (cap table with shares, price per share, vesting) via EntityMode enum for Phase 3 expansion
*   **Authentication and Authorization**: Utilizes email magic links and Google OAuth for admin users. A role-based access control system (`LP` and `GP` roles) ensures data segregation and appropriate access levels, with `LP` users restricted to their own data and `GP` users having full access to fund aggregates within their teams. Distinct interfaces and server-side protection are implemented based on user roles.
*   **Hybrid Routing**: Employs Pages Router for the main application, API routes, and viewer pages, while App Router is used for authentication and admin pages.
*   **Database Schema**: A comprehensive Prisma schema supports various functionalities, including Users, Teams, Documents, E-signatures, LP Portal (Investor, Fund, Investment, CapitalCall, Distribution, BankLink, Transaction), and Analytics, designed for extensibility.
*   **UI/UX**: Prioritizes a UX-first approach with mobile-responsive design, using Tailwind CSS and shadcn/ui for components, aiming for intuitive, guided workflows.

## Payment Architecture

| Service | Purpose | Flow |
|---------|---------|------|
| **Plaid** | Large ACH transfers | Capital calls (debit: LP → Fund), Distributions (credit: Fund → LP) |
| **Stripe** | Billing/subscriptions | Platform subscription fees (not capital movements) |

**Key Models**: BankLink (Plaid tokens, account details), Transaction (ACH transfers with status tracking)

## KYC/AML Flow (506(c) Compliant)

1. Dataroom access (optional NDA gate)
2. Account creation
3. NDA signature (if enabled)
4. Accreditation self-certification (4-checkbox wizard)
5. Persona KYC/AML verification (iframe embed)
6. Fundroom dashboard access
7. Subscription/investment

## External Dependencies

*   **Resend**: Transactional email services
*   **Persona**: KYC/AML verification (iframe integration)
*   **Plaid**: Bank connectivity for ACH capital calls and distributions
*   **Tinybird**: Real-time analytics and audit logging
*   **Google OAuth**: Authentication for admin users
*   **OpenAI**: Optional AI features
*   **Stripe**: Platform billing/subscriptions (NOT capital movements)
*   **Replit Object Storage**: Primary storage solution for documents and files

## GitHub Push Instructions (Bitget Repo)

To push to the bitget repository:

1. Open the **Shell** tab in Replit
2. Add the bitget remote (first time only):
   ```bash
   git remote add bitget https://${GITHUB_PERSONAL_ACCESS_TOKEN}@github.com/rciesco805/bitget.git
   ```
3. Push to bitget:
   ```bash
   git push bitget main
   ```

If the remote already exists and you need to update the URL:
```bash
git remote set-url bitget https://${GITHUB_PERSONAL_ACCESS_TOKEN}@github.com/rciesco805/bitget.git
```

**Note**: The GITHUB_PERSONAL_ACCESS_TOKEN secret is already configured in this project.

**TROUBLESHOOTING**: If you get "Repository not found":
1. First, check the current remote URL: `git remote get-url bitget`
2. If it shows literal `${GITHUB_PERSONAL_ACCESS_TOKEN}` instead of the actual token, the variable didn't expand
3. Fix by removing and re-adding with the actual token value:
   ```bash
   git remote remove bitget
   echo $GITHUB_PERSONAL_ACCESS_TOKEN
   ```
4. Copy the token output and use it directly:
   ```bash
   git remote add bitget https://YOUR_ACTUAL_TOKEN_HERE@github.com/rciesco805/bitget.git
   git push bitget main
   ```

## Phase Status

- **Phase 1 (MVP)**: ~95% complete - Core onboarding, NDA gate, accreditation, fundroom, e-signature, dual thresholds
- **Phase 2**: ~75% complete - Plaid transfers, AUM reporting, entity fee configs, wizard progress tracking, audit dashboard, PWA support
- **Phase 3**: Planned - STARTUP mode (cap table), vesting schedules, equity management, QuickBooks/Wolters Kluwer integrations

## Documentation

- **[API Documentation](docs/API_DOCUMENTATION.md)**: Comprehensive API reference with endpoints, request/response examples, authentication, and error codes
- **[Phase 3 Roadmap](docs/PHASE3_ROADMAP.md)**: Integration roadmap for QuickBooks, Wolters Kluwer K-1, cap table management, and vesting schedules

## Directory Structure

```
├── pages/                    # Next.js Pages Router (main app, API routes)
│   ├── api/admin/           # GP dashboard endpoints
│   ├── api/lp/              # LP portal endpoints (bank, notes, transactions, wizard)
│   ├── api/transactions/    # Plaid transfer processing
│   ├── api/webhooks/        # Plaid webhook handler
│   └── api/sign/            # E-signature endpoints
├── app/                      # Next.js App Router (auth, admin sections)
├── components/               # React components (UI, LP, signatures)
├── lib/                      # Shared utilities (auth, audit, Prisma)
├── prisma/schema/            # Multi-file Prisma schema
└── __tests__/               # Jest E2E tests (1235+ passing)
```

## Integrations Status

| Integration | Status | Implementation |
|-------------|--------|----------------|
| **Plaid** | ✅ Complete | Bank connect, ACH transfers, webhook handler |
| **Persona** | ✅ Complete | KYC/AML iframe embed post-NDA |
| **Resend** | ✅ Complete | Email notifications, magic links |
| **Tinybird** | ✅ Complete | Real-time analytics, audit logging |
| **Stripe** | ✅ Complete | Platform billing |
| **Object Storage** | ✅ Complete | Replit Object Storage (documents) |
| **QuickBooks** | ⏳ Phase 3 | Accounting sync for K-1s |
| **Wolters Kluwer** | ⏳ Phase 3 | Tax document automation |
