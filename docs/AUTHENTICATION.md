# BF Fund Dataroom - Authentication System

**Last Updated:** January 30, 2026  
**Production Domain:** dataroom.bermudafranchisegroup.com

---

## Overview

The BF Fund Dataroom uses NextAuth.js v4/v5 with PrismaAdapter for database-backed authentication. The system supports two distinct user types:

1. **GP/Admin (General Partner)** - Fund managers with full administrative access
2. **LP/Viewer (Limited Partner)** - Investors with controlled access to specific datarooms

**Key Principle:** There is no traditional email/password authentication. All users authenticate via OAuth or magic links.

---

## Authentication Providers

| Provider | Description | Configuration |
|----------|-------------|---------------|
| **Google OAuth** | Primary OAuth provider | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` |
| **LinkedIn OAuth** | Secondary OAuth provider | `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET` |
| **Email (Magic Link)** | Passwordless email authentication | Sent via Resend API, 20-minute expiry |
| **Passkey (Optional)** | Hanko integration for WebAuthn | `HANKO_API_KEY`, conditional registration |

All OAuth providers use `allowDangerousEmailAccountLinking: true` to allow account linking by email.

---

## Core Configuration Files

| File | Purpose |
|------|---------|
| `pages/api/auth/[...nextauth].ts` | Main auth handler, signIn callback, rate limiting |
| `lib/auth/auth-options.ts` | Providers, adapter, session config, callbacks |
| `lib/constants/admins.ts` | Admin email checks, database lookups |
| `lib/auth/admin-magic-link.ts` | Admin-specific magic link generation |

---

## Session Strategy

```typescript
session: { 
  strategy: "database",    // Sessions stored in Prisma Session table
  maxAge: 30 * 24 * 60 * 60, // 30 days
  updateAge: 24 * 60 * 60,   // Refresh every 24 hours
}
```

**Cookies:**
- `httpOnly: true` - JavaScript cannot access
- `secure: true` - HTTPS only
- `sameSite: "none"` - Cross-site friendly (required for iframe embedding)

---

## User Roles

| Role | Access Level | Description |
|------|-------------|-------------|
| `OWNER` | Full access | Team owner with all permissions |
| `SUPER_ADMIN` | Administrative | Platform-wide admin capabilities |
| `ADMIN` | Team admin | Standard team administrative access |
| `LP` | Limited Partner | Investor access to assigned datarooms |

Roles are fetched fresh from the database on every session access to prevent stale data.

---

## GP/Admin Login Flow

### Step 1: Authentication Initiation
User lands on login page with options for:
- Google OAuth
- LinkedIn OAuth  
- Email magic link form

### Step 2: signIn Callback Execution
The `signIn` callback in `pages/api/auth/[...nextauth].ts` is the **primary security layer**:

```
1. Blacklist Check
   └── isBlacklistedEmail(email) from edge config
   
2. Admin Check (Two-Phase)
   ├── Phase 1: Static list check via isAdminEmail()
   │   └── Checks DEFAULT_ADMIN_EMAIL (investors@bermudafranchisegroup.com)
   └── Phase 2: Database lookup
       └── Query UserTeam for OWNER, ADMIN, SUPER_ADMIN roles with ACTIVE status
   
3. If Admin → Immediate Allow (bypasses viewer checks)
   
4. Rate Limiting
   └── IP-based via Redis (graceful skip if unavailable)
```

### Step 3: Post-Authentication
- Analytics tracking ("User Signed In")
- Dub lead tracking for new users
- Session creation with fresh role from database
- Redirect to `/viewer-redirect` or admin-specific path

### Step 4: Admin Route Access
Protected admin routes (`/admin/*`, GP dashboard) use:
```typescript
const session = await getServerSession(req, res, authOptions);
const user = session.user as CustomUser;
if (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN" && user.role !== "OWNER") {
  return res.status(403).json({ error: "Unauthorized" });
}
```

---

## LP/Visitor Login Flow

### Step 1: Authentication Initiation
Same login page as admins (shared auth infrastructure).

### Step 2: signIn Callback Execution (Non-Admin Branch)

```
1. Blacklist Check
   └── Same as admin flow
   
2. Admin Check
   └── Returns false → continues to viewer checks
   
3. Authorization Checks (THREE methods, any one grants access):
   
   ├── Method A: Direct Viewer Record
   │   └── prisma.viewer.findFirst({
   │         email: emailLower (case-insensitive),
   │         accessRevokedAt: null  // Not revoked
   │       })
   │
   ├── Method B: Viewer Group Membership
   │   └── prisma.viewer.findFirst({
   │         email: emailLower,
   │         groups: { some: {} }  // Member of any group
   │       })
   │
   └── Method C: Link AllowList
       └── prisma.link.findFirst({
             allowList: { has: emailLower },
             deletedAt: null,
             isArchived: false
           })

4. If ALL checks fail → Reject with detailed logging:
   - Viewer records count
   - Active links count
   - Analytics tracking
   - Error logging

5. If ANY check passes → Allow access
```

### Step 3: Viewer-Redirect Logic
After successful authentication, `/viewer-redirect` routes users to:
- Specific dataroom (via Viewer association)
- LP portal (`/lp/`)
- Pending onboarding (if incomplete)

### Step 4: Post-Login Onboarding (For New LPs)
This is a **distinct flow** from authentication:

```
1. NDA Signature Gate
   └── Self-hosted e-signature for investor agreements
   
2. Accreditation Wizard
   ├── Self-certification option
   └── Persona KYC/AML verification iframe
   
3. Subscription Flow
   └── Investment commitment and payment setup
```

---

## Database Models

### Viewer Model
```prisma
model Viewer {
  id                  String    @id @default(cuid())
  email               String
  verified            Boolean   @default(false)
  invitedAt           DateTime?
  
  // SEC Compliance: Soft-delete for access revocation
  accessRevokedAt     DateTime?
  accessRevokedBy     String?
  accessRevokedReason String?
  
  dataroomId          String?
  teamId              String
  
  groups              ViewerGroupMembership[]
  views               View[]
  
  @@unique([teamId, email])
}
```

### Link Model (Relevant Fields)
```prisma
model Link {
  id                 String    @id @default(cuid())
  documentId         String?
  dataroomId         String?
  
  allowList          String[]  // Emails/domains allowed to view
  denyList           String[]  // Emails/domains denied
  emailProtected     Boolean   @default(true)
  emailAuthenticated Boolean   @default(false)
  
  expiresAt          DateTime?
  password           String?
  isArchived         Boolean   @default(false)
  deletedAt          DateTime?
  
  groupId            String?
  group              ViewerGroup?
}
```

---

## Security Features

### Rate Limiting
```typescript
// IP-based rate limiting via Redis
const rateLimitResult = await checkRateLimit(rateLimiters.auth, clientIP);
if (!rateLimitResult.success) {
  // Reject request
}
```

### Audit Logging
All authentication events are logged with:
- IP address
- User agent
- Geolocation (when available)
- Timestamp
- Event type

### Access Revocation
Viewers can be soft-deleted for SEC compliance:
```typescript
// Revoke access (preserves audit trail)
await prisma.viewer.update({
  where: { id: viewerId },
  data: {
    accessRevokedAt: new Date(),
    accessRevokedBy: adminUserId,
    accessRevokedReason: "Compliance requirement",
  },
});
```

---

## Admin Email Determination

The system uses a **dynamic database lookup** with fallback:

```typescript
// lib/constants/admins.ts

// Static fallback
export const DEFAULT_ADMIN_EMAIL = 
  process.env.DEFAULT_ADMIN_EMAIL || "investors@bermudafranchisegroup.com";

// Sync check (static list only)
export function isAdminEmail(email: string): boolean {
  return ADMIN_EMAILS.includes(email.toLowerCase().trim());
}

// Async check (database + static list)
export async function isUserAdminAsync(email: string): Promise<boolean> {
  // 1. Check static list
  if (isAdminEmail(email)) return true;
  
  // 2. Query database for admin roles
  const adminTeam = await prisma.userTeam.findFirst({
    where: {
      user: { email: { equals: email, mode: "insensitive" } },
      role: { in: ["OWNER", "ADMIN", "SUPER_ADMIN"] },
      status: "ACTIVE",
    },
  });
  return !!adminTeam;
}
```

---

## Edge Cases

| Case | Handling |
|------|----------|
| Viewer access revoked | `accessRevokedAt` not null → reject login |
| Link archived/deleted | `isArchived` or `deletedAt` set → email not in valid allowList |
| New user vs existing viewer | `createUser` event sends welcome email; viewer record checked separately |
| Rate limit unavailable | Graceful skip (Redis failure doesn't block auth) |
| Cross-domain magic links | URL rewriting to match production domain |

---

## Environment Variables

### Required
| Variable | Description |
|----------|-------------|
| `NEXTAUTH_URL` | Base URL for auth callbacks |
| `NEXTAUTH_SECRET` | Session encryption key |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth secret |

### Optional
| Variable | Description |
|----------|-------------|
| `LINKEDIN_CLIENT_ID` | LinkedIn OAuth client ID |
| `LINKEDIN_CLIENT_SECRET` | LinkedIn OAuth secret |
| `DEFAULT_ADMIN_EMAIL` | Fallback admin email |
| `AUTH_DEBUG` | Enable debug logging in development |

---

## Debugging

### Console Logs
All authentication events log with `[AUTH]` prefix:
```
[AUTH] signIn callback called for: user@example.com
[AUTH] Admin email check: user@example.com isAdmin: true
[AUTH] Admin access granted for: user@example.com
```

### Rejection Debug
Failed logins include detailed context:
```
[AUTH] REJECTION DEBUG: {
  email: "user@example.com",
  viewerRecordsFound: 0,
  activeLinksTotal: 42,
  existingViewer: false,
  viewerHasGroups: false,
  emailInAllowList: false
}
```

---

## Recent Updates (January 30, 2026)

1. **Database-backed admin verification** - Admin check now queries `UserTeam` table for OWNER/ADMIN/SUPER_ADMIN roles instead of relying solely on static email list

2. **Added `isUserAdminAsync()` function** - Async database lookup for admin status with static list fallback

3. **Files updated:**
   - `pages/api/auth/[...nextauth].ts` - Added database query in signIn callback
   - `pages/api/auth/check-admin.ts` - Database lookup for admin roles
   - `pages/api/auth/check-visitor.ts` - Database lookup for admin roles
   - `lib/auth/admin-magic-link.ts` - Added OWNER role to admin check
   - `lib/constants/admins.ts` - Added `isUserAdminAsync()` function
