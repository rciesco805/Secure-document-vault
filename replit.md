# BF Fund Investor Dataroom - Reference Memo

## Overview
The BF Fund Investor Dataroom is a secure, self-hosted investor portal for Bermuda Franchise Group (BFG), built on the Papermark platform. Its primary purpose is to enable secure sharing of confidential investment documents with verified investors. The platform emphasizes email-verified access, custom branding, and detailed page-by-page analytics. It operates under the tagline "Work Well. Play Well. Be Well." and is deployed on Replit, with all premium features unlocked and billing functionalities disabled.

## User Preferences
- **Communication style**: Simple, everyday language
- **Technical level**: Non-technical explanations preferred
- **Focus**: Security and ease of use for investors

---

## Key Design Decisions

| Decision | Implementation |
|----------|----------------|
| Self-hosted | All billing/upgrade code disabled; `datarooms-plus` plan hardcoded |
| Authentication | Magic link only, **1-hour expiration** |
| Admin Access | Allowlist: 2 emails (investors@bermudafranchisegroup.com, rciesco@gmail.com) |
| Email Required | `emailProtected=true` default |
| Session-based Auth | `emailAuthenticated=false` - verify once per session |
| Downloads Disabled | `allowDownload=false` default |
| File Storage | Replit Object Storage (AES-256 encrypted, presigned URLs) |
| Analytics | PostgreSQL-based (Tinybird optional fallback) |
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
- **Auth**: NextAuth.js (magic links via Resend)
- **File Storage**: Replit Object Storage (AES-256)
- **Analytics**: PostgreSQL (PageView model) with optional Tinybird fallback

**Key Patterns:**
- Data fetching: SWR hooks
- Forms: React Hook Form + Zod validation
- Team context: `useTeam()` hook
- Admin emails: Centralized in `lib/constants/admins.ts`

---

## External Dependencies

| Dependency | Purpose | Required? |
|------------|---------|-----------|
| PostgreSQL | Primary database | Yes |
| Resend API | Magic links and notifications | Yes |
| Replit Object Storage | Encrypted file storage | Yes |
| TINYBIRD_TOKEN | Analytics (alternative) | No - PostgreSQL fallback |
| UPSTASH_REDIS_REST_URL | Rate limiting | No - graceful fallback |

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

## Change Log

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
