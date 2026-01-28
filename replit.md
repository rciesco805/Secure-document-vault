# BF Fund Investor Dataroom

## Overview

The BF Fund Investor Dataroom is a 506(c) compliant GP/LP management suite designed to streamline investor relations and compliance. It offers secure document sharing, self-hosted e-signature capabilities, personalized investor portals, and integrated KYC/AML verification. The platform aims to provide a robust, compliant, and user-friendly experience for both fund managers and limited partners, encompassing investor onboarding, accreditation verification, secure document vaults, and comprehensive compliance audit trails.

## User Preferences

- Communication: Simple, everyday language
- Technical level: Non-technical explanations preferred
- Focus: Security and ease of use for investors

## System Architecture

The platform is built on Next.js 14, utilizing a hybrid Pages and App Router architecture with TypeScript. Styling is managed with Tailwind CSS and shadcn/ui, prioritizing a UX-first approach with mobile-responsiveness, minimal clicks, clear CTAs, and guided wizards. PostgreSQL with Prisma ORM serves as the database, and NextAuth.js handles authentication with database-backed sessions.

Key features include:
- **506(c) Compliance**: Accreditation self-certification, comprehensive audit logs, integrated KYC/AML hooks, single-email-per-signin protection, and cross-log access verification.
- **Self-hosted E-Signature**: Custom React drag-and-drop field placement for legally compliant electronic signatures (ESIGN/UETA) with consent capture and SHA-256 checksum verification.
- **LP Portal**: Secure, personalized investor portals with role-based access control, real-time dashboard updates, and quick action CTAs for investment-related tasks.
- **Admin Dashboards**: Unified admin access with a hub navigation, CRM timeline for investor activity, capital tracking, and a compliance audit dashboard with event filtering and export functionalities.
- **Payment & Transaction Flows**: Integration with Plaid for ACH transfers (capital calls, distributions) and Stripe for platform subscription billing, with transactions enforced by KYC/AML verification.
- **PWA Support**: Progressive Web App features including a service worker, manifest, offline page, and an auto-update cache system ensuring users always access the latest version without manual cache clearing.
- **Error Monitoring**: Comprehensive error tracking across both App Router and Pages Router using Rollbar, including client-side and server-side error boundaries.

The core flow for investors involves: Dataroom access (optional NDA), account creation, NDA signature (if enabled), accreditation self-certification, Persona KYC/AML verification, and finally, Fundroom dashboard access and subscription/investment.

## Authentication System

### Unified Login Portal
Both admins (GP) and investors (LP) use the same login page (`/login`). The system routes users based on their role after authentication:

| User Role | Destination | Condition |
|-----------|-------------|-----------|
| GP (Admin) | `/hub` | Has team membership |
| LP (Investor) | `/lp/dashboard` | Has investor profile |
| Viewer | `/view/{linkId}` | Has viewer/group access |
| New User | `/viewer-portal` | No specific access found |

### Magic Link Flows

**Admin Magic Links** (server-side verification):
1. Created via `lib/auth/admin-magic-link.ts`
2. Link format: `/api/auth/admin-magic-verify?token=...&email=...`
3. Server verifies token → creates database session → sets cookie → redirects to dashboard

**Visitor Magic Links** (client-side verification):
1. Created via `lib/auth/create-visitor-magic-link.ts`
2. Link format: `/view/{linkId}?token=...&email=...`
3. Page loads → client calls `/api/view/verify-magic-link` → sets cookies → grants access

### Database Sessions
- Using `@auth/prisma-adapter` for database-backed sessions
- Sessions stored in `Session` table with `sessionToken` and `userId`
- Enables instant role revocation without requiring re-login
- Session cookie: `next-auth.session-token` (or `__Secure-next-auth.session-token` for HTTPS)

### Role-Based Routing (`/viewer-redirect`)
After login, users are automatically routed based on:
1. **User role** (GP/LP) from database
2. **Team membership** (UserTeam table)
3. **Investor profile** (Investor table)
4. **Viewer access** (Viewer/ViewerGroup tables)

Admins can test visitor experience by appending `?mode=visitor` to bypass admin routing.

## Database Audit Protection

### onDelete: Restrict Constraints (SEC Compliance)
The following foreign keys use `RESTRICT` to prevent deletion of audit records:

| Table | Foreign Key | Protects |
|-------|-------------|----------|
| `View` | `linkId`, `documentId`, `dataroomId`, `viewerId` | Access audit trail |
| `Transaction` | `investorId` | Financial transaction history |
| `SignatureRecipient` | `documentId` | Signature audit trail |
| `SignatureField` | `documentId`, `recipientId` | Field-level signature data |

**Effect**: Cannot delete Links, Documents, Datarooms, Viewers, Investors, or SignatureDocuments if audit records exist. Must explicitly archive/handle audit records first.

### Cross-Log Access Verification
Access verification covers all 4 paths:
1. `ViewerInvitations` - Direct email invitations
2. `ViewerGroup` → `links` - Group-based link access
3. `Viewer.dataroom` - Direct dataroom assignment
4. `ViewerGroup` → `dataroom` - Group-based dataroom access

## External Dependencies

- **Resend**: Transactional email services for notifications and magic links.
- **Persona**: KYC/AML verification, integrated via an iframe. Requires: `PERSONA_TEMPLATE_ID`, `PERSONA_ENVIRONMENT_ID`, `PERSONA_WEBHOOK_SECRET`
- **Plaid**: Bank connectivity for ACH capital calls and distributions.
- **Tinybird**: Real-time analytics and audit logging.
- **Stripe**: Platform billing and subscription management.
- **Replit Object Storage**: Primary storage solution for documents and files, supporting S3-compatible and TUS resumable uploads.
- **Rollbar**: Real-time error monitoring and tracking for client and server errors.
- **Google OAuth**: Authentication for admin users.
- **OpenAI**: Optional AI features.

## Key Files

### Authentication
- `lib/auth/auth-options.ts` - NextAuth configuration with database sessions
- `lib/auth/admin-magic-link.ts` - Admin magic link creation/verification
- `lib/auth/create-visitor-magic-link.ts` - Visitor magic link creation
- `pages/api/auth/admin-magic-verify.ts` - Admin magic link verification endpoint
- `pages/api/view/verify-magic-link.ts` - Visitor magic link verification endpoint
- `pages/viewer-redirect.tsx` - Role-based post-login routing

### Database Schema
- `prisma/schema/schema.prisma` - Core models
- `prisma/schema/investor.prisma` - Investor/LP models
- `prisma/schema/signature.prisma` - E-signature models

### Access Control
- `lib/access/cross-log-verification.ts` - Cross-log access verification
- `lib/middleware/app.ts` - Route protection middleware

## Recent Changes (January 2026)

- **Database Sessions**: Migrated from JWT to database sessions using `@auth/prisma-adapter`
- **Audit Protection**: Added `onDelete: Restrict` constraints for SEC compliance
- **Magic Link Fix**: Fixed visitor magic link verification to properly call backend API
- **Role-Based Routing**: Improved `/viewer-redirect` to use user role as primary routing indicator
- **Redirect Loop Fix**: Fixed infinite redirect loops on login pages
- **E-Signature UI Enhancements**: Added customizable signature pad with:
  - Customizable pen color and thickness
  - Draw or Type modes with font selection
  - SVG export option for signatures
  - Theme support via React context
  - Undo functionality for drawn signatures

### E-Signature Theme System
New files for signature customization:
- `lib/signature/theme/types.ts` - Theme types and presets
- `lib/signature/theme/context.tsx` - React context for theme provider
- `components/signature/enhanced-signature-pad.tsx` - Enhanced signature component with customization

### Signer Portal Integration
The enhanced signature pad is now integrated into `/view/sign/[token]`:
- Uses EnhancedSignaturePad with SignatureThemeProvider wrapper
- Supports pen customization (color, thickness)
- 5 cursive font options for typed signatures
- Undo functionality for drawn signatures
- Data flows directly to existing submission handler

### Security Best Practices for Fund Documents
New security infrastructure in `lib/signature/security/`:
- `plugin-executor.ts` - Server-side only plugin execution (no client-side code)
- `config-validator.ts` - JSON schema validation (Zod) for all plugin configs
- `audit-logger.ts` - Comprehensive audit logging to SignatureAuditLog
- `sandbox.ts` - Sandboxed custom validators with timeout protection
- `index.ts` - Consolidated exports and documentation

**Security Features:**
1. **No client-side plugin execution** - All plugins run server-side only during signer flow
2. **Config validation** - All plugin configs validated against JSON schema before save
3. **Audit all plugin actions** - Every action logged to SignatureAuditLog
4. **Timeout protection** - Validators run with timeout (1000ms) and ReDoS pattern blocking
5. **PKI ready** - Architecture prepared for Certificate Authority integration (future enhancement)

## Middleware Route Protection

The middleware (`lib/middleware/app.ts`) protects routes as follows:

| Route Pattern | Protection | Unauthenticated Redirect |
|---------------|------------|--------------------------|
| `/lp/onboard`, `/lp/login` | Public | None |
| `/view/*` | Public (own access control) | None |
| `/lp/*` | Requires LP or GP role | `/lp/login` |
| `/dashboard`, `/settings`, `/documents`, `/datarooms`, `/admin/*` (except `/admin/login`) | Requires GP role | `/admin/login` |
| `/login`, `/admin/login`, `/lp/login` | Public login pages | None |
| `/viewer-portal` | Authenticated users | `/login` |

**Important**: 
- Login pages (`/login`, `/admin/login`, `/lp/login`) are explicitly excluded from route protection to prevent redirect loops.
- View pages (`/view/*`) are public to allow magic link verification - they have their own access control via visitor tokens.
