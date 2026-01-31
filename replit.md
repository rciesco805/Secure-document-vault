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

---

## Authentication System

### Providers
- NextAuth.js with magic links (email), Google OAuth, LinkedIn OAuth

### Session Strategy
- Database sessions (30-day max age, 24-hour refresh)
- Sessions stored in PostgreSQL via Prisma adapter

### Magic Link Flow
1. User enters email on login page
2. System sends magic link email via Resend
3. Two-step verification at `/verify` prevents email scanners from consuming tokens
4. Callback URLs stored server-side in `MagicLinkCallback` table
5. Users must manually click "Sign In to Portal" button to consume the link
6. Token correlation ensures exact match of the original NextAuth token

### Admin Verification
- Checks static admin list in `lib/constants/admins.ts`
- Also checks database `UserTeam` roles (OWNER, ADMIN, SUPER_ADMIN)

---

## Portal-Based Access Control (Updated January 2026)

### Overview
The platform enforces strict separation between admin and visitor (investor) portals. Users must authenticate through the correct portal to access its features - there is no path to cross from one portal to another without re-authenticating.

### Database Schema Changes
**New fields in `prisma/schema.prisma`:**
```prisma
model Session {
  id           String      @id @default(cuid())
  sessionToken String      @unique
  userId       String
  expires      DateTime
  loginPortal  LoginPortal @default(VISITOR)
  user         User        @relation(fields: [userId], references: [id], onDelete: Cascade)
}

enum LoginPortal {
  ADMIN
  VISITOR
}
```

### How Portal Detection Works
**File: `pages/api/auth/[...nextauth].ts`**

1. Portal intent is detected from the `callbackUrl` in query params or cookies
2. Admin portal requests are identified by URLs containing: `/dashboard`, `/admin`, `/datarooms`, `/documents`, `/settings`
3. The `isAdminPortalRequest` flag is set based on this detection

```typescript
const isAdminPortalRequest = callbackUrl.includes("/dashboard") || 
                             callbackUrl.includes("/admin") ||
                             callbackUrl.includes("/datarooms") ||
                             callbackUrl.includes("/documents") ||
                             callbackUrl.includes("/settings");
```

### SignIn Callback Enforcement
**File: `pages/api/auth/[...nextauth].ts`**

The `signIn` callback enforces portal-specific access:

1. **Admin Portal Requests**: If a non-admin tries to login through admin portal, they get redirected to `/admin/login?error=AccessDenied`
2. **Visitor Portal Requests**: Users must have viewer access (direct viewer record, group membership, or link allowList) OR be an admin

### Session Portal Tracking
**File: `pages/api/auth/[...nextauth].ts` - signIn event**

When a user signs in, their session is stamped with the portal type:

1. System attempts to update session by session token from cookies
2. If token not available yet (new session), uses delayed update to newest session
3. The `loginPortal` field is set to `ADMIN` or `VISITOR`

### Admin Page Guards
**File: `lib/auth/admin-guard.ts`**

The `requireAdminPortalAccess()` function enforces strict admin access:

```typescript
export async function requireAdminPortalAccess(): Promise<AdminPortalGuardResult> {
  // 1. Check for valid session
  const session = await getServerSession(authOptions);
  if (!session) redirect("/admin/login");

  // 2. Get session token from cookies and lookup specific session
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("next-auth.session-token")?.value;
  
  // 3. Lookup loginPortal from the specific session record
  const dbSession = await prisma.session.findUnique({
    where: { sessionToken },
  });
  const loginPortal = dbSession?.loginPortal || "VISITOR";

  // 4. Check user has admin UserTeam membership
  const userTeam = await prisma.userTeam.findFirst({
    where: {
      userId: user.id,
      role: { in: ["OWNER", "ADMIN", "SUPER_ADMIN"] },
      status: "ACTIVE",
    },
  });
  if (!userTeam) redirect("/viewer-portal");

  // 5. Check session was created via admin portal
  if (loginPortal !== "ADMIN") {
    redirect("/viewer-portal?error=wrong_portal");
  }

  return { session, user, userTeam, loginPortal };
}
```

### Protected Admin Pages
The following pages use `requireAdminPortalAccess()`:
- `app/dashboard/page.tsx` - Main admin dashboard
- `app/admin/fund/page.tsx` - Fund management dashboard

### Login Routes
| Route | Portal | Callback URL Default |
|-------|--------|---------------------|
| `/login` | Visitor | `/viewer-redirect?mode=visitor` |
| `/lp/login` | Visitor | `/lp/dashboard` |
| `/admin/login` | Admin | `/dashboard` |

### Security Guarantees
1. **Per-Session Tracking**: Each session token has its own `loginPortal` value - multiple sessions for the same user can have different portal types
2. **No Cross-Portal Access**: A visitor-portal session cannot access admin pages even if the user has admin privileges
3. **Cookie-Based Lookup**: Admin guards read the session token directly from cookies and lookup that specific session record
4. **Defense in Depth**: Both signIn callback AND page guards enforce portal separation

---

## Role System

### User.role (Global)
- `GP` (General Partner) - Fund managers and administrators
- `LP` (Limited Partner) - Investors

### UserTeam.role (Team-specific)
- `OWNER` - Full control over team
- `SUPER_ADMIN` - Nearly full control
- `ADMIN` - Administrative access

---

## Key Files Modified (January 2026)

### Authentication Core
| File | Purpose |
|------|---------|
| `pages/api/auth/[...nextauth].ts` | NextAuth handler with portal detection, signIn callback enforcement, and session portal stamping |
| `lib/auth/auth-options.ts` | Base NextAuth options with session callback to include loginPortal |
| `lib/auth/admin-guard.ts` | Admin page guard with `requireAdminPortalAccess()` function |

### Database Schema
| File | Changes |
|------|---------|
| `prisma/schema.prisma` | Added `loginPortal` field to Session model, added `LoginPortal` enum |

### Admin Pages
| File | Changes |
|------|---------|
| `app/dashboard/page.tsx` | Now uses `requireAdminPortalAccess()` guard |
| `app/admin/fund/page.tsx` | Now uses `requireAdminPortalAccess()` guard |

### Login Pages
| File | Purpose |
|------|---------|
| `app/admin/login/page-client.tsx` | Admin-only login with pre-check for admin role |
| `app/(auth)/login/page-client.tsx` | Visitor/investor login with callbackUrl `/viewer-redirect?mode=visitor` |
| `app/(auth)/lp/login/page-client.tsx` | LP-specific login with callbackUrl `/lp/dashboard` |

---

## External Dependencies

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

---

## Recent Changes Log

### January 31, 2026 - Portal-Based Access Control Implementation
- Added `loginPortal` field to Session model in Prisma schema
- Added `LoginPortal` enum with values `ADMIN` and `VISITOR`
- Updated `pages/api/auth/[...nextauth].ts` with portal detection from callbackUrl
- Updated signIn callback to enforce admin role check for admin portal requests
- Added signIn event to stamp sessions with portal type
- Created `requireAdminPortalAccess()` guard in `lib/auth/admin-guard.ts`
- Updated dashboard and fund management pages to use new guard
- Per-session portal tracking prevents cross-portal access even for admins with multiple sessions
