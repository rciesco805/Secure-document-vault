# BF Fund Investor Dataroom

## Overview
The BF Fund Investor Dataroom is a 506(c) compliant GP/LP management suite designed to streamline investor relations and compliance. It offers secure document sharing, self-hosted e-signature capabilities, personalized investor portals, and integrated KYC/AML verification. The platform aims to provide a robust, compliant, and user-friendly experience for fund managers and limited partners, covering investor onboarding, accreditation verification, secure document vaults, and comprehensive compliance audit trails. The business vision is to become the leading platform for fund managers seeking to automate and secure their investor relations while ensuring regulatory compliance and offering market-leading features.

## User Preferences
- Communication: Simple, everyday language
- Technical level: Non-technical explanations preferred
- Focus: Security and ease of use for investors

## System Architecture
The platform is built using Next.js 14 with a hybrid Pages and App Router architecture and TypeScript. Styling is managed with Tailwind CSS and shadcn/ui, emphasizing a UX-first, mobile-responsive design with minimal clicks and guided wizards. Data persistence is handled by PostgreSQL with Prisma ORM, and NextAuth.js provides authentication with database-backed sessions.

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
When adding a new third-party service (analytics, payments, APIs, CDNs), you MUST add its domain to the appropriate CSP list in `next.config.mjs`:
1. For JavaScript SDKs: Add to `trustedScriptDomains`
2. For API calls: Add to `trustedConnectDomains`
3. For images/assets: Add to `trustedImageDomains`
4. For fonts: Add to `trustedFontDomains`
5. For styles: Add to `trustedStyleDomains`

Failure to add domains will cause the integration to silently fail in production (blocked by CSP).

**Security Features:**
- Production uses `wasm-unsafe-eval` (allows WASM for PDF processing, blocks eval())
- Frame-ancestors: Main routes `none`, /view/ routes `self`, embed routes configurable
- Additional headers: `X-Content-Type-Options: nosniff`, `Permissions-Policy`, strict `Referrer-Policy`

**Environment Variables:**
- `CSP_EMBED_ALLOWED_ORIGINS`: Space-separated list of domains that can embed /view/*/embed routes
- `CSP_EMBED_ALLOW_ALL=true`: Allow any HTTPS origin to embed (less secure, use only if needed)

**Known Limitations:**
- `unsafe-inline` required for styles (Tailwind/shadcn) and Next.js hydration scripts
- Future improvement: Implement nonce-based CSP for additional XSS protection

**Debugging CSP Issues:**
- Check browser console for "Refused to..." errors
- CSP violations are logged to `/api/csp-report`
- In development, the CSP is more permissive (allows http: for local testing)

## Planned Upgrades

### Next.js 15/16 Migration (Future Project)
**Purpose**: Resolve remaining npm audit vulnerabilities and access modern features.

**Key Breaking Changes**:
1. React 19 required (currently on 18.3.1)
2. Async request APIs - `cookies()`, `headers()`, `params` become async
3. ESLint 9 required with eslint-config-next@16
4. Caching defaults changed - `fetch` no longer cached by default
5. Turbopack as default bundler

**Dependencies to Update**:
- `next`: 14.2.35 → 16.x
- `react` / `react-dom`: 18.3.1 → 19.x  
- `eslint-config-next`: 14.2.35 → 16.x
- `next-auth`: Verify v5 compatibility

**Testing Required**:
- All authentication flows (NextAuth, LP auth)
- Document upload/view/sign workflows
- KYC/payment integrations (Persona, Plaid, Stripe)
- PDF encryption/decryption
- Admin dashboards and CRM features

**Estimated Effort**: 2-3 days with thorough testing

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