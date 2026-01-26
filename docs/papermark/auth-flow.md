# Authentication Flow

## Overview

The platform uses a unified login portal with role-based routing. Both admins (GP) and investors (LP) login through the same page, and the system routes them to the appropriate dashboard based on their role and access.

## Authentication Architecture

### Database Sessions
- Using `@auth/prisma-adapter` for database-backed sessions
- Sessions stored in `Session` table with `sessionToken` and `userId`
- Enables instant role revocation without requiring re-login
- 30-day session expiry with 24-hour refresh interval

### Session Cookies
| Environment | Cookie Name |
|-------------|-------------|
| HTTPS (Production) | `__Secure-next-auth.session-token` |
| HTTP (Development) | `next-auth.session-token` |

## Admin Authentication (Magic Link)

### Flow
```
1. User enters email on /login
2. System sends magic link via Resend
3. Link valid for 20 minutes (EmailProvider) or 1 hour (admin magic link)
4. Click link → server verifies → creates database session → redirects
5. Session managed by NextAuth.js with database adapter
```

### Admin Magic Link (Direct)
For admin-specific actions (e.g., quick-add from email):
```
1. System generates link: /api/auth/admin-magic-verify?token=...&email=...
2. Admin clicks link
3. Server verifies token against VerificationToken table
4. Server creates Session record in database
5. Server sets session cookie
6. Redirects to specified path (e.g., /admin/quick-add?email=...)
```

### Key Files
- `lib/auth/auth-options.ts` - NextAuth configuration with database sessions
- `lib/auth/admin-magic-link.ts` - Admin magic link creation/verification
- `pages/api/auth/admin-magic-verify.ts` - Server-side verification endpoint
- `lib/emails/send-verification-request.ts` - Email sending

## Visitor Authentication (Document Access)

### Magic Link Flow (Primary)
```
1. Visitor receives invitation email with magic link
2. Link format: /view/{linkId}?token=...&email=...
3. Page loads and detects token/email in URL
4. Client calls POST /api/view/verify-magic-link with {token, email, linkId}
5. Server verifies token against VerificationToken table
6. Server sets cookies: pm_vft_{linkId}, pm_email_{linkId}, pm_drs_flag_{linkId}
7. Client stores verified email and sets local state
8. URL is cleaned (token/email removed for security)
9. Access granted to dataroom content
```

### Key Files
- `lib/auth/create-visitor-magic-link.ts` - Visitor magic link creation
- `pages/api/view/verify-magic-link.ts` - Visitor magic link verification
- `pages/view/[linkId]/index.tsx` - View page with client-side verification

### Auto-Verify for Authenticated Users
If a user is already logged in with NextAuth session:
```
1. Page detects authenticated session via useSession()
2. Calls POST /api/view/auto-verify-session with {email, linkId}
3. Server checks viewer access (group membership, allowList, etc.)
4. If access verified → sets cookies → bypasses manual verification
```

### One-Click Access Flow (Authenticated Users)
```
1. Viewer clicks magic link in invitation email
2. NextAuth authenticates user and creates session
3. Viewer redirected to dataroom via /viewer-redirect
4. API checks: NextAuth session + dataroom access (group/allowList/team viewer)
5. If both valid → isEmailVerified = true → OTP bypassed
6. Direct access to dataroom content immediately
7. No 6-digit code entry required
```

**Key Implementation:** `app/api/views-dataroom/route.ts` checks:
- Group membership via `ViewerGroupMembership`
- AllowList inclusion (normalized email matching)
- Team viewer status via `Viewer` + `ViewerGroupMembership`

### Standard Flow (Non-Authenticated Users)
```
1. Viewer visits dataroom link directly (no session)
2. Email verification page shown
3. Enter email → receive OTP code/magic link
4. Enter code or click link → session created
5. Access granted for browser session
```

## Role-Based Routing (/viewer-redirect)

After any successful login, users are routed through `/viewer-redirect`:

### Routing Priority
1. **GP Role + Team Membership** → `/hub` (admin dashboard)
2. **LP Role + Investor Profile** → `/lp/dashboard` (investor portal)
3. **Any Team Membership** → `/hub` (fallback for admins)
4. **Viewer Access** → `/view/{linkId}` (direct to dataroom)
5. **No Access Found** → `/viewer-portal` (access request page)

### Visitor Mode
Admins can test the visitor experience by adding `?mode=visitor` to skip admin routing.

### Key Logic
```typescript
const userRole = user.role || "LP";

// GP users with team → admin hub
if (userRole === "GP" && hasTeamMembership) → /hub

// LP users with investor profile → LP dashboard
if (userRole === "LP" && hasInvestorProfile) → /lp/dashboard

// Fallback team check → admin hub
if (hasTeamMembership) → /hub

// Check viewer access → dataroom
if (hasViewerAccess) → /view/{linkId}

// No access → portal
→ /viewer-portal
```

## Email Verification Settings

| Setting | Authenticated Session | No Session |
|---------|----------------------|------------|
| OFF (default) | One-click access | Email collected, no OTP |
| ON | One-click access (session = verified) | OTP required |

**Note:** Authenticated session users ALWAYS get one-click access regardless of the toggle.

### Key Settings
| Setting | Value | Effect |
|---------|-------|--------|
| `emailProtected` | `true` | Must provide email to view |
| `emailAuthenticated` | `false` | Default: one-click for authenticated, email-only for others |
| `emailAuthenticated` | `true` | OTP required for non-authenticated users only |
| `allowList` | `string[]` | Only these emails can access |

## Quick Add Authentication

Quick Add uses session-based auth with these settings:
- `emailProtected: true` - Email required
- `emailAuthenticated: false` - Session-based (no re-verification)
- `allowAll: true` - Full access to all content
- Viewer added to `allowList` automatically

### Standard Flow (from admin dashboard)
```
1. Admin opens dataroom → clicks "Quick Add" button
2. Enters investor email(s)
3. Viewer receives invitation email with magic link
4. Click link → verify email once
5. Session cookie grants access
6. Navigate freely within dataroom
```

### Deep-Link Flow (from access request email)
```
1. Investor submits access request form
2. Admin receives email with "Quick Add This Investor" button
3. Button contains magic link to /admin/quick-add?email=<investor_email>
4. Admin clicks → authenticated and redirected to Quick Add page
5. Email pre-filled, dataroom auto-selected if only one exists
6. Admin clicks "Add & Send Invite"
7. Investor receives magic link invitation
```

### Key Files
| File | Purpose |
|------|---------|
| `pages/admin/quick-add.tsx` | Quick Add landing page |
| `pages/api/request-invite.ts` | Generates admin magic link with redirect |
| `components/emails/invite-request.tsx` | Email template with Quick Add button |
| `lib/auth/admin-magic-link.ts` | Magic link generation with redirect path |

## Session Management

### Database Sessions (Admin)
- Stored in `Session` table via Prisma adapter
- Contains: `id`, `sessionToken`, `userId`, `expires`
- Role fetched fresh from database on each session access
- Enables instant role revocation

### Visitor Sessions (Cookie-Based)
- Cookie-based session per browser
- Keyed by linkId + email
- Cookies: `pm_vft_{linkId}`, `pm_email_{linkId}`, `pm_drs_flag_{linkId}`
- Persists for 1 hour or until browser closed

## Security Considerations

- Magic links expire after 20-60 minutes (configurable)
- No password authentication
- HTTPS required in production
- Session cookies are HttpOnly
- CSRF protection via NextAuth
- Tokens are hashed before database storage
- URL tokens are cleaned after verification
- Database sessions enable instant revocation

## Middleware Protection

Route protection in `lib/middleware/app.ts`:

| Route Pattern | Auth Required | Role Check |
|---------------|---------------|------------|
| `/lp/onboard`, `/lp/login` | No | - |
| `/lp/*` | Yes | LP or GP |
| `/dashboard`, `/datarooms`, `/admin` | Yes | GP (or team member) |
| `/viewer-portal` | Yes | Any authenticated |

LP users attempting to access GP routes are redirected to `/viewer-portal`.
