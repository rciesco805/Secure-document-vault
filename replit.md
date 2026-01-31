# BF Fund Investor Dataroom

### Overview
The BF Fund Investor Dataroom is a 506(c) compliant GP/LP management suite designed to streamline investor relations and compliance. It offers secure document sharing, self-hosted e-signature capabilities, personalized investor portals, and integrated KYC/AML verification. The platform provides a robust, compliant, and user-friendly experience for fund managers and limited partners. Its business vision is to provide a comprehensive and compliant solution for investor management, targeting fund managers looking to enhance efficiency and transparency with their limited partners. The project aims to become the leading platform for investor relations in the private equity and venture capital space.

### User Preferences
- Communication: Simple, everyday language
- Technical level: Non-technical explanations preferred
- Focus: Security and ease of use for investors

### System Architecture
The BF Fund Investor Dataroom is built on a modern web stack designed for performance, scalability, and security.

**Tech Stack**:
- **Framework**: Next.js 16.1.6
- **Runtime**: React 19.2.4
- **Language**: TypeScript 5.x
- **Styling**: Tailwind CSS 3.x, shadcn/ui
- **Database**: PostgreSQL 16 via Prisma ORM
- **Authentication**: NextAuth.js
- **Node**: Node.js 22
- **Push Notifications**: web-push (Web Push API)

**Core Features**:
- **506(c) Compliance**: Accreditation workflow, audit logging, KYC/AML via Persona, investor qualification.
- **Self-hosted E-Signature**: ESIGN/UETA compliant, consent capture, document checksums, completion certificates, multiple font styles.
- **LP Portal (Investor Portal)**: Personalized dashboards, role-based access control, watermarked document viewing, investment tracking.
- **Admin Dashboards**: CRM timeline, capital tracking, compliance audit trails, user management, fund analytics.
- **Payment Flows**: Plaid ACH for capital calls, Stripe for billing, KYC enforcement, transaction history.
- **PWA Support**: Offline access, service worker caching (v5), auto-updates, offline document viewing.
- **Push Notifications**: Real-time alerts for document views, signatures, capital calls, and distributions.
- **Advanced Reporting**: Custom report builder with 8 report types, scheduled reports, PDF/CSV/Excel export.
- **Security**: Four-layer encryption (TLS 1.3, Client-Side AES-256-GCM, Server-Side AES-256-GCM, PDF 2.0 AES-256).
- **Authentication**: NextAuth.js with OAuth (Google, LinkedIn), magic links, database sessions.

**UI/UX Decisions**:
The platform utilizes Tailwind CSS and shadcn/ui for a clean, modern, and responsive user interface. Investor portals are designed for ease of use, with clear navigation and personalized dashboards. Admin interfaces prioritize data visualization and efficient workflow management.

**System Design Choices**:
- **App Router Migration**: The application has fully migrated to Next.js App Router for server components handling metadata, authentication, authorization, and initial data fetching, while client components manage UI rendering, navigation, and interactive state.
- **Dynamic Rendering**: Enabled for signature-related pages, document, and link viewing, with client-side data fetching and loading states.
- **Admin Role Hierarchy**: Supports OWNER, SUPER_ADMIN, and ADMIN roles with database-backed verification for granular access control.
- **Push Notifications System**: Implemented with `PushSubscription`, `NotificationPreference`, `Notification` models, and event-specific notification functions.
- **Advanced Reporting System**: Features `ReportTemplate` and `GeneratedReport` models with various statuses, supporting comprehensive report generation and management.
- **Error Handling**: Implemented safe destructuring for `useSession` to prevent crashes and proper handling for tooltip components.

### External Dependencies
- **Resend**: Transactional email
- **Persona**: KYC/AML verification
- **Plaid**: Bank connectivity for ACH
- **Tinybird**: Real-time analytics
- **Stripe**: Platform billing
- **Rollbar**: Error monitoring
- **PostHog**: Product analytics
- **Google OAuth**: Admin authentication
- **OpenAI**: AI features
- **Storage**: Replit Object Storage (default), AWS S3 (alternative), Cloudflare R2 (alternative)
- **Web Push**: Push notifications