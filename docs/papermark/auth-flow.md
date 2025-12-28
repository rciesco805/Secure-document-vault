# Authentication Flow

## Admin Authentication (Magic Link)

### Flow
```
1. User enters email on /login
2. System sends magic link via Resend
3. Link valid for 20 minutes
4. Click link → auto-redirect to dashboard
5. Session managed by NextAuth.js
```

### Key Files
- `app/(auth)/login/page-client.tsx` - Login form
- `app/(auth)/verify/page.tsx` - Token verification (auto-redirects)
- `pages/api/auth/[...nextauth].ts` - NextAuth configuration
- `lib/emails/send-verification-request.ts` - Email sending

### Admin Allowlist
Only these emails can access admin:
1. rciesco@gmail.com
2. richard@bermudafranchisegroup.com
3. investors@bermudafranchisegroup.com

## Viewer Authentication (Document Access)

### Session-Based Flow (emailAuthenticated=false)
```
1. Viewer clicks link in invitation email
2. Email verification page shown
3. Enter email → receive verification code/link
4. Once verified → session cookie set
5. Full access for entire browser session
6. No re-verification when switching documents
```

### Per-Document Flow (emailAuthenticated=true)
```
1. Every document view requires re-verification
2. Not used in BF Fund (session-based preferred)
```

### Key Settings
| Setting | Value | Effect |
|---------|-------|--------|
| `emailProtected` | `true` | Must provide email to view |
| `emailAuthenticated` | `false` | Verify once per session |
| `allowList` | `string[]` | Only these emails can access |

## Quick Add Authentication

Quick Add uses session-based auth with these settings:
- `emailProtected: true` - Email required
- `emailAuthenticated: false` - Session-based (no re-verification)
- `allowAll: true` - Full access to all content
- Viewer added to `allowList` automatically

### Flow
```
1. Admin adds email via Quick Add
2. Viewer receives invitation email
3. Click link → verify email once
4. Session cookie grants access
5. Navigate freely within dataroom
```

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

- Magic links expire after 20 minutes
- No password authentication
- HTTPS required in production
- Session cookies are HttpOnly
- CSRF protection via NextAuth
