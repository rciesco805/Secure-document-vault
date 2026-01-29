# BF Fund Investor Dataroom

## Overview
The BF Fund Investor Dataroom is a 506(c) compliant GP/LP management suite designed to streamline investor relations and compliance. It offers secure document sharing, self-hosted e-signature capabilities, personalized investor portals, and integrated KYC/AML verification. The platform aims to provide a robust, compliant, and user-friendly experience for fund managers and limited partners, covering investor onboarding, accreditation verification, secure document vaults, and comprehensive compliance audit trails. The business vision is to become the leading platform for fund managers seeking to automate and secure their investor relations while ensuring regulatory compliance and offering market-leading features.

## User Preferences
- Communication: Simple, everyday language
- Technical level: Non-technical explanations preferred
- Focus: Security and ease of use for investors

## System Architecture
The platform is built using Next.js 16 with a hybrid Pages and App Router architecture, React 19, and TypeScript. Styling is managed with Tailwind CSS and shadcn/ui, emphasizing a UX-first, mobile-responsive design with minimal clicks and guided wizards. Data persistence is handled by PostgreSQL with Prisma ORM, and NextAuth.js provides authentication with database-backed sessions.

Core features include:
- **506(c) Compliance**: Accreditation self-certification, audit logs, and KYC/AML hooks.
- **Self-hosted E-Signature**: ESIGN/UETA compliant with consent capture and checksums.
- **LP Portal**: Personalized investor portals with role-based access.
- **Admin Dashboards**: CRM timeline, capital tracking, and compliance audit.
- **Payment Flows**: Plaid ACH transfers and Stripe billing with KYC enforcement.
- **PWA Support**: Progressive Web App with offline document access, auto-updates, and seamless deployment transitions.
- **Error Monitoring**: Rollbar integration for real-time tracking.

## Authentication Flow
The platform has separate login portals for different user types:

### Visitor/Investor Portal (`/login`)
- For investors and LPs accessing their datarooms
- Checks authorization BEFORE sending magic link email
- User must be: a viewer record, in a viewer group, or in a link's allowList
- If not authorized, shows "Request Access" message directing to "Request Invite" button
- Admins using this portal enter as visitors (not admin access)

### Admin Portal (`/admin/login`)
- For BF Fund team administrators only
- Checks if email is in admin list before sending magic link
- Redirects to admin dashboard (`/dashboard`) after login
- Only way to access admin dashboard

### Authorization Check
- API endpoint `/api/auth/check-visitor` validates before magic link is sent
- API endpoint `/api/auth/check-admin` validates admin access
- Prevents unauthorized emails from receiving magic links

## PWA Offline Document Caching
The platform includes a comprehensive offline document caching system for investors to access saved documents without internet connectivity.

### Key Features
- **User-Scoped Caching**: Each user has isolated cache storage (`bf-fund-documents-user-{userId}-{version}`) preventing cross-user data exposure
- **Save for Offline**: Documents can be saved via the "Save Offline" button in document viewers
- **Offline Documents Page**: Dedicated page at `/lp/offline-documents` to view and manage cached documents
- **Automatic Cache Clearing**: User caches are cleared on logout via `signOutWithCacheClear()`

### Security Controls
- Origin validation restricts caching to trusted domains only
- User ID is required for all cache operations (save, get, remove, stats)
- IndexedDB stores document metadata with user scoping
- Cache names include version for proper invalidation on updates

### Key Files
- `public/sw.js` - Service worker with caching logic
- `lib/offline/document-cache.ts` - Client-side cache management API
- `lib/offline/use-offline-cache-sync.ts` - Session sync and secure logout
- `components/offline/save-offline-button.tsx` - UI component for saving documents
- `pages/lp/offline-documents.tsx` - Offline documents management page

## Cache Invalidation Strategy
The platform uses aggressive cache invalidation to ensure users always receive the latest code after deployments without manual cache clearing.

### Build-Time Versioning
- `scripts/generate-sw-version.js` generates a unique hash on each build
- `CACHE_VERSION` is automatically updated (e.g., `v5-3feb7a2f4e189f76`)
- Both `npm run build` and `vercel-build` run the version script

### Service Worker Updates
- Registration uses `updateViaCache: 'none'` to bypass browser caching
- Cache-busting query parameter added to SW URL
- Immediate `registration.update()` on page load
- Hourly automatic update checks for installed PWAs
- `skipWaiting()` and `clients.claim()` for immediate takeover

### Caching Strategy
- **Network-First**: All static assets (JS, CSS, images, `/_next/static/`) use network-first with cache fallback
- **No-Cache Headers**: `sw.js` and all pages have `Cache-Control: no-cache, no-store, must-revalidate`
- **Automatic Cleanup**: Old caches are deleted on SW activation (except user document caches)
- **Safe Reload**: `controllerchange` listener with refresh guard prevents reload loops

Security is implemented with a defense-in-depth approach featuring four encryption layers: Transport (TLS 1.3), Client-Side (AES-256-GCM using Web Crypto API), Server-Side (AES-256-GCM using Node.js crypto module), and PDF Level (PDF 2.0 AES-256 using `pdf-lib-plus-encrypt`). The system incorporates rate limiting with three tiers (auth: 10/hour, strict: 3/hour, api: 100/min) and anomaly detection to identify and mitigate suspicious activities, employing a STRIDE-based threat model. The signature workflow is secured with a dedicated encryption service, ensuring signature images and documents are encrypted, and all events are logged to an audit trail. An external API provides programmatic access to signature features, authenticated via Bearer tokens.

A critical security feature is the **enforcing Content Security Policy (CSP)**, which strictly whitelists domains for scripts, connections, images, styles, and fonts. When adding new third-party services, their domains **MUST** be added to the appropriate CSP list in `lib/middleware/csp.ts` to prevent silent failures in production.

The platform includes a unified storage abstraction layer supporting multiple providers: Replit Object Storage, AWS S3, Cloudflare R2, and local filesystem for development. This is configured via `STORAGE_PROVIDER` and related environment variables, with AES-256 encryption available for stored data.

## Rollbar Error Monitoring Configuration
Rollbar provides real-time error monitoring for both client and server-side errors.

### Required Secrets
- `NEXT_PUBLIC_ROLLBAR_CLIENT_TOKEN`: Client-side error tracking (must be "post_client_item" scope token, NOT the Public ID)
- `ROLLBAR_SERVER_TOKEN`: Server-side error tracking (must be "post_server_item" scope token)
- `ROLLBAR_POST_SERVER_ITEM_ACCESS_TOKEN`: Alternative server token for API access
- `ROLLBAR_READ_TOKEN`: For fetching error data from Rollbar API

### How to Get Tokens
1. Go to Rollbar Dashboard > Project Settings > Project Access Tokens
2. For client token: Use or create a token with "post_client_item" scope
3. For server token: Use or create a token with "post_server_item" scope
4. IMPORTANT: Do NOT use the "Public ID" - it's just an identifier, not an access token

### Key Files
- `lib/rollbar.ts` - Rollbar client and server configuration
- `pages/_app.tsx` - RollbarProvider wraps the app for client-side error boundary

## External Dependencies
- **Resend**: Transactional email services.
- **Persona**: KYC/AML verification.
- **Plaid**: Bank connectivity for ACH transfers.
- **Tinybird**: Real-time analytics and audit logging.
- **Stripe**: Platform billing.
- **Storage Providers**: Replit Object Storage, AWS S3, Cloudflare R2, or local filesystem.
- **Rollbar**: Real-time error monitoring (see configuration section above).
- **Google OAuth**: Admin authentication.
- **OpenAI**: Optional AI features.