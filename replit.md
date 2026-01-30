# BF Fund Investor Dataroom

## Overview
The BF Fund Investor Dataroom is a 506(c) compliant GP/LP management suite designed to streamline investor relations and compliance. It offers secure document sharing, self-hosted e-signature capabilities, personalized investor portals, and integrated KYC/AML verification. The platform provides a robust, compliant, and user-friendly experience for fund managers and limited partners.

**Production Domain**: dataroom.bermudafranchisegroup.com
**Last Updated**: January 30, 2026
**Current Version**: v5-2c5865e3df468493

---

## Current Production Status

### Deployment Configuration
- **Deployment Target**: Autoscale (serverless)
- **Build Command**: `npm run build`
- **Run Command**: `npm start`
- **Framework**: Next.js 16.1.6 with Turbopack

### Production Environment
| Variable | Value |
|----------|-------|
| NEXTAUTH_URL | https://dataroom.bermudafranchisegroup.com |
| NEXT_PUBLIC_BASE_URL | https://dataroom.bermudafranchisegroup.com |
| NEXT_PUBLIC_MARKETING_URL | https://dataroom.bermudafranchisegroup.com |
| NEXT_PUBLIC_APP_BASE_HOST | dataroom.bermudafranchisegroup.com |
| NEXT_PUBLIC_UPLOAD_TRANSPORT | replit |

### Development Environment
| Variable | Value |
|----------|-------|
| NODE_ENV | development |
| NEXTAUTH_URL | Replit dev URL |
| PLAID_ENV | sandbox |

---

## Recent Changes (January 2026)

### January 30, 2026 - Critical Fixes

#### 1. Verify Page Fix (Next.js 16 Compatibility)
- **Issue**: `/verify` page returned 404 when signing in
- **Cause**: Next.js 16 changed `searchParams` to be a Promise in server components
- **Fix**: Updated `app/(auth)/verify/page.tsx` to properly `await searchParams`
- **File**: `app/(auth)/verify/page.tsx`

#### 2. Content Security Policy (CSP) Configuration
- **Issue**: CSP was blocking JavaScript evaluation in development
- **Cause**: NODE_ENV not set, defaulting to production CSP rules
- **Fix**: Set NODE_ENV=development for dev environment
- **File**: `lib/middleware/csp.ts`

#### 3. Cross-Origin Request Configuration
- **Issue**: Replit preview was blocked by cross-origin restrictions
- **Cause**: Next.js 16 `allowedDevOrigins` patterns too restrictive
- **Fix**: Updated `allowedDevOrigins` to `["*"]` for development
- **File**: `next.config.mjs`

#### 4. ConversationMessage Component Props Fix (Build Blocker)
- **Issue**: TypeScript compilation failed - `isVisitor` and `isAdmin` props do not exist on component interface
- **Cause**: Component interface expected `isAuthor` and `senderEmail` but page was passing incorrect props
- **Fix**: Updated props to match component interface:
  - Replaced `isVisitor` → `isAuthor` (determines if message was sent by admin user)
  - Replaced `isAdmin` → `senderEmail` (displays sender's email in message)
  - Added `isSelectable={true}` to enable FAQ message selection
- **File**: `app/datarooms/[id]/conversations/[conversationId]/page-client.tsx`

### January 29, 2026 - Route Conflict Resolution
- Fixed 500 errors on login pages caused by route conflicts between App Router and Pages Router
- Removed all legacy Pages Router page files for migrated routes
- Cleared `.next` cache and `node_modules/.cache` to resolve caching issues

### App Router Migration Complete
Migrated ~73 pages from Next.js Pages Router to App Router architecture:
- Dashboard, Hub, Offline, Branding pages
- Account pages (2)
- Admin pages (6): fund, security, users, login, dashboard, analytics
- Datarooms pages (23): full CRUD, documents, links, settings, visitors
- Documents pages (4): list, create, edit, view
- Settings pages (22): general, notifications, branding, billing, team, etc.
- Visitors pages (2): list, details
- Workflows pages (3): list, create, details
- E-signature pages (7): documents, signing, completion
- Public pages: dataroom viewer, unsubscribe

---

## Error Monitoring (Rollbar)

### Current Active Errors
Monitored via Rollbar API with READ token.

| Environment | Error | Count | Status |
|-------------|-------|-------|--------|
| production | React.Children.only expected single child | 9 | Will be fixed after deployment |
| production | useSession undefined | 4 | Will be fixed after deployment |
| development | isTrusted browser event | 2 | Non-critical |

### Rollbar Integration
- **Client Token**: NEXT_PUBLIC_ROLLBAR_CLIENT_TOKEN
- **Server Token**: ROLLBAR_SERVER_TOKEN
- **Read Token**: ROLLBAR_READ_TOKEN (for API queries)
- **Project**: FundRoom

---

## Core Features

### 506(c) Compliance
- Accreditation self-certification workflow
- Comprehensive audit logging to Tinybird
- KYC/AML verification hooks via Persona
- Investor qualification tracking

### Self-hosted E-Signature
- ESIGN/UETA compliant digital signatures
- Consent capture with timestamps
- Document checksums for integrity verification
- Completion certificates with verification URLs
- Multiple signature font styles

### LP Portal (Investor Portal)
- Personalized investor dashboards
- Role-based access control (GP/LP/Admin)
- Document viewing with watermarks
- Investment tracking and capital calls

### Admin Dashboards
- CRM timeline with investor interactions
- Capital tracking and commitment monitoring
- Compliance audit trails
- User management and team controls
- Fund analytics and reporting

### Payment Flows
- Plaid ACH transfers for capital calls
- Stripe billing for platform subscription
- KYC enforcement before transactions
- Transaction history and receipts

### PWA Support
- Progressive Web App with offline access
- Service worker with versioned caching (current: v5)
- Auto-updates with user notification
- Offline document viewing capability
- Install prompts for mobile/desktop

### Security (Four-Layer Encryption)
1. **TLS 1.3**: Transport layer encryption
2. **Client-Side AES-256-GCM**: Browser-level encryption
3. **Server-Side AES-256-GCM**: Application-level encryption
4. **PDF 2.0 AES-256**: Document-level encryption

---

## System Architecture

### Tech Stack
| Component | Technology | Version |
|-----------|------------|---------|
| Framework | Next.js | 16.1.6 |
| Runtime | React | 19.2.4 |
| Language | TypeScript | 5.x |
| Styling | Tailwind CSS | 3.x |
| Components | shadcn/ui | Latest |
| Database | PostgreSQL | 16 |
| ORM | Prisma | Latest |
| Auth | NextAuth.js | Latest |
| Node | Node.js | 22 |

### Directory Structure
```
/
├── app/                    # App Router pages
│   ├── (auth)/             # Auth route group (login, register, verify)
│   ├── (ee)/               # Enterprise features (workflows, AI)
│   ├── admin/              # Admin pages
│   ├── dashboard/          # Main dashboard
│   ├── datarooms/          # Dataroom management
│   ├── documents/          # Document management
│   ├── settings/           # Settings pages
│   ├── visitors/           # Visitor management
│   ├── workflows/          # Workflow management
│   ├── view/               # Public document viewer
│   └── sign/               # E-signature pages
├── components/             # React components
│   ├── ui/                 # shadcn/ui components
│   └── providers/          # Context providers
├── lib/                    # Utilities and helpers
│   ├── middleware/         # Middleware (CSP, auth)
│   └── utils/              # Helper functions
├── pages/                  # Pages Router (API routes only)
│   ├── api/                # API endpoints
│   ├── _app.tsx            # App wrapper (required)
│   ├── _document.tsx       # Document wrapper (required)
│   └── 404.tsx             # Custom 404 page
├── prisma/                 # Database schema
├── public/                 # Static assets
├── styles/                 # Global styles
└── scripts/                # Build scripts
```

### App Router Structure
```
app/
├── (auth)/                    # Auth route group
│   ├── login/                 # /login - investor login
│   ├── lp/login/              # /lp/login - LP-specific login
│   ├── welcome/               # /welcome - onboarding
│   ├── register/              # /register
│   └── verify/                # /verify - email verification
├── admin/                     # Admin pages
│   ├── login/                 # /admin/login
│   ├── dashboard/             # /admin/dashboard
│   ├── fund/                  # /admin/fund
│   ├── security/              # /admin/security
│   ├── users/                 # /admin/users
│   └── analytics/             # /admin/analytics
├── dashboard/                 # /dashboard - main dashboard
├── datarooms/                 # /datarooms - dataroom management
│   └── [id]/                  # Dynamic dataroom routes
├── documents/                 # /documents - document management
├── settings/                  # /settings - all settings pages
├── visitors/                  # /visitors - visitor management
├── workflows/                 # /workflows - workflow management
├── hub/                       # /hub - hub page
├── branding/                  # /branding - branding settings
└── public/dataroom/[id]/      # Public dataroom access
```

### Migration Pattern (Pages to App Router)
Server component handles:
- Metadata generation with `generateMetadata`
- Authentication via `getServerSession`
- Admin/team authorization checks via Prisma
- Data fetching for initial render

Client component handles:
- UI rendering with `"use client"` directive
- Navigation via `next/navigation` hooks
- Dynamic params via `useParams`/`useSearchParams`
- Interactive state management

---

## External Dependencies

| Service | Purpose | Environment Variables |
|---------|---------|----------------------|
| Resend | Transactional email | RESEND_API_KEY |
| Persona | KYC/AML verification | PERSONA_* |
| Plaid | Bank connectivity (ACH) | PLAID_* |
| Tinybird | Real-time analytics | TINYBIRD_TOKEN |
| Stripe | Platform billing | STRIPE_* |
| Rollbar | Error monitoring | ROLLBAR_* |
| PostHog | Product analytics | POSTHOG_* |
| Google OAuth | Admin authentication | GOOGLE_* |
| OpenAI | AI features (optional) | OPENAI_API_KEY |

### Storage Options
- **Replit Object Storage** (default for Replit deployment)
- AWS S3 (alternative)
- Cloudflare R2 (alternative)
- Local filesystem (development only)

---

## Development Commands

```bash
# Development
npm run dev              # Start dev server on port 5000
npm run dev:turbo        # Start with Turbopack (faster)

# Build & Production
npm run build            # Production build
npm start                # Start production server

# Database
npm run db:push          # Push schema changes to database
npm run db:push --force  # Force push schema (use carefully)
npm run db:studio        # Open Prisma Studio
npm run db:generate      # Generate Prisma client

# Utilities
npm run lint             # Run ESLint
npm run type-check       # Run TypeScript checks
```

---

## Environment Variables Reference

### Required Secrets (Configured in Replit)
| Secret | Purpose |
|--------|---------|
| DATABASE_URL | PostgreSQL connection string |
| NEXTAUTH_SECRET | NextAuth.js encryption secret |
| ROLLBAR_POST_SERVER_ITEM_ACCESS_TOKEN | Rollbar server logging |
| ROLLBAR_READ_TOKEN | Rollbar API read access |
| ROLLBAR_SERVER_TOKEN | Rollbar server token |
| NEXT_PUBLIC_ROLLBAR_CLIENT_TOKEN | Rollbar client logging |
| TINYBIRD_TOKEN | Tinybird analytics |
| PERSONA_WEBHOOK_SECRET | Persona webhook verification |

### Missing/Optional Secrets
| Secret | Purpose | Status |
|--------|---------|--------|
| PERSONA_ENVIRONMENT_ID | Persona environment | Not configured |
| PERSONA_TEMPLATE_ID | Persona verification template | Not configured |

---

## User Preferences
- Communication: Simple, everyday language
- Technical level: Non-technical explanations preferred
- Focus: Security and ease of use for investors

---

## Known Issues & Technical Debt

### Pending Deployment
The following fixes are in the codebase but require production deployment:
1. Verify page searchParams fix (Next.js 16 compatibility)
2. React.Children.only fix in Button component
3. CSP configuration updates
4. ConversationMessage component props fix (build blocker resolved)

### WebSocket HMR Warnings
- WebSocket connection warnings in Replit preview are normal
- Caused by Replit's proxy architecture
- Does not affect functionality

### Hydration Warnings
- Minor hydration mismatches may occur
- Usually caused by dynamic content (dates, random values)
- Non-blocking, cosmetic only

---

## Deployment Checklist

Before publishing to production:
- [ ] All recent fixes committed
- [ ] Development server tested
- [ ] Rollbar errors reviewed
- [ ] Environment variables verified
- [ ] Build command tested locally

After publishing:
- [ ] Test admin login flow
- [ ] Test investor login flow
- [ ] Verify email verification works
- [ ] Check Rollbar for new errors
- [ ] Confirm PWA updates propagate
