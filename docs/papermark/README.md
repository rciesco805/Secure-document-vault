# Papermark Reference Documentation

> Local reference library for BF Fund Dataroom (customized Papermark)

## Quick Links

| Document | Description |
|----------|-------------|
| [Architecture](./architecture.md) | System design, component relationships, PDF rendering |
| [Data Models](./data-models.md) | Entity relationships and database schema |
| [Auth Flow](./auth-flow.md) | Magic link authentication and session management |
| [File Storage](./file-storage.md) | Replit Object Storage integration |
| [UI Patterns](./ui-patterns.md) | SWR, forms, and component conventions |
| [API Conventions](./api-conventions.md) | API route patterns and authentication |

## Key Customizations (BF Fund vs. Stock Papermark)

| Area | Stock Papermark | BF Fund Customization |
|------|-----------------|----------------------|
| Plan System | Multi-tier (Free, Pro, Business, Enterprise) | Always `datarooms-plus` (all features enabled) |
| Auth | Multiple providers | Magic link only, **1-hour expiration** |
| Admin Access | Any registered user | Allowlist: 2 specific emails only |
| File Storage | Vercel Blob / S3 | Replit Object Storage (AES-256) |
| Analytics | Tinybird (required) | **PostgreSQL fallback** (Tinybird optional) |
| Branding | Papermark branding | BF Fund / Bermuda Franchise Group |
| Billing | Stripe integration | Completely disabled |
| Rate Limiting | Upstash Redis (required) | Upstash optional (graceful fallback) |
| Bulk Download | AWS Lambda ZIP creation | Disabled (not supported on Replit) |

### Analytics System Difference

**Stock Papermark** requires Tinybird for page-level analytics (time spent, completion %).

**BF Fund** uses PostgreSQL-based tracking when `TINYBIRD_TOKEN` is not configured:
- `PageView` model stores page-level duration data
- Stats queries use SQL aggregation instead of Tinybird API
- Helper functions in `lib/tracking/postgres-stats.ts`
- Same data displayed in dashboard, fully self-contained

### Quick Add Email Workflow

**Stock Papermark** sends basic admin notifications when visitors request access.

**BF Fund** streamlines investor onboarding:
- Access request emails include "Quick Add This Investor" button
- Button contains magic link + pre-filled email parameter
- Redirects to `/admin/quick-add?email=<investor_email>`
- Admin selects dataroom, clicks "Add & Send Invite"
- Investor receives magic link instantly

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
