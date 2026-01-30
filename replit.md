# BF Fund Investor Dataroom

## Overview
The BF Fund Investor Dataroom is a 506(c) compliant GP/LP management suite designed to streamline investor relations and compliance. It offers secure document sharing, self-hosted e-signature capabilities, personalized investor portals, and integrated KYC/AML verification. The platform provides a robust, compliant, and user-friendly experience for fund managers and limited partners.

**Production Domain**: dataroom.bermudafranchisegroup.com

## Recent Changes (January 2026)

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

### Route Conflict Resolution (January 30, 2026)
Fixed 500 errors on login pages caused by route conflicts between App Router and Pages Router. Removed all legacy Pages Router page files for migrated routes.

**Current `pages/` directory contains only**:
- `_app.tsx` and `_document.tsx` (required for API routes)
- `404.tsx` (custom error page)
- API routes under `pages/api/`
- Demo preview pages

## User Preferences
- Communication: Simple, everyday language
- Technical level: Non-technical explanations preferred
- Focus: Security and ease of use for investors

## System Architecture

### Tech Stack
- **Framework**: Next.js 16.1.6 with App Router
- **Frontend**: React 19.2.4, TypeScript, Tailwind CSS, shadcn/ui
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js with database-backed sessions
- **Error Monitoring**: Rollbar

### Core Features
- **506(c) Compliance**: Accreditation self-certification, audit logs, and KYC/AML hooks
- **Self-hosted E-Signature**: ESIGN/UETA compliant with consent capture and checksums
- **LP Portal**: Personalized investor portals with role-based access
- **Admin Dashboards**: CRM timeline, capital tracking, and compliance audit
- **Payment Flows**: Plaid ACH transfers and Stripe billing with KYC enforcement
- **PWA Support**: Progressive Web App with offline document access and auto-updates
- **Security**: Four-layer encryption (TLS 1.3, Client-Side AES-256-GCM, Server-Side AES-256-GCM, PDF 2.0 AES-256)

### App Router Structure
```
app/
├── (auth)/                    # Auth route group
│   ├── login/                 # /login - investor login
│   ├── lp/login/              # /lp/login - LP-specific login
│   ├── welcome/               # /welcome - onboarding
│   ├── register/              # /register
│   └── verify/                # /verify
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

### Migration Pattern
Server component handles:
- Metadata generation
- Authentication via `getServerSession`
- Admin/team authorization checks via Prisma

Client component handles:
- UI rendering with `"use client"` directive
- Navigation via `next/navigation` hooks
- Dynamic params via `useParams`/`useSearchParams`

## External Dependencies
- **Resend**: Transactional email services
- **Persona**: KYC/AML verification
- **Plaid**: Bank connectivity for ACH transfers
- **Tinybird**: Real-time analytics and audit logging
- **Stripe**: Platform billing
- **Storage**: Replit Object Storage, AWS S3, Cloudflare R2, or local filesystem
- **Rollbar**: Real-time error monitoring
- **Google OAuth**: Admin authentication
- **OpenAI**: Optional AI features

## Development Commands
```bash
npm run dev          # Start development server on port 5000
npm run build        # Production build
npm run db:push      # Push schema changes to database
npm run db:studio    # Open Prisma Studio
```

## Environment Variables
Required secrets (configured in Replit):
- `DATABASE_URL` - PostgreSQL connection string
- `NEXTAUTH_SECRET` - NextAuth.js secret
- `NEXTAUTH_URL` - Application URL
- `ROLLBAR_*` - Error monitoring tokens
- `TINYBIRD_TOKEN` - Analytics token
- `PERSONA_*` - KYC/AML configuration
