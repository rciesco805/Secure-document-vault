# BF Fund Investor Dataroom

### Overview
The BF Fund Investor Dataroom is a 506(c) compliant GP/LP management suite designed to streamline investor relations and compliance. It offers secure document sharing, self-hosted e-signature capabilities, personalized investor portals, and integrated KYC/AML verification. The platform provides a robust, compliant, and user-friendly experience for fund managers and limited partners.

**Production Domain**: dataroom.bermudafranchisegroup.com

### User Preferences
- Communication: Simple, everyday language
- Technical level: Non-technical explanations preferred
- Focus: Security and ease of use for investors

### Recent Changes (January 2026)

#### Critical Bug Fixes
- **Admin Authentication Fix**: Updated admin verification to check database for OWNER, SUPER_ADMIN, ADMIN roles instead of relying solely on static email list
  - Files fixed: `/api/auth/check-admin`, `/api/auth/check-visitor`, `/pages/api/auth/[...nextauth].ts`, `/lib/auth/admin-magic-link.ts`
- **Domain Typo Fix**: Corrected "bermudaclubfranchise.com" typos to "bermudafranchisegroup.com" in OG preview, email footer, and link settings
- **useSession Crash Fix**: Applied safe pattern across 20+ files to prevent crashes when session is undefined. Pattern: `const sessionData = useSession(); const session = sessionData?.data;`
  - Files fixed: All `/app/` pages, `/components/` (profile-menu, nav-user, sidebar components), `/context/team-context.tsx`, `/ee/features/`
- **Service Worker Infinite Refresh Fix**: Removed dynamic timestamp from service worker registration (`/sw.js` instead of `/sw.js?v=${Date.now()}`) to stop page refresh loops
- **Tooltip Errors**: Fixed single child element requirement for tooltip components
- **Navigation Hooks**: Updated sidebar and layout components to use correct Next.js App Router navigation hooks

#### App Router Migration (100% Complete)
- Migrated 404 page to App Router (`app/not-found.tsx`)
- All 99 pages fully migrated to App Router
- Pages Router retained only for API routes and required system files (`_app.tsx`, `_document.tsx`)

#### New Features Added

**Push Notifications System**
- Database schema: `PushSubscription`, `NotificationPreference`, `Notification` models
- Notification types: DOCUMENT_VIEWED, SIGNATURE_COMPLETE, SIGNATURE_REQUESTED, CAPITAL_CALL, DISTRIBUTION, NEW_DOCUMENT, ACCREDITATION_UPDATE, SYSTEM
- API endpoints:
  - `POST/DELETE /api/notifications/subscribe` - Subscribe/unsubscribe from push notifications
  - `GET/PUT /api/notifications/preferences` - Manage notification preferences
  - `GET/PATCH /api/notifications` - List and mark notifications as read
- Helper library: `lib/notifications/send-notification.ts` with event-specific notification functions
- Dependencies: `web-push` package for Web Push API

**Advanced Reporting System**
- Database schema: `ReportTemplate`, `GeneratedReport` models
- Report types: INVESTOR_SUMMARY, CAPITAL_ACTIVITY, DOCUMENT_ANALYTICS, VISITOR_ANALYTICS, SIGNATURE_STATUS, FUND_PERFORMANCE, COMPLIANCE_AUDIT, CUSTOM
- Report statuses: PENDING, GENERATING, COMPLETED, FAILED, EXPIRED
- API endpoints:
  - `GET /api/teams/[teamId]/reports` - List templates and recent reports
  - `POST/PUT/DELETE /api/teams/[teamId]/reports/templates` - Manage report templates
  - `POST /api/teams/[teamId]/reports/generate` - Generate reports

#### Dynamic Rendering Updates
- Enabled dynamic rendering for all signature-related pages
- Added client-side data fetching for document and link viewing pages
- Added loading states across viewer components

### System Architecture

#### Tech Stack
- **Framework**: Next.js 16.1.6
- **Runtime**: React 19.2.4
- **Language**: TypeScript 5.x
- **Styling**: Tailwind CSS 3.x, shadcn/ui
- **Database**: PostgreSQL 16 via Prisma ORM
- **Authentication**: NextAuth.js
- **Node**: Node.js 22
- **Push Notifications**: web-push (Web Push API)

#### Core Features
- **506(c) Compliance**: Accreditation workflow, audit logging, KYC/AML via Persona, investor qualification.
- **Self-hosted E-Signature**: ESIGN/UETA compliant, consent capture, document checksums, completion certificates, multiple font styles.
- **LP Portal (Investor Portal)**: Personalized dashboards, role-based access control, watermarked document viewing, investment tracking.
- **Admin Dashboards**: CRM timeline, capital tracking, compliance audit trails, user management, fund analytics.
- **Payment Flows**: Plaid ACH for capital calls, Stripe for billing, KYC enforcement, transaction history.
- **PWA Support**: Offline access, service worker caching (v5), auto-updates, offline document viewing.
- **Push Notifications**: Real-time alerts for document views, signatures, capital calls, and distributions.
- **Advanced Reporting**: Custom report builder with 8 report types, scheduled reports, PDF/CSV/Excel export.
- **Security**: Four-layer encryption (TLS 1.3, Client-Side AES-256-GCM, Server-Side AES-256-GCM, PDF 2.0 AES-256).

#### Directory Structure
- `/app/`: App Router pages for auth, admin, dashboard, datarooms, documents, settings, visitors, workflows, and public viewing/signing.
- `/components/`: Reusable React components and context providers.
- `/lib/`: Utilities, helpers, middleware, and notification/reporting services.
- `/pages/`: Pages Router for API routes and required Next.js files (`_app.tsx`, `_document.tsx`).
- `/prisma/`: Database schema definitions.
- `/public/`: Static assets including service worker (`sw.js`).

#### Key Files Modified Recently
- `components/pwa-install.tsx` - Service worker registration fix
- `components/profile-menu.tsx` - useSession safe pattern
- `components/sidebar/nav-user.tsx` - useSession safe pattern
- `context/team-context.tsx` - useSession safe pattern
- `components/offline/save-offline-button.tsx` - useSession safe pattern
- `app/not-found.tsx` - New App Router 404 page
- `public/sw.js` - Service worker (v5)
- `prisma/schema.prisma` - Added notification and reporting models

#### Migration Pattern (Pages to App Router)
- **Server Components**: Handle metadata, authentication, authorization, and initial data fetching.
- **Client Components**: Manage UI rendering, navigation, dynamic parameters, and interactive state.
- **useSession Pattern**: Always use `const sessionData = useSession(); const session = sessionData?.data;` to prevent crashes

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
- **Web Push**: Push notifications (VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)

### Pending Work
- Push notification preferences UI in settings
- Notification triggers integration with existing events
- Report builder UI component
- Reports page in admin settings
- Report generation library (`lib/reports/generate-report.ts`)