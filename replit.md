# BF Fund Investor Dataroom

## Overview

The BF Fund Investor Dataroom is a 506(c) compliant GP/LP management suite. It aims to streamline investor relations and compliance by offering secure document sharing, self-hosted e-signature capabilities, personalized investor portals, and integrated KYC/AML verification. The platform provides a robust, compliant, and user-friendly experience for fund managers and limited partners, covering investor onboarding, accreditation verification, secure document vaults, and comprehensive compliance audit trails.

## User Preferences

- Communication: Simple, everyday language
- Technical level: Non-technical explanations preferred
- Focus: Security and ease of use for investors

## System Architecture

The platform uses Next.js 14 with a hybrid Pages and App Router architecture and TypeScript. Styling is handled by Tailwind CSS and shadcn/ui, focusing on a UX-first, mobile-responsive design with minimal clicks and guided wizards. PostgreSQL with Prisma ORM is used for the database, and NextAuth.js provides authentication with database-backed sessions.

Key features include:
-   **506(c) Compliance**: Accreditation self-certification, audit logs, integrated KYC/AML hooks, and access verification.
-   **Self-hosted E-Signature**: Custom React drag-and-drop field placement for legally compliant electronic signatures (ESIGN/UETA) with consent capture and SHA-256 checksum verification.
-   **LP Portal**: Secure, personalized investor portals with role-based access control and real-time updates.
-   **Admin Dashboards**: Unified admin access with CRM timeline, capital tracking, and compliance audit functionalities.
-   **Payment & Transaction Flows**: Integration with Plaid for ACH transfers and Stripe for platform billing, with transactions enforced by KYC/AML.
-   **PWA Support**: Progressive Web App features for enhanced user experience and auto-updates.
-   **Error Monitoring**: Comprehensive error tracking across the application using Rollbar.
-   **Authentication System**: Unified login portal for admins and investors, supporting magic links for both, and role-based routing post-login. Database-backed sessions enable instant role revocation.
-   **Database Audit Protection**: `onDelete: Restrict` constraints on critical foreign keys protect audit records for SEC compliance. Cross-log access verification ensures secure data access across various invitation and group mechanisms.
-   **Encryption & Security**: Multiple encryption layers (TLS 1.3, AES-256-GCM for client-side and server-side, PDF 2.0 encryption) ensure data security. Features include client-side encryption with PBKDF2, PDF password protection, document SHA-256 checksums, and secure token generation. Signature images are encrypted before database storage. Completed documents are automatically encrypted with generated passwords. A detailed threat model (STRIDE-based) guides security implementations. Integration via `lib/signature/encryption-service.ts`.
-   **Security Rate Limiting & Anomaly Detection**: Configurable rate limiting protects sensitive endpoints. Anomaly detection monitors suspicious user patterns (e.g., multiple IPs, rapid location changes, unusual access times, excessive requests, suspicious user agents) with escalating severity levels and automated actions.
-   **External API for Integrations**: A REST API provides programmatic control for template creation and document workflows, secured with Bearer token authentication.

## External Dependencies

-   **Resend**: Transactional email services.
-   **Persona**: KYC/AML verification.
-   **Plaid**: Bank connectivity for ACH transfers.
-   **Tinybird**: Real-time analytics and audit logging.
-   **Stripe**: Platform billing and subscription management.
-   **Replit Object Storage**: Primary storage for documents and files (S3-compatible, TUS resumable uploads).
-   **Rollbar**: Real-time error monitoring.
-   **Google OAuth**: Authentication for admin users.
-   **OpenAI**: Optional AI features.