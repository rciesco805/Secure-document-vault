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
- **PWA Support**: Progressive Web App with auto-updates.
- **Error Monitoring**: Rollbar integration for real-time tracking.

Security is implemented with a defense-in-depth approach featuring four encryption layers: Transport (TLS 1.3), Client-Side (AES-256-GCM using Web Crypto API), Server-Side (AES-256-GCM using Node.js crypto module), and PDF Level (PDF 2.0 AES-256 using `pdf-lib-plus-encrypt`). The system incorporates rate limiting and anomaly detection to identify and mitigate suspicious activities, employing a STRIDE-based threat model. The signature workflow is secured with a dedicated encryption service, ensuring signature images and documents are encrypted, and all events are logged to an audit trail. An external API provides programmatic access to signature features, authenticated via Bearer tokens.

### Content Security Policy (CSP)
The platform implements an **enforcing CSP** (not report-only) with strict domain whitelisting. This is a critical security feature that blocks any scripts, connections, or resources from non-whitelisted domains.

**Current Whitelisted Domains** (in `next.config.mjs`):
- **script-src**: PostHog, Rollbar, unpkg.com, Stripe JS, Plaid, Persona
- **connect-src**: PostHog, Rollbar, Replit storage, Stripe API, Plaid, Persona, Tinybird, Cal.com, Vercel Blob
- **img-src**: CloudFront CDNs, Twitter, LinkedIn, Google, Replit, Vercel Blob, dynamic upload hosts
- **style-src**: Google Fonts
- **font-src**: fonts.gstatic.com

**IMPORTANT - Adding New Integrations:**
When adding a new third-party service (analytics, payments, APIs, CDNs), you MUST add its domain to the appropriate CSP list in `lib/middleware/csp.ts`:
1. For JavaScript SDKs: Add to `trustedScriptDomains`
2. For API calls: Add to `trustedConnectDomains`
3. For images/assets: Add to `trustedImageDomains`
4. For fonts: Add to `trustedFontDomains`
5. For styles: Add to `trustedStyleDomains`

Failure to add domains will cause the integration to silently fail in production (blocked by CSP).

**Security Features:**
- **Nonce-based CSP**: Scripts require per-request nonces (generated in middleware, injected via `_document.tsx`)
- Production uses `'strict-dynamic'` with nonces (eliminates need for `'unsafe-inline'` for scripts)
- Production uses `wasm-unsafe-eval` (allows WASM for PDF processing, blocks regular eval())
- Frame-ancestors: Main routes `none`, /view/ routes `self`, embed routes configurable
- Additional headers: `X-Content-Type-Options: nosniff`, `Permissions-Policy`, strict `Referrer-Policy`

**CSP Implementation:**
- Nonces generated in `middleware.ts` using `lib/middleware/csp.ts`
- Nonces passed to `_document.tsx` via `x-nonce` header
- `NextScript` and `Head` components receive nonce prop for inline scripts

**Environment Variables:**
- `CSP_EMBED_ALLOWED_ORIGINS`: Space-separated list of domains that can embed /view/*/embed routes
- `CSP_EMBED_ALLOW_ALL=true`: Allow any HTTPS origin to embed (less secure, use only if needed)

**Known Limitations:**
- `unsafe-inline` still required for styles (Tailwind/shadcn dynamic classes)
- Third-party scripts (PostHog, Stripe, etc.) must be in trustedScriptDomains

**Debugging CSP Issues:**
- Check browser console for "Refused to..." errors
- CSP violations are logged to `/api/csp-report`
- In development, the CSP is more permissive (allows http: for local testing)

## Recent Changes

### Next.js 16 Migration (Completed January 2026)
Successfully upgraded the platform to resolve security vulnerabilities:
- **Next.js**: 14.2.x → 16.1.6
- **React/React-DOM**: 18.3.x → 19.2.4
- **eslint-config-next**: 14.x → 16.x

**Breaking Changes Addressed**:
1. Async cookies() API - All route handlers updated to await cookies()
2. React 19 type changes - Updated cloneElement, RefObject, and event handler types
3. Turbopack as default bundler - Added turbopack config for compatibility
4. Moved experimental config keys to top-level (serverExternalPackages, outputFileTracingIncludes)

**Note**: The "middleware" file convention is deprecated in Next.js 16. Consider migrating to "proxy" convention in a future update.

## External Dependencies
- **Resend**: Transactional email services.
- **Persona**: KYC/AML verification.
- **Plaid**: Bank connectivity for ACH transfers.
- **Tinybird**: Real-time analytics and audit logging.
- **Stripe**: Platform billing and subscription management.
- **Replit Object Storage**: Document storage (S3-compatible, TUS uploads).
- **Rollbar**: Real-time error monitoring.
- **Google OAuth**: Admin authentication.
- **OpenAI**: Optional AI features.