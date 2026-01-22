# BF Fund Investor Dataroom - Complete Technical Documentation

## Overview

The BF Fund Investor Dataroom is a secure, self-hosted investor portal for Bermuda Franchise Group (BFG). It consists of two integrated platforms:

1. **BF Fund Dataroom** - Secure document sharing with investors featuring visitor access management, one-click magic link authentication, and admin approval workflows
2. **BF Fund Sign** - DocuSign-style e-signature platform with signature fields, templates, bulk send, QR signing, and audit trails

The platform is deployed on Replit with a custom domain at `dataroom.bermudafranchisegroup.com`.

## Platform Build Origins

This platform is built on two open-source foundations:

### 1. Papermark (Dataroom Foundation)
- **Repository:** https://github.com/mfts/papermark
- **License:** AGPLv3 (with commercial EE license for enterprise features)
- **What it provides:**
  - Document sharing and dataroom infrastructure
  - Custom domains and branding
  - Page-level analytics and visitor tracking
  - Magic link authentication system
  - Viewer access controls and permissions
  - Folder organization with drag-and-drop
  - PDF viewing and document processing
  - NextAuth.js authentication setup
  - Email system via Resend
  - Database schema for teams, users, documents, links, viewers

### 2. OpenSign (E-Signature Foundation)
- **Inspiration:** OpenSign open-source e-signature platform
- **Integration:** Custom-built e-signature module with OpenSign-compatible data structures
- **What it provides:**
  - Signature document workflow (`SignatureDocument` model)
  - Multi-recipient signing with roles (Signer, Viewer, Approver)
  - Field types: Signature, Initials, Date, Text, Checkbox, Name, Email, Company, Title, Address
  - Sequential signing order support
  - Signing tokens and secure URLs (`openSignDocumentId`, `openSignRecipientId` fields)
  - Complete audit trail logging
  - Template system for reusable documents
  - PDF signature embedding

### How They're Integrated
- Papermark provides the core application shell, authentication, team management, and document infrastructure
- The e-signature system extends Papermark with new Prisma models (`signature.prisma`) that reference OpenSign data structures
- Both systems share the same database, authentication, and file storage backends
- The UI follows Papermark's design patterns using shadcn/ui components

### Reference Documentation
Full documentation for both foundation platforms is available in `/docs/`:

| Path | Description |
|------|-------------|
| `/docs/papermark/README.md` | Papermark architecture, customizations, patterns |
| `/docs/papermark/architecture.md` | System design, PDF rendering, component relationships |
| `/docs/papermark/data-models.md` | Database entity relationships |
| `/docs/papermark/auth-flow.md` | Magic link authentication, session management |
| `/docs/opensign/README.md` | OpenSign overview, features, core concepts |
| `/docs/opensign/api-reference.md` | OpenSign API endpoints and authentication |
| `/docs/opensign/data-models.md` | Document, Recipient, Field, Template models |
| `/docs/opensign/signing-workflows.md` | Signing flows, sequential signing, bulk send |

## User Preferences

- Communication style: Simple, everyday language
- Technical level: Non-technical explanations preferred
- Focus: Security and ease of use for investors

## Recent Changes (January 2026)

### E-Signature System Validation (January 22, 2026)
- Validated complete end-to-end e-signature workflow
- Confirmed self-hosted architecture (no external OpenSign API required)
- Tested all API endpoints: GET/POST `/api/sign/[token]`
- Verified fund compliance requirements: IP tracking, audit trails, timestamps
- Added comprehensive testing sandbox documentation (see "E-Signature Testing Sandbox" section)

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
| Framework | Next.js 14 (hybrid Pages + App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS, shadcn/ui |
| Database | PostgreSQL (Replit) + Prisma ORM |
| Auth | NextAuth.js |
| Storage | Replit Object Storage (AES-256), S3-compatible, TUS resumable uploads |
| Email | Resend API |
| PDF | pdf-lib, MuPDF |
| AI | OpenAI API |
| UI | Radix UI primitives |
| Forms | React Hook Form, Zod |

### Routing Architecture (Hybrid Next.js)
- **Pages Router** (`pages/`): Main application, API routes, viewer pages
- **App Router** (`app/`): Auth pages, EE APIs, admin pages, cron jobs

### Storage Backends
- **Replit Object Storage**: Primary encrypted storage (`lib/files/put-file.ts`)
- **S3-Compatible**: AWS S3 endpoints (`pages/api/file/s3/`)
- **TUS Protocol**: Resumable uploads (`pages/api/file/tus/`)
- **Browser Upload**: Direct client uploads (`pages/api/file/browser-upload.ts`)

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

## API Routes

### Pages Router APIs (`pages/api/`)

#### Authentication & Account
- `auth/[...nextauth].ts` - NextAuth.js endpoints
- `account/` - User account management
- `passkeys/` - Passkey authentication

#### Teams Management (`teams/[teamId]/`)
- `documents/` - Document CRUD, versions, folders
- `datarooms/[id]/` - Dataroom CRUD
  - `documents/`, `folders/` - Content management
  - `conversations/` - Dataroom conversations
  - `faqs/` - FAQ management
  - `download/` - Bulk download
  - `groups/` - Viewer group management
  - `permissions/` - Permission management
  - `qanda/` - Q&A system (notes, questions)
- `links/` - Shareable link management
- `domains/` - Custom domain configuration
- `agreements/` - Legal agreements
- `billing/` - Billing and subscription
- `webhooks/` - Webhook configuration
- `integrations/` - Third-party integrations
- `tokens/` - API tokens

#### File Operations
- `file/browser-upload.ts` - Client-side uploads
- `file/replit-upload.ts` - Replit storage uploads
- `file/replit-get.ts`, `replit-get-proxy.ts` - Storage retrieval
- `file/s3/` - S3-compatible endpoints
- `file/tus/` - TUS resumable uploads
- `file/tus-viewer/` - Viewer TUS uploads
- `file/notion/` - Notion integration uploads
- `mupdf/[documentId]` - PDF page rendering

#### Links & Viewer Access
- `links/[id]/` - Link settings, views, documents
- `links/domains/` - Domain-based links
- `links/download/` - Document downloads
- `view/` - Viewer verification, access APIs
- `analytics/` - View analytics tracking
- `conversations/` - Viewer conversations
- `feedback/` - Viewer feedback

#### E-Signature
- `sign/` - Signature documents and recipients

#### Background Jobs & Internal
- `jobs/` - Background job processing
- `internal/billing/` - Internal billing operations
- `stripe/` - Stripe webhook handling

### App Router APIs (`app/api/`)

#### Scheduled Tasks
- `cron/` - Cron job endpoints
- `cron/domains/` - Domain verification jobs
- `cron/year-in-review/` - Annual report generation

#### Analytics & Views
- `views/` - Document view endpoints
- `views-dataroom/` - Dataroom view analytics

#### System & Webhooks
- `webhooks/callback/` - Webhook callbacks
- `integrations/` - Integration endpoints
- `og/`, `og/yir/` - Open Graph images
- `csp-report/` - CSP violation reports
- `feature-flags/` - Feature flag management
- `help/` - Help/support endpoints

### Enterprise APIs (`app/(ee)/api/`)

#### AI Features
- `ai/chat/[chatId]/messages/` - AI chat sessions
- `ai/store/teams/[teamId]/` - AI vector stores
  - `datarooms/[dataroomId]/` - Dataroom AI indexing
  - `documents/[documentId]/` - Document AI indexing

#### Links (EE)
- `links/[id]/upload/` - EE link upload features

#### Workflows
- `workflows/[workflowId]/` - Workflow management
  - `executions/` - Workflow execution history
  - `steps/[stepId]/` - Workflow step configuration
- `workflow-entry/link/[entryLinkId]/` - Entry link access
  - `access/`, `verify/` - Entry verification
- `workflow-entry/domains/` - Domain-based entries

#### FAQs
- `faqs/` - FAQ management

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

## E-Signature Testing Sandbox

### Architecture Note
The BF Fund Sign e-signature system is **self-hosted** and does NOT use the external OpenSign API (opensignlabs.com). It is a custom-built system inspired by OpenSign's architecture but implemented entirely within this codebase using Prisma models. No external API token is required.

### Architecture Clarification (Important!)
| Component | Status | Notes |
|-----------|--------|-------|
| OpenSign API | **NOT USED** | System is self-hosted, no external API calls |
| @opensign/react | **NOT USED** | Custom drag-drop field UI built with React |
| Tinybird Analytics | **NOT CONFIGURED** | Code exists but `TINYBIRD_TOKEN` not set |
| Webhooks | **AVAILABLE** | Infrastructure at `/api/teams/[teamId]/webhooks/` |
| Resend Email | **CONFIGURED** | Sends signing request emails |
| Prisma DB | **ACTIVE** | All signature data in PostgreSQL |

### Production End-to-End Test Guide

#### Step 1: Admin Login
1. Navigate to `/admin/login` or `/login`
2. Use admin credentials (Google OAuth or magic link)
3. Access the dashboard

#### Step 2: Create Document (/sign/new)
1. Navigate to `/sign/new`
2. Upload a test PDF (e.g., subscription agreement)
3. Enter document title and description
4. Add recipient: `test@investor.com` with name "Test Investor"
5. Set role to "SIGNER"
6. Click "Continue to Prepare"

#### Step 3: Place Fields (/sign/[id]/prepare)
1. Drag signature fields onto the PDF:
   - SIGNATURE field (required)
   - DATE_SIGNED field (auto-fills)
   - NAME field (auto-fills from recipient)
2. Position fields where signatures are needed
3. Click "Send for Signature"

#### Step 4: Send Document
- System creates signing tokens via `nanoid(32)`
- Resend API sends email with signing URL
- Document status: DRAFT → SENT
- Audit trail updated with SENT event

#### Step 5: Recipient Signing (/view/sign/[token])
1. Recipient opens email link (no login required)
2. Views PDF with positioned fields
3. Draws or types signature
4. Fills any required fields
5. Clicks "Sign & Complete"
6. Status updates: SENT → VIEWED → SIGNED/COMPLETED

#### Step 6: Verify in Dashboard (/sign)
1. Refresh the /sign dashboard
2. Check document status: "Completed" 
3. View audit trail (IP, timestamps, user agent)
4. Download signed PDF with embedded signatures

### Verification SQL Queries

```sql
-- Check document status and audit trail
SELECT id, title, status, "sentAt", "completedAt", "auditTrail"
FROM "SignatureDocument" 
WHERE id = '[document-id]';

-- Check recipient signing details (SEC traceability)
SELECT name, email, status, "viewedAt", "signedAt", "ipAddress", "userAgent"
FROM "SignatureRecipient"
WHERE "documentId" = '[document-id]';

-- Check field values
SELECT type, value, "filledAt"
FROM "SignatureField"
WHERE "documentId" = '[document-id]';

-- Dashboard summary query
SELECT 
  d.id, d.title, d.status,
  COUNT(r.id) as recipients,
  SUM(CASE WHEN r.status = 'SIGNED' THEN 1 ELSE 0 END) as signed
FROM "SignatureDocument" d
LEFT JOIN "SignatureRecipient" r ON r."documentId" = d.id
GROUP BY d.id ORDER BY d."createdAt" DESC LIMIT 10;
```

### SEC Compliance Tracking
The system captures for audit purposes:
- **IP Address**: Recorded on each signing action
- **User Agent**: Browser/device fingerprint
- **Timestamps**: Precise to millisecond (viewedAt, signedAt)
- **Signature Image**: Base64 PNG stored in DB
- **Decline Reason**: Text captured if recipient declines

### Testing Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/sign/[token]` | GET | Fetch document and fields for signing |
| `/api/sign/[token]` | POST | Submit signature or decline |
| `/api/teams/[teamId]/signature-documents` | GET | List signature documents |
| `/api/teams/[teamId]/signature-documents` | POST | Create new signature document |
| `/api/teams/[teamId]/signature-documents/[documentId]/send` | POST | Send document for signing |
| `/api/teams/[teamId]/signature-documents/[documentId]/fields` | POST | Add/update signature fields |
| `/view/sign/[token]` | Page | Public signing UI for recipients |

### Test Parameters

#### Create Test Document (SQL)
```sql
INSERT INTO "SignatureDocument" (
  id, title, description, file, "storageType", "numPages", status, 
  "emailSubject", "emailMessage", "auditTrail", "teamId", "createdById", 
  "createdAt", "updatedAt"
) VALUES (
  'test-e2e-doc-XXX',
  'Test Document Title',
  'Description for testing',
  'https://example.com/sample.pdf',
  'VERCEL_BLOB',
  1,
  'DRAFT',
  'Please sign this document',
  'Dear recipient, please review and sign.',
  '[{"actor": "system", "action": "CREATED", "timestamp": "..."}]'::jsonb,
  'cmjbsfoec0000p9pfot2jcr8w',  -- Bermuda Franchise Fund team ID
  'cmjbqc0ss0000p91n4qjcdujk',  -- Admin user ID
  now(), now()
);
```

#### Create Test Recipient (SQL)
```sql
INSERT INTO "SignatureRecipient" (
  id, "documentId", name, email, role, "signingOrder", status, 
  "signingToken", "createdAt", "updatedAt"
) VALUES (
  'test-recipient-XXX',
  'test-e2e-doc-XXX',
  'Test Investor',
  'test@investor.com',
  'SIGNER',  -- Options: SIGNER, VIEWER, APPROVER
  1,
  'SENT',    -- Options: PENDING, SENT, VIEWED, SIGNED, DECLINED
  'unique-signing-token-xxx',
  now(), now()
);
```

#### Create Test Fields (SQL)
```sql
INSERT INTO "SignatureField" (
  id, "documentId", "recipientId", type, "pageNumber", 
  x, y, width, height, required, "createdAt", "updatedAt"
) VALUES 
  ('field-sig-001', 'test-e2e-doc-XXX', 'test-recipient-XXX', 'SIGNATURE', 1, 10, 70, 35, 12, true, now(), now()),
  ('field-date-001', 'test-e2e-doc-XXX', 'test-recipient-XXX', 'DATE_SIGNED', 1, 50, 70, 20, 6, true, now(), now()),
  ('field-name-001', 'test-e2e-doc-XXX', 'test-recipient-XXX', 'NAME', 1, 10, 85, 35, 6, true, now(), now());
```

### API Test Commands

#### Test GET (Fetch Document)
```bash
curl -s "http://localhost:5000/api/sign/[token]"
```

#### Test POST (Submit Signature)
```bash
curl -s -X POST "http://localhost:5000/api/sign/[token]" \
  -H "Content-Type: application/json" \
  -d '{
    "fields": [
      {"id": "field-sig-001", "value": null},
      {"id": "field-date-001", "value": "01/22/2026"},
      {"id": "field-name-001", "value": "Test Investor"}
    ],
    "signatureImage": "data:image/png;base64,iVBORw0KGgo..."
  }'
```

#### Test POST (Decline Document)
```bash
curl -s -X POST "http://localhost:5000/api/sign/[token]" \
  -H "Content-Type: application/json" \
  -d '{"declined": true, "declinedReason": "Reason for declining"}'
```

### Validation Test Results (January 22, 2026)

| Test Case | Status | Notes |
|-----------|--------|-------|
| Database Schema Exists | ✅ Pass | SignatureDocument, SignatureRecipient, SignatureField, SignatureTemplate |
| GET /api/sign/[token] | ✅ Pass | Returns document, recipient, and fields |
| Auto-update to VIEWED | ✅ Pass | Recipient status updates on first view |
| POST Submit Signature | ✅ Pass | Signs document, updates all statuses |
| Document Status Flow | ✅ Pass | DRAFT → SENT → VIEWED → COMPLETED |
| Recipient Status Flow | ✅ Pass | PENDING → SENT → VIEWED → SIGNED |
| IP Address Tracking | ✅ Pass | Records 127.0.0.1 (localhost) or real IP |
| User Agent Logging | ✅ Pass | Records curl/8.14.1 or browser info |
| Signature Image Storage | ✅ Pass | Base64 PNG stored in database |
| Field Values Saved | ✅ Pass | All field values and filledAt timestamps recorded |
| POST Decline Flow | ✅ Pass | Document/recipient status → DECLINED |
| Decline Reason Captured | ✅ Pass | Text stored in declinedReason field |
| Already Signed Protection | ✅ Pass | Returns 400 "already completed" |
| Rate Limiting Active | ✅ Pass | 10 POST / 30 GET per minute per IP |
| Audit Trail JSON | ✅ Pass | Events logged with actor, action, timestamp |

### Fund Compliance Verification
- ✅ All signature data persists to PostgreSQL via Prisma
- ✅ IP address recorded for each signing action
- ✅ User agent (browser) fingerprint captured
- ✅ Timestamps precise to millisecond
- ✅ Decline reasons stored for audit purposes
- ✅ Transactional updates ensure data consistency

### Cleanup SQL
```sql
DELETE FROM "SignatureField" WHERE "documentId" LIKE 'test-%';
DELETE FROM "SignatureRecipient" WHERE "documentId" LIKE 'test-%';
DELETE FROM "SignatureDocument" WHERE id LIKE 'test-%';
```

---

## GP/LP Fund Management Suite Roadmap

### Vision
Transform the BF Fund Investor Dataroom into a comprehensive 506(c) fund LP portal for GPs managing private investments. Focus on tech-driven capital raises, transactions, and reporting with **UX as the #1 priority**.

### Core Principles

| Principle | Description |
|-----------|-------------|
| **UX-First** | Mobile-responsive (Tailwind/shadcn/ui), minimal clicks, clear CTAs, guided wizards |
| **Simple Steps** | 3-5 step linear flows per action (dataroom → account → NDA → dashboard) |
| **Build on Existing** | Extend Next.js, Prisma, self-hosted e-sign, Resend, webhooks, Stripe |
| **506(c) Compliance** | Accreditation self-ack, audit logs (IP/timestamps), KYC/AML hooks |
| **Internal Stack** | No external APIs like OpenSign—keep everything self-hosted |

### Unique Fundroom Concept
A personalized, secure dashboard for each investor (LP) post-account creation:
- **Fund Data**: Full raise status, capital call notices
- **Personal Docs**: Signed documents, subscription agreements, K-1s
- **Communication**: Notes/feedback to GP, messaging
- **Payments**: Automated capital management via Stripe
- **Reporting**: Custom dashboards for metrics and distributions

### Tech Stack (Reusing Existing)

| Component | Technology |
|-----------|------------|
| Framework | Next.js 14 (routes/UI) |
| Language | TypeScript |
| Database | PostgreSQL + Prisma (extend for LP data) |
| Auth | NextAuth (enhanced for LP logins) |
| E-Signature | Self-hosted BF Fund Sign |
| Email | Resend API |
| Payments | Stripe integration |
| Analytics | Tinybird (configure TINYBIRD_TOKEN later) |
| Storage | Replit Object Storage / S3 / Vercel Blob |

### New Prisma Models Needed

| Model | Purpose |
|-------|---------|
| `Investor` | LP profiles with accreditation status, contact info |
| `Fund` | Fund entities with target raise, terms, status |
| `Investment` | LP investments linking Investor → Fund |
| `CapitalCommitment` | Commitment amounts and schedules |
| `CapitalCall` | Capital call notices and payments |
| `Distribution` | Distribution events and payouts |
| `K1Document` | Tax documents per LP per year |
| `AccreditationVerification` | Accreditation proof and status |
| `InvestorNote` | LP notes/feedback to GP |
| `FundReport` | Fund performance reports |

### Implementation Phases

#### Phase 1: MVP Core (1-2 weeks)
**Priority: Get LP onboarding + personalized dashboard working**

1. **Investor Registration Flow**
   - Email-based signup with magic link
   - Investor profile creation (name, contact, entity type)
   - Link existing Viewer → Investor model

2. **NDA Gate**
   - Auto-present NDA on first login
   - Integrate with BF Fund Sign
   - Gate dashboard access until NDA signed

3. **Personalized LP Dashboard**
   - Investor-specific document view
   - Signed documents history
   - Fund summary cards

4. **Accreditation Self-Certification**
   - Simple checkbox acknowledgment
   - Record IP, timestamp, user agent
   - Store in AccreditationVerification model

#### Phase 2: Full UX + Automations (2-4 weeks)
**Priority: Polish investor experience + automate workflows**

1. **Fund Subscription Flow**
   - Subscription agreement generation
   - Commitment amount entry
   - Bank/wire information capture
   - E-sign integration

2. **Capital Call System**
   - GP creates capital call notice
   - Automatic LP notifications
   - Payment tracking (Stripe or manual wire)
   - Capital call status dashboard

3. **Distribution Management**
   - GP creates distribution event
   - LP payout calculations
   - Distribution notice emails
   - Distribution history

4. **Document Management**
   - Organized folders per investor
   - Automatic K-1 assignment
   - Quarterly/annual report distribution
   - Document acknowledgment tracking

5. **Investor Portal Enhancements**
   - Fund performance metrics
   - Investment history
   - Capital account balance
   - Communication thread with GP

#### Phase 3: Scaling + Compliance (1-2 months)
**Priority: Enterprise features + regulatory readiness**

1. **KYC/AML Integration**
   - Persona API integration (post-NDA)
   - Identity verification workflow
   - Accredited investor verification

2. **Multi-Fund Support**
   - Multiple funds per GP team
   - LP investments across funds
   - Consolidated investor view

3. **Advanced Reporting**
   - IRR/MOIC calculations
   - Custom report generation
   - Tinybird analytics integration
   - Investor statement generation

4. **Audit + Compliance**
   - Full audit trail export
   - SEC-ready documentation
   - Blue Sky filing support
   - Compliance dashboard for GP

5. **External Integrations**
   - CRM sync (Hubspot, Salesforce)
   - Accounting integration
   - Cap table management
   - Banking API for payments

### Database Extensions

#### Extend Existing Models
```prisma
// Extend User model for investor attributes
model User {
  // ... existing fields
  investorProfile   Investor?
  isAccredited      Boolean   @default(false)
  accreditedAt      DateTime?
  accreditedMethod  String?   // SELF_CERTIFIED, THIRD_PARTY_VERIFIED
}

// Extend Team for fund management
model Team {
  // ... existing fields
  funds             Fund[]
  isGP              Boolean   @default(false)
}
```

#### New LP/GP Models
```prisma
model Investor {
  id                    String   @id @default(cuid())
  userId                String   @unique
  user                  User     @relation(fields: [userId], references: [id])
  entityName            String?
  entityType            String   // INDIVIDUAL, LLC, TRUST, IRA, etc.
  taxId                 String?
  address               String?
  phone                 String?
  accreditationStatus   String   @default("PENDING")
  investments           Investment[]
  notes                 InvestorNote[]
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
}

model Fund {
  id                String   @id @default(cuid())
  teamId            String
  team              Team     @relation(fields: [teamId], references: [id])
  name              String
  targetRaise       Decimal
  minimumInvestment Decimal
  status            String   @default("RAISING")
  closingDate       DateTime?
  investments       Investment[]
  capitalCalls      CapitalCall[]
  distributions     Distribution[]
  reports           FundReport[]
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
}

model Investment {
  id                String   @id @default(cuid())
  fundId            String
  fund              Fund     @relation(fields: [fundId], references: [id])
  investorId        String
  investor          Investor @relation(fields: [investorId], references: [id])
  commitmentAmount  Decimal
  fundedAmount      Decimal  @default(0)
  status            String   @default("COMMITTED")
  subscriptionDate  DateTime?
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
}
```

### UI Flows

#### LP Onboarding Flow (5 steps)
```
1. Email Signup → Magic Link
2. Profile Creation → Name, Entity, Contact
3. NDA Presentation → E-Sign with BF Fund Sign
4. Accreditation Self-Cert → Checkbox + Acknowledgment
5. Dashboard Access → Personalized Fundroom
```

#### Subscription Flow (4 steps)
```
1. View Fund Details → Summary, Terms, Docs
2. Enter Commitment → Amount, Bank Info
3. Sign Subscription → E-Sign Agreement
4. Confirmation → Receipt, Next Steps
```

#### Capital Call Flow (GP side - 3 steps)
```
1. Create Call → Amount, Due Date, Purpose
2. Select LPs → All or Specific Investors
3. Send Notice → Email + Dashboard Notification
```

### API Routes to Add

| Endpoint | Purpose |
|----------|---------|
| `/api/investor/profile` | LP profile CRUD |
| `/api/investor/dashboard` | LP dashboard data |
| `/api/investor/documents` | LP document list |
| `/api/investor/accreditation` | Accreditation management |
| `/api/fund/[fundId]` | Fund details |
| `/api/fund/[fundId]/investments` | Fund investments |
| `/api/fund/[fundId]/capital-calls` | Capital call management |
| `/api/fund/[fundId]/distributions` | Distribution management |
| `/api/gp/dashboard` | GP overview dashboard |
| `/api/gp/investors` | LP management |
| `/api/gp/reports` | Fund reporting |

### Success Metrics

| Metric | Target |
|--------|--------|
| LP onboarding completion | > 90% |
| Time to first investment | < 15 minutes |
| Document signing rate | > 95% |
| Capital call response time | < 5 days avg |
| LP portal engagement | Weekly active |
| GP time saved | 10+ hours/week |

### Testing Strategy
- Use Replit for prototyping (Agent-assisted)
- Deploy to Vercel for production
- Add Jest for E2E tests
- Test each flow with real investor data

---

*Roadmap created: January 22, 2026*
*Last updated: January 22, 2026*
