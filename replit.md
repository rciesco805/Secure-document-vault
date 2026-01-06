# BF Fund Investor Dataroom - Project Documentation

## High-Level Overview

The BF Fund Investor Dataroom is a secure, self-hosted investor portal for Bermuda Franchise Group (BFG). It provides:

1. **Investor Dataroom** - Secure document sharing with verified investors
2. **BF Fund Sign** - DocuSign-style e-signature platform for NDAs, contracts, and legal documents
3. **Admin Portal** - Full management interface for authorized team members
4. **Viewer Portal** - Read-only access for investors to view shared datarooms

**Tagline:** "Work Well. Play Well. Be Well."

**Deployment:** Replit with custom domain (dataroom.bermudafranchisegroup.com)

---

## Mid-Level Summary

### Platform Components

| Component | Purpose | Access Level |
|-----------|---------|--------------|
| Admin Dashboard | Manage documents, datarooms, signatures | Team Admins only |
| BF Fund Sign | Create and send documents for e-signature | Team Admins only |
| Viewer Portal | View shared datarooms | Investors/Viewers |
| Public Signing | Sign documents via secure link | Anyone with link |

### Authorized Admins
- `rciesco@gmail.com` (Richard Ciesco)
- `investors@bermudafranchisegroup.com` (Investors)

### Key Technologies
- **Frontend:** Next.js 14, TypeScript, Tailwind CSS, shadcn/ui
- **Database:** Replit PostgreSQL (primary), Supabase PostgreSQL (backup)
- **Auth:** NextAuth.js with Google OAuth and magic links
- **Storage:** Replit Object Storage with AES-256 encryption
- **Email:** Resend API

### Current Plan
- Team: "BF Fund I"
- Plan: `datarooms-plus` (all features unlocked)

---

## Detailed Architecture

### System Architecture

The platform is built on Next.js 14 (Pages Router) using TypeScript, Tailwind CSS, and shadcn/ui. PostgreSQL, managed via Prisma ORM, serves as the primary database for both application data and analytics. Authentication is handled by NextAuth.js, supporting magic links (via Resend) and Google OAuth for administrators. File storage utilizes Replit Object Storage with AES-256 encryption.

A critical architectural decision is the **platform-agnostic design**, ensuring all features are implemented dynamically without hardcoded IDs for datarooms, teams, links, or documents.

### User Preferences
- Communication style: Simple, everyday language
- Technical level: Non-technical explanations preferred
- Focus: Security and ease of use for investors

### Feature Details

#### Investor Dataroom
- Secure document sharing with email-verified access
- Custom branding (Bermuda Franchise Group)
- "Quick Add" system for streamlined investor onboarding
- PostgreSQL-based page-level analytics
- Detailed view tracking and engagement metrics

#### BF Fund Sign (E-Signature Platform)
- Document creation with PDF upload
- Recipient management (signers, viewers, approvers)
- Draggable field placement editor
- Field types: Signature, Initials, Date, Text, Checkbox, Name, Email, Title, Company, Address
- Required field indicators with asterisk
- Sequential signing enforcement
- Bulk sending to multiple recipients
- In-person signing via QR codes
- Document expiration handling
- "Correct & Resend" functionality
- Reusable templates
- Audit trails with timestamps
- PDF download with embedded signatures

#### Security Features
- Token-based access for signers
- Per-recipient authorization
- Expiration enforcement
- Transactional database updates
- Comprehensive audit logging
- IP-based rate limiting on public signing API

### Admin/Viewer Separation Architecture

#### How It Works
1. User logs in with Google or magic link
2. Server checks for `UserTeam` record in database
3. If `UserTeam` exists → Admin Dashboard access
4. If no `UserTeam` → Redirect to Viewer Portal

#### User Types
- **Admins (Team Members):** Users with a `UserTeam` record can access the full admin interface (dashboard, documents, datarooms, sign, settings)
- **Viewers (Investors):** Users without `UserTeam` records but with dataroom access via allowlists are redirected to `/viewer-portal`. They can view shared documents but cannot manage them.

#### Server-Side Protected Pages
The following pages use `withAdminGuard()` for server-side protection:
- `/dashboard` - Main admin dashboard
- `/documents` - Document management
- `/datarooms` - Dataroom management
- `/sign` - E-signature dashboard
- `/sign/new` - Create signature document
- `/sign/bulk` - Bulk sending
- `/sign/[id]` - View signature document
- `/sign/templates` - Template management
- `/settings/general` - Team settings

### Database Configuration

| Database | Status | Purpose |
|----------|--------|---------|
| Replit PostgreSQL | Active (Primary) | Production and development data |
| Supabase PostgreSQL | Configured | Backup/migration option |

**Environment Variables:**
- `DATABASE_URL` - Replit PostgreSQL connection
- `POSTGRES_PRISMA_URL` - Prisma-specific connection string
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase endpoint (backup)
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase admin access (backup)

### External Dependencies
- **PostgreSQL:** Primary database for application data and analytics
- **Resend API:** Magic links and notification emails
- **Replit Object Storage:** Encrypted (AES-256) file storage
- **pdf-lib:** Embedding signatures into downloaded PDFs
- **qrcode.react:** QR codes for in-person signing
- **UPSTASH_REDIS_REST_URL:** Optional rate limiting and session caching

### UI/UX Decisions
- Custom branding replaces all "Papermark" references with "BF Fund Dataroom" or "BF Fund Sign"
- Mobile-responsive design for both admin and investor interfaces
- Auto-adjusting text color on document/folder cards for readability
- Dark theme throughout the application

---

## Recent Changes (January 2026)

### Authentication & Authorization Overhaul (Jan 5-6, 2026)

1. **Fixed Google OAuth redirect bug**
   - Users added via Quick Add (investors/viewers) who login with Google are now correctly redirected to the viewer portal instead of the admin dashboard

2. **Server-side admin protection implemented**
   - Created `withAdminGuard()` wrapper in `lib/auth/admin-guard.ts`
   - Checks for `UserTeam` membership before rendering admin pages
   - Redirects non-admins to `/viewer-portal`

3. **Team auto-creation disabled for viewers**
   - Modified `/api/teams` to prevent auto-creating teams for viewer-only users
   - Users in `ViewerGroupMembership` or link allowlists no longer get automatic teams

4. **Viewer portal created**
   - New `/viewer-portal` page shows investors their accessible datarooms
   - Clean, simple interface without admin navigation

5. **Production database cleanup**
   - Updated "BF Fund I" team plan from `free` to `datarooms-plus`
   - Configured admin access for `rciesco@gmail.com` and `investors@bermudafranchisegroup.com`
   - Removed unauthorized users from admin access

### E-Signature Enhancements

1. **Draggable signature fields**
   - Fields can be repositioned after placement via drag-and-drop

2. **Required field indicator**
   - Added checkbox in field properties panel
   - Visual asterisk (*) on required field labels

3. **ADDRESS field type**
   - New field type with map pin icon
   - Default dimensions: 25% width × 6% height

### Analytics & Error Handling

1. **Tinybird analytics fallback**
   - Graceful handling when analytics service isn't configured
   - Basic view tracking works via PostgreSQL
   - Duration tracking requires Tinybird configuration

### Multi-Admin Session Fix (Jan 6, 2026)

1. **User-scoped team selection**
   - Team selection now stored per-user in localStorage (`currentTeamId_${userId}`)
   - Different admins on the same browser no longer inherit each other's team selections
   - Legacy global `currentTeamId` key automatically cleaned up

2. **Session lifecycle improvements**
   - All user-scoped team keys cleared on logout
   - Team context validates stored team ID against current user's memberships
   - Invalid stored team IDs automatically fall back to first available team

3. **AppLayout hydration fix**
   - Waits for full team context hydration before making routing decisions
   - Prevents false viewer-portal redirects during loading
   - Simplified single LoadingState component

### Quick Add Dataroom-Agnostic Fix (Jan 6, 2026)

1. **Auto-provisioning Quick Add groups**
   - Every new dataroom automatically gets a Quick Add group and link on creation
   - No manual setup required - Quick Add works immediately for any dataroom

2. **Fixed "Send Invitations" for Quick Add links**
   - Modified `ee/features/dataroom-invitations/api/group-invite.ts`
   - When using Quick Add Link, new emails are automatically added as viewers and group members
   - Emails are added to the link's allowList before sending invitations
   - This allows entering any email in the invitation modal - no need to add members first

3. **Login page UI improvements**
   - "Request Invite" button moved to top for first-time visitors
   - "Already have access?" divider separates login options
   - Larger, more visible divider text

---

## File Structure (Key Files)

```
lib/
├── auth/
│   └── admin-guard.ts          # Server-side admin protection
├── prisma.ts                   # Database client
└── swr/
    └── use-signature-documents.ts

pages/
├── dashboard.tsx               # Admin dashboard (protected)
├── viewer-portal.tsx           # Investor portal
├── documents/
│   └── index.tsx               # Document management (protected)
├── datarooms/
│   └── index.tsx               # Dataroom management (protected)
├── sign/
│   ├── index.tsx               # E-signature dashboard (protected)
│   ├── new.tsx                 # Create document (protected)
│   ├── bulk.tsx                # Bulk sending (protected)
│   ├── [id]/
│   │   ├── index.tsx           # View document (protected)
│   │   └── prepare.tsx         # Field editor
│   └── templates/
│       └── index.tsx           # Templates (protected)
└── api/
    ├── teams/
    │   └── index.ts            # Team management (viewer check)
    └── viewer/
        └── my-datarooms.ts     # Viewer dataroom access

components/
├── layouts/
│   └── app.tsx                 # Admin layout with client-side backup
└── sign/
    └── field-placement-editor.tsx  # Signature field editor
```

---

## TODO (Next Build)

1. **Supabase Sync** - Sync admin users and team data to Supabase as backup/migration option
2. **Extended admin protection** - Add `withAdminGuard()` to remaining nested admin pages
3. **API authorization** - Add server-side auth checks to admin API endpoints
