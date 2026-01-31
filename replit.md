# BF Fund Investor Dataroom

### Overview
The BF Fund Investor Dataroom is a 506(c) compliant GP/LP management suite designed to streamline investor relations and compliance. It offers secure document sharing, self-hosted e-signature capabilities, personalized investor portals, and integrated KYC/AML verification. The platform provides a robust, compliant, and user-friendly experience for fund managers and limited partners. Its business vision is to provide a comprehensive and compliant solution for investor management, targeting fund managers looking to enhance efficiency and transparency with their limited partners. The project aims to become the leading platform for investor relations in the private equity and venture capital space.

### User Preferences
- Communication: Simple, everyday language
- Technical level: Non-technical explanations preferred
- Focus: Security and ease of use for investors

### System Architecture
**Tech Stack**:
- **Framework**: Next.js 16.1.6 (App Router)
- **Runtime**: React 19.2.4
- **Language**: TypeScript 5.x
- **Styling**: Tailwind CSS 3.x, shadcn/ui
- **Database**: PostgreSQL 16 via Prisma ORM
- **Authentication**: NextAuth.js with database sessions
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
- **Manual Investment Tracking**: System to record investments and documents signed outside the platform for complete fund reporting, integrated into fund calculations.
- **Comprehensive Audit Logging**: Centralized logging utility with typed event types and resource types for compliance and GP export.
- **Auto-Certificate Generation**: PDF completion certificates generated automatically on document completion and stored securely.
- **Accreditation SEC Guidance Auto-Approval**: Logic for auto-approving high-value investors ($200k+) with self-attestation, flagging others for manual review.
- **LP Dashboard Payment Flow**: Enhanced subscription lifecycle tracking (PENDING → SIGNED → PAYMENT_PROCESSING → COMPLETED) with UI for each phase and duplicate subscription prevention.

**Authentication System**:
- **Providers**: NextAuth.js with magic links (email), Google OAuth, LinkedIn OAuth.
- **Session Strategy**: Database sessions (30-day max age, 24-hour refresh).
- **Magic Link Flow**: Two-step verification at `/verify` prevents email scanners from consuming tokens. Callback URLs are stored server-side in a `MagicLinkCallback` table. Users must manually click "Sign In to Portal" button to consume the link. Token correlation ensures exact match of the original NextAuth token.
- **Admin Verification**: Checks static admin list + database UserTeam roles.

**Role System**:
- **User.role**: `GP` (General Partner), `LP` (Limited Partner).
- **UserTeam.role**: `OWNER`, `SUPER_ADMIN`, `ADMIN`.

### External Dependencies

| Service | Purpose |
|---------|---------|
| **Resend** | Transactional email |
| **Persona** | KYC/AML verification |
| **Plaid** | Bank connectivity for ACH payments |
| **Tinybird** | Real-time analytics |
| **Stripe** | Platform billing |
| **Rollbar** | Error monitoring |
| **PostHog** | Product analytics |
| **Google OAuth** | Admin authentication |
| **OpenAI** | AI features |
| **Replit Object Storage** | Document storage (default) |
| **Web Push** | Push notifications |