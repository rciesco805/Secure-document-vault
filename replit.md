# BF Fund Investor Dataroom - Reference Memo

## Overview
The BF Fund Investor Dataroom is a secure, self-hosted investor portal for Bermuda Franchise Group (BFG), built on the Papermark platform. Its primary purpose is to enable secure sharing of confidential investment documents with verified investors. The platform emphasizes email-verified access, custom branding, and detailed page-by-page analytics. It operates under the tagline "Work Well. Play Well. Be Well." and is deployed on Replit, with all premium features unlocked and billing functionalities disabled.

## User Preferences
- **Communication style**: Simple, everyday language
- **Technical level**: Non-technical explanations preferred
- **Focus**: Security and ease of use for investors

---

## CRITICAL: Platform-Agnostic Build Requirements

> **All features MUST be platform-wide solutions, NOT tied to any specific dataroom.**

### Build Rules
1. **No hardcoded IDs** - Never use specific dataroom, team, link, or document IDs in code
2. **Dynamic references only** - All IDs must come from URL parameters, database queries, or user context
3. **Dataroom lifecycle independent** - If a dataroom is deleted and a new one created, ALL features must work on the new dataroom automatically
4. **Use parameterized routes** - API routes must use `[teamId]`, `[dataroomId]`, `[linkId]` patterns

### What This Means
- Quick Add works for ANY dataroom (uses dynamic selector)
- Analytics track ANY dataroom (uses foreign keys, not hardcoded IDs)
- Session cookies use dynamic `linkId` (not hardcoded values)
- Email templates receive dataroom info as props (not hardcoded names)
- Access requests work for ANY portal request

### Verification Checklist (Before Each Deploy)
- [ ] No CUID patterns (cmj*, clp*) in source code
- [ ] All API routes use dynamic parameters
- [ ] Database queries filter by passed-in IDs, not constants
- [ ] Email templates use props for all dataroom-specific content

---

## Key Design Decisions

| Decision | Implementation |
|----------|----------------|
| Self-hosted | All billing/upgrade code disabled; `datarooms-plus` plan hardcoded |
| Authentication | Magic links (1-hour expiration) + Google OAuth for admins |
| Admin Access | Allowlist: 2 emails (investors@bermudafranchisegroup.com, rciesco@gmail.com) |
| Email Required | `emailProtected=true` default |
| Session-based Auth | `emailAuthenticated=false` - verify once per session |
| Downloads Disabled | `allowDownload=false` default |
| File Storage | Replit Object Storage (AES-256 encrypted, presigned URLs) |
| Analytics | PostgreSQL only (PageView model) - Tinybird code exists but is NOT used |
| Branding | All "Papermark" references replaced with "BF Fund Dataroom" |

---

## Features by User Type

### Admin Experience

| Feature | Description |
|---------|-------------|
| Magic Link Login | 1-hour expiry, auto-redirect to dashboard |
| Quick Add | One-click investor access with session-based auth |
| Quick Add from Email | "Quick Add This Investor" button in access request emails pre-fills email |
| Quick Add Page | `/admin/quick-add` - dedicated page with dataroom selector and pre-filled email |
| PostgreSQL Analytics | Full page-level tracking (time spent, completion %) without external dependencies |
| View as Visitor | Preview dataroom as investor would see it |
| Investor Request Notifications | Emails to all admin addresses with one-click Quick Add button |

### Visitor (Investor) Experience

| Feature | Description |
|---------|-------------|
| Request Access | Form to request dataroom access (name, email, company) |
| Magic Link Invitations | Click link in email for instant access, no password needed |
| Session-based Access | Verify email once, then navigate freely within dataroom |
| Page-by-page Viewing | Tracked analytics (time spent per page, completion %) |
| Mobile Responsive | Full access on all devices |

---

## System Architecture

**Stack:**
- **Framework**: Next.js 14 (Pages Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **Database**: PostgreSQL via Prisma ORM
- **Auth**: NextAuth.js (magic links via Resend + Google OAuth)
- **File Storage**: Replit Object Storage (AES-256)
- **Analytics**: PostgreSQL only (PageView model) - Tinybird NOT used

**Key Patterns:**
- Data fetching: SWR hooks
- Forms: React Hook Form + Zod validation
- Team context: `useTeam()` hook
- Admin emails: Centralized in `lib/constants/admins.ts`

---

## External Dependencies

| Dependency | Purpose | Required? |
|------------|---------|-----------|
| PostgreSQL | Primary database + analytics | Yes |
| Resend API | Magic links and notifications | Yes |
| Replit Object Storage | Encrypted file storage | Yes |
| UPSTASH_REDIS_REST_URL | Rate limiting, session caching | No - graceful fallback |

**Not Used:**
- Tinybird (legacy code exists but gracefully skipped when `TINYBIRD_TOKEN` not set)

---

## Key Files Reference

### Admin Functionality
| File | Purpose |
|------|---------|
| `lib/constants/admins.ts` | Admin email allowlist |
| `pages/admin/quick-add.tsx` | Quick Add page with pre-filled email |
| `pages/api/request-invite.ts` | Handle investor access requests |
| `components/emails/invite-request.tsx` | Access request email template |
| `lib/auth/admin-magic-link.ts` | Admin magic link generation |

### Analytics & Tracking
| File | Purpose |
|------|---------|
| `prisma/schema/schema.prisma` | PageView model definition |
| `pages/api/record_view.ts` | Store page view events |
| `lib/tracking/postgres-stats.ts` | PostgreSQL query helpers |
| `pages/api/teams/[teamId]/documents/[id]/stats.ts` | Document stats API |

### Quick Add System
| File | Purpose |
|------|---------|
| `components/datarooms/quick-add-modal.tsx` | Quick Add dialog |
| `pages/api/teams/[teamId]/datarooms/[id]/quick-add/index.ts` | Add users API |
| `pages/api/teams/[teamId]/datarooms/[id]/quick-add/invite.ts` | Send invitations |
| `pages/api/teams/[teamId]/datarooms/[id]/ensure-quick-add.ts` | Create Quick Add group |

---

## Platform Audit (January 2026)

All features verified as platform-agnostic. No hardcoded dataroom IDs in source code.

| Feature | Status | Notes |
|---------|--------|-------|
| Quick Add System | ✅ Pass | Uses dynamic dataroom selector |
| Analytics/Tracking | ✅ Pass | PostgreSQL with foreign keys |
| Session Cookies | ✅ Pass | Uses dynamic `linkId` in cookie name |
| Access Request Emails | ✅ Pass | Receives dataroom info as props |
| Magic Links | ✅ Pass | Generated per-request with dynamic IDs |
| API Routes | ✅ Pass | All use parameterized `[id]` patterns |
| Database Queries | ✅ Pass | Filter by passed-in IDs only |

---

## Change Log

### January 2026

**Google OAuth Added**
- Admins can now sign in with Google accounts
- Requires `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` secrets
- Redirect URI: `https://dataroom.bermudafranchisegroup.com/api/auth/callback/google`

**UI/UX Improvements**
- "Home" renamed to "Dataroom Home" in breadcrumb navigation
- Auto-adjusting text color on document/folder cards based on background brightness
- Uses luminance calculation to ensure text readability on dark/light backgrounds
- Utility: `lib/utils/determine-text-color.ts`

**Platform Audit Completed**
- Verified all features work for ANY dataroom, not tied to specific IDs
- Added platform-agnostic build requirements to documentation
- Confirmed: deleting a dataroom and creating a new one = all features work automatically

**Session Cookie Fallback Without Redis**
- Fixed session flag cookie (`pm_drs_flag_${linkId}`) to set even without Redis
- Enables seamless document navigation within dataroom session (1-hour expiry)
- Both DATAROOM_VIEW and DOCUMENT_VIEW flows updated

**Tinybird Error Handling Improved**
- `recordLinkView` now gracefully handles missing `TINYBIRD_TOKEN`
- No more unhandled rejection errors when Tinybird is not configured
- PostgreSQL remains the primary analytics storage

**Email Verification Defaults Updated**
- `emailAuthenticated=false` by default for all link types (Quick Add, General, Group)
- Visitors enter email once at dataroom entry, then browse documents freely
- Note: Allow/Deny lists still auto-enable email verification for security (verifying restricted emails)
- Quick Add links use group-based access without email verification by default
- Session-based access: Once verified, visitors navigate without re-entering email

**Access Request Email - Dual Button Options**
- Investor access request emails now show BOTH buttons:
  - "Quick Add This Investor" (amber) - one-click add with pre-filled email
  - "Enter The Dataroom" (black) - sign in and review dataroom first
- Gives admins the choice of how to handle each request

**Favicon Upload & Group Member Display**
- Added favicon upload to dataroom branding settings
- Group link edit modal now displays member emails in scrollable list

### December 2024 (Week 4)

**PostgreSQL Analytics System**
- Replaced Tinybird dependency with PostgreSQL-based tracking
- New `PageView` model stores page-level duration and completion data
- Helper functions in `lib/tracking/postgres-stats.ts` for stats queries
- All stats APIs fall back to PostgreSQL when `TINYBIRD_TOKEN` not configured
- Composite indexes for optimal query performance

**Quick Add Email Integration**
- Access request emails now include "Quick Add This Investor" button (amber)
- Button links to `/admin/quick-add?email=<investor_email>`
- Magic link authenticates admin and redirects to Quick Add page
- Email pre-filled automatically - just select dataroom and click Add

**Admin Quick Add Page**
- New `/admin/quick-add` page for streamlined investor onboarding
- Dataroom selector (auto-selects if only one exists)
- Pre-filled email from URL parameter
- One-click "Add & Send Invite" workflow

**Magic Link Expiry Extended**
- Admin and Quick Add magic links now valid for 1 hour (was 20 minutes)
- Improved UX for admins who may not check email immediately

**Email Template Improvements**
- Investor email displayed in highlighted gray box with monospace font
- Helper text for easy copy-paste
- Quick Add button replaces generic "Enter Fund Dataroom" for access requests

### December 2024 (Earlier)

**Billing/Plan UI Removed**
- Billing tab removed from sidebar
- All upgrade prompts disabled
- `usePlan()` always returns datarooms-plus
- `useLimits()` always returns unlimited

**Quick Add Feature**
- One-click user access workflow
- Auto-creates "Quick Add" group with default link
- Session-based access (no re-verification)
- Full access to all folders and files

**File Storage Migration**
- Migrated from Vercel Blob to Replit Object Storage
- AES-256 encryption at rest
- Presigned URLs for secure access

**Branding & UI**
- All Papermark references replaced with BF Fund Dataroom
- 30+ email templates rebranded
- Mobile-responsive admin and viewer interfaces

---

## Production Deployment

**Configuration:**
- Build: `npm run build`
- Run: `npm run start`
- Type: Autoscale
- Domain: dataroom.bermudafranchisegroup.com

**Post-Deploy Check:**
```sql
-- Ensure all teams have correct plan
UPDATE "Team" SET plan = 'datarooms-plus' WHERE plan = 'free';
```

---

## Approved Admin Emails

Managed in: `lib/constants/admins.ts`

1. investors@bermudafranchisegroup.com
2. rciesco@gmail.com

To modify: Edit only `lib/constants/admins.ts` - all other files import from there.
