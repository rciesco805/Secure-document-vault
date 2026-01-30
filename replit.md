# BF Fund Investor Dataroom

## Recent Changes (January 30, 2026)

### App Router Migration - Phase 5 Complete (Admin, Documents, Datarooms, Settings)
- **Migrated ~73 pages** from Pages Router to App Router
- **Admin pages** (6): audit, entities, fund, fund/[id], quick-add, subscriptions/new
- **Documents pages** (4): index, new, [id], tree/[...name]
- **Datarooms pages** (23): Full migration including groups, conversations, permissions, settings
- **Settings pages** (22): All settings including billing, domains, webhooks, presets
- **Account pages** (2): general, security
- **Visitors pages** (2): index, [id]
- **Workflows pages** (3): index, [id], new
- **Misc pages** (7): branding, hub, offline, unsubscribe, viewer-portal, viewer-redirect, public/dataroom/[id]

### Previous Changes (January 29, 2026)
- **Phase 4 Complete**: Viewer pages cleanup - removed all Pages Router API remnants from viewer client components
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

### Phase 5 Complete: Admin, Documents, Datarooms, Settings (January 30, 2026)
- `/dashboard` → `app/dashboard/` (main admin dashboard)
- `/hub` → `app/hub/` (LP hub)
- `/admin/*` → `app/admin/` (6 pages: audit, entities, fund, quick-add, subscriptions)
- `/documents/*` → `app/documents/` (4 pages: index, new, [id], tree)
- `/datarooms/*` → `app/datarooms/` (23 pages including groups, conversations, permissions, settings)
- `/settings/*` → `app/settings/` (22 pages including billing, domains, webhooks, presets)
- `/account/*` → `app/account/` (2 pages: general, security)
- `/visitors/*` → `app/visitors/` (2 pages: index, [id])
- `/workflows/*` → `app/workflows/` (3 pages: index, [id], new)
- `/branding` → `app/branding/`
- `/offline` → `app/offline/`
- `/unsubscribe` → `app/unsubscribe/`
- `/viewer-portal` → `app/viewer-portal/`
- `/viewer-redirect` → `app/viewer-redirect/`
- `/public/dataroom/[id]` → `app/public/dataroom/[id]/`

### Migration Complete
All user-facing pages have been migrated to App Router. Legacy Pages Router files remain for API routes and may be removed after validation.

### Current App Router Structure
```
app/
├── (auth)/                    # Auth route group (doesn't add to URL)
│   ├── login/                 # /login - main visitor login
│   ├── lp/login/              # /lp/login - investor-specific login
│   ├── welcome/               # /welcome - onboarding wizard
│   ├── register/              # /register
│   └── verify/                # /verify
├── admin/                     # Admin pages
│   ├── login/                 # /admin/login - admin-only login
│   ├── audit/                 # /admin/audit - audit logs
│   ├── entities/              # /admin/entities - entity management
│   ├── fund/                  # /admin/fund - fund management
│   ├── quick-add/             # /admin/quick-add - quick entity creation
│   └── subscriptions/new/     # /admin/subscriptions/new - new subscriptions
├── lp/                        # LP Portal
│   ├── dashboard/             # /lp/dashboard - investor dashboard
│   ├── docs/                  # /lp/docs - document vault
│   ├── onboard/               # /lp/onboard - onboarding flow
│   ├── bank-connect/          # /lp/bank-connect - Plaid ACH linking
│   └── offline-documents/     # /lp/offline-documents - offline docs
├── dashboard/                 # /dashboard - main admin dashboard
├── hub/                       # /hub - LP hub
├── documents/                 # Document management
│   ├── page.tsx               # /documents - list
│   ├── new/                   # /documents/new - upload
│   ├── [id]/                  # /documents/[id] - detail
│   └── tree/                  # /documents/tree - folder view
├── datarooms/                 # Dataroom management (23 pages)
│   ├── page.tsx               # /datarooms - list
│   └── [id]/                  # /datarooms/[id] - full suite
├── settings/                  # Settings (22 pages)
│   ├── general/               # /settings/general
│   ├── billing/               # /settings/billing
│   ├── domains/               # /settings/domains
│   └── ...                    # All other settings
├── account/                   # User account
│   ├── general/               # /account/general
│   └── security/              # /account/security
├── visitors/                  # Visitor management
├── workflows/                 # Workflow management
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
