# BF Fund Platform - Reference Documentation

> Local reference library for BF Fund Investor Portal  
> Built on **Papermark** (dataroom) and **OpenSign** (e-signature) open-source foundations

---

## Platform Build Origins

This platform integrates two open-source projects into a unified investor portal:

### Papermark (Dataroom Foundation)
| Attribute | Details |
|-----------|---------|
| Repository | https://github.com/mfts/papermark |
| License | AGPLv3 (with commercial /ee license) |
| Version | Forked and customized for BF Fund |

**Papermark provides:**
- Complete document sharing and dataroom infrastructure
- Custom domains and branding system
- Page-level analytics via PostgreSQL (Tinybird disabled)
- Magic link authentication via NextAuth.js
- Viewer access controls and permission groups
- Folder hierarchy with drag-and-drop
- PDF rendering via MuPDF and pdf-lib
- Email notifications via Resend
- Core database models: Team, User, Document, Folder, Link, Viewer, ViewerGroup

### OpenSign (E-Signature Foundation)
| Attribute | Details |
|-----------|---------|
| Inspiration | OpenSign open-source e-signature platform |
| Integration | Custom module in `/prisma/schema/signature.prisma` |
| UI Location | `/pages/sign/`, `/components/signature/` |

**OpenSign integration provides:**
- `SignatureDocument` model with `openSignDocumentId` for external references
- `SignatureRecipient` model with `openSignRecipientId` and signing tokens
- Multi-recipient workflows: Signer, Viewer, Approver roles
- 10 field types: Signature, Initials, Date, Text, Checkbox, Name, Email, Company, Title, Address
- Sequential signing order enforcement
- Secure signing URL generation
- Complete audit trail system
- Reusable template system (`SignatureTemplate` model)
- PDF signature embedding

### Integration Pattern
```
BF Fund Platform
├── BF Fund Dataroom (Papermark core)
│   ├── Document management
│   ├── Viewer authentication
│   ├── Analytics tracking
│   └── Access controls
│
├── BF Fund Sign (OpenSign integration)
│   ├── Signature workflows
│   ├── Field placement
│   ├── Recipient management
│   └── Audit trails
│
└── Shared Infrastructure
    ├── PostgreSQL + Prisma ORM
    ├── NextAuth.js authentication
    ├── Replit Object Storage
    ├── Resend email service
    └── shadcn/ui components
```

---

## CRITICAL: Platform-Agnostic Build Requirements

> **All features MUST be platform-wide solutions, NOT tied to any specific dataroom.**

### Build Rules
1. **No hardcoded IDs** - Never use specific dataroom, team, link, or document IDs in code
2. **Dynamic references only** - All IDs must come from URL parameters, database queries, or user context
3. **Dataroom lifecycle independent** - If a dataroom is deleted and a new one created, ALL features must work on the new dataroom automatically
4. **Use parameterized routes** - API routes must use `[teamId]`, `[dataroomId]`, `[linkId]` patterns

### Verification Checklist (Before Each Deploy)
- [ ] No CUID patterns (cmj*, clp*) in source code
- [ ] All API routes use dynamic parameters
- [ ] Database queries filter by passed-in IDs, not constants
- [ ] Email templates use props for all dataroom-specific content

---

## Quick Links

### Papermark (Dataroom) Documentation
| Document | Description |
|----------|-------------|
| [Architecture](./architecture.md) | System design, component relationships, PDF rendering |
| [Data Models](./data-models.md) | Entity relationships and database schema |
| [Auth Flow](./auth-flow.md) | Magic link authentication and session management |
| [File Storage](./file-storage.md) | Replit Object Storage integration |
| [UI Patterns](./ui-patterns.md) | SWR, forms, and component conventions |
| [API Conventions](./api-conventions.md) | API route patterns and authentication |

### OpenSign (E-Signature) Documentation
| Document | Description |
|----------|-------------|
| [OpenSign Overview](../opensign/README.md) | Complete OpenSign reference documentation |
| [API Reference](../opensign/api-reference.md) | OpenSign API endpoints and authentication |
| [Data Models](../opensign/data-models.md) | Document, Recipient, Field, Template models |
| [Signing Workflows](../opensign/signing-workflows.md) | Signing flows, sequential signing, bulk send |

## Key Customizations (BF Fund vs. Stock Papermark)

| Area | Stock Papermark | BF Fund Customization |
|------|-----------------|----------------------|
| Plan System | Multi-tier (Free, Pro, Business, Enterprise) | Always `datarooms-plus` (all features enabled) |
| Auth | Multiple providers | Magic link only, **1-hour expiration**, one-click session bypass |
| Admin Access | Any registered user | Allowlist: 2 specific emails only |
| File Storage | Vercel Blob / S3 | Replit Object Storage (AES-256) |
| Analytics | Tinybird (required) | **PostgreSQL only** (Tinybird NOT used) |
| Branding | Papermark branding | BF Fund / Bermuda Franchise Group |
| Billing | Stripe integration | Completely disabled |
| Rate Limiting | Upstash Redis (required) | Upstash optional (graceful fallback) |
| Bulk Download | AWS Lambda ZIP creation | Disabled (not supported on Replit) |

### Analytics System Difference

**Stock Papermark** requires Tinybird for page-level analytics (time spent, completion %).

**BF Fund** uses PostgreSQL as the **only** analytics storage (Tinybird is NOT used):
- `PageView` model stores page-level duration data
- Stats queries use SQL aggregation instead of Tinybird API
- Helper functions in `lib/tracking/postgres-stats.ts`
- Same data displayed in dashboard, fully self-contained
- Tinybird legacy code exists but gracefully skipped when `TINYBIRD_TOKEN` not set

### Quick Add Email Workflow

**Stock Papermark** sends basic admin notifications when visitors request access.

**BF Fund** streamlines investor onboarding:
- Access request emails include BOTH buttons:
  - "Quick Add This Investor" (amber) - one-click add with pre-filled email
  - "Enter The Dataroom" (black) - sign in and review first
- Quick Add button contains magic link + pre-filled email parameter
- Redirects to `/admin/quick-add?email=<investor_email>`
- Admin selects dataroom (dynamic selector, works for ANY dataroom), clicks "Add & Send Invite"
- Investor receives magic link instantly

### One-Click Authentication System

**Platform-wide enhancement** that provides seamless access for authenticated users:

| User State | emailAuthenticated Toggle | Behavior |
|------------|--------------------------|----------|
| Authenticated (has NextAuth session) + has access | OFF or ON | **One-click access** (OTP bypassed) |
| Not authenticated | OFF | Email collected, no OTP |
| Not authenticated | ON | OTP required |

**How It Works:**
1. User clicks magic link → NextAuth creates session
2. API checks session + verifies access (group/allowList/team viewer)
3. If both valid → `isEmailVerified = true` → OTP skipped
4. Direct dataroom access without 6-digit code entry

**Key Implementation:** `app/api/views-dataroom/route.ts` performs session-based access verification for ALL datarooms dynamically.

### Session Cookie System

Session cookies enable seamless document navigation within a dataroom:
- Cookie name: `pm_drs_flag_${linkId}` (uses dynamic linkId)
- Expiry: 1 hour
- Works with or without Redis (graceful fallback)
- Once verified, visitors browse freely without re-entering email

## Core Entities Relationship

```
Team (organization)
  ├── Users (admin members)
  ├── Datarooms
  │     ├── Folders
  │     ├── Documents
  │     ├── ViewerGroups (including Quick Add)
  │     │     ├── Members (Viewers)
  │     │     └── AccessControls
  │     └── Links
  │           ├── AllowList (emails)
  │           └── Views (analytics)
  └── Viewers (document recipients)
```

## Session Start Protocol

At the start of each session, the agent should:
1. Read `replit.md` for project context
2. Check workflow status and logs
3. Review recent git commits
4. Run basic health checks if needed

See `/docs/runbooks/session-checks.md` for detailed procedures.
