# BF Fund Investor Dataroom - Reference Memo

> **IMPORTANT**: Review this document on EVERY request before making changes.

---

## SESSION START PROTOCOL

**At the start of each session, perform these checks:**

### 1. Environment Health Check
```bash
# Check workflow status - should show "RUNNING"
# Review recent workflow logs for errors
# Verify no red error messages in console
```

### 2. Code State Review
```bash
git log --oneline -5        # Recent commits
git status                  # Uncommitted changes
```

### 3. Quick Validation (if changes were made previously)
```bash
npx prisma generate --schema=prisma/schema   # Regenerate Prisma client
```

### 4. Reference Documentation
- **Papermark Reference:** `/docs/papermark/README.md`
- **Session Checks Runbook:** `/docs/runbooks/session-checks.md`

### Escalate to User If:
- Production site down
- Database migration risks data loss
- Authentication system broken
- Multiple TypeScript errors in core files

---

## HIGH LEVEL OVERVIEW

### What Is This Project?
A secure investor dataroom portal for **Bermuda Franchise Group (BFG)**, built on the open-source Papermark platform. It enables secure document sharing with investors through email-verified access, custom branding, and detailed page-by-page analytics.

### Key Business Context
- **Purpose**: Share confidential investment documents with verified investors
- **Tagline**: Work Well. Play Well. Be Well.
- **Contact**: investors@bermudafranchisegroup.com
- **Custom Domain**: dataroom.bermudafranchisegroup.com
- **Deployment**: Self-hosted on Replit (NOT SaaS, all features enabled)

### Critical Design Decisions
| Decision | Rationale |
|----------|-----------|
| Self-hosted, not SaaS | All billing/upgrade code disabled; `datarooms-plus` plan hardcoded |
| Magic link auth only | No passwords; 20-minute expiration for security |
| Admin allowlist | Only 3 emails can access admin: rciesco@gmail.com, richard@bermudafranchisegroup.com, investors@bermudafranchisegroup.com |
| Email required for all access | `emailProtected=true` default in Prisma schema |
| Session-based auth by default | `emailAuthenticated=false` - visitors verify email once per session, not every document |
| Downloads disabled by default | `allowDownload=false` default in Prisma schema |
| Replit Object Storage | AES-256 encrypted, presigned URLs, replaced Vercel Blob |

### What NOT To Do
- **Never add billing/payment features** - This is self-hosted with all features unlocked
- **Never add plan restrictions** - Remove any `usePlan()` or `useLimits()` gating you find
- **Never reference papermark.com** - All branding is BF Fund Dataroom
- **Never use Vercel Blob** - Use Replit Object Storage via presigned URLs
- **Never expose secrets in code** - Always use environment variables

---

## MID LEVEL ARCHITECTURE

### Technology Stack
| Layer | Technology |
|-------|------------|
| Framework | Next.js 14 with **Pages Router** (NOT App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS with CSS variables (light/dark mode) |
| UI Components | shadcn/ui (Radix UI primitives) |
| State | React hooks, SWR for data fetching, React Context for team state |
| Forms | React Hook Form + Zod validation |
| Database | PostgreSQL via Prisma ORM |
| Auth | NextAuth.js with Prisma adapter |
| Email | Resend API |
| File Storage | Replit Object Storage (AES-256 encrypted) |

### Directory Structure
```
/
├── app/                    # Next.js App Router pages (auth pages only)
│   └── (auth)/            # Login, verify, register pages
├── pages/                  # Next.js Pages Router (main app)
│   ├── api/               # API routes
│   ├── documents/         # Document management
│   ├── datarooms/         # Dataroom management
│   └── settings/          # User/team settings
├── components/            # React components
│   ├── billing/           # Upgrade modals (mostly disabled)
│   ├── datarooms/         # Dataroom-specific components
│   ├── documents/         # Document components
│   ├── links/             # Link sharing components
│   ├── ui/                # shadcn/ui primitives
│   └── view/              # Viewer-facing components
├── lib/                   # Utilities and hooks
│   ├── swr/               # SWR data fetching hooks
│   ├── utils/             # Helper functions
│   └── files/             # File handling (Replit storage)
├── ee/                    # Enterprise features (all enabled)
│   ├── datarooms/         # Dataroom enterprise features
│   ├── limits/            # Plan limits (hardcoded to unlimited)
│   └── stripe/            # Stripe constants (plan enums only)
├── prisma/                # Database schema and migrations
├── public/_static/        # Static assets (logos, images)
└── emails/                # Email templates (React Email)
```

### Key Patterns to Follow

**1. Data Fetching Pattern (SWR)**
```typescript
const { data, mutate, error } = useSWR<ResponseType>(
  teamId ? `/api/teams/${teamId}/resource` : null,
  fetcher
);
```

**2. Team Context Pattern**
```typescript
const teamInfo = useTeam();
const teamId = teamInfo?.currentTeam?.id;
```

**3. API Route Pattern**
```typescript
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).end("Unauthorized");
  
  const { teamId } = req.query;
  // Verify team membership before proceeding
}
```

**4. Form Pattern**
```typescript
const form = useForm<FormType>({
  resolver: zodResolver(formSchema),
  defaultValues: { ... }
});
```

### Authentication Flow
1. User enters email on login page
2. Magic link sent via Resend
3. Link valid for 20 minutes
4. Click link → auto-redirect to dashboard (no second click)
5. Session managed by NextAuth.js

### File Upload Flow
1. Frontend requests presigned URL from `/api/file/replit-upload`
2. File uploaded directly to Replit Object Storage
3. Path stored: `/objects/documents/{uuid}/{filename}`
4. Access via presigned GET URLs from `/api/file/replit-get`

---

## DETAILED IMPLEMENTATION NOTES

### Files Modified for Self-Hosted Deployment

**Plan/Billing Hooks (Always Return Enabled)**
| File | What It Does |
|------|--------------|
| `lib/swr/use-billing.ts` | Returns `datarooms-plus` with all flags true |
| `ee/limits/swr-handler.ts` | Returns unlimited for all limits |

**Components with Plan Gating REMOVED**
| Component | What Was Removed |
|-----------|------------------|
| `components/datarooms/actions/rebuild-index-button.tsx` | Removed usePlan, useFeatureFlags, UpgradePlanModal |
| `components/datarooms/actions/generate-index-dialog.tsx` | Removed usePlan, UpgradePlanModal |
| `components/datarooms/settings/notification-settings.tsx` | Removed usePlan, PlanBadge |
| `components/datarooms/settings/duplicate-dataroom.tsx` | Removed useLimits, usePlan, UpgradePlanModal |
| `components/links/link-sheet/link-options.tsx` | Removed usePlan, useLimits; all isAllowed=true |
| `components/sidebar/team-switcher.tsx` | Removed plan checks |
| `components/settings/settings-header.tsx` | Removed Billing tab |

**API Routes with Plan Gating REMOVED**
| Route | Change |
|-------|--------|
| `pages/api/teams/[teamId]/datarooms/index.ts` | Removed plan check for creation |
| `pages/api/teams/[teamId]/datarooms/[id]/calculate-indexes.ts` | Removed plan check |
| `pages/api/teams/[teamId]/viewers/index.ts` | Removed free plan restriction |
| `pages/api/teams/[teamId]/links/[id]/index.ts` | Removed free plan restriction |
| `pages/api/teams/[teamId]/export-jobs.ts` | Removed free plan restriction |

### Branding Files
| File | Purpose |
|------|---------|
| `public/_static/bfg-logo-black.png` | Black logo for light backgrounds |
| `public/_static/bfg-logo-white.png` | White logo for dark backgrounds |
| `public/_static/bfg-icon-black.png` | Icon-only (black) |
| `public/_static/bfg-icon-white.png` | Icon-only (white) |
| `app/(auth)/login/page-client.tsx` | Login page with BFG branding |
| `components/view/nav.tsx` | Viewer navigation with BFG logo |
| `lib/constants.ts` | Global constants |

### Email Templates
All 30+ email templates in `/emails/` have been rebranded:
- Sender: `BF Fund Dataroom <investors@bermudafranchisegroup.com>`
- Support: `investors@bermudafranchisegroup.com`
- Confidentiality notice included in investor invitations

### Environment Variables

**Required Secrets**
| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` / `POSTGRES_PRISMA_URL` | PostgreSQL connection |
| `NEXTAUTH_SECRET` | Session encryption |
| `RESEND_API_KEY` | Email delivery |
| `NEXT_PRIVATE_VERIFICATION_SECRET` | Email verification checksums |

**Optional Variables**
| Variable | Purpose | Default Behavior |
|----------|---------|------------------|
| `TINYBIRD_TOKEN` | Analytics | Logs warning, analytics limited |
| `UPSTASH_REDIS_REST_URL` | Rate limiting | Graceful fallback, no rate limiting |
| `NEXT_PUBLIC_UPLOAD_TRANSPORT` | File storage | Set to `replit` for Replit storage |

### Common Gotchas & Fixes

**1. Browser Upload Compatibility**
- Issue: Some browsers send empty `content-type` for unknown file types
- Fix: `lib/zod/url-validation.ts` accepts empty string content types
- File: `contentType: z.string()` (not `.min(1)`)

**2. Bulk Download Not Available**
- Issue: Bulk download requires AWS Lambda (not available on Replit)
- Fix: `pages/api/teams/[teamId]/datarooms/[id]/download/bulk.ts` returns 501 with helpful message
- Individual downloads still work via presigned URLs

**3. Dev Server Host Access**
- Issue: Replit proxy requires allowing all hosts
- Fix: Next.js dev server bound to `0.0.0.0:5000`

**4. Magic Link Auto-Redirect**
- Issue: Original flow required clicking "Sign In" button after verification
- Fix: `app/(auth)/verify/page.tsx` auto-redirects when token valid

### Database Schema Defaults
```prisma
model Link {
  emailProtected Boolean @default(true)    // Always require email
  allowDownload  Boolean @default(false)   // No downloads by default
}

model Team {
  plan String @default("datarooms-plus")   // Full features for all teams
}
```

### Security Checklist
- [ ] Magic links expire after 20 minutes
- [ ] Admin allowlist enforced (3 emails only)
- [ ] Files encrypted at rest (AES-256)
- [ ] Presigned URLs for all file access
- [ ] Email verification required for document access
- [ ] No secrets exposed in client code

---

## QUICK REFERENCE

### Run Development
```bash
npm run dev -- -p 5000 -H 0.0.0.0
```

### Database Commands
```bash
npx prisma generate      # Generate client
npx prisma migrate deploy # Run migrations
npx prisma studio        # Visual database browser
```

### Key API Endpoints
| Endpoint | Purpose |
|----------|---------|
| `/api/auth/[...nextauth]` | Authentication |
| `/api/teams/[teamId]/datarooms` | Dataroom CRUD |
| `/api/teams/[teamId]/documents` | Document CRUD |
| `/api/file/replit-upload` | Get presigned upload URL |
| `/api/file/replit-get` | Get presigned download URL |
| `/api/teams/[teamId]/links` | Link management |

### Approved Admin Emails
1. rciesco@gmail.com
2. richard@bermudafranchisegroup.com
3. investors@bermudafranchisegroup.com

---

## CHANGE LOG

**December 2024:**
- **Quick Add Feature**: One-click user access workflow
  - Auto-creates "Quick Add" group with default link for new datarooms
  - "Quick Add" button in dataroom header (amber colored, next to Share)
  - Session-based access (no re-verification during session)
  - Users get full access to all folders and files
  - API: `/api/teams/[teamId]/datarooms/[id]/quick-add`
  - API: `/api/teams/[teamId]/datarooms/[id]/ensure-quick-add`
  - Schema: `isQuickAdd` Boolean field on ViewerGroup model
- Removed ALL plan restrictions from UI and API
- Fixed document upload validation (empty content types)
- Added "View as Visitor" button to dataroom header
- Created branding preview demo pages
- Migrated to Replit Object Storage (AES-256 encrypted)
- Implemented magic link auth with 20-minute expiration
- Rebranded all 30+ email templates
- Mobile-responsive admin and viewer interfaces
- Comprehensive code cleanup (unused imports removed)

---

## User Preferences

- **Communication style**: Simple, everyday language
- **Technical level**: Non-technical explanations preferred
- **Focus**: Security and ease of use for investors

---

## Production Deployment

Deployment is configured for autoscale:
- **Build**: `npm run build`
- **Run**: `npm run start`
- **Type**: Autoscale (scales with traffic)

After deploying, ensure all teams have the correct plan:
```sql
UPDATE "Team" SET plan = 'datarooms-plus' WHERE plan = 'free';
```
