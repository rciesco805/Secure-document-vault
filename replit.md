# BF Fund Investor Dataroom

## Overview

A comprehensive 506(c) fund GP/LP management suite designed to streamline investor relations and compliance. It offers secure document sharing, self-hosted e-signature capabilities, personalized investor portals, and integrated KYC/AML verification. The platform aims to provide a robust, compliant, and user-friendly experience for both fund managers and limited partners. Key capabilities include investor onboarding, accreditation verification, secure document vaults, and comprehensive compliance audit trails.

## User Preferences

- Communication: Simple, everyday language
- Technical level: Non-technical explanations preferred
- Focus: Security and ease of use for investors

## Recent Changes (January 2026)

### Phase 2 Additions (Latest)
- **Rollbar Error Monitoring**: Real-time error tracking with client-side RollbarProvider, server-side middleware integration, error.tsx and global-error.tsx components, and /api/test-error verification endpoint
- **KYC Post-Bank Enforcement**: Transactions API now requires KYC verification before initiating any capital calls or distributions
- **AML Screening Hooks**: Built-in AML compliance screening with risk scoring, velocity limits ($100k single, $250k daily, 5+ transactions/day triggers), and audit logging
- **Expanded Data Portability**: /api/admin/export now includes viewAudit, signatureAudit, auditLog, and signatureConsent models
- **Quick Actions CTAs**: Prominent action buttons on LP dashboard for Invest, Sign NDA, Verify Status, Link Bank, and Sign Documents
- **ESIGN/UETA Legal Compliance**: Full ESIGN Act and UETA compliance for electronic signatures with consent capture, SHA-256 checksums of actual PDF bytes, and signature verification endpoint
- **Consent Capture**: Explicit consent requirement before signing with stored consent records (timestamp, version, consent text, IP address)
- **Signature Verification**: New /api/sign/verify/[token] endpoint with rate limiting to verify signature integrity and compliance
- **Plaid Transfers API**: Full inbound/outbound ACH transfer flow via /api/transactions with KYC/AML gating and webhook handler at /api/webhooks/plaid
- **Webhook Security**: Plaid webhook verification (JWT signature, timestamp, body hash) with idempotent event processing to prevent double-counting
- **Entity Fee/Tier Configuration**: Extended Entity model with feeConfig (management fees, carried interest, hurdle rates), tierConfig (investor tiers with discounts), and customSettings JSON fields
- **AUM Reporting**: New /api/admin/reports/aum endpoint with gross/net AUM, NAV, fee deductions (management, performance, organizational, expenses), and fund ratios
- **Real-time Wizard Progress**: /api/lp/wizard-progress tracks 7 onboarding steps with prerequisites validation (NDA to Accreditation to KYC required before completion)
- **Mobile Viewport Tests**: 30 additional tests for device detection, responsive UI, touch interactions
- **API Error Path Tests**: 110 tests for transaction/subscription validation, auth utilities, and audit utilities
- **CRM Timeline UI**: Admin timeline view showing investor activity (views, signatures, documents, notes) with search/filter and CSV export
- **Capital Tracking Dashboard**: Comprehensive committed capital metrics with charts, investor-level breakdown, and real-time data
- **Bulk Action Wizard**: 5-step wizard for capital calls and distributions with percentage/fixed allocation modes
- **Compliance Audit Dashboard**: /pages/admin/audit.tsx with event filtering, date range search, pagination, and CSV/HTML export
- **PWA Support**: Service worker, manifest, offline page, and install prompt for mobile-first experience
- **Auto-Update Cache System**: Versioned service worker with automatic cache invalidation - visitors always get latest version without manual cache clearing
- **GP Notes Reply**: Admin API for replying to investor notes with email notifications
- **1584+ Passing Tests**: Comprehensive E2E coverage including Transaction KYC enforcement, AML screening, bulk action wizard, audit dashboard, PWA support, Form D reminders, LP statements, waterfall visualization, and Rollbar error monitoring tests
- **Deployment Optimization**: Dynamic route exports to prevent static generation errors on authenticated admin pages

### Phase 1 Completion (January 25, 2026)
- **Form D Amendment Reminders**: API for tracking SEC Form D deadlines with 30-day advance reminders, urgency levels (OVERDUE, CRITICAL, WARNING, OK), email notifications to admins
- **LP Statement Generation**: Quarterly/annual capital account statements with JSON/HTML output, transaction history, K-1 status tracking
- **Waterfall Visualization**: React component and API for distribution waterfall (ROC, preferred return, GP catch-up, carried interest), investor-level breakdown, LP multiples

### Phase 1 Features
- **Unified Admin Access Control with Hub Navigation**: /hub landing page for admins, hasFundroomAccess field for permission-based access
- **LP/Dataroom Cross-Navigation**: Seamless navigation between Fundroom and Dataroom
- **Subscription Modal with Multi-Tier Pricing**: Unit-based pricing, blended pricing, Review to Sign flow
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

## Payment Architecture

| Service | Purpose | Flow |
|---------|---------|------|
| Plaid | Large ACH transfers | Capital calls (debit: LP to Fund), Distributions (credit: Fund to LP) |
| Stripe | Billing/subscriptions | Platform subscription fees (not capital movements) |

## KYC/AML Flow (506(c) Compliant)

1. Dataroom access (optional NDA gate)
2. Account creation
3. NDA signature (if enabled)
4. Accreditation self-certification (4-checkbox wizard)
5. Persona KYC/AML verification (iframe embed)
6. Fundroom dashboard access
7. Subscription/investment

## Phase Status

- **Phase 1 (MVP)**: 100% complete - Core onboarding, NDA gate, accreditation, fundroom, e-signature, dual thresholds, Form D reminders, LP statements, waterfall visualization
- **Phase 2**: 85% complete - Plaid transfers, AUM reporting, entity fee configs, wizard progress tracking, audit dashboard, PWA support, auto-update cache, Rollbar error monitoring
- **Phase 3**: Planned - STARTUP mode (cap table), vesting schedules, equity management, QuickBooks/Wolters Kluwer integrations

## Documentation

| Document | Description |
|----------|-------------|
| [API Documentation](docs/API_DOCUMENTATION.md) | Comprehensive API reference with all endpoints, request/response examples, authentication, error codes, SDK examples |
| [Test Report](docs/test-report.md) | Full E2E test report with 1540+ passing tests, coverage breakdown, and execution logs |
| [ESIGN Compliance](docs/ESIGN_COMPLIANCE.md) | ESIGN Act / UETA compliance documentation, consent capture, checksum verification |
| [Persona Sanctions](docs/PERSONA_SANCTIONS_SCREENING.md) | KYC/AML integration with Persona, sanctions screening |
| [Phase 3 Roadmap](docs/PHASE3_ROADMAP.md) | Integration roadmap for QuickBooks, Wolters Kluwer K-1, cap table management |
| [Main Documentation](DOCUMENTATION.md) | Complete platform documentation with features, user journeys, tech stack |

## Directory Structure

    pages/                    # Next.js Pages Router (main app, API routes)
      api/admin/              # GP dashboard endpoints (export, reports, bulk-action)
      api/lp/                 # LP portal endpoints (bank, notes, transactions, wizard)
      api/transactions/       # Plaid transfer processing with KYC/AML enforcement
      api/webhooks/           # Plaid/Persona webhook handlers
      api/sign/               # E-signature endpoints (sign, verify)
    app/                      # Next.js App Router (auth, admin sections)
    components/               # React components (UI, LP, signatures)
    lib/                      # Shared utilities (auth, audit, Prisma)
    prisma/schema/            # Multi-file Prisma schema
    docs/                     # Platform documentation
    __tests__/                # Jest E2E tests (1540+ passing)

## Integrations Status

| Integration | Status | Implementation |
|-------------|--------|----------------|
| Plaid | Complete | Bank connect, ACH transfers, webhook handler |
| Persona | Complete | KYC/AML iframe embed post-NDA |
| Resend | Complete | Email notifications, magic links |
| Tinybird | Complete | Real-time analytics, audit logging |
| Stripe | Complete | Platform billing |
| Object Storage | Complete | Replit Object Storage (documents) |
| Rollbar | Complete | Error monitoring (client + server), error boundaries |
| QuickBooks | Phase 3 | Accounting sync for K-1s |
| Wolters Kluwer | Phase 3 | Tax document automation |

## Cache Management and Auto-Updates

The platform uses a zero-cache-clearing update system. Visitors automatically receive the latest version without any manual intervention.

### How It Works

| Component | Strategy | Purpose |
|-----------|----------|---------|
| Service Worker | Versioned (v2-2026-01-25) | Triggers cache invalidation on deploy |
| HTML Pages | no-cache, no-store | Always fetches fresh content |
| sw.js | Never cached | Ensures updates are immediate |
| manifest.json | 1-hour cache | Picks up app icon/name changes |
| Static Assets | Network-first | Caches for offline, updates on load |

### Automatic Update Flow

1. User visits site after deploy
2. Browser detects new service worker version
3. Old caches (bf-fund-v1, etc.) automatically deleted
4. New service worker activates with skipWaiting()
5. Page auto-refreshes via controllerchange event
6. User sees latest version - no manual refresh needed

### Key Files

| File | Purpose |
|------|---------|
| public/sw.js | Service worker with versioned cache names |
| components/pwa-install.tsx | Auto-update detection and page refresh |
| next.config.mjs | HTTP cache headers for all routes |

### Cache Version Updates

When deploying updates, increment the version in public/sw.js:

    const CACHE_VERSION = 'v2-2026-01-25';  // Update this on each deploy

This ensures all visitors get fresh content without 404 errors from stale cached routes.

## External Dependencies

- Resend: Transactional email services
- Persona: KYC/AML verification (iframe integration)
- Plaid: Bank connectivity for ACH capital calls and distributions
- Tinybird: Real-time analytics and audit logging
- Google OAuth: Authentication for admin users
- OpenAI: Optional AI features
- Stripe: Platform billing/subscriptions (NOT capital movements)
- Replit Object Storage: Primary storage solution for documents and files
- Rollbar: Real-time error monitoring and tracking (requires NEXT_PUBLIC_ROLLBAR_CLIENT_TOKEN, ROLLBAR_SERVER_TOKEN)
