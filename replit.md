# BF Fund Investor Dataroom

### Overview
The BF Fund Investor Dataroom is a 506(c) compliant GP/LP management suite designed to streamline investor relations and compliance. It offers secure document sharing, self-hosted e-signature capabilities, personalized investor portals, and integrated KYC/AML verification. The platform provides a robust, compliant, and user-friendly experience for fund managers and limited partners.

### User Preferences
- Communication: Simple, everyday language
- Technical level: Non-technical explanations preferred
- Focus: Security and ease of use for investors

### System Architecture

#### Tech Stack
- **Framework**: Next.js 16.1.6
- **Runtime**: React 19.2.4
- **Language**: TypeScript 5.x
- **Styling**: Tailwind CSS 3.x, shadcn/ui
- **Database**: PostgreSQL 16 via Prisma ORM
- **Authentication**: NextAuth.js
- **Node**: Node.js 22

#### Core Features
- **506(c) Compliance**: Accreditation workflow, audit logging, KYC/AML via Persona, investor qualification.
- **Self-hosted E-Signature**: ESIGN/UETA compliant, consent capture, document checksums, completion certificates, multiple font styles.
- **LP Portal (Investor Portal)**: Personalized dashboards, role-based access control, watermarked document viewing, investment tracking.
- **Admin Dashboards**: CRM timeline, capital tracking, compliance audit trails, user management, fund analytics.
- **Payment Flows**: Plaid ACH for capital calls, Stripe for billing, KYC enforcement, transaction history.
- **PWA Support**: Offline access, service worker caching (v5), auto-updates, offline document viewing.
- **Security**: Four-layer encryption (TLS 1.3, Client-Side AES-256-GCM, Server-Side AES-256-GCM, PDF 2.0 AES-256).

#### Directory Structure
- `/app/`: App Router pages for auth, admin, dashboard, datarooms, documents, settings, visitors, workflows, and public viewing/signing.
- `/components/`: Reusable React components and context providers.
- `/lib/`: Utilities, helpers, and middleware.
- `/pages/`: Pages Router for API routes and required Next.js files (`_app.tsx`, `_document.tsx`, `404.tsx`).
- `/prisma/`: Database schema definitions.
- `/public/`: Static assets.

#### Migration Pattern (Pages to App Router)
- **Server Components**: Handle metadata, authentication, authorization, and initial data fetching.
- **Client Components**: Manage UI rendering, navigation, dynamic parameters, and interactive state.

### External Dependencies

- **Resend**: Transactional email (RESEND_API_KEY)
- **Persona**: KYC/AML verification (PERSONA_*)
- **Plaid**: Bank connectivity for ACH (PLAID_*)
- **Tinybird**: Real-time analytics (TINYBIRD_TOKEN)
- **Stripe**: Platform billing (STRIPE_*)
- **Rollbar**: Error monitoring (ROLLBAR_*)
- **PostHog**: Product analytics (POSTHOG_*)
- **Google OAuth**: Admin authentication (GOOGLE_*)
- **OpenAI**: AI features (OPENAI_API_KEY)
- **Storage**: Replit Object Storage (default), AWS S3 (alternative), Cloudflare R2 (alternative)