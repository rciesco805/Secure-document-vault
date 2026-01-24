# BF Fund Investor Dataroom

## Overview

A comprehensive 506(c) fund GP/LP management suite designed to streamline investor relations and compliance. It offers secure document sharing, self-hosted e-signature capabilities, personalized investor portals, and integrated KYC/AML verification. The platform aims to provide a robust, compliant, and user-friendly experience for both fund managers and limited partners. Key capabilities include investor onboarding, accreditation verification, secure document vaults, and comprehensive compliance audit trails.

## User Preferences

- Communication: Simple, everyday language
- Technical level: Non-technical explanations preferred
- Focus: Security and ease of use for investors

## Recent Changes (January 2026)

- **LP Portal UI Polish**: Added skeleton loading states, welcome banner with onboarding progress, tooltips for financial terms (commitment, funded, distributions, capital calls), empty state component, smooth card animations with staggered fade-in effects, hover lift states, and animated progress bars with prefers-reduced-motion support
- **Real-time Dashboard Updates**: 30-second auto-refresh polling on LP and admin dashboards with manual refresh buttons
- **View Audit Extension**: Extended View model with comprehensive audit fields (ipAddress, userAgent, geo location, device/browser/OS info, sessionId, referrer, auditMetadata) for 506(c) compliance tracking
- **Form D Reminder**: Added Form D filing reminder display in accreditation wizard showing filing date and annual amendment due date
- **View Audit Helper**: Created lib/audit/view-audit.ts utility for extracting audit data from requests
- **Entity Model Added**: Standalone Entity model with FUND/STARTUP mode toggle, JSON configs, and EntityInvestor junction table for investor linkage
- **Admin Entity Management**: New /admin/entities page with mode toggle switch, create/delete functionality, and investor count display
- **OpenSign Removed**: E-signature is now fully self-hosted with custom React drag-drop field placement (no external API dependencies)
- **Form D Compliance**: Added SEC Form D filing date tracking, amendment reminders, and state notice fields to Fund model
- **Dual Threshold System**: Initial Closing Threshold (gates capital calls) vs Full Authorized Amount (progress tracking only) with color-coded UI
- **EntityMode Enum**: FUND (LP/GP with units, capital calls) vs STARTUP (cap table with shares, vesting) for Phase 3 expansion
- **208 Passing Tests**: Comprehensive E2E coverage for threshold gating, export/import, multi-fund scenarios, and full dataroom→dashboard flow
- **GitHub Actions CI**: Added .github/workflows/test.yml for automated testing on push/PR

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

## Phase Status

- **Phase 1 (MVP)**: ~90% complete - Core onboarding, NDA gate, accreditation, fundroom, e-signature, dual thresholds
- **Phase 2**: Pending - Bulk operations, advanced analytics, full Persona/Plaid integration
- **Phase 3**: Planned - STARTUP mode (cap table), vesting schedules, equity management
