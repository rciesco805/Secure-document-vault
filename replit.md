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
The platform implements an enforcing CSP with strict domain whitelisting:
- **script-src**: Whitelisted domains for PostHog, Rollbar, Stripe JS, Plaid, Persona
- **connect-src**: All API endpoints, Vercel Blob storage, CloudFront CDNs
- **img-src**: All image CDNs from remotePatterns configuration
- **Production**: Uses `wasm-unsafe-eval` instead of `unsafe-eval` (allows WASM, blocks general eval)
- **Frame-ancestors**: Main routes `none`, /view/ routes `self`, embed routes `self` by default
- **Embed configuration**: Set `CSP_EMBED_ALLOWED_ORIGINS` for partner domains or `CSP_EMBED_ALLOW_ALL=true` for any HTTPS
- **Known limitation**: `unsafe-inline` required for styles (Tailwind/shadcn) and Next.js hydration scripts

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