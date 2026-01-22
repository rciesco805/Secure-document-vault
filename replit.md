# BF Fund Investor Dataroom - Complete Technical Documentation

## Overview

The BF Fund Investor Dataroom is a secure, self-hosted investor portal for Bermuda Franchise Group (BFG). It consists of two integrated platforms:

1. **BF Fund Dataroom** - Secure document sharing with investors featuring visitor access management, one-click magic link authentication, and admin approval workflows
2. **BF Fund Sign** - DocuSign-style e-signature platform with signature fields, templates, bulk send, QR signing, and audit trails

The platform is deployed on Replit with a custom domain at `dataroom.bermudafranchisegroup.com`.

## User Preferences

- Communication style: Simple, everyday language
- Technical level: Non-technical explanations preferred
- Focus: Security and ease of use for investors

## Recent Changes (January 2026)

### Bug Fixes
- Fixed 404 errors on document navigation (URL routing from `/document/` to `/d/`)
- Fixed "Add a custom domain" modal not opening (DialogTrigger conditional rendering)
- Fixed verification cookie persistence (pm_vft and pm_drs_flag cookies)
- Improved login page: grey fill on "Request Invite" button, added "For accredited investors only" subtitle

### URL Routing Patterns
- Viewer document navigation: `/view/[linkId]/d/[documentId]`
- Custom domain routes: `/view/domains/[domain]/[slug]/d/[documentId]`

### Cookie System for Verification
- `pm_vft`: Global verification token (path="/", expires 1 day)
- `pm_drs_flag_${linkId}`: Link-specific verification flag
- `pm_drs_flag_${slug}`: Slug-specific verification flag for custom domains

## Project Architecture

### Directory Structure

```
app/                    # Next.js App Router
  (auth)/              # Auth pages (login, register, verify)
  (ee)/                # Enterprise features API
  admin/               # Admin-only pages
  api/                 # App Router API routes

pages/                  # Next.js Pages Router (main app)
  api/                 # API routes
    auth/              # NextAuth endpoints
    teams/             # Team management
    sign/              # E-signature APIs
    view/              # Viewer access APIs
  datarooms/           # Dataroom management
  documents/           # Document management
  sign/                # E-signature pages
  view/                # Public viewer pages
  visitors/            # Visitor management

components/             # React components
  datarooms/           # Dataroom UI
  documents/           # Document UI
  domains/             # Domain management
  emails/              # React Email templates
  links/               # Link management
  qanda/               # Q&A system
  signature/           # E-signature
  ui/                  # shadcn/ui components
  view/                # Viewer components
    dataroom/          # Dataroom viewer
    viewer/            # Document viewer

ee/                     # Enterprise Edition
  features/            # EE modules
    access-notifications/
    ai/
    billing/
    conversations/
    dataroom-invitations/
    permissions/
    security/
    storage/
    templates/
    workflows/
  limits/              # Plan limits
  stripe/              # Stripe integration

lib/                    # Shared libraries
  analytics/           # Analytics
  api/                 # API helpers
  auth/                # Auth utilities
  documents/           # Document processing
  emails/              # Email utilities
  files/               # File handling
  middleware/          # Custom middleware
  swr/                 # SWR hooks
  tracking/            # View tracking
  utils/               # General utilities

prisma/schema/          # Database schema (split files)
  schema.prisma        # Core models
  dataroom.prisma      # Dataroom models
  document.prisma      # Document models
  link.prisma          # Link models
  signature.prisma     # E-signature models
  team.prisma          # Team models
  qanda.prisma         # Q&A models
```

## Database Schema

### Core Models

| Model | Description |
|-------|-------------|
| User | Platform users (admins and authenticated viewers) |
| Team | Organization entity, owns all resources |
| UserTeam | User-team membership with roles |
| Document | Uploaded documents |
| DocumentVersion | Version history |
| Folder | Document organization |

### Dataroom Models

| Model | Description |
|-------|-------------|
| Dataroom | Secure document collections |
| DataroomDocument | Documents within dataroom |
| DataroomFolder | Folder hierarchy |
| DataroomBrand | Branding and welcome screen |

### Access Control Models

| Model | Description |
|-------|-------------|
| Link | Shareable links with settings |
| Domain | Custom domains |
| Viewer | External viewers (investors) |
| ViewerGroup | Groups for access control |
| ViewerGroupMembership | Group membership |
| ViewerGroupAccessControls | Granular permissions |
| PermissionGroup | Permission templates |
| AccessRequest | Pending access requests |

### E-Signature Models (BF Fund Sign)

| Model | Description |
|-------|-------------|
| SignatureDocument | Documents requiring signatures |
| SignatureRecipient | Recipients (SIGNER, VIEWER, APPROVER) |
| SignatureField | Fields on documents (SIGNATURE, INITIALS, DATE, TEXT, CHECKBOX, NAME, EMAIL, COMPANY, TITLE, ADDRESS) |
| SignatureTemplate | Reusable templates |

### Analytics Models

| Model | Description |
|-------|-------------|
| View | Document/dataroom view events |
| PageView | Page-level tracking with duration |
| Reaction | Viewer reactions |

### Q&A Models

| Model | Description |
|-------|-------------|
| ViewerNote | Private notes from viewers |
| DataroomQuestion | Questions to admins (OPEN, ANSWERED, CLOSED) |
| DataroomFaqItem | FAQ items |

## Feature Specifications

### Investor Dataroom
- Secure document sharing with custom branding
- Folder hierarchy with drag-and-drop
- Multiple file types (PDF, images, videos, Excel)
- Page-level analytics
- Custom domain support

### Email Verification Flow
1. "Require email to view": Asks for email
2. "Require email verification": Sends OTP
3. Verification persists 1 day via cookies
4. Authenticated users bypass OTP

### BF Fund Sign (E-Signature)
- Drag-and-drop field placement
- Recipient roles: Signer, Viewer, Approver
- Sequential signing order
- Bulk sending
- In-person signing via QR codes
- Document expiration
- "Correct & Resend"
- Reusable templates
- Audit trails
- PDF download with embedded signatures

### Authentication
- Email magic links (primary)
- Google OAuth (admin-only)
- Role hierarchy: SUPER_ADMIN > ADMIN > MANAGER > MEMBER

### Admin/Viewer Separation
- Users with UserTeam record: Admin Dashboard
- Users without UserTeam: Viewer Portal
- Server-side protection via withAdminGuard()

## Technical Stack

| Component | Technology |
|-----------|------------|
| Framework | Next.js 14 (Pages + App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS, shadcn/ui |
| Database | PostgreSQL (Replit) + Prisma ORM |
| Auth | NextAuth.js |
| Storage | Replit Object Storage (AES-256) |
| Email | Resend API |
| PDF | pdf-lib, MuPDF |
| AI | OpenAI API |
| UI | Radix UI primitives |
| Forms | React Hook Form, Zod |

## Key Files Reference

### Viewer Components
- `components/view/dataroom/dataroom-view.tsx` - Main viewer with verification
- `components/view/dataroom/dataroom-document-view.tsx` - Document viewer
- `components/datarooms/folders/view-tree.tsx` - Folder tree navigation

### Authentication
- `app/(auth)/login/page-client.tsx` - Login page
- `pages/api/auth/[...nextauth].ts` - NextAuth config

### Viewer Pages
- `pages/view/[linkId]/index.tsx` - Dataroom entry
- `pages/view/[linkId]/d/[documentId].tsx` - Document view
- `pages/view/domains/[domain]/[slug]/` - Custom domain routes

### E-Signature
- `pages/sign/index.tsx` - Documents list
- `pages/sign/new.tsx` - Create document
- `components/signature/audit-trail.tsx` - Audit trail

## Environment Variables

### Required
- DATABASE_URL - PostgreSQL connection
- NEXTAUTH_SECRET - Auth secret
- RESEND_API_KEY - Email
- OPENAI_API_KEY - AI features

### Storage
- BLOB_READ_WRITE_TOKEN - Object storage
- DEFAULT_OBJECT_STORAGE_BUCKET_ID - Bucket ID

### Optional
- GOOGLE_CLIENT_ID/SECRET - Google OAuth

## Deployment

- Platform: Replit
- Custom Domain: dataroom.bermudafranchisegroup.com
- Workflow: `npm run dev -- -p 5000 -H 0.0.0.0`
- After changes: Redeploy required

## Future: Personalized Investor Portal

### Planned Features
1. Unique login per investor with personalized dashboard
2. Fund raise tracking and progress
3. Investment document management (subscriptions, K-1s, reports)
4. Investor communication and messaging

### Database Considerations
- Extend Viewer model for investor-specific data
- Add investment tracking models
- Capital commitment/contribution tracking

## Security Features

- Token-based access with per-recipient authorization
- Expiration enforcement
- Transactional database updates
- Comprehensive audit logging
- IP-based rate limiting
- AES-256 file encryption
- Cookie-based verification persistence
