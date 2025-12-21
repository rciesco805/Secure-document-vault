# BF Fund Investor Dataroom - Bermuda Franchise Group

## Overview

This is a secure investor dataroom portal for Bermuda Franchise Group (BFG), built on the open-source Papermark platform. It enables secure document sharing with investors through email-verified access, custom branding, and detailed page-by-page analytics.

**Tagline:** Work Well. Play Well. Be Well.

**Contact:** investors@bermudafranchisegroup.com

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes

**December 2024:**
- Migrated document storage from Vercel Blob to Replit App Storage for enhanced security
  - Files now use AES-256 encryption and are private by default
  - Storage path format: /objects/documents/{uuid}/{filename}
  - Added presigned URL upload flow for secure file transfers
- Applied BFG branding (logos, colors, tagline) to login page and navigation
- Configured security defaults: email required for all access, downloads disabled
- Set up PostgreSQL database with Prisma migrations
- Configured development environment with Next.js on port 5000
- Upgraded team plan to "datarooms-plus" for all premium features
- Removed papermark.com domain references, using custom domains only
- Updated all email sender addresses to use investors.bermudafranchisegroup.com subdomain
- Made rate limiting optional (works without Upstash Redis)
- Fixed viewer page meta URLs to use NEXT_PUBLIC_BASE_URL
- Added "Send Link" button to Permissions page for sending access links via email
- Created custom BFG-branded invitation email with confidentiality notice
- Enabled dataroom invitations feature by default
- Shortened link URL display for better fit on smaller screens
- Added "Send Link Now" prompt after creating a new link to streamline investor invitations
- Mobile optimization: Admin portal and viewer now fully responsive with Tailwind breakpoints
- Implemented magic link authentication for admin access request notifications (one-click login)
- Added dismissable "Request Invite" notice for unapproved login attempts
- Removed Upgrade/Pro Banner from sidebar completely (self-hosted deployment)
- Rebranded all welcome/onboarding screens from Papermark to BF Fund Dataroom
- Changed default team plan in Prisma schema to "datarooms-plus" for all new teams
- Updated custom domain to dataroom.bermudafranchisegroup.com (now active in production)
- Made All Datarooms and Visitors navigation always enabled (no plan gating)
- Added magic link functionality for visitor email verification (one-click access from email)
- Extended verification token expiration from 10 to 20 minutes for both admin and visitor flows
- Completed comprehensive email template rebranding: all 30+ email templates updated from Papermark to BF Fund Dataroom branding with correct contact info and team signatures
- Disabled all upgrade prompts and plan upsell modals (self-hosted deployment with datarooms-plus plan)
- Comprehensive code cleanup: removed old demo pages, simplified upgrade modal code, updated remaining Papermark branding references to BF Fund Dataroom throughout the codebase
- Final pre-launch review: Fixed all remaining hardcoded papermark.com URLs and support emails to use bermudafranchisegroup.com
- Updated all user-facing help/support links to route to investors@bermudafranchisegroup.com
- All admin users configured: rciesco@gmail.com, richard@bermudafranchisegroup.com, investors@bermudafranchisegroup.com

## Platform Testing Status (Dec 2024)

**Verified Working:**
- Login page with BFG branding
- Document upload (PDF, images, all file types)
- Replit App Storage for secure file hosting (AES-256 encrypted)
- Database connectivity (PostgreSQL)
- API health endpoints
- Session management (NextAuth)
- Rate limiting graceful fallback

**Optional Services (Not Configured):**
- Upstash Redis (rate limiting works without it)
- Slack integration (not needed)
- Trigger.dev (PDF-to-image conversion disabled)
- Tinybird analytics (view tracking limited)

## Security Configuration

All links created in the dataroom have these security defaults (configured in Prisma schema):
- **Email Protection:** Required for every document access (`emailProtected=true`)
- **Downloads:** Disabled by default (`allowDownload=false`)
- **Analytics:** Full page-by-page tracking with time-on-page data

## Branding Assets

Logo files stored in `public/_static/`:
- `bfg-logo-black.png` - Black logo for light backgrounds
- `bfg-logo-white.png` - White logo for dark backgrounds
- `bfg-icon-black.png` - Icon-only variant (black)
- `bfg-icon-white.png` - Icon-only variant (white)

## System Architecture

### Frontend Architecture
- **Framework**: Next.js with Pages Router (not App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS with CSS variables for theming (light/dark mode support)
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **State Management**: React hooks, SWR for data fetching, and React Context for team state
- **Forms**: React Hook Form with Zod validation

### Backend Architecture
- **API Routes**: Next.js API routes in `/pages/api/`
- **ORM**: Prisma with PostgreSQL database
- **Authentication**: NextAuth.js with Prisma adapter, including passkey support via Hanko
- **Background Jobs**: Trigger.dev for async task processing (document conversion, exports)
- **File Storage**: AWS S3 with CloudFront for signed URLs and TUS protocol for resumable uploads

### Data Storage
- **Primary Database**: PostgreSQL via Prisma ORM (Replit-managed)
- **Caching/Rate Limiting**: Upstash Redis for rate limiting and job queue storage
- **File Storage**: AWS S3 for documents with CloudFront CDN
- **Analytics Data**: Tinybird for view analytics and tracking

### Key Design Patterns
- **Multi-tenancy**: Team-based architecture with team context provider
- **Middleware**: Custom domain routing, analytics proxying (PostHog), and webhook handling
- **Enterprise Features**: Located in `/ee/` directory under separate commercial license (data rooms, advanced permissions, Q&A)

### Authentication & Authorization
- NextAuth.js handles session management
- Passkey/WebAuthn support through Hanko integration
- Team-based permissions with role management
- Custom domain verification through Vercel API

## Environment Variables

Required secrets (stored in Replit Secrets):
- `DATABASE_URL` - PostgreSQL connection string
- `NEXTAUTH_SECRET` - Session encryption key
- `RESEND_API_KEY` - Email delivery service

Optional environment variables:
- `NEXT_PUBLIC_MARKETING_URL` - Marketing site URL
- `NEXT_PUBLIC_WEBHOOK_BASE_HOST` - Webhook base host

## Key Files Modified for BFG Branding

- `app/(auth)/login/page-client.tsx` - Login page with BFG branding
- `components/view/nav.tsx` - Navigation with BFG logo
- `pages/_app.tsx` - Meta tags and site title
- `lib/constants.ts` - Global constants

## External Dependencies

### Core Services
- **Database**: PostgreSQL (Replit-managed)
- **Email**: Resend for transactional emails

### Third-Party Integrations (Optional)
- **Analytics**: Tinybird for document view analytics, PostHog for product analytics
- **File Storage**: AWS S3 + CloudFront for document storage and delivery
- **Payments**: Stripe for subscription billing
- **Link Shortening**: Dub for short links and referral tracking
- **Authentication**: Hanko for passkey/WebAuthn support
- **Background Jobs**: Trigger.dev for document processing

## Development

Run the development server:
```bash
npm run dev -- -p 5000 -H 0.0.0.0
```

Run database migrations:
```bash
npx prisma migrate deploy
```

Generate Prisma client:
```bash
npx prisma generate
```

## Security Audit Notes (December 2024)

### Fixed Issues

| Issue | File | Status | Notes |
|-------|------|--------|-------|
| Missing env var check for NEXT_PRIVATE_VERIFICATION_SECRET | `lib/utils/generate-checksum.ts` | ✅ Fixed | Now throws clear error if missing |
| Missing env var checks for JWT_SECRET and UNSUBSCRIBE_BASE_URL | `lib/utils/unsubscribe.ts` | ✅ Fixed | Now throws clear errors if missing |
| Silent failure in email blacklist check | `lib/edge-config/blacklist.ts` | ✅ Fixed | Now logs errors to console |
| Hardcoded Replit sidecar endpoint | `pages/api/file/replit-upload.ts`, `pages/api/file/replit-get.ts` | ✅ Fixed | Now configurable via REPLIT_SIDECAR_ENDPOINT env var |
| Deprecated Stripe webhook file | `pages/api/stripe/webhook-old.ts` | ✅ Fixed | File deleted |
| Tinybird token missing causes silent failure | `lib/tinybird/pipes.ts` | ✅ Fixed | Now logs warning when token not configured |
| js-yaml vulnerability | npm dependency | ✅ Fixed | Patched via npm audit fix |

### Known Vulnerabilities (Deferred - Require Breaking Changes)

| Vulnerability | Package | Severity | Required Fix | Notes |
|---------------|---------|----------|--------------|-------|
| DoS with Server Components | next 14.2.33 | High | Upgrade to Next.js 15.x | Major version upgrade, needs full testing |
| Command injection in CLI | glob 10.2.0-10.4.5 | High | Upgrade eslint-config-next to 16.x | Breaking change in ESLint config |
| Arbitrary JS execution in PDF | pdfjs-dist <=4.1.392 | High | Upgrade react-pdf to 10.x | Breaking change in PDF rendering |

### Code Quality Notes (64 ESLint Warnings)

Most warnings are minor and don't affect functionality:
- Unused variables in catch blocks (intentional empty catches)
- Missing dependencies in useEffect hooks (some are intentional)
- Prefer-const suggestions

### Recommended Future Actions

1. **Schedule Next.js 15 upgrade** - Test thoroughly in development first
2. **Update react-pdf** - May require changes to PDF viewer components
3. **Review ESLint warnings** - Address when doing related code changes
4. **Add monitoring** - Consider adding error tracking (e.g., Sentry) for production

### Required Environment Variables

Ensure these are set in all environments:
- `NEXT_PRIVATE_VERIFICATION_SECRET` - Required for email verification checksums
- `JWT_SECRET` - Required for unsubscribe link generation
- `UNSUBSCRIBE_BASE_URL` - Required for unsubscribe links
- `TINYBIRD_TOKEN` - Optional, analytics limited without it
- `NEXT_PUBLIC_UPLOAD_TRANSPORT` - Set to `replit` for secure storage (production)

### Security Configuration (December 2024)

**Magic Link Authentication:**
- Token expiration: 20 minutes (`maxAge: 20 * 60` in EmailProvider)
- Admin allowlist enforced: Only rciesco@gmail.com, investors@bermudafranchisegroup.com, richard@bermudafranchisegroup.com
- Auto-redirect on verification (no second click needed)

**Document Storage Security:**
- Production: Replit Object Storage with presigned URLs (private by default)
- Development: Replit Object Storage with presigned URLs
- Files are AES-256 encrypted and require authenticated access

## Self-Hosted Simplifications (December 2024)

The following SaaS-specific features were removed/disabled for self-hosted deployment:

### Billing & Plan Gating Removed
- **usePlan hook** (`lib/swr/use-billing.ts`) - Always returns `datarooms-plus` plan with all features enabled
- **useLimits hook** (`ee/limits/swr-handler.ts`) - Always returns unlimited (no document/link/user limits)
- **People page** (`pages/settings/people.tsx`) - Simple "Add Member" button replaces complex seat/checkout flow
- **Billing settings tab** - Removed from settings navigation

### Upgrade Prompts Disabled
All upgrade prompts, trial banners, and blocking modals are disabled because:
- `isFree: false` and `isTrial: false` always
- `isDataroomsPlus: true` always
- `canAddUsers/canAddDocuments/canAddLinks: true` always

### Files Modified for Self-Hosted
| File | Change |
|------|--------|
| `lib/swr/use-billing.ts` | Hardcoded datarooms-plus plan with all flags true (isPro, isBusiness, isDatarooms, isDataroomsPlus, isDataroomsPremium) |
| `ee/limits/swr-handler.ts` | Always returns unlimited flags |
| `pages/settings/people.tsx` | Simplified to direct AddTeamMembers modal |
| `components/settings/settings-header.tsx` | Removed Billing tab |
| `components/sidebar/team-switcher.tsx` | Removed plan checks for "Add new team" button |
| `pages/api/teams/[teamId]/datarooms/index.ts` | Removed plan restrictions for dataroom creation |
| `pages/api/teams/[teamId]/viewers/index.ts` | Removed free plan restriction |
| `pages/api/teams/[teamId]/viewers/[id]/index.ts` | Removed free plan restriction |
| `pages/api/teams/[teamId]/links/[id]/index.ts` | Removed free plan restriction for link deletion |
| `pages/api/links/[id]/index.ts` | Removed free plan restriction for link deletion |
| `pages/api/teams/[teamId]/export-jobs.ts` | Removed free plan restriction |
| `pages/api/teams/[teamId]/datarooms/[id]/export-visits.ts` | Removed free plan restriction |
| `pages/api/teams/[teamId]/datarooms/[id]/groups/[groupId]/export-visits.ts` | Removed free plan restriction |
| `app/(auth)/verify/page.tsx` | Auto-redirect for magic link login (no second click needed) |

## Production Deployment

After deploying to production, run the SQL script to enable all features:
```sql
-- Set default plan for new teams to 'datarooms-plus'
ALTER TABLE "Team" ALTER COLUMN "plan" SET DEFAULT 'datarooms-plus';

-- Upgrade existing teams from 'free' to 'datarooms-plus'
UPDATE "Team" SET plan = 'datarooms-plus' WHERE plan = 'free';
```

The full script is available at `scripts/production-setup.sql`.
