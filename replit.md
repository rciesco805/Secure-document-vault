# BF Fund Investor Dataroom

## Overview

The BF Fund Investor Dataroom is a 506(c) compliant GP/LP management suite designed to streamline investor relations and compliance. It offers secure document sharing, self-hosted e-signature capabilities, personalized investor portals, and integrated KYC/AML verification. The platform aims to provide a robust, compliant, and user-friendly experience for both fund managers and limited partners, encompassing investor onboarding, accreditation verification, secure document vaults, and comprehensive compliance audit trails.

## User Preferences

- Communication: Simple, everyday language
- Technical level: Non-technical explanations preferred
- Focus: Security and ease of use for investors

## System Architecture

The platform is built on Next.js 14, utilizing a hybrid Pages and App Router architecture with TypeScript. Styling is managed with Tailwind CSS and shadcn/ui, prioritizing a UX-first approach with mobile-responsiveness, minimal clicks, clear CTAs, and guided wizards. PostgreSQL with Prisma ORM serves as the database, and NextAuth.js handles authentication.

Key features include:
- **506(c) Compliance**: Accreditation self-certification, comprehensive audit logs, integrated KYC/AML hooks, single-email-per-signin protection, and cross-log access verification.
- **Self-hosted E-Signature**: Custom React drag-and-drop field placement for legally compliant electronic signatures (ESIGN/UETA) with consent capture and SHA-256 checksum verification.
- **LP Portal**: Secure, personalized investor portals with role-based access control, real-time dashboard updates, and quick action CTAs for investment-related tasks.
- **Admin Dashboards**: Unified admin access with a hub navigation, CRM timeline for investor activity, capital tracking, and a compliance audit dashboard with event filtering and export functionalities.
- **Payment & Transaction Flows**: Integration with Plaid for ACH transfers (capital calls, distributions) and Stripe for platform subscription billing, with transactions enforced by KYC/AML verification.
- **PWA Support**: Progressive Web App features including a service worker, manifest, offline page, and an auto-update cache system ensuring users always access the latest version without manual cache clearing.
- **Error Monitoring**: Comprehensive error tracking across both App Router and Pages Router using Rollbar, including client-side and server-side error boundaries.

The core flow for investors involves: Dataroom access (optional NDA), account creation, NDA signature (if enabled), accreditation self-certification, Persona KYC/AML verification, and finally, Fundroom dashboard access and subscription/investment.

## External Dependencies

- **Resend**: Transactional email services for notifications and magic links.
- **Persona**: KYC/AML verification, integrated via an iframe.
- **Plaid**: Bank connectivity for ACH capital calls and distributions.
- **Tinybird**: Real-time analytics and audit logging.
- **Stripe**: Platform billing and subscription management.
- **Replit Object Storage**: Primary storage solution for documents and files, supporting S3-compatible and TUS resumable uploads.
- **Rollbar**: Real-time error monitoring and tracking for client and server errors.
- **Google OAuth**: Authentication for admin users.
- **OpenAI**: Optional AI features.