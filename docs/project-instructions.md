# BF Fund Investor Dataroom - Project Instructions

## Project Overview

This is the BF Fund Investor Dataroom, a secure dataroom and LP portal for General Partners (GPs) managing private investments under 506(c) rules. It provides tech-driven capital raises, transactions, and reporting.

The "uniquefundroom" (per-LP dashboard + storage) is a personalized, secure space post-account, including fund data, signed docs, notes, and hooks for automations like Plaid payments and Persona KYC.

The platform is flexible for multi-fund/startup use: Toggle entity modes (`FUND` for units/tiers/calls vs. `STARTUP` for shares/price per share/vesting like Carta). Focus on linear flows (dataroom → "Sign Me Up" → account → NDA gate → dashboard unlock → subscriptions).

## Core Principles

### UX-First
- Mobile-responsive (Tailwind/shadcn/ui)
- Minimal clicks, clear CTAs (e.g., big "Sign Me Up" button)
- Use guided wizards for onboarding (e.g., step-by-step NDA + accreditation)

### Ease/Simple Steps
- Break everything into linear flows (e.g., dataroom → button → account create → NDA gate → dashboard unlock)

### Build on Existing
- Leverage Next.js routes, Prisma models (e.g., extend User/Team for Investor)
- Self-hosted e-sign (custom React drag-drop)
- Resend emails, webhooks, and Stripe integrations
- No external APIs like OpenSign—keep it internal

### 506(c) Compliance
- Embed accreditation self-ack
- Audit logs (IP/timestamps/user agent via Prisma)
- Hooks for KYC/AML (e.g., Persona API post-NDA)

### Tech Stack Reuse
- Next.js (routes/UI)
- TypeScript
- Prisma/PostgreSQL (new models for LP data)
- NextAuth (enhanced for LP logins)
- Tinybird (analytics, configure TINYBIRD_TOKEN later)
- Stripe (payments)
- Blob storage (S3/Vercel)

### Testing/Deployment
- Use Replit for prototyping (Agent-assisted)
- Vercel for prod
- Jest for E2E tests

## Repo Status

### Core
BF Fund Dataroom platform with secure sharing, analytics, branding, and self-hosting capabilities. Includes LP portals, dataroom access, investor tracking, and e-sign flows.

### Directory Structure

```
pages/                    # Next.js Pages Router (main app, API routes)
  api/admin/              # GP dashboard endpoints (export, reports, bulk-action)
  api/lp/                 # LP portal endpoints (bank, notes, transactions, wizard)
  api/transactions/       # Plaid transfer processing with KYC/AML enforcement
  api/webhooks/           # Plaid/Persona webhook handlers
  api/sign/               # E-signature endpoints (sign, verify)
app/                      # Next.js App Router (auth, admin sections)
components/               # React components (UI, LP, signatures)
lib/                      # Shared utilities (auth, audit, Prisma)
prisma/schema/            # Multi-file Prisma schema
docs/                     # Platform documentation
__tests__/                # Jest E2E tests (1599+ passing)
public/                   # Fund assets, PWA files
.github/workflows/        # CI/CD
ee/                       # Enterprise tweaks
middleware.ts             # Auth/webhooks
```

### Key Models (Prisma)
- `User` - Extended with role enum ('LP'/'GP')
- `Team` - Organization/fund entity
- `Document` - Secure document storage
- `Link` - Shareable document links
- `Visit` - Access tracking
- `Signature` - E-signature records
- `Investor` - LP-specific data (fundId, signedDocs)
- `Subscription` - Investment amounts, status
- `Transaction` - In/out transfers, audits
- `Share` - Startup mode: pricePerShare, vesting
- `Entity` - Mode 'FUND'/'STARTUP', configs like thresholds/fees/pricing tiers

### Integrations
- Plaid (banking, ACH transfers)
- Persona (KYC/AML)
- Resend (emails)
- Tinybird (analytics)
- Stripe (platform billing)
- Replit Object Storage (documents)
- Rollbar (error monitoring)

### Recent Commits Focus
- LP-focused (Plaid/transfers, bank linking)
- Admin mirroring (aggregates, roles)
- Docs polish (Git workflows, Plaid details)

### Gaps Filled
- Role enums ('LP'/'GP')
- Middleware for isolation (LPs see own + fund data)
- Admin dashboards mirroring LP

## Platform Architecture

The architecture is a modular Next.js app for secure, compliant portals. Data portability via `/api/export` (JSON/CSV + ZIP blobs) for migrations (e.g., to AWS).

### Frontend
- Next.js pages/routes (e.g., `/dataroom`, `/lp/dashboard`, `/admin/fund/[id]`)
- Components: shadcn/ui modals/wizards (e-sign drag-drop, subscription push)
- Styling: Tailwind (mobile-responsive CTAs)

### Backend
- API routes (`/api/subscriptions`, `/api/transactions`)
- Middleware: NextAuth (roles/gating), webhooks (Plaid updates Prisma, Resend notifications)

### Data Layer
- Prisma/PostgreSQL
- Key Models: Entity (mode 'FUND'/'STARTUP', configs like thresholds/fees/pricing tiers), Investor (fundId, signedDocs), Subscription (amount, status), Transaction (in/out, audits), Share (startup: pricePerShare, vesting)
- Relations: Multi-entity (1:M Investor/Subscription)
- Analytics: Tinybird

### Integrations
- Plaid (transfers)
- Stripe (hybrid)
- Persona (KYC)
- Resend (emails)
- Blob storage (S3-compatible)
- Hooks: Wolters Kluwer (K1), QuickBooks (expenses)

### Deployment
- Replit proto (`npm run dev`)
- Vercel prod (`.github/workflows` CI/CD)
- Testing: Jest E2E

### Security/Compliance
- Audit JSON (IP/timestamps)
- Role-based isolation (LPs see personal data only)
- Self-ack/KYC wizards

## Troubleshooting & Fixes

### LP Login Issues (NextAuth Role Callbacks)

LP login failures can stem from incomplete role-based authentication in NextAuth. The auth config needs proper callbacks to inject roles ('LP'/'GP') into sessions.

#### Root Causes
1. Sessions don't persist role data
2. Middleware can't determine user role for gating
3. Prisma User model role extensions incomplete

#### Solution: Implement RBAC via Auth.js Callbacks

**Step 1: Ensure Prisma User Model Has Role**

```prisma
model User {
  id    String  @id @default(cuid())
  email String  @unique
  role  String  @default("LP")  // 'LP' or 'GP'
  // ... other fields
}
```

**Step 2: Configure NextAuth Callbacks**

In `lib/auth/auth-options.ts`:

```typescript
export const authOptions: NextAuthOptions = {
  // ... providers, adapter, etc.
  
  callbacks: {
    async jwt({ token, user }) {
      // On initial sign-in, add role from database user
      if (user) {
        token.role = user.role || 'LP';
        token.userId = user.id;
      }
      return token;
    },
    
    async session({ session, token }) {
      // Inject role into session for client-side access
      if (session.user) {
        session.user.role = token.role as string;
        session.user.id = token.userId as string;
      }
      return session;
    },
  },
};
```

**Step 3: Type Extensions**

In `types/next-auth.d.ts`:

```typescript
import { DefaultSession, DefaultUser } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
    } & DefaultSession["user"];
  }
  
  interface User extends DefaultUser {
    role: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: string;
    userId: string;
  }
}
```

**Step 4: Middleware Role Gating**

In `lib/middleware/app.ts`:

```typescript
// Check role for protected routes
const token = await getToken({ req });
const userRole = token?.role || 'LP';

// LP routes - allow both LP and GP
if (path.startsWith('/lp/')) {
  // Both roles can access LP routes
}

// GP/Admin routes - block LP users
if (path.startsWith('/admin/') || path.startsWith('/settings/')) {
  if (userRole === 'LP') {
    return NextResponse.redirect(new URL('/viewer-portal', req.url));
  }
}
```

**Step 5: LP Registration Sets Role**

In `/api/lp/register.ts`:

```typescript
// Explicitly set role on LP user creation
const user = await prisma.user.upsert({
  where: { email },
  update: { role: 'LP' },
  create: {
    email,
    role: 'LP',
    // ... other fields
  },
});
```

#### Verification Checklist
- [ ] User model has `role` field with default 'LP'
- [ ] JWT callback adds role to token
- [ ] Session callback exposes role to client
- [ ] TypeScript declarations extend Session/User types
- [ ] Middleware checks `token.role` for route protection
- [ ] LP registration API sets `role: 'LP'` explicitly

### LP Route Protection

All `/lp/*` routes redirect unauthenticated users to `/lp/login` (not main login):

```typescript
// In middleware
if (path.startsWith('/lp/') && !['lp/login', 'lp/onboard'].includes(pathWithoutLeadingSlash)) {
  if (!token) {
    const loginUrl = new URL('/lp/login', req.url);
    loginUrl.searchParams.set('next', path);
    return NextResponse.redirect(loginUrl);
  }
}
```

## Phase Status

| Phase | Status | Description |
|-------|--------|-------------|
| Phase 1 (MVP) | 100% | Core onboarding, NDA gate, accreditation, fundroom, e-signature, dual thresholds, Form D reminders, LP statements, waterfall visualization |
| Phase 2 | 85% | Plaid transfers, AUM reporting, entity fee configs, wizard progress tracking, audit dashboard, PWA support, auto-update cache, Rollbar error monitoring |
| Phase 3 | Planned | STARTUP mode (cap table), vesting schedules, equity management, QuickBooks/Wolters Kluwer integrations |

## Phase 3 Roadmap (Planned)

### STARTUP Mode Features
- Cap table management (like Carta)
- Share issuance and tracking
- Vesting schedules with cliff/acceleration
- 409A valuation support
- Equity grant documentation

### Integration Hooks
- QuickBooks: Expense sync, K-1 data
- Wolters Kluwer: Tax document automation
- External cap table import/export

### Entity Mode Toggle
The `Entity.mode` field switches between:
- `FUND`: Units, tiers, capital calls, distributions
- `STARTUP`: Shares, price per share, vesting, equity grants

## Documentation Reference

| Document | Path | Description |
|----------|------|-------------|
| API Documentation | `docs/API_DOCUMENTATION.md` | Comprehensive API reference |
| Test Report | `docs/test-report.md` | E2E test coverage |
| ESIGN Compliance | `docs/ESIGN_COMPLIANCE.md` | Electronic signature compliance |
| Persona Sanctions | `docs/PERSONA_SANCTIONS_SCREENING.md` | KYC/AML integration |
| Phase 3 Roadmap | `docs/PHASE3_ROADMAP.md` | Integration roadmap |
| Main Documentation | `DOCUMENTATION.md` | Complete platform docs |
