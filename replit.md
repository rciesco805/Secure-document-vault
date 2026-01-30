# BF Fund Investor Dataroom

### Overview
The BF Fund Investor Dataroom is a 506(c) compliant GP/LP management suite designed to streamline investor relations and compliance. It offers secure document sharing, self-hosted e-signature capabilities, personalized investor portals, and integrated KYC/AML verification. The platform provides a robust, compliant, and user-friendly experience for fund managers and limited partners.

**Production Domain**: dataroom.bermudafranchisegroup.com

### User Preferences
- Communication: Simple, everyday language
- Technical level: Non-technical explanations preferred
- Focus: Security and ease of use for investors

### Recent Changes (January 30, 2026)

#### Critical Bug Fixes

**Admin Authentication Fix (January 30, 2026)**
- Updated admin verification to check database for OWNER, SUPER_ADMIN, ADMIN roles instead of relying solely on static email list
- Authentication now queries `UserTeam` table for active admin roles dynamically
- Files fixed:
  - `pages/api/auth/check-admin.ts` - Database lookup for admin roles
  - `pages/api/auth/check-visitor.ts` - Database lookup for admin roles
  - `pages/api/auth/[...nextauth].ts` - signIn callback checks database for admin status
  - `lib/auth/admin-magic-link.ts` - Added OWNER role to admin check
  - `lib/constants/admins.ts` - Added `isUserAdminAsync()` function for database lookup

**Domain Typo Fix (January 30, 2026)**
- Corrected "bermudaclubfranchise.com" typos to "bermudafranchisegroup.com" across 3 files:
  - `components/settings/og-preview.tsx` - Fixed hostname display
  - `components/links/link-sheet/og-section.tsx` - Fixed help link URL
  - `components/emails/shared/footer.tsx` - Fixed contact email address

**useSession Crash Fix (January 30, 2026)**
- Applied safe destructuring pattern across 22+ files to prevent crashes when session is undefined
- Pattern: `const sessionData = useSession(); const session = sessionData?.data;`
- Additional files fixed in this session:
  - `lib/offline/use-offline-cache-sync.ts` - Safe session pattern
  - `lib/swr/use-teams.ts` - Safe session pattern
- Previously fixed: All `/app/` pages, `/components/` (profile-menu, nav-user, sidebar components), `/context/team-context.tsx`, `/ee/features/`

**Service Worker Infinite Refresh Fix**
- Removed dynamic timestamp from service worker registration (`/sw.js` instead of `/sw.js?v=${Date.now()}`)
- Prevents page refresh loops caused by service worker version changes

**Tooltip Errors**
- Fixed single child element requirement for tooltip components
- All TooltipTrigger components now use proper `asChild` pattern

**Navigation Hooks**
- Updated sidebar and layout components to use correct Next.js App Router navigation hooks

#### New Features Added

**Report Generation Library (January 30, 2026)**
- Created `lib/reports/generate-report.ts` - Complete report data generation module
- Supports all 8 report types with data aggregation from database:
  | Report Type | Description |
  |-------------|-------------|
  | INVESTOR_SUMMARY | Investor count, accreditation status breakdown, investor details |
  | CAPITAL_ACTIVITY | Capital calls and distributions with totals and net cash flow |
  | DOCUMENT_ANALYTICS | Document counts, views, version tracking |
  | VISITOR_ANALYTICS | Visitor statistics, unique emails, verification rates |
  | SIGNATURE_STATUS | E-signature documents by status, completion rates, recipient details |
  | FUND_PERFORMANCE | Fund metrics, capital called vs distributed, DPI calculations |
  | COMPLIANCE_AUDIT | Accreditation expiring soon, pending KYC, recent audit logs |
  | CUSTOM | Placeholder for user-defined custom report configurations |

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
- Report statuses: PENDING, GENERATING, COMPLETED, FAILED, EXPIRED
- API endpoints:
  - `GET /api/teams/[teamId]/reports` - List templates and recent reports
  - `POST/PUT/DELETE /api/teams/[teamId]/reports/templates` - Manage report templates
  - `POST /api/teams/[teamId]/reports/generate` - Generate reports with data

#### App Router Migration (100% Complete)
- Migrated 404 page to App Router (`app/not-found.tsx`)
- All 99 pages fully migrated to App Router
- Pages Router retained only for API routes and required system files (`_app.tsx`, `_document.tsx`)

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
- **Authentication**: NextAuth.js with OAuth (Google, LinkedIn), magic links, database sessions. See `docs/AUTHENTICATION.md` for comprehensive documentation.

#### Directory Structure
```
/app/                 # App Router pages (auth, admin, dashboard, datarooms, documents, settings, etc.)
/components/          # Reusable React components and context providers
/lib/                 # Utilities, helpers, middleware services
  /notifications/     # Push notification helpers (send-notification.ts)
  /reports/           # Report generation (generate-report.ts)
  /auth/              # Authentication utilities
  /constants/         # Admin email list and constants
/pages/               # Pages Router (API routes only)
  /api/               # All API endpoints
/prisma/              # Database schema definitions
/public/              # Static assets including service worker (sw.js)
/ee/                  # Enterprise features (billing, workflows, conversations)
```

#### Key Files Modified (January 30, 2026)
| File | Change |
|------|--------|
| `pages/api/auth/check-admin.ts` | Database lookup for admin roles |
| `pages/api/auth/check-visitor.ts` | Database lookup for admin roles |
| `pages/api/auth/[...nextauth].ts` | signIn callback checks database |
| `lib/auth/admin-magic-link.ts` | Added OWNER role check |
| `lib/constants/admins.ts` | Added `isUserAdminAsync()` function |
| `lib/reports/generate-report.ts` | **NEW** - Report data generation module |
| `lib/offline/use-offline-cache-sync.ts` | Safe useSession pattern |
| `lib/swr/use-teams.ts` | Safe useSession pattern |
| `components/settings/og-preview.tsx` | Fixed domain typo |
| `components/links/link-sheet/og-section.tsx` | Fixed domain typo |
| `components/emails/shared/footer.tsx` | Fixed contact email |

#### Migration Pattern (Pages to App Router)
- **Server Components**: Handle metadata, authentication, authorization, and initial data fetching.
- **Client Components**: Manage UI rendering, navigation, dynamic parameters, and interactive state.
- **useSession Pattern**: Always use `const sessionData = useSession(); const session = sessionData?.data;` to prevent crashes

#### Admin Role Hierarchy
The system recognizes three admin roles with database-backed verification:
- **OWNER**: Full access to team and all settings
- **SUPER_ADMIN**: Administrative access across the platform
- **ADMIN**: Standard administrative access to team resources

### Domain Structure
| Domain | Purpose |
|--------|---------|
| `dataroom.bermudafranchisegroup.com` | Investor portal (this application) |
| `bermudafranchisegroup.com` | Marketing website (separate site) |
| `investors@bermudafranchisegroup.com` | Support email address |

### External Dependencies

- **Resend**: Transactional email (RESEND_API_KEY)
- **Persona**: KYC/AML verification (PERSONA_API_KEY, PERSONA_TEMPLATE_ID, PERSONA_ENVIRONMENT_ID)
- **Plaid**: Bank connectivity for ACH (PLAID_CLIENT_ID, PLAID_SECRET)
- **Tinybird**: Real-time analytics (TINYBIRD_TOKEN)
- **Stripe**: Platform billing (STRIPE_SECRET_KEY, STRIPE_PUBLISHABLE_KEY)
- **Rollbar**: Error monitoring (ROLLBAR_SERVER_TOKEN, ROLLBAR_READ_TOKEN)
- **PostHog**: Product analytics (POSTHOG_*)
- **Google OAuth**: Admin authentication (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET)
- **OpenAI**: AI features (OPENAI_API_KEY)
- **Storage**: Replit Object Storage (default), AWS S3 (alternative), Cloudflare R2 (alternative)
- **Web Push**: Push notifications (VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)

### Error Monitoring (Rollbar)
Recent errors tracked and resolved:
- `useSession` crash errors - Fixed with safe destructuring pattern
- `React.Children.only` tooltip errors - Fixed with `asChild` pattern
- `isTrusted` event errors - Benign browser events, no action needed

### Pending Work
- Push notification preferences UI in settings
- Notification triggers integration with existing events (document views, signatures, capital calls)
- Report builder UI component in admin settings
- Reports page in admin settings for viewing generated reports
- Scheduled report automation

### Security Backlog (From January 30, 2026 Security Review)
| Priority | Issue | Status | Description |
|----------|-------|--------|-------------|
| HIGH | `allowDangerousEmailAccountLinking` | Pending | Disable in OAuth providers to prevent account takeover |
| HIGH | Rate limiting fails open | Pending | Make rate limiting fail-closed (reject on Redis failure) |
| MEDIUM | MFA for admins | Pending | Add TOTP/Passkey requirement for admin accounts |
| MEDIUM | Cookie sameSite config | Pending | Use environment-aware sameSite (lax in dev, none in prod) |
| LOW | Magic link URL rewriting | Pending | Simplify domain rewrite logic in sendVerificationRequest |
| DONE | Multiple signIn queries | Fixed | Combined 3+ queries into single `$transaction()` call |

### Rollbar Integration
Access Rollbar logs programmatically:
```bash
curl -s "https://api.rollbar.com/api/1/items?access_token=$ROLLBAR_READ_TOKEN&status=active&level=error&limit=20"
```

### Recent Commits (January 30, 2026)
1. Optimize signIn callback - Combine 3+ authorization queries into single `$transaction()` call
2. `eb35c4b` - Add comprehensive module for generating various types of reports
3. `103e619` - Address remaining useSession crash errors in team and cache sync functions
4. `ecad730` - Update links and contact information to use the correct company domain
5. `b0d7533` - Grant admin access by checking user roles in the database
