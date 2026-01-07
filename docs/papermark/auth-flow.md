# Authentication Flow

## Admin Authentication (Magic Link)

### Flow
```
1. User enters email on /login
2. System sends magic link via Resend
3. Link valid for 1 hour
4. Click link → auto-redirect to dashboard
5. Session managed by NextAuth.js
```

### Key Files
- `app/(auth)/login/page-client.tsx` - Login form (email-only, no Google OAuth button)
- `app/(auth)/verify/page.tsx` - Token verification (auto-redirects)
- `pages/api/auth/[...nextauth].ts` - NextAuth configuration
- `lib/emails/send-verification-request.ts` - Email sending

### Admin Allowlist
Only these emails can access admin:
1. investors@bermudafranchisegroup.com
2. rciesco@gmail.com

## Viewer Authentication (Document Access)

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

### Email Verification Toggle (emailAuthenticated)
| Setting | Authenticated Session | No Session |
|---------|----------------------|------------|
| OFF (default) | One-click access | Email collected, no OTP |
| ON | One-click access (session = verified) | OTP required |

**Note:** Authenticated session users ALWAYS get one-click access regardless of the toggle, since the magic link authentication already verified their identity.

### Key Settings
| Setting | Value | Effect |
|---------|-------|--------|
| `emailProtected` | `true` | Must provide email to view |
| `emailAuthenticated` | `false` | Default: one-click for authenticated, email-only for others |
| `emailAuthenticated` | `true` | OTP required for non-authenticated users only |
| `allowList` | `string[]` | Only these emails can access |

### Session-Based Bypass Logic
The `/api/views-dataroom` endpoint implements session-based authentication bypass:

```typescript
// Check if user is authenticated via NextAuth and has access
const session = await getServerSession(authOptions);
if (session?.user?.email) {
  // Check group membership, allowList, or team viewer status
  // If access verified → isEmailVerified = true → skip OTP
}
```

This is platform-wide and applies dynamically to ALL datarooms without hardcoded IDs.

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

### Admin Sessions
- Managed by NextAuth.js
- Stored in database via Prisma adapter
- Session check on every protected route

### Viewer Sessions
- Cookie-based session per browser
- Keyed by linkId + email
- Persists until browser closed or cookie expires

## Security Considerations

- Magic links expire after 1 hour
- No password authentication
- HTTPS required in production
- Session cookies are HttpOnly
- CSRF protection via NextAuth
