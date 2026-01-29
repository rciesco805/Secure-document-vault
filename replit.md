# BF Fund Investor Dataroom

## Recent Changes (January 29, 2026)

### App Router Migration - Phase 2 Complete
- **LP Portal Migration**: All 5 investor portal pages successfully migrated from Pages Router to App Router
  - `pages/lp/dashboard.tsx` → `app/lp/dashboard/` (1150+ lines - largest single page migration)
  - `pages/lp/docs.tsx` → `app/lp/docs/`
  - `pages/lp/onboard.tsx` → `app/lp/onboard/`
  - `pages/lp/bank-connect.tsx` → `app/lp/bank-connect/`
  - `pages/lp/offline-documents.tsx` → `app/lp/offline-documents/`
- **Route Conflict Resolution**: Fixed `/dashboard` route conflict by using `app/lp/` folder instead of `app/(lp)/` route group (route groups don't add to URL path, causing conflict with admin `/dashboard`)
- **Server/Client Separation**: Each page now has proper `page.tsx` (server) and `page-client.tsx` (client) components
- **Navigation Updates**: All pages updated to use `next/navigation` instead of deprecated `next/router`
- **Metadata Migration**: Removed `Head` components, metadata now exported from server components

### Previous Changes (January 24-28, 2026)
- **Visitor Authorization Pre-Check**: Added `/api/auth/check-visitor` endpoint that validates user authorization BEFORE sending magic link emails
- **Separate Login Portals**: Maintained distinct login paths - `/login` for investors/visitors, `/admin/login` for administrators
- **PWA User-Scoped Caching**: Implemented isolated cache storage per user preventing cross-user data exposure
- **Cache Invalidation**: Build-time versioning with network-first strategy for all static assets
- **Rollbar Integration**: Added comprehensive client and server-side error monitoring
- **Rate Limiting**: Implemented three tiers - auth (10/hour), strict (3/hour), api (100/min)

---

## Overview
The BF Fund Investor Dataroom is a 506(c) compliant GP/LP management suite designed to streamline investor relations and compliance. It offers secure document sharing, self-hosted e-signature capabilities, personalized investor portals, and integrated KYC/AML verification. The platform provides a robust, compliant, and user-friendly experience for fund managers and limited partners.

**Production Domain**: dataroom.bermudafranchisegroup.com

## User Preferences
- Communication: Simple, everyday language
- Technical level: Non-technical explanations preferred
- Focus: Security and ease of use for investors

## System Architecture
The platform is built using Next.js 16.1.6 with a hybrid Pages and App Router architecture, React 19.2.4, and TypeScript. Styling is managed with Tailwind CSS and shadcn/ui. Data persistence is handled by PostgreSQL with Prisma ORM, and NextAuth.js provides authentication with database-backed sessions.

### Core Features
- **506(c) Compliance**: Accreditation self-certification, audit logs, and KYC/AML hooks
- **Self-hosted E-Signature**: ESIGN/UETA compliant with consent capture and checksums
- **LP Portal**: Personalized investor portals with role-based access
- **Admin Dashboards**: CRM timeline, capital tracking, and compliance audit
- **Payment Flows**: Plaid ACH transfers and Stripe billing with KYC enforcement
- **PWA Support**: Progressive Web App with offline document access and auto-updates
- **Error Monitoring**: Rollbar integration for real-time tracking

---

## App Router Migration Status

The platform is actively migrating from Next.js Pages Router to App Router for improved performance, better SEO with server components, and modern React 19 patterns.

### Migration Pattern
- Each page has a server component (`page.tsx`) that exports metadata and wraps a client component in Suspense
- Client components (`page-client.tsx`) contain the interactive UI with `"use client"` directive
- Navigation uses `next/navigation` (useRouter, useSearchParams, usePathname)
- Head components removed; metadata exported from server components instead
- Loading states provided via Suspense fallback components

### Phase 0 Complete: Provider Parity
- `pages/_app.tsx` and `app/providers.tsx` now have matching providers:
  - RollbarProvider + ErrorBoundary, SessionProvider, PostHogCustomProvider, ThemeProvider, NuqsAdapter, Toaster, TooltipProvider, PWAInstallPrompt
- App Router has additional `OfflineCacheSyncProvider` for user-scoped cache management

### Phase 1 Complete: Auth Pages
- `/login` → `app/(auth)/login/` (main visitor login)
- `/lp/login` → `app/(auth)/lp/login/` (investor-specific login)
- `/welcome` → `app/(auth)/welcome/` (onboarding wizard)
- `/register` → `app/(auth)/register/`
- `/verify` → `app/(auth)/verify/`
- `/admin/login` → `app/admin/login/`

### Phase 2 Complete: LP Portal (January 29, 2026)
- `/lp/dashboard` → `app/lp/dashboard/` (investor dashboard - 1150+ lines)
- `/lp/docs` → `app/lp/docs/` (document vault with encryption)
- `/lp/onboard` → `app/lp/onboard/` (investor onboarding flow)
- `/lp/bank-connect` → `app/lp/bank-connect/` (Plaid bank linking for ACH)
- `/lp/offline-documents` → `app/lp/offline-documents/` (offline document management)

### Phase 3 Complete: E-Signature Pages (January 29, 2026)
- `/sign` → `app/sign/` (signature dashboard - document list)
- `/sign/new` → `app/sign/new/` (create new signature document)
- `/sign/bulk` → `app/sign/bulk/` (bulk send to multiple recipients)
- `/sign/templates` → `app/sign/templates/` (reusable templates)
- `/sign/[id]` → `app/sign/[id]/` (document detail view - 827 lines)
- `/sign/[id]/prepare` → `app/sign/[id]/prepare/` (field placement - 908 lines)
- `/view/sign/[token]` → `app/view/sign/[token]/` (public signing interface - 840 lines)
- `/sign/certificate/[documentId]` → `app/sign/certificate/[documentId]/` (completion certificates)
- `/sign/certificate/verify` → `app/sign/certificate/verify/` (certificate verification)

### Phase 4 Complete: Viewer Pages (January 29, 2026)
- `/view/[linkId]` → `app/view/[linkId]/` (link viewer - 701 lines)
- `/view/[linkId]/embed` → `app/view/[linkId]/embed/` (embedded viewer)
- `/view/[linkId]/d/[documentId]` → `app/view/[linkId]/d/[documentId]/` (dataroom document)
- `/view/domains/[domain]/[slug]` → `app/view/domains/[domain]/[slug]/` (custom domain viewer)
- `/view/domains/[domain]/[slug]/d/[documentId]` → `app/view/domains/[domain]/[slug]/d/[documentId]/` (custom domain document)

### Phase 5 Pending
Admin pages, documents, datarooms, settings

### Current App Router Structure
```
app/
├── (auth)/                    # Auth route group (doesn't add to URL)
│   ├── login/                 # /login - main visitor login
│   ├── lp/login/              # /lp/login - investor-specific login
│   ├── welcome/               # /welcome - onboarding wizard
│   ├── register/              # /register
│   └── verify/                # /verify
├── admin/
│   └── login/                 # /admin/login - admin-only login
├── lp/                        # LP Portal (regular folder, adds /lp/ to URL)
│   ├── dashboard/             # /lp/dashboard - investor dashboard
│   ├── docs/                  # /lp/docs - document vault
│   ├── onboard/               # /lp/onboard - onboarding flow
│   ├── bank-connect/          # /lp/bank-connect - Plaid ACH linking
│   └── offline-documents/     # /lp/offline-documents - offline docs
├── sign/                      # E-Signature module
│   ├── page.tsx               # /sign - dashboard
│   ├── new/                   # /sign/new - create document
│   ├── bulk/                  # /sign/bulk - bulk send
│   ├── templates/             # /sign/templates - templates
│   ├── [id]/                  # /sign/[id] - document detail
│   │   └── prepare/           # /sign/[id]/prepare - field placement
│   └── certificate/           # Completion certificates
│       ├── [documentId]/      # /sign/certificate/[documentId]
│       └── verify/            # /sign/certificate/verify
├── view/
│   ├── [linkId]/              # /view/[linkId] - link viewer
│   │   ├── embed/             # /view/[linkId]/embed - embedded
│   │   └── d/[documentId]/    # /view/[linkId]/d/[documentId] - dataroom doc
│   ├── domains/[domain]/[slug]/  # Custom domain viewers
│   │   └── d/[documentId]/    # Custom domain document view
│   └── sign/
│       └── [token]/           # /view/sign/[token] - public signing
├── layout.tsx                 # Root layout with providers
└── providers.tsx              # Client-side providers wrapper
```

---

## Authentication Flow

### Visitor/Investor Portal (`/login`)
- For investors and LPs accessing their datarooms
- Checks authorization BEFORE sending magic link email via `/api/auth/check-visitor`
- User must be: a viewer record, in a viewer group, or in a link's allowList
- If not authorized, shows "Request Access" message
- Admins using this portal enter as visitors (no admin access)

### Admin Portal (`/admin/login`)
- For BF Fund team administrators only
- Checks if email is in admin list before sending magic link
- Redirects to admin dashboard (`/dashboard`) after login
- Only way to access admin dashboard

---

## PWA & Offline Documents

### User-Scoped Caching
- Each user has isolated cache storage (`bf-fund-documents-user-{userId}-{version}`)
- Documents saved via "Save Offline" button in document viewers
- Caches cleared automatically on logout via `signOutWithCacheClear()`

### Key Files
- `public/sw.js` - Service worker with caching logic
- `lib/offline/document-cache.ts` - Client-side cache management API
- `lib/offline/use-offline-cache-sync.ts` - Session sync and secure logout
- `components/offline/save-offline-button.tsx` - UI component for saving documents
- `app/lp/offline-documents/page-client.tsx` - Offline documents management page

### Cache Invalidation Strategy
- Build-time versioning via `scripts/generate-sw-version.js`
- Network-first strategy for all static assets
- Service worker uses `skipWaiting()` and `clients.claim()` for immediate updates
- Registration uses `updateViaCache: 'none'` to bypass browser caching

---

## Security

### Four-Layer Encryption
- Transport: TLS 1.3
- Client-Side: AES-256-GCM using Web Crypto API
- Server-Side: AES-256-GCM using Node.js crypto module
- PDF Level: PDF 2.0 AES-256

### Rate Limiting
- Auth endpoints: 10/hour
- Strict endpoints: 3/hour
- API endpoints: 100/min

### Content Security Policy (CSP)
Strict domain whitelisting in `lib/middleware/csp.ts`. New third-party services MUST be added to CSP lists.

---

## External Dependencies
- **Resend**: Transactional email services
- **Persona**: KYC/AML verification
- **Plaid**: Bank connectivity for ACH transfers
- **Tinybird**: Real-time analytics and audit logging
- **Stripe**: Platform billing
- **Storage Providers**: Replit Object Storage, AWS S3, Cloudflare R2, or local filesystem
- **Rollbar**: Real-time error monitoring
- **Google OAuth**: Admin authentication
- **OpenAI**: Optional AI features

## Rollbar Configuration
- `NEXT_PUBLIC_ROLLBAR_CLIENT_TOKEN`: Client-side (must be "post_client_item" scope token)
- `ROLLBAR_SERVER_TOKEN`: Server-side (must be "post_server_item" scope token)
- Do NOT use the "Public ID" - it's just an identifier, not an access token
