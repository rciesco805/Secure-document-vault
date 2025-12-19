# BF Fund Investor Dataroom - Bermuda Franchise Group

## Overview

This is a secure investor dataroom portal for Bermuda Franchise Group (BFG), built on the open-source Papermark platform. It enables secure document sharing with investors through email-verified access, custom branding, and detailed page-by-page analytics.

**Tagline:** Work Well. Play Well. Be Well.

**Contact:** investors@bermudafranchisegroup.com

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes

**December 2024:**
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
- Updated custom domain to dataroom.bermudafranchisegroup.com
- Made All Datarooms and Visitors navigation always enabled (no plan gating)
- Added magic link functionality for visitor email verification (one-click access from email)
- Extended verification token expiration from 10 to 20 minutes for both admin and visitor flows

## Platform Testing Status (Dec 2024)

**Verified Working:**
- Login page with BFG branding
- Document upload (PDF, images, all file types)
- Vercel Blob storage for file hosting
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

## Production Deployment

After deploying to production, run the SQL script to enable all features:
```sql
-- Set default plan for new teams to 'datarooms-plus'
ALTER TABLE "Team" ALTER COLUMN "plan" SET DEFAULT 'datarooms-plus';

-- Upgrade existing teams from 'free' to 'datarooms-plus'
UPDATE "Team" SET plan = 'datarooms-plus' WHERE plan = 'free';
```

The full script is available at `scripts/production-setup.sql`.
