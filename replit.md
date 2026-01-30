# BF Fund Investor Dataroom

## Overview
The BF Fund Investor Dataroom is a 506(c) compliant GP/LP management suite designed to streamline investor relations and compliance. It offers secure document sharing, self-hosted e-signature capabilities, personalized investor portals, and integrated KYC/AML verification. The platform provides a robust, compliant, and user-friendly experience for fund managers and limited partners, with a vision to become the leading platform for investor relationship management in the financial sector, enhancing transparency and efficiency.

## User Preferences
- Communication: Simple, everyday language
- Technical level: Non-technical explanations preferred
- Focus: Security and ease of use for investors

## System Architecture
The platform is built using Next.js with a hybrid App Router architecture, React, and TypeScript. Styling is managed with Tailwind CSS and shadcn/ui. Data persistence is handled by PostgreSQL with Prisma ORM, and NextAuth.js provides authentication with database-backed sessions.

### Core Features
- **506(c) Compliance**: Accreditation self-certification, audit logs, and KYC/AML hooks.
- **Self-hosted E-Signature**: ESIGN/UETA compliant with consent capture and checksums.
- **LP Portal**: Personalized investor portals with role-based access.
- **Admin Dashboards**: CRM timeline, capital tracking, and compliance audit.
- **Payment Flows**: Plaid ACH transfers and Stripe billing with KYC enforcement.
- **PWA Support**: Progressive Web App with offline document access and auto-updates, featuring user-scoped caching for data isolation.
- **Security**: Four-layer encryption (TLS 1.3, Client-Side AES-256-GCM, Server-Side AES-256-GCM, PDF 2.0 AES-256), rate limiting, and a strict Content Security Policy.

### Technical Implementation
The system leverages Next.js App Router for improved performance and SEO, utilizing server components and Suspense for loading states. Authentication distinguishes between investor/visitor and administrator logins, with authorization pre-checks. PWA features include isolated cache storage per user and a network-first cache invalidation strategy with build-time versioning.

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