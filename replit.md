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

Security is implemented with a defense-in-depth approach featuring four encryption layers: Transport (TLS 1.3), Client-Side (AES-256-GCM using Web Crypto API), Server-Side (AES-256-GCM using Node.js crypto module), and PDF Level (PDF 2.0 AES-256 using `pdf-lib-plus-encrypt`). The system incorporates rate limiting with three tiers (auth: 10/hour, strict: 3/hour, api: 100/min) and anomaly detection to identify and mitigate suspicious activities, employing a STRIDE-based threat model. The signature workflow is secured with a dedicated encryption service, ensuring signature images and documents are encrypted, and all events are logged to an audit trail. An external API provides programmatic access to signature features, authenticated via Bearer tokens.

A critical security feature is the **enforcing Content Security Policy (CSP)**, which strictly whitelists domains for scripts, connections, images, styles, and fonts. When adding new third-party services, their domains **MUST** be added to the appropriate CSP list in `lib/middleware/csp.ts` to prevent silent failures in production.

The platform includes a unified storage abstraction layer supporting multiple providers: Replit Object Storage, AWS S3, Cloudflare R2, and local filesystem for development. This is configured via `STORAGE_PROVIDER` and related environment variables, with AES-256 encryption available for stored data.

## External Dependencies
- **Resend**: Transactional email services.
- **Persona**: KYC/AML verification.
- **Plaid**: Bank connectivity for ACH transfers.
- **Tinybird**: Real-time analytics and audit logging.
- **Stripe**: Platform billing.
- **Storage Providers**: Replit Object Storage, AWS S3, Cloudflare R2, or local filesystem.
- **Rollbar**: Real-time error monitoring.
- **Google OAuth**: Admin authentication.
- **OpenAI**: Optional AI features.